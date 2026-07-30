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
import { randomUUID } from 'crypto';
import { prisma } from '../utils/prisma';
import { waChatbotResolverService, persistLidMapping } from '../modules/whatsapp/services/wa-chatbot-resolver.service';
import { getRedisConnection } from '../queue/redis';
import { createRedisConnection } from '../infra/redis/redisClient';

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

function isMasterInstance(): boolean {
  const instanceId = process.env.NODE_APP_INSTANCE;
  const serviceRole = String(process.env.SERVICE_ROLE || process.env.WORKER_ROLE || '').trim().toLowerCase();

  // If explicit SERVICE_ROLE=worker is specified, this process handles WA
  if (serviceRole === 'worker' || serviceRole === 'wa-worker' || serviceRole === 'wa_worker') return true;

  // In PM2 Cluster mode, only instance 0 handles active WA socket connection to prevent Error 440
  if (instanceId !== undefined && instanceId !== '' && instanceId !== '0') {
    return false;
  }

  return true;
}

async function connectTenant(tenantId: string): Promise<void> {
  const authDir = getTenantAuthDir(tenantId);
  ensureDir(authDir);

  // In PM2 Cluster Mode, prevent non-primary instances from opening duplicate sockets (prevents Error 440)
  if (!isMasterInstance()) {
    console.log(`[WA-Pool:${tenantId}] [PM2 Instance ${process.env.NODE_APP_INSTANCE}] WA Socket connection delegated to Instance 0.`);
    return;
  }

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
      authDir: getTenantAuthDir(tenantId),
      lastMessageReceivedAt: null,
      lastMessageSentAt: null,
      decryptFailCount: 0,
      lastDecryptFailAt: null,
      lidToPhone: new Map(),
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

  // Hardened state: if creds.json has authenticated user ID, set status to 'connected' immediately
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

  // ── Contacts LID → Phone Resolver ────────────────────────────────────────
  // WA versi 2024+ mengirim JID berupa LID (angka besar bukan nomor HP).
  // Event contacts.upsert membawa mapping id (LID) ↔ notify/verifiedName
  // dan field `lid` yang menyimpan nomor HP aslinya.
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
        // WA 2024+ mengirim LID (angka panjang non-628xx) sebagai JID.
        // Kita cari dari lidToPhone map yang diisi contacts.upsert.
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
      create: { tenant_id: tenantId, status, connected_number: number, auth_dir: getTenantAuthDir(tenantId) },
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
        try {
          entry.sock.ev.removeAllListeners('connection.update');
          entry.sock.ev.removeAllListeners('creds.update');
          entry.sock.end();
        } catch (_) {}
        entry.sock = null;
        entry.status = 'connecting';
        await syncStatusToDB(tenantId, 'connecting', null);
        
        setTimeout(() => connectTenant(tenantId), 2000);
        throw new Error('Koneksi WhatsApp tidak merespons (zombie socket). Sistem sedang menyambung ulang otomatis.');
      }
      throw err;
    }
  },

  /**
   * Kirim pesan WA langsung ke JID tertentu (bisa Nomor Individual atau WhatsApp Group JID e.g. 120363xxx@g.us).
   */
  async sendMessageToJid(tenantId: string, jidTarget: string, pesan: string): Promise<boolean> {
    const entry = pool.get(tenantId);
    if (!entry || entry.status !== 'connected' || !entry.sock) {
      throw new Error(`WA Gateway tenant ${tenantId} belum terhubung.`);
    }

    let finalJid = jidTarget.trim();
    if (!finalJid.includes('@')) {
      let formattedNumber = finalJid.replace(/[^0-9]/g, '');
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '62' + formattedNumber.substring(1);
      }
      finalJid = formattedNumber + '@s.whatsapp.net';
    }

    const sendPromise = entry.sock.sendMessage(finalJid, { text: pesan });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_SEND')), 8000)
    );

    try {
      await Promise.race([sendPromise, timeoutPromise]);
      console.log(`[WA-Pool:${tenantId}] Pesan terkirim ke JID ${finalJid}`);
      return true;
    } catch (err: any) {
      if (err.message === 'TIMEOUT_SEND') {
        console.warn(`[WA-Pool:${tenantId}] Pengiriman WA timeout ke JID ${finalJid}`);
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

  getStatus(tenantId: string) {
    let entry = pool.get(tenantId);
    const authDir = getTenantAuthDir(tenantId);
    const credsFile = path.join(authDir, 'creds.json');
    const hasCreds = fs.existsSync(credsFile);

    if (!entry && hasCreds && isMasterInstance()) {
      console.log(`[WA-Pool:${tenantId}] Restoring session from disk creds.json...`);
      connectTenant(tenantId).catch(err => console.error(`[WA-Pool:${tenantId}] Auto-restore error:`, err));
      entry = pool.get(tenantId);
    }

    const currentStatus = entry?.status ?? (hasCreds ? 'connected' : 'disconnected');

    return {
      status: currentStatus,
      number: entry?.connectedNumber ?? null,
      has_qr: !!(entry?.qrBase64),
    };
  },

  getHealthStatus(tenantId: string) {
    let entry = pool.get(tenantId);
    const authDir = getTenantAuthDir(tenantId);
    const credsFile = path.join(authDir, 'creds.json');
    const hasCreds = fs.existsSync(credsFile);

    if (!entry && hasCreds && isMasterInstance()) {
      console.log(`[WA-Pool:${tenantId}] HealthCheck: Restoring session from disk creds.json...`);
      connectTenant(tenantId).catch(err => console.error(`[WA-Pool:${tenantId}] Auto-restore error:`, err));
      entry = pool.get(tenantId);
    }

    if (!entry || (entry.status === 'disconnected' && !hasCreds)) {
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

    const effectiveStatus = (entry?.status === 'connected' || hasCreds) ? 'connected' : (entry?.status ?? 'connecting');

    if (effectiveStatus === 'connecting' && !hasCreds) {
      return {
        health: 'connecting' as const,
        status: 'connecting' as const,
        number: null,
        has_qr: !!(entry?.qrBase64),
        decrypt_fail_count: 0,
        last_message_received_at: null,
        last_message_sent_at: null,
        warning: null,
      };
    }

    const now = Date.now();

    if (!entry.sock) {
      return {
        health: 'ghost' as const,
        status: 'connected' as const,
        number: entry.connectedNumber,
        has_qr: false,
        decrypt_fail_count: entry.decryptFailCount,
        last_message_received_at: entry.lastMessageReceivedAt,
        last_message_sent_at: entry.lastMessageSentAt,
        warning: 'Socket objek null meskipun status connected. Reconnect diperlukan.',
      };
    }

    const recentDecryptFail =
      entry.lastDecryptFailAt &&
      now - entry.lastDecryptFailAt.getTime() < 5 * 60 * 1000 &&
      entry.decryptFailCount > 10;

    if (recentDecryptFail) {
      return {
        health: 'degraded' as const,
        status: 'connected' as const,
        number: entry.connectedNumber,
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
      number: entry.connectedNumber,
      has_qr: false,
      decrypt_fail_count: entry.decryptFailCount,
      last_message_received_at: entry.lastMessageReceivedAt,
      last_message_sent_at: entry.lastMessageSentAt,
      warning: null,
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
      for (const conn of connections) {
        console.log(`[WA-Pool] Restoring koneksi tenant: ${conn.tenant_id}`);
        connectTenant(conn.tenant_id).catch((e: any) =>
          console.error(`[WA-Pool] Gagal restore ${conn.tenant_id}:`, e.message)
        );
      }
    } catch (e: any) {
      console.error('[WA-Pool] Gagal restore connections:', e.message);
    }
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
};

function clearTenantAuth(tenantId: string) {
  const authDir = getTenantAuthDir(tenantId);
  if (fs.existsSync(authDir)) {
    fs.readdirSync(authDir).forEach((f) => {
      fs.unlinkSync(path.join(authDir, f));
    });
    console.log(`[WA-Pool:${tenantId}] Auth state dihapus.`);
  }
}
