import { prisma } from '@/utils/prisma';
import {
  formatMultiRoleMenu,
  formatGuestMessage,
  handleGuruCommand,
  handleSiswaCommand,
  handleOrtuCommand,
} from './wa-chatbot-commands';

/**
 * Peta persistent LID → nomor HP asli (in-memory, direset saat restart).
 * Diisi dari dua sumber:
 *  1. contacts.upsert event di wa-gateway.service.ts (otomatis)
 *  2. Self-identification flow (user ketik nomor HP saat LID tidak dikenal)
 */
export const lidToPhoneGlobalMap = new Map<string, string>();

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
    const upperInput = rawInput.toUpperCase();

    // ── Step 1: Normalize JID (handle LID variations like 12345:0@lid vs 12345@lid)
    const fullJid = rawJid.trim();
    const cleanJid = fullJid.split('@')[0].split(':')[0];

    let resolvedPhone = lidToPhoneGlobalMap.get(cleanJid) ?? lidToPhoneGlobalMap.get(fullJid) ?? fullJid;
    let isSelfIdJustCompleted = false;

    // ── Step 2: Self-Identification Flow ────────────────────────────────────
    if (pendingIdentification.get(cleanJid) || pendingIdentification.get(fullJid)) {
      const inputDigits = rawInput.replace(/\D/g, '');
      if (inputDigits.length >= 10 && (inputDigits.startsWith('0') || inputDigits.startsWith('62'))) {
        lidToPhoneGlobalMap.set(cleanJid, inputDigits);
        lidToPhoneGlobalMap.set(fullJid, inputDigits);
        pendingIdentification.delete(cleanJid);
        pendingIdentification.delete(fullJid);
        resolvedPhone = inputDigits;
        isSelfIdJustCompleted = true;
        console.log(`[Chatbot] LID resolved via self-ID: ${fullJid} (${cleanJid}) → ${resolvedPhone}`);
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

    // Tidak ditemukan di DB sama sekali
    if (activeCount === 0) {
      return formatGuestMessage(resolvedPhone);
    }

    // Jika self-identification baru saja selesai, gunakan command kosong agar langsung menampilkan menu tanpa "Perintah tidak dikenali"
    const effectiveCommand = isSelfIdJustCompleted ? '' : rawInput;
    const effectiveUpper = effectiveCommand.toUpperCase();

    // Hanya satu role → langsung routing, tidak perlu menu pilihan
    if (activeCount === 1) {
      // Reset sesi role jika ada
      activeRoleSession.delete(cleanJid);
      activeRoleSession.delete(fullJid);
      if (guru)  return handleGuruCommand(effectiveCommand, guru);
      if (siswa) return handleSiswaCommand(effectiveCommand, siswa);
      if (ortu)  return handleOrtuCommand(effectiveCommand, ortu);
    }

    // ── Step 6: Multi-Role — perlu pilih peran ──────────────────────────────
    const currentSession = activeRoleSession.get(cleanJid) ?? activeRoleSession.get(fullJid);

    // User mengetik perintah reset menu: "0" atau "MENU"
    if (effectiveUpper === '0' || effectiveUpper === 'MENU' || isSelfIdJustCompleted) {
      activeRoleSession.delete(cleanJid);
      activeRoleSession.delete(fullJid);
    }

    // User memilih peran dari menu
    if (!currentSession || effectiveUpper === '0' || effectiveUpper === 'MENU' || isSelfIdJustCompleted) {
      const chosenRole = roles.find(r => r.key === effectiveUpper);
      if (chosenRole && !isSelfIdJustCompleted) {
        activeRoleSession.set(cleanJid, chosenRole.key);
        activeRoleSession.set(fullJid, chosenRole.key);
        if (chosenRole.key === 'G' && guru)  return handleGuruCommand('', guru);
        if (chosenRole.key === 'S' && siswa) return handleSiswaCommand('', siswa);
        if (chosenRole.key === 'O' && ortu)  return handleOrtuCommand('', ortu);
      }

      // Tampilkan menu pemilihan peran
      const nama = guru?.nama_guru ?? siswa?.nama_siswa ?? ortu?.nama ?? 'Pengguna';
      return formatMultiRoleMenu(nama, roles);
    }

    // User sudah memilih peran sebelumnya → routing ke handler peran aktif
    if (currentSession === 'G' && guru)  return handleGuruCommand(effectiveCommand, guru);
    if (currentSession === 'S' && siswa) return handleSiswaCommand(effectiveCommand, siswa);
    if (currentSession === 'O' && ortu)  return handleOrtuCommand(effectiveCommand, ortu);

    // Fallback: tampilkan menu lagi
    activeRoleSession.delete(cleanJid);
    activeRoleSession.delete(fullJid);
    const nama = guru?.nama_guru ?? siswa?.nama_siswa ?? ortu?.nama ?? 'Pengguna';
    return formatMultiRoleMenu(nama, roles);
  }
}

export const waChatbotResolverService = new WaChatbotResolverService();
