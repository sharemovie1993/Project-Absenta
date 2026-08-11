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

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma';
import { waChatbotResolverService, persistLidMapping } from '../modules/whatsapp/services/wa-chatbot-resolver.service';
import { getRedisConnection } from '../queue/redis';
import { createRedisConnection } from '../infra/redis/redisClient';
import { appLogger } from '../utils/app-logger';

// ─── WA Groups Redis Cache ─────────────────────────────────────────────────────
const WA_GROUPS_CACHE_TTL_SECONDS = 300; // 5 menit
function getGroupsCacheKey(tenantId: string): string {
  return `wa:groups:${tenantId}`;
}

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
  // ── Health Tracking ──────────────────────────────────────────────────────
  /** Waktu terakhir pesan berhasil diterima & didekripsi */
  lastMessageReceivedAt: Date | null;
  /** Waktu terakhir pesan berhasil dikirim */
  lastMessageSentAt: Date | null;
  /** Jumlah kegagalan dekripsi sejak koneksi terakhir */
  decryptFailCount: number;
  /** Waktu terakhir kegagalan dekripsi */
  lastDecryptFailAt: Date | null;
  /**
   * Peta LID (WA internal ID) → nomor HP asli.
   * Diperlukan karena WA versi baru (2024+) menggunakan LID sebagai JID
   * menggantikan nomor HP langsung (Phone Number Privacy / PN system).
   * Diisi dari event contacts.upsert / contacts.update.
   */
  lidToPhone: Map<string, string>;
}

async function getTenantDbCredsInfo(tenantId: string): Promise<{ hasCreds: boolean; savedNumber: string | null }> {
  try {
    const credsRow = await prisma.waAuthSession.findUnique({
      where: { tenant_id_key_id: { tenant_id: tenantId, key_id: 'creds' } },
      select: { value: true },
    });
    if (credsRow?.value) {
      const credsData = JSON.parse(credsRow.value);
      if (credsData?.me?.id) {
        const savedNumber = credsData.me.id.split(':')[0] || credsData.me.id.split('@')[0] || null;
        return { hasCreds: true, savedNumber };
      }
    }
  } catch (e) {}
  return { hasCreds: false, savedNumber: null };
}

// ─── Pool ────────────────────────────────────────────────────────────────────

const pool = new Map<string, WaConnectionState>();

// ─── Connect (per-tenant) ────────────────────────────────────────────────────

function isMasterInstance(): boolean {
  const serviceRole = String(process.env.SERVICE_ROLE || process.env.WORKER_ROLE || '').trim().toLowerCase();

  // Explicit Dedicated WA Worker process handles WA socket
  if (serviceRole === 'wa-worker' || serviceRole === 'wa_worker' || serviceRole === 'worker') return true;

  // Explicit HTTP API instances DO NOT handle WA socket directly (delegates via Redis RPC)
  if (serviceRole === 'api') return false;

  // Fallback for PM2 Cluster mode if SERVICE_ROLE is unconfigured
  const instanceId = process.env.NODE_APP_INSTANCE;
  if (instanceId !== undefined && instanceId !== '' && instanceId !== '0') {
    return false;
  }

  return true;
}

