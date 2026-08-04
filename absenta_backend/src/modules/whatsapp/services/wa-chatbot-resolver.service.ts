import { prisma } from '@/utils/prisma';
import { getRedisConnection } from '../../../queue/redis';
import { formatMultiRoleMenu } from './wa-chatbot-commands';
import { ChatbotRouter } from '../chatbot/core/chatbot-router';
import { ChatbotContext } from '../chatbot/core/chatbot-context';
import { WaChatLogService } from './wa-chat-log.service';

/**
 * Peta persistent LID → nomor HP asli (terisolasi aman di Database PostgreSQL + Redis Store).
 * Diisi dari dua sumber:
 *  1. contacts.upsert event di wa-gateway.service.ts (otomatis)
 *  2. Self-identification flow (user ketik nomor HP saat LID tidak dikenal)
 */
export const lidToPhoneGlobalMap = new Map<string, string>();

export async function persistLidMapping(key: string, value: string, tenantId?: string) {
  try {
    lidToPhoneGlobalMap.set(key, value);

    const redis = getRedisConnection();
    if (redis) {
      try {
        await redis.hset('wa:lid:mappings', key, value);
      } catch (_) {}
    }

    if (tenantId) {
      await prisma.waLidMapping.upsert({
        where: { tenant_id_lid_key: { tenant_id: tenantId, lid_key: key } },
        create: { tenant_id: tenantId, lid_key: key, phone: value },
        update: { phone: value },
      });
    } else {
      const existing = await prisma.waLidMapping.findFirst({ where: { lid_key: key } });
      if (existing) {
        await prisma.waLidMapping.update({ where: { id: existing.id }, data: { phone: value } });
      } else {
        await prisma.waLidMapping.create({ data: { lid_key: key, phone: value } });
      }
    }
  } catch (err: any) {
    console.warn('[Chatbot] Failed to persist LID mapping to Database:', err.message);
  }
}

export async function removeLidMappingByPhone(phone: string) {
  try {
    const rawDigits = phone.replace(/\D/g, '');
    if (!rawDigits) return;

    for (const [key, value] of lidToPhoneGlobalMap.entries()) {
      if (value.includes(rawDigits) || rawDigits.includes(value)) {
        lidToPhoneGlobalMap.delete(key);
      }
    }

    const redis = getRedisConnection();
    if (redis) {
      try {
        const keys = await redis.hkeys('wa:lid:mappings');
        for (const k of keys) {
          const val = await redis.hget('wa:lid:mappings', k);
          if (val && (val.includes(rawDigits) || rawDigits.includes(val))) {
            await redis.hdel('wa:lid:mappings', k);
          }
        }
      } catch (_) {}
    }

    await prisma.waLidMapping.deleteMany({
      where: { phone: { contains: rawDigits } },
    });
  } catch (err: any) {
    console.warn('[Chatbot] Failed to remove LID mapping from Database:', err.message);
  }
}

// Load persisted LID mappings from Database on module start
(async function loadLidMappingsFromDb() {
  try {
    const rows = await prisma.waLidMapping.findMany({ select: { lid_key: true, phone: true } });
    let count = 0;
    for (const r of rows) {
      lidToPhoneGlobalMap.set(r.lid_key, r.phone);
      count++;
    }
    console.log(`[Chatbot] Restored ${count} LID mappings from Database.`);
  } catch (err: any) {
    console.warn('[Chatbot] Failed to load LID mappings from Database:', err.message);
  }
})();

/**
 * State per-JID untuk user yang sedang memilih peran.
 * Key = rawJid, Value = peran yang sedang aktif ('G' | 'S' | 'O' | null)
 * null = belum memilih peran (tampilkan menu lagi)
 */
const activeRoleSession = new Map<string, 'G' | 'S' | 'O' | null>();

/**
 * State untuk self-identification: JID sedang menunggu input nomor HP.
 */
const pendingIdentification = new Map<string, boolean>();

/**
 * State untuk pending edit field guru per-JID ('EDIT_NIP' | 'EDIT_EMAIL')
 */
export const pendingGuruEditSession = new Map<string, 'EDIT_NIP' | 'EDIT_EMAIL'>();

