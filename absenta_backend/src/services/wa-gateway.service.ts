/**
 * wa-gateway.service.ts
 * Multi-tenant WhatsApp Gateway menggunakan @whiskeysockets/baileys.
 * Menggunakan Pool Pattern: setiap tenant yang mengaktifkan WA Service
 * mendapatkan socket & auth-dir sendiri. Diadopsi dari Project-Server-Lisensi/services/waGateway.js.
 *
 * Syarat pengiriman notifikasi WA:
 *  1. Tenant memiliki fitur/subscription WHATSAPP_SERVICE aktif
 *  2. Tenant sudah menautkan (scan QR) nomor WA ke platform
 *  3. Status socket = 'connected'
 */

import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { prisma } from '../utils/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaConnectionState {
  tenantId: string;
  status: 'disconnected' | 'connecting' | 'connected';
  connectedNumber: string | null;
  qrBase64: string | null;
  retryCount: number;
  sock: any | null;
  emitter: EventEmitter;
  authDir: string;
}

// ─── Pool ────────────────────────────────────────────────────────────────────

const pool = new Map<string, WaConnectionState>();

const BASE_AUTH_DIR = path.join(process.cwd(), 'wa_auth');

function getTenantAuthDir(tenantId: string): string {
  return path.join(BASE_AUTH_DIR, tenantId);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Connect (per-tenant) ────────────────────────────────────────────────────

async function connectTenant(tenantId: string): Promise<void> {
  const authDir = getTenantAuthDir(tenantId);
  ensureDir(authDir);

  // Pastikan slot ada di pool
  if (!pool.has(tenantId)) {
    pool.set(tenantId, {
      tenantId,
      status: 'disconnected',
      connectedNumber: null,
      qrBase64: null,
      retryCount: 0,
      sock: null,
      emitter: new EventEmitter(),
      authDir,
    });
  }

  const entry = pool.get(tenantId)!;

  // Jika status sudah terhubung, jangan re-koneksi untuk menghindari konflik sesi
  if (entry.status === 'connected' && entry.sock) {
    console.log(`[WA-Pool:${tenantId}] Sesi sudah terhubung. Mengabaikan connect.`);
    return;
  }

  // Bersihkan socket lama jika ada untuk menghindari konflik file lock & port leak
  if (entry.sock) {
    try {
      console.log(`[WA-Pool:${tenantId}] Menutup socket lama sebelum membuat koneksi baru...`);
      entry.sock.ev.removeAllListeners('connection.update');
      entry.sock.ev.removeAllListeners('creds.update');
      entry.sock.end();
    } catch (e: any) {
      console.warn(`[WA-Pool:${tenantId}] Gagal menutup socket lama:`, e.message);
    }
    entry.sock = null;
  }

  entry.status = 'connecting';
  entry.qrBase64 = null;

  // Dynamic import Baileys (ESM)
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
  } = await import('@whiskeysockets/baileys');

  const pino = (await import('pino')).default;
  const logger = pino({ level: 'silent' });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015970961] as any }));

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Absenta Platform', 'Chrome', '120.0.0'],
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
    retryRequestDelayMs: 5_000,
    defaultQueryTimeoutMs: 60_000,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
  });

  entry.sock = sock;

  // ── QR & Connection events ──
  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const b64 = await generateQRBase64(qr);
      entry.qrBase64 = b64;
      entry.status = 'connecting';
      entry.emitter.emit('qr', b64);
      console.log(`[WA-Pool:${tenantId}] QR tersedia — silakan scan di Admin Panel.`);
    }

    if (connection === 'open') {
      entry.status = 'connected';
      entry.qrBase64 = null;
      entry.retryCount = 0;
      entry.connectedNumber = sock.user?.id?.split(':')[0] || null;
      console.log(`[WA-Pool:${tenantId}] ✅ Terhubung sebagai: ${entry.connectedNumber}`);
      entry.emitter.emit('connected', entry.connectedNumber);
      // Simpan status ke DB
      await syncStatusToDB(tenantId, 'connected', entry.connectedNumber);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[WA-Pool:${tenantId}] Koneksi terputus (kode: ${statusCode}). Reconnect: ${shouldReconnect}`);
      
      // Bersihkan listener dari socket yang sudah ditutup
      try {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
      } catch (_) {}

      entry.connectedNumber = null;
      entry.emitter.emit('disconnected', statusCode);

      if (shouldReconnect) {
        entry.status = 'connecting';
        await syncStatusToDB(tenantId, 'connecting', null);

        const isRestart = statusCode === DisconnectReason.restartRequired;
        const delay = isRestart ? 2000 : Math.max(5000, Math.min(5000 * entry.retryCount, 30_000));
        if (!isRestart) {
          entry.retryCount++;
        }

        const MAX_RETRY = 10;
        if (entry.retryCount < MAX_RETRY || isRestart) {
          console.log(`[WA-Pool:${tenantId}] Retry reconnect dalam ${delay / 1000}s...`);
          setTimeout(() => connectTenant(tenantId), delay);
        } else {
          console.log(`[WA-Pool:${tenantId}] Batas maksimum retry tercapai.`);
          entry.status = 'disconnected';
          await syncStatusToDB(tenantId, 'disconnected', null);
        }
      } else {
        console.log(`[WA-Pool:${tenantId}] Sesi logout — hapus auth & scan ulang.`);
        entry.status = 'disconnected';
        await syncStatusToDB(tenantId, 'disconnected', null);
        clearTenantAuth(tenantId);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

async function generateQRBase64(qrString: string): Promise<string | null> {
  try {
    const qrcode = await import('qrcode');
    return await qrcode.default.toDataURL(qrString, { width: 300, margin: 2 });
  } catch (e: any) {
    console.error('[WA-Pool] Gagal generate QR image:', e.message);
    return null;
  }
}
async function syncStatusToDB(tenantId: string, status: string, number: string | null) {
  try {
    await prisma.waTenantConnection.upsert({
      where: { tenant_id: tenantId },
      update: { status, connected_number: number, updated_at: new Date() },
      create: { tenant_id: tenantId, status, connected_number: number, auth_dir: getTenantAuthDir(tenantId) },
    });
  } catch (e: any) {
    console.error(`[WA-Pool:${tenantId}] Gagal sync status ke DB:`, e.message);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const waGatewayService = {
  /**
   * Inisialisasi WA untuk satu tenant (dipanggil saat admin klik "Hubungkan WA")
   */
  async initTenant(tenantId: string): Promise<void> {
    if (pool.get(tenantId)?.status === 'connected') return;
    await connectTenant(tenantId);
  },

  /**
   * Kirim pesan WA ke nomor, hanya jika tenant sudah connected.
   * Melempar Error jika belum connected (agar caller bisa gracefully skip).
   */
  async sendMessage(tenantId: string, nomor: string, pesan: string): Promise<boolean> {
    const entry = pool.get(tenantId);
    if (!entry || entry.status !== 'connected' || !entry.sock) {
      throw new Error(`WA Gateway tenant ${tenantId} belum terhubung.`);
    }
    let formattedNumber = nomor.replace(/[^0-9]/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '62' + formattedNumber.substring(1);
    }
    const jid = formattedNumber + '@s.whatsapp.net';
    
    // Gunakan Promise.race dengan timeout 5 detik untuk mendeteksi koneksi mati (zombie socket)
    const sendPromise = entry.sock.sendMessage(jid, { text: pesan });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_SEND')), 5000)
    );

    try {
      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[WA-Pool:${tenantId}] Pesan terkirim ke ${nomor}`);
      return true;
    } catch (err: any) {
      if (err.message === 'TIMEOUT_SEND') {
        console.warn(`[WA-Pool:${tenantId}] Pengiriman WA timeout (5 detik). Koneksi mati (zombie). Memulai reconnect otomatis...`);
        // Putuskan koneksi socket saat ini secara paksa untuk memicu reconnect
        try {
          entry.sock.ev.removeAllListeners('connection.update');
          entry.sock.ev.removeAllListeners('creds.update');
          entry.sock.end();
        } catch (_) {}
        entry.sock = null;
        entry.status = 'connecting';
        await syncStatusToDB(tenantId, 'connecting', null);
        
        // Mulai ulang koneksi setelah jeda 2 detik
        setTimeout(() => connectTenant(tenantId), 2000);
        throw new Error('Koneksi WhatsApp tidak merespons (zombie socket). Sistem sedang menyambung ulang otomatis.');
      }
      throw err;
    }
  },

  /**
   * Kirim pesan WA secara soft (tidak throw jika belum connected — hanya log warning).
   * Gunakan ini untuk notifikasi opsional.
   */
  async sendMessageSoft(tenantId: string, nomor: string | null | undefined, pesan: string): Promise<void> {
    if (!nomor) return;
    try {
      await waGatewayService.sendMessage(tenantId, nomor, pesan);
    } catch (e: any) {
      console.warn(`[WA-Pool:${tenantId}] Skip WA notif (${e.message})`);
    }
  },

  /**
   * Cek apakah tenant punya hak kirim WA (punya subscription WHATSAPP_SERVICE aktif)
   */
  async hasWaSubscription(tenantId: string): Promise<boolean> {
    try {
      const sub = await (prisma as any).subscription.findFirst({
        where: {
          tenant_id: tenantId,
          status: { in: ['ACTIVE', 'TRIAL'] },
          Plan: { features: { contains: 'WHATSAPP_SERVICE' } },
        },
      });
      return !!sub;
    } catch {
      return false;
    }
  },

  getStatus(tenantId: string) {
    const entry = pool.get(tenantId);
    return {
      status: entry?.status ?? 'disconnected',
      number: entry?.connectedNumber ?? null,
      has_qr: !!(entry?.qrBase64),
    };
  },

  getQRBase64(tenantId: string): string | null {
    return pool.get(tenantId)?.qrBase64 ?? null;
  },

  clearTenantAuth,
  async disconnectTenant(tenantId: string): Promise<void> {
    const entry = pool.get(tenantId);
    if (entry?.sock) {
      try {
        entry.sock.ev.removeAllListeners('connection.update');
        entry.sock.ev.removeAllListeners('creds.update');
        entry.sock.end();
      } catch (_) {}
      entry.sock = null;
    }
    clearTenantAuth(tenantId);
    if (entry) {
      entry.status = 'disconnected';
      entry.qrBase64 = null;
      entry.connectedNumber = null;
    }
    await syncStatusToDB(tenantId, 'disconnected', null);
    pool.delete(tenantId);
  },

  on(tenantId: string, event: string, listener: (...args: any[]) => void) {
    pool.get(tenantId)?.emitter.on(event, listener);
  },

  /**
   * Restore active connections dari DB saat server restart
   */
  async restoreConnections(): Promise<void> {
    try {
      const connections = await prisma.waTenantConnection.findMany({
        where: { status: { in: ['connected', 'connecting'] } },
      });
      for (const conn of connections) {
        console.log(`[WA-Pool] Restoring koneksi tenant: ${conn.tenant_id}`);
        connectTenant(conn.tenant_id).catch((e: any) =>
          console.error(`[WA-Pool] Gagal restore ${conn.tenant_id}:`, e.message)
        );
      }
    } catch (e: any) {
      console.error('[WA-Pool] Gagal restore connections:', e.message);
    }
  },};

function clearTenantAuth(tenantId: string) {
  const authDir = getTenantAuthDir(tenantId);
  if (fs.existsSync(authDir)) {
    fs.readdirSync(authDir).forEach((f) => {
      fs.unlinkSync(path.join(authDir, f));
    });
    console.log(`[WA-Pool:${tenantId}] Auth state dihapus.`);
  }
}