async function connectTenant(tenantId: string): Promise<void> {
  // In PM2 Cluster Mode, prevent non-primary instances from opening duplicate sockets (prevents Error 440)
  if (!isMasterInstance()) {
    console.log(`[WA-Pool:${tenantId}] [PM2 Instance ${process.env.NODE_APP_INSTANCE}] WA Socket connection delegated to Instance 0.`);
    return;
  }

  const { hasCreds, savedNumber } = await getTenantDbCredsInfo(tenantId);

  // Pastikan slot ada di pool dengan status awal 'connected' jika creds sudah ada di DB
  if (!pool.has(tenantId)) {
    pool.set(tenantId, {
      tenantId,
      status: hasCreds ? 'connected' : 'connecting',
      connectedNumber: savedNumber,
      qrBase64: null,
      retryCount: 0,
      sock: null,
      emitter: new EventEmitter(),
      authDir: '',
      lastMessageReceivedAt: null,
      lastMessageSentAt: null,
      decryptFailCount: 0,
      lastDecryptFailAt: null,
      lidToPhone: new Map(),
    });
  }

  const entry = pool.get(tenantId)!;

  // Jika belum ada creds, set status ke 'connecting' secara eksplisit
  if (!hasCreds) {
    entry.status = 'connecting';
  }

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

  // Dynamic import Baileys (ESM)
  const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
  } = await import('@whiskeysockets/baileys');

  const pino = (await import('pino')).default;
  const logger = pino({ level: 'silent' });

  const { usePrismaAuthState } = await import('./wa-prisma-auth.service');
  const { state, saveCreds } = await usePrismaAuthState(tenantId);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015970961] as any }));

  // Hardened state: if creds has authenticated user ID, set status to 'connected' immediately
  if (state.creds?.me?.id) {
    entry.status = 'connected';
    entry.connectedNumber = state.creds.me.id.split(':')[0] || null;
  } else {
    entry.status = 'connecting';
  }
  entry.qrBase64 = null;

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
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      console.log(`[WA-Pool:${tenantId}] Koneksi terputus (kode: ${statusCode}).`);
      
      // Bersihkan listener dari socket yang sudah ditutup
      try {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
      } catch (_) {}

      entry.emitter.emit('disconnected', statusCode);

      if (!isLoggedOut) {
        const { hasCreds: stillHasCreds } = await getTenantDbCredsInfo(tenantId);
        if (stillHasCreds) {
          entry.status = 'connected';
          if (sock.user?.id) {
            entry.connectedNumber = sock.user.id.split(':')[0];
          }
        } else {
          entry.status = 'connecting';
          entry.connectedNumber = null;
          await syncStatusToDB(tenantId, 'connecting', null);
        }

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
          const { hasCreds: authenticated } = await getTenantDbCredsInfo(tenantId);
          if (!authenticated) {
            entry.status = 'disconnected';
            await syncStatusToDB(tenantId, 'disconnected', null);
          }
        }
      } else {
        console.log(`[WA-Pool:${tenantId}] Sesi logout — hapus auth & scan ulang.`);
        entry.status = 'disconnected';
        entry.connectedNumber = null;
        await syncStatusToDB(tenantId, 'disconnected', null);
        await waGatewayServiceLocal.clearTenantAuth(tenantId);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Contacts LID → Phone Resolver ────────────────────────────────────────
  sock.ev.on('contacts.upsert', (contacts: any[]) => {
    for (const contact of contacts) {
      if (contact.id && contact.lid) {
        const lid   = contact.id.split('@')[0];
        const phone = contact.lid.split('@')[0];
        entry.lidToPhone.set(lid, phone);
        persistLidMapping(lid, phone);
        persistLidMapping(contact.id, phone);
      }
      if (contact.id && /^\d+$/.test(contact.id.split('@')[0])) {
        const raw = contact.id.split('@')[0];
        if (raw.startsWith('62') || raw.startsWith('0')) {
          entry.lidToPhone.set(raw, raw);
          persistLidMapping(raw, raw);
        }
      }
    }
  });

  sock.ev.on('contacts.update', (updates: any[]) => {
    for (const upd of updates) {
      if (upd.id && upd.lid) {
        const lid   = upd.id.split('@')[0];
        const phone = upd.lid.split('@')[0];
        entry.lidToPhone.set(lid, phone);
        persistLidMapping(lid, phone);
        persistLidMapping(upd.id, phone);
      }
    }
  });

  // ── Inbound Chatbot Event Listener ──
  sock.ev.on('messages.upsert', async (m: any) => {
    try {
      if (m.type !== 'notify') return;
      for (const msg of m.messages) {
        // Skip pesan dari diri sendiri
        if (msg.key.fromMe) continue;

        const fromJid = (msg.key.remoteJid || '').toLowerCase();

        // Skip Channel WA (@newsletter), Grup WA (@g.us), Broadcast (@broadcast)
        if (
          fromJid.endsWith('@g.us') ||
          fromJid.endsWith('@newsletter') ||
          fromJid.endsWith('@broadcast') ||
          fromJid.includes('newsletter') ||
          fromJid.includes('channel') ||
          fromJid === 'status@broadcast'
        ) continue;

        // Pesan gagal dekripsi (closed session) — Baileys tidak bisa baca isinya
        if (!msg.message) {
          // Jangan log per-pesan agar tidak spam, hanya catat satu kali per batch
          console.debug(`[WA-Chatbot:${tenantId}] Pesan gagal dekripsi dari ${fromJid} (closed session, akan otomatis pulih)`);
          // Track decrypt failure untuk health check
          if (entry) {
            entry.decryptFailCount = (entry.decryptFailCount || 0) + 1;
            entry.lastDecryptFailAt = new Date();
          }
          continue;
        }

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          '';

        const rawJidPart = fromJid.split('@')[0] || '';

        // Resolve LID → nomor HP asli.
        const senderPhone = entry.lidToPhone.get(rawJidPart) || rawJidPart;

        if (!senderPhone || !text.trim()) continue;

        // Track pesan berhasil diterima
        if (entry) {
          entry.lastMessageReceivedAt = new Date();
        }

        console.log(`[WA-Chatbot:${tenantId}] Pesan masuk dari ${senderPhone} (JID: ${rawJidPart}): "${text}"`);

        const replyText = await waChatbotResolverService.processIncomingMessage(senderPhone, text.trim());

        if (replyText) {
          await sock.sendMessage(fromJid, { text: replyText });
          // Track pesan berhasil dikirim
          if (entry) entry.lastMessageSentAt = new Date();
          console.log(`[WA-Chatbot:${tenantId}] Balasan terkirim ke ${senderPhone}`);
        }
      }
    } catch (err: any) {
      console.warn(`[WA-Pool:${tenantId}] Error processing inbound message:`, err.message);
    }
  });
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
      create: { tenant_id: tenantId, status, connected_number: number, auth_dir: '' },
    });
  } catch (e: any) {
    console.error(`[WA-Pool:${tenantId}] Gagal sync status ke DB:`, e.message);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// ─── Local WA Gateway Implementation ─────────────────────────────────────────

const waGatewayServiceLocal = {
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
    let entry = pool.get(tenantId);
    if (!entry || entry.status !== 'connected' || !entry.sock) {
      const { hasCreds } = await getTenantDbCredsInfo(tenantId);
      if (hasCreds && isMasterInstance()) {
        console.log(`[WA-Pool:${tenantId}] Auto-restoring WA socket connection from DB creds before sending message...`);
        try {
          await connectTenant(tenantId);
          for (let i = 0; i < 15; i++) {
            entry = pool.get(tenantId);
            if (entry && entry.status === 'connected' && entry.sock) break;
            await new Promise(r => setTimeout(r, 200));
          }
        } catch (err: any) {
          console.error(`[WA-Pool:${tenantId}] Auto-restore before send failed:`, err.message);
        }
      }
    }

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
      const isClosedOrTimeout = err.message === 'TIMEOUT_SEND' || String(err.message).toLowerCase().includes('closed') || String(err.message).toLowerCase().includes('disconnect');
      if (isClosedOrTimeout) {
        console.warn(`[WA-Pool:${tenantId}] Pengiriman WA terputus (${err.message}). Memulai reconnect otomatis dari DB creds...`);
        try {
          entry.sock?.end();
        } catch (_) {}
        entry.sock = null;
        entry.status = 'connecting';
        await syncStatusToDB(tenantId, 'connecting', null);
        
        try {
          await connectTenant(tenantId);
          for (let i = 0; i < 15; i++) {
            entry = pool.get(tenantId);
            if (entry && entry.status === 'connected' && entry.sock) break;
            await new Promise(r => setTimeout(r, 200));
          }

          if (entry && entry.status === 'connected' && entry.sock) {
            await entry.sock.sendMessage(jid, { text: pesan });
            console.log(`[WA-Pool:${tenantId}] Pesan terkirim ke ${nomor} setelah auto-reconnect!`);
            return true;
          }
        } catch (reconnectErr: any) {
          console.error(`[WA-Pool:${tenantId}] Auto-reconnect retry failed:`, reconnectErr.message);
        }

        throw new Error('Koneksi WhatsApp Gateway sedang memuat ulang (reconnecting). Silakan coba klik Kirim WA sekali lagi atau pastikan status WA Connected di menu Konfigurasi WA.');
      }
      throw err;
    }
  },

  /**
   * Kirim pesan WA langsung ke JID tertentu (bisa Nomor Individual atau WhatsApp Group JID e.g. 120363xxx@g.us).
   */
  async sendMessageToJid(tenantId: string, jidTarget: string, pesan: string): Promise<boolean> {
    let entry = pool.get(tenantId);
    if (!entry || entry.status !== 'connected' || !entry.sock) {
      const { hasCreds } = await getTenantDbCredsInfo(tenantId);
      if (hasCreds && isMasterInstance()) {
        console.log(`[WA-Pool:${tenantId}] Auto-restoring WA socket connection from DB creds before sending to JID...`);
        try {
          await connectTenant(tenantId);
          for (let i = 0; i < 15; i++) {
            entry = pool.get(tenantId);
            if (entry && entry.status === 'connected' && entry.sock) break;
            await new Promise(r => setTimeout(r, 200));
          }
        } catch (err: any) {
          console.error(`[WA-Pool:${tenantId}] Auto-restore before sendToJid failed:`, err.message);
        }
      }
    }

    if (!entry || entry.status !== 'connected' || !entry.sock) {
      throw new Error(`WA Gateway tenant ${tenantId} belum terhubung.`);
    }

    const sendPromise = entry.sock.sendMessage(jidTarget, { text: pesan });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_SEND')), 8000)
    );

    try {
      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[WA-Pool:${tenantId}] Pesan terkirim ke JID ${jidTarget}`);
      return true;
    } catch (err: any) {
      if (err.message === 'TIMEOUT_SEND') {
        console.warn(`[WA-Pool:${tenantId}] Pengiriman WA timeout ke JID ${jidTarget}`);
        throw new Error('Pengiriman pesan ke Grup WA timeout (8 detik). Pastikan koneksi WA aktif.');
      }
      throw err;
    }
  },

  async sendMessageSoft(tenantId: string, nomor: string | null | undefined, pesan: string, source?: string): Promise<void> {
    if (!nomor) return;
    try {
      const { waQueueService } = await import('./wa-queue.service');
      await waQueueService.enqueueSoft({ tenantId, nomor, pesan, source: source ?? 'soft-send' });
    } catch (e: any) {
      console.warn(`[WA-Pool:${tenantId}] Skip WA notif queue (${e.message})`);
    }
  },

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

  async getStatus(tenantId: string) {
    let entry = pool.get(tenantId);
    const { hasCreds, savedNumber } = await getTenantDbCredsInfo(tenantId);

    if (!entry && hasCreds && isMasterInstance()) {
      console.log(`[WA-Pool:${tenantId}] Restoring session from DB...`);
      connectTenant(tenantId).catch(err => console.error(`[WA-Pool:${tenantId}] Auto-restore error:`, err));
      entry = pool.get(tenantId);
    }

    if (!entry || !entry.sock) {
      return {
        status: hasCreds ? ('connecting' as const) : ('disconnected' as const),
        number: savedNumber,
        has_qr: false,
      };
    }

    return {
      status: entry.status,
      number: entry.connectedNumber ?? savedNumber,
      has_qr: !!(entry.qrBase64),
    };
  },

  async getHealthStatus(tenantId: string) {
    let entry = pool.get(tenantId);
    const { hasCreds, savedNumber } = await getTenantDbCredsInfo(tenantId);

    if (!entry && hasCreds && isMasterInstance()) {
      console.log(`[WA-Pool:${tenantId}] HealthCheck: Restoring session from Database...`);
      connectTenant(tenantId).catch(err => console.error(`[WA-Pool:${tenantId}] Auto-restore error:`, err));
      entry = pool.get(tenantId);
    }

    if (!entry && !hasCreds) {
      return {
        health: 'disconnected' as const,
        status: 'disconnected' as const,
        number: null,
        has_qr: false,
        decrypt_fail_count: 0,
        last_message_received_at: null,
        last_message_sent_at: null,
        warning: null,
      };
    }

    if (!entry || !entry.sock) {
      return {
        health: hasCreds ? ('connecting' as const) : ('disconnected' as const),
        status: hasCreds ? ('connecting' as const) : ('disconnected' as const),
        number: savedNumber,
        has_qr: false,
        decrypt_fail_count: entry?.decryptFailCount ?? 0,
        last_message_received_at: entry?.lastMessageReceivedAt ?? null,
        last_message_sent_at: entry?.lastMessageSentAt ?? null,
        warning: hasCreds ? 'Menghubungkan ulang sesi ke server WhatsApp...' : null,
      };
    }

    const currentStatus = entry.status;
    if (currentStatus !== 'connected') {
      return {
        health: currentStatus as any,
        status: currentStatus as any,
        number: entry.connectedNumber ?? savedNumber,
        has_qr: !!(entry.qrBase64),
        decrypt_fail_count: entry.decryptFailCount,
        last_message_received_at: entry.lastMessageReceivedAt,
        last_message_sent_at: entry.lastMessageSentAt,
        warning: null,
      };
    }

    const now = Date.now();
    const recentDecryptFail =
      entry.lastDecryptFailAt &&
      now - entry.lastDecryptFailAt.getTime() < 5 * 60 * 1000 &&
      entry.decryptFailCount > 10;

    if (recentDecryptFail) {
      return {
        health: 'degraded' as const,
        status: 'connected' as const,
        number: entry.connectedNumber ?? savedNumber,
        has_qr: false,
        decrypt_fail_count: entry.decryptFailCount,
        last_message_received_at: entry.lastMessageReceivedAt,
        last_message_sent_at: entry.lastMessageSentAt,
        warning: `Signal session rusak (${entry.decryptFailCount} kegagalan dekripsi). Pesan tidak dapat dibaca. Disarankan reconnect.`,
      };
    }

    return {
      health: 'connected' as const,
      status: 'connected' as const,
      number: entry.connectedNumber ?? savedNumber,
      has_qr: false,
      decrypt_fail_count: entry.decryptFailCount,
      last_message_received_at: entry.lastMessageReceivedAt,
      last_message_sent_at: entry.lastMessageSentAt,
      warning: null,
    };
  },

  async getQRBase64(tenantId: string): Promise<string | null> {
    const { hasCreds } = await getTenantDbCredsInfo(tenantId);
    if (hasCreds) {
      return null;
    }
    return pool.get(tenantId)?.qrBase64 ?? null;
  },

  async clearTenantAuth(tenantId: string): Promise<void> {
    try {
      const { usePrismaAuthState } = await import('./wa-prisma-auth.service');
      const authState = await usePrismaAuthState(tenantId);
      await authState.clearAuth();
    } catch (e: any) {
      console.error(`[WA-Pool:${tenantId}] Gagal clear database auth:`, e.message);
    }
  },

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
    await this.clearTenantAuth(tenantId);
    if (entry) {
      entry.status = 'disconnected';
      entry.qrBase64 = null;
      entry.connectedNumber = null;
    }
    await syncStatusToDB(tenantId, 'disconnected', null);
    pool.delete(tenantId);
  },

  async getParticipatingGroups(tenantId: string, forceRefresh = false) {
    const redis = getRedisConnection();
    const cacheKey = getGroupsCacheKey(tenantId);

    if (!forceRefresh && redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`[WA-Pool:${tenantId}] Groups: Serving from Redis cache.`);
          return JSON.parse(cached);
        }
      } catch (cacheErr: any) {
        console.warn(`[WA-Pool:${tenantId}] Redis cache read error:`, cacheErr.message);
      }
    }

    const entry = pool.get(tenantId);
    if (!entry || entry.status !== 'connected' || !entry.sock) {
      throw new Error(`WA Gateway tenant ${tenantId} belum terhubung.`);
    }

    try {
      console.log(`[WA-Pool:${tenantId}] Groups: Fetching live dari WA server...`);
      const fetchPromise = entry.sock.groupFetchAllParticipating();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_GROUP_FETCH')), 15_000)
      );

      const groups = await Promise.race([fetchPromise, timeoutPromise]);

      const groupList = Object.values(groups as Record<string, any>).map((g: any) => ({
        id: g.id,
        subject: g.subject || 'Tanpa Nama',
        creation: g.creation ? new Date(g.creation * 1000) : null,
        owner: g.owner || g.subjectOwner || null,
        participantsCount: g.participants?.length || 0,
        announce: !!g.announce,
        isCommunity: !!g.isCommunity,
      }));

      if (redis) {
        try {
          await redis.set(cacheKey, JSON.stringify(groupList), 'EX', WA_GROUPS_CACHE_TTL_SECONDS);
          console.log(`[WA-Pool:${tenantId}] Groups: ${groupList.length} grup di-cache ke Redis (TTL ${WA_GROUPS_CACHE_TTL_SECONDS}s).`);
        } catch (cacheErr: any) {
          console.warn(`[WA-Pool:${tenantId}] Redis cache write error:`, cacheErr.message);
        }
      }

      return groupList;
    } catch (err: any) {
      if (err.message === 'TIMEOUT_GROUP_FETCH') {
        console.error(`[WA-Pool:${tenantId}] groupFetchAllParticipating timeout (15s). Koneksi mungkin zombie.`);
        throw new Error('Pengambilan daftar grup WA timeout (15 detik). Pastikan koneksi WA stabil.');
      }
      console.error(`[WA-Pool:${tenantId}] Failed to fetch participating groups:`, err.message);
      throw err;
    }
  },

  async invalidateGroupsCache(tenantId: string): Promise<void> {
    const redis = getRedisConnection();
    if (!redis) return;
    try {
      await redis.del(getGroupsCacheKey(tenantId));
      console.log(`[WA-Pool:${tenantId}] Groups: Cache Redis dihapus.`);
    } catch (e: any) {
      console.warn(`[WA-Pool:${tenantId}] Gagal hapus cache groups:`, e.message);
    }
  },

  on(tenantId: string, event: string, listener: (...args: any[]) => void) {
    pool.get(tenantId)?.emitter.on(event, listener);
  },

  async restoreConnections(): Promise<void> {
    try {
      const connections = await prisma.waTenantConnection.findMany({
        where: { status: { in: ['connected', 'connecting'] } },
      });
      const restoredTenantIds = new Set<string>();

      for (const conn of connections) {
        restoredTenantIds.add(conn.tenant_id);
        appLogger.info({ tenant_id: conn.tenant_id }, 'wa_pool.restoring_connection');
        connectTenant(conn.tenant_id).catch((e: any) =>
          appLogger.error({ tenant_id: conn.tenant_id, error: e.message }, 'wa_pool.restore_error')
        );
      }

      const activeConfigs = await prisma.whatsappConfig.findMany({
        where: { provider_name: 'LOCAL', is_active: true },
      });

      for (const cfg of activeConfigs) {
        if (!restoredTenantIds.has(cfg.tenant_id)) {
          const { hasCreds } = await getTenantDbCredsInfo(cfg.tenant_id);
          if (hasCreds) {
            appLogger.info({ tenant_id: cfg.tenant_id }, 'wa_pool.restoring_session_from_db');
            connectTenant(cfg.tenant_id).catch((e: any) =>
              appLogger.error({ tenant_id: cfg.tenant_id, error: e.message }, 'wa_pool.restore_creds_error')
            );
          }
        }
      }
    } catch (e: any) {
      console.error('[WA-Pool] Gagal restore connections:', e.message);
    }
  },
  async shutdownAll(): Promise<void> {
    for (const entry of pool.values()) {
      try {
        if (entry.sock) {
          entry.sock.ev.removeAllListeners('connection.update');
          entry.sock.ev.removeAllListeners('messages.upsert');
          entry.sock.ws?.close();
          entry.sock.end?.(undefined);
        }
      } catch (_) {}
    }
    pool.clear();
    console.log('[WA-Pool] Cleanly closed all WhatsApp sockets on shutdown.');
  },
};

// ─── PM2 Cluster RPC Delegator ───────────────────────────────────────────────
let rpcPubClient: any = null;
let isRpcInitialized = false;

function initClusterRpc() {
  if (isRpcInitialized) return;
  isRpcInitialized = true;

  try {
    const redis = getRedisConnection();
    if (!redis) return;

    rpcPubClient = typeof redis.duplicate === 'function' ? redis.duplicate() : getRedisConnection();

    if (isMasterInstance()) {
      const reqSub = typeof redis.duplicate === 'function' ? redis.duplicate() : createRedisConnection();
      reqSub.subscribe('wa:cluster:rpc:req');
      reqSub.on('message', async (channel: string, message: string) => {
        if (channel !== 'wa:cluster:rpc:req') return;
        try {
          const { reqId, method, tenantId, args } = JSON.parse(message);
          let result: any = null;
          let error: string | null = null;
          try {
            result = await executeLocalMethod(method, tenantId, args);
          } catch (e: any) {
            error = e.message || 'Error WA Local';
          }
          await rpcPubClient.publish(`wa:cluster:rpc:res:${reqId}`, JSON.stringify({ reqId, result, error }));
        } catch (e: any) {
          console.error('[WA-RPC:Master] Gagal memproses request RPC:', e.message);
        }
      });
      console.log('[WA-RPC] Master Instance 0 siap menerima RPC dari PM2 cluster instances.');
    }
  } catch (e: any) {
    console.warn('[WA-RPC] Gagal inisialisasi Redis RPC:', e.message);
  }
}

async function executeLocalMethod(method: string, tenantId: string, args: any[] = []): Promise<any> {
  switch (method) {
    case 'initTenant':
      return waGatewayServiceLocal.initTenant(tenantId);
    case 'disconnectTenant':
      return waGatewayServiceLocal.disconnectTenant(tenantId);
    case 'sendMessage':
      return waGatewayServiceLocal.sendMessage(tenantId, args[0], args[1]);
    case 'sendMessageToJid':
      return waGatewayServiceLocal.sendMessageToJid(tenantId, args[0], args[1]);
    case 'getParticipatingGroups':
      return waGatewayServiceLocal.getParticipatingGroups(tenantId, args[0]);
    case 'getStatus':
      return waGatewayServiceLocal.getStatus(tenantId);
    case 'getHealthStatus':
      return waGatewayServiceLocal.getHealthStatus(tenantId);
    case 'getQRBase64':
      return waGatewayServiceLocal.getQRBase64(tenantId);
    case 'invalidateGroupsCache':
      return waGatewayServiceLocal.invalidateGroupsCache(tenantId);
    default:
      throw new Error(`Method RPC WA tidak dikenal: ${method}`);
  }
}

async function callMasterViaRpc(method: string, tenantId: string, args: any[] = []): Promise<any> {
  if (isMasterInstance()) {
    return executeLocalMethod(method, tenantId, args);
  }

  const redis = getRedisConnection();
  if (!redis) {
    return executeLocalMethod(method, tenantId, args);
  }

  initClusterRpc();

  const reqId = randomUUID();
  const resChannel = `wa:cluster:rpc:res:${reqId}`;

  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Koneksi WA ke Master Instance 0 timeout. Silakan coba lagi.'));
    }, 15000);

    try {
      const sub = typeof redis.duplicate === 'function' ? redis.duplicate() : createRedisConnection();
      await sub.subscribe(resChannel);
      
      sub.on('message', async (chan: string, msgStr: string) => {
        if (chan === resChannel) {
          clearTimeout(timer);
          try {
            await sub.unsubscribe(resChannel);
            await sub.quit();
          } catch (_) {}

          try {
            const { result, error } = JSON.parse(msgStr);
            if (error) reject(new Error(error));
            else resolve(result);
          } catch (e: any) {
            reject(e);
          }
        }
      });

      const payload = JSON.stringify({ reqId, method, tenantId, args });
      await rpcPubClient.publish('wa:cluster:rpc:req', payload);
    } catch (err: any) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

// ─── Public Delegated API ──────────────────────────────────────────────────────

export const waGatewayService = {
  async initTenant(tenantId: string): Promise<void> {
    return callMasterViaRpc('initTenant', tenantId);
  },
  async sendMessage(tenantId: string, nomor: string, pesan: string): Promise<boolean> {
    return callMasterViaRpc('sendMessage', tenantId, [nomor, pesan]);
  },
  async sendMessageToJid(tenantId: string, jidTarget: string, pesan: string): Promise<boolean> {
    return callMasterViaRpc('sendMessageToJid', tenantId, [jidTarget, pesan]);
  },
  async sendMessageSoft(tenantId: string, nomor: string | null | undefined, pesan: string, source?: string): Promise<void> {
    return waGatewayServiceLocal.sendMessageSoft(tenantId, nomor, pesan, source);
  },
  async hasWaSubscription(tenantId: string): Promise<boolean> {
    return waGatewayServiceLocal.hasWaSubscription(tenantId);
  },
  async getStatus(tenantId: string) {
    return callMasterViaRpc('getStatus', tenantId);
  },
  async getHealthStatus(tenantId: string) {
    return callMasterViaRpc('getHealthStatus', tenantId);
  },
  async getQRBase64(tenantId: string): Promise<string | null> {
    return callMasterViaRpc('getQRBase64', tenantId);
  },
  clearTenantAuth(tenantId: string) {
    return waGatewayServiceLocal.clearTenantAuth(tenantId);
  },
  async disconnectTenant(tenantId: string): Promise<void> {
    return callMasterViaRpc('disconnectTenant', tenantId);
  },
  async getParticipatingGroups(tenantId: string, forceRefresh = false) {
    if (!forceRefresh) {
      const redis = getRedisConnection();
      if (redis) {
        try {
          const cached = await redis.get(getGroupsCacheKey(tenantId));
          if (cached) {
            console.log(`[WA-Pool:${tenantId}] Groups: Serving from Redis cache (local process check).`);
            return JSON.parse(cached);
          }
        } catch (_) {}
      }
    }
    return callMasterViaRpc('getParticipatingGroups', tenantId, [forceRefresh]);
  },
  async invalidateGroupsCache(tenantId: string): Promise<void> {
    return callMasterViaRpc('invalidateGroupsCache', tenantId);
  },
  on(tenantId: string, event: string, listener: (...args: any[]) => void) {
    return waGatewayServiceLocal.on(tenantId, event, listener);
  },
  async restoreConnections(): Promise<void> {
    initClusterRpc();
    if (isMasterInstance()) {
      return waGatewayServiceLocal.restoreConnections();
    }
  },
  async shutdownAll(): Promise<void> {
    return waGatewayServiceLocal.shutdownAll();
  },
};