export class WaChatbotResolverService {
  /**
   * Normalisasi nomor HP ke berbagai format string pencarian DB.
   *   "08xxx"   → ["628xxx", "08xxx", "+628xxx"]
   *   "628xxx"  → ["628xxx", "08xxx", "+628xxx"]
   *   "+628xxx" → ["628xxx", "08xxx", "+628xxx"]
   */
  private normalizePhoneVariations(phone: string): string[] {
    if (!phone) return [];
    const rawInput = phone.trim();
    const rawDigits = phone.replace(/\D/g, '');

    let digits62 = rawDigits;
    if (rawDigits.startsWith('0')) {
      digits62 = '62' + rawDigits.substring(1);
    } else if (rawDigits.startsWith('62')) {
      digits62 = rawDigits;
    } else {
      return Array.from(new Set([rawInput, rawDigits, '+' + rawDigits]));
    }

    const local08 = '0' + digits62.substring(2);
    const plus62 = '+' + digits62;

    return Array.from(new Set([
      rawInput,
      rawDigits,
      digits62,
      local08,
      plus62
    ]));
  }

  /** Cek apakah nomor terlihat seperti WA LID (bukan nomor HP Indonesia) */
  private isLikelyLid(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return !digits.startsWith('0') && !digits.startsWith('62') && digits.length >= 10;
  }

  /** Cari semua persona di DB secara paralel */
  private async findPersona(phone: string) {
    const variations = this.normalizePhoneVariations(phone);
    if (variations.length === 0) return { guru: null, siswa: null, ortu: null };

    let [guru, siswa, ortu] = await Promise.all([
      prisma.guru.findFirst({
        where: { OR: [{ no_hp: { in: variations } }, { User: { no_hp: { in: variations } } }] },
        include: { User: true },
      }),
      prisma.siswa.findFirst({
        where: { OR: [{ no_hp: { in: variations } }, { User: { no_hp: { in: variations } } }] },
        include: { Kelas: true, Jurusan: true, User: true },
      }),
      prisma.orangTua.findFirst({
        where: { no_hp: { in: variations } },
      }),
    ]);

    // Fallback: Smart digit-matching if direct variations match returned nothing
    // Handles human-entered DB entries with spaces or hyphens like "+62 877-7993-7341"
    const targetDigits = phone.replace(/\D/g, '');
    const cleanDigits = targetDigits.startsWith('62')
      ? targetDigits.slice(2)
      : targetDigits.startsWith('0')
        ? targetDigits.slice(1)
        : targetDigits;

    if (cleanDigits.length >= 6) {
      // Use the last 5 digits for SQL filtering to reliably match formatted numbers with spaces/hyphens
      const searchSuffix = cleanDigits.slice(-5);

      if (!guru) {
        const candidates = await prisma.guru.findMany({
          where: {
            OR: [
              { no_hp: { contains: searchSuffix } },
              { User: { no_hp: { contains: searchSuffix } } }
            ]
          },
          include: { User: true }
        });
        guru = candidates.find(g => {
          const p1 = (g.no_hp || '').replace(/\D/g, '');
          const p2 = (g.User?.no_hp || '').replace(/\D/g, '');
          return p1.endsWith(cleanDigits) || p2.endsWith(cleanDigits);
        }) || null;
      }

      if (!siswa) {
        const candidates = await prisma.siswa.findMany({
          where: {
            OR: [
              { no_hp: { contains: searchSuffix } },
              { User: { no_hp: { contains: searchSuffix } } }
            ]
          },
          include: { Kelas: true, Jurusan: true, User: true }
        });
        siswa = candidates.find(s => {
          const p1 = (s.no_hp || '').replace(/\D/g, '');
          const p2 = (s.User?.no_hp || '').replace(/\D/g, '');
          return p1.endsWith(cleanDigits) || p2.endsWith(cleanDigits);
        }) || null;
      }

      if (!ortu) {
        const candidates = await prisma.orangTua.findMany({
          where: { no_hp: { contains: searchSuffix } },
        });
        ortu = candidates.find(o => {
          const p1 = (o.no_hp || '').replace(/\D/g, '');
          return p1.endsWith(cleanDigits);
        }) || null;
      }
    }

    return { guru, siswa, ortu };
  }

  /**
   * Bangun daftar role yang aktif dan menu pilihan yang sesuai.
   * Mengembalikan null jika hanya satu role (tidak perlu menu pilihan).
   */
  private buildRoleList(guru: any, siswa: any, ortu: any) {
    const roles: { key: 'G' | 'S' | 'O'; label: string }[] = [];
    if (guru)  roles.push({ key: 'G', label: 'GURU 👨‍🏫' });
    if (siswa) roles.push({ key: 'S', label: 'SISWA 👦' });
    if (ortu)  roles.push({ key: 'O', label: 'ORANG TUA 👨‍👩‍👧' });
    return roles;
  }

  /**
   * Mengolah pesan WA masuk dan menghasilkan balasan teks sesuai Persona.
   * @param rawJid      - JID asli dari Baileys (bisa LID atau nomor HP langsung)
   * @param messageText - teks pesan dari user
   */
  async processIncomingMessage(rawJid: string, messageText: string): Promise<string> {
    const rawInput = String(messageText || '').trim();
    const fullJid = rawJid.trim();

    // ── Step 0: Ignore Channel/Newsletter, Group, & Broadcast Messages ────────
    const jidLower = fullJid.toLowerCase();
    if (
      jidLower.includes('@newsletter') ||
      jidLower.includes('@g.us') ||
      jidLower.includes('@broadcast') ||
      jidLower.includes('newsletter') ||
      jidLower.includes('channel')
    ) {
      console.log(`[Chatbot] Ignored non-DM message from Channel/Group/Broadcast JID: ${fullJid}`);
      return '';
    }

    // ── Step 1: Normalize JID (handle LID variations like 12345:0@lid vs 12345@lid)
    const cleanJid = fullJid.split('@')[0].split(':')[0];

    let resolvedPhone = lidToPhoneGlobalMap.get(cleanJid) ?? lidToPhoneGlobalMap.get(fullJid) ?? fullJid;
    let isSelfIdJustCompleted = false;

    // ── Step 1.5: Command RESET / VERIFIKASI / UBAH NOMOR ───────────────────
    const checkUpper = rawInput.toUpperCase();
    if (
      checkUpper === 'RESET' ||
      checkUpper === 'VERIFIKASI' ||
      checkUpper === 'UBAH NOMOR' ||
      checkUpper === 'RELOG' ||
      checkUpper === 'RESET NOMOR'
    ) {
      lidToPhoneGlobalMap.delete(cleanJid);
      lidToPhoneGlobalMap.delete(fullJid);
      activeRoleSession.delete(cleanJid);
      activeRoleSession.delete(fullJid);
      pendingGuruEditSession.delete(cleanJid);
      pendingGuruEditSession.delete(fullJid);
      pendingIdentification.set(cleanJid, true);
      pendingIdentification.set(fullJid, true);

      try {
        await prisma.waLidMapping.deleteMany({
          where: { lid_key: { in: [cleanJid, fullJid] } },
        });
        const redis = getRedisConnection();
        if (redis) {
          try {
            await redis.hdel('wa:lid:mappings', cleanJid, fullJid);
          } catch (_) {}
        }
      } catch (_) {}

      return (
        `🔄 *Verifikasi Ulang Identitas WA*\n\n` +
        `Tautan nomor WhatsApp Anda dengan akun sekolah telah di-reset.\n\n` +
        `Silakan ketik **nomor HP baru** Anda yang terdaftar di sistem sekolah:\n` +
        `_(contoh: 0812xxxxxxxx)_`
      );
    }

    // ── Step 2: Self-Identification Flow ────────────────────────────────────
    if (pendingIdentification.get(cleanJid) || pendingIdentification.get(fullJid)) {
      const inputDigits = rawInput.replace(/\D/g, '');
      if (inputDigits.length >= 10 && (inputDigits.startsWith('0') || inputDigits.startsWith('62'))) {
        persistLidMapping(cleanJid, inputDigits);
        persistLidMapping(fullJid, inputDigits);
        pendingIdentification.delete(cleanJid);
        pendingIdentification.delete(fullJid);
        resolvedPhone = inputDigits;
        isSelfIdJustCompleted = true;
        console.log(`[Chatbot] LID resolved via self-ID (persisted to disk): ${fullJid} (${cleanJid}) → ${resolvedPhone}`);
      } else {
        return (
          `⚠️ Format nomor tidak valid.\n\n` +
          `Ketik nomor HP Anda yang terdaftar di sekolah:\n` +
          `• *0812xxxxxxxx*\n• *628xxxxxxxxxx*`
        );
      }
    }

    // ── Step 3: Cari semua persona di DB ────────────────────────────────────
    const { guru, siswa, ortu } = await this.findPersona(resolvedPhone);

    // ── Step 4: Jika LID belum resolve dan tidak ditemukan → minta self-ID ──
    if (this.isLikelyLid(resolvedPhone) && !guru && !siswa && !ortu) {
      pendingIdentification.set(cleanJid, true);
      pendingIdentification.set(fullJid, true);
      return (
        `👋 Halo! Selamat datang di *Sistem Absenta*.\n\n` +
        `Untuk melanjutkan, sistem perlu memverifikasi identitas Anda.\n\n` +
        `Ketik *nomor HP* Anda yang terdaftar di sekolah:\n` +
        `_(contoh: 0812xxxxxxxx)_`
      );
    }

    // ── Step 5: Hitung berapa role yang aktif ────────────────────────────────
    const roles = this.buildRoleList(guru, siswa, ortu);
    const activeCount = roles.length;

    const effectiveCommand = isSelfIdJustCompleted ? '' : rawInput;
    const effectiveUpper = effectiveCommand.toUpperCase();

    // ── Step 6: Multi-Role Session Manager ──────────────────────────────────
    let activeRole: 'G' | 'S' | 'O' | null = null;

    if (activeCount === 1) {
      activeRoleSession.delete(cleanJid);
      activeRoleSession.delete(fullJid);
      if (guru) activeRole = 'G';
      else if (siswa) activeRole = 'S';
      else if (ortu) activeRole = 'O';
    } else if (activeCount > 1) {
      if (effectiveUpper === '0' || effectiveUpper === 'MENU' || effectiveUpper === 'BATAL' || isSelfIdJustCompleted) {
        activeRoleSession.delete(cleanJid);
        activeRoleSession.delete(fullJid);
        pendingGuruEditSession.delete(cleanJid);
        pendingGuruEditSession.delete(fullJid);
      }

      const currentSession = activeRoleSession.get(cleanJid) ?? activeRoleSession.get(fullJid);

      if (!currentSession || effectiveUpper === '0' || effectiveUpper === 'MENU' || effectiveUpper === 'BATAL' || isSelfIdJustCompleted) {
        const chosenRole = roles.find(r => r.key === effectiveUpper);
        if (chosenRole && !isSelfIdJustCompleted) {
          activeRoleSession.set(cleanJid, chosenRole.key);
          activeRoleSession.set(fullJid, chosenRole.key);
          activeRole = chosenRole.key;
        } else {
          const nama = guru?.nama_guru ?? siswa?.nama_siswa ?? ortu?.nama ?? 'Pengguna';
          return formatMultiRoleMenu(nama, roles);
        }
      } else {
        activeRole = currentSession;
      }
    }

    // ── Step 7: Construct Context & Dispatch via ChatbotRouter ──────────────
    const tenantId = guru?.tenant_id ?? siswa?.tenant_id ?? ortu?.tenant_id ?? null;
    const namaUser = guru?.nama_guru ?? siswa?.nama_siswa ?? ortu?.nama ?? null;

    // ── Log pesan masuk (IN) ─────────────────────────────────────────────────
    if (effectiveCommand) {
      void WaChatLogService.logIn({
        tenantId,
        jid: fullJid,
        phone: resolvedPhone,
        nama: namaUser,
        role: activeRole,
        message: effectiveCommand,
      });
    }

    const ctx: ChatbotContext = {
      rawJid,
      cleanJid,
      fullJid,
      resolvedPhone,
      messageText: effectiveCommand,
      commandUpper: effectiveUpper,
      guru,
      siswa,
      ortu,
      roles,
      activeCount,
      activeRole,
      tenantId,
    };

    const reply = await ChatbotRouter.route(ctx);

    // ── Log pesan keluar (OUT) ───────────────────────────────────────────────
    void WaChatLogService.logOut({
      tenantId,
      jid: fullJid,
      phone: resolvedPhone,
      nama: namaUser,
      role: activeRole,
      message: reply,
    });

    return reply;
  }
}

export const waChatbotResolverService = new WaChatbotResolverService();
