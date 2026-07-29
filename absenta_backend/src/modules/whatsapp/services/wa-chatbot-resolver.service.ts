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

    const [guru, siswa, ortu] = await Promise.all([
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

    // ── Step 1: Resolve LID → nomor HP ──────────────────────────────────────
    let resolvedPhone = lidToPhoneGlobalMap.get(rawJid) ?? rawJid;

    // ── Step 2: Self-Identification Flow ────────────────────────────────────
    if (pendingIdentification.get(rawJid)) {
      const inputDigits = rawInput.replace(/\D/g, '');
      if (inputDigits.length >= 10 && (inputDigits.startsWith('0') || inputDigits.startsWith('62'))) {
        lidToPhoneGlobalMap.set(rawJid, inputDigits);
        pendingIdentification.delete(rawJid);
        resolvedPhone = inputDigits;
        console.log(`[Chatbot] LID resolved via self-ID: ${rawJid} → ${resolvedPhone}`);
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
      pendingIdentification.set(rawJid, true);
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

    // Hanya satu role → langsung routing, tidak perlu menu pilihan
    if (activeCount === 1) {
      // Reset sesi role jika ada
      activeRoleSession.delete(rawJid);
      if (guru)  return handleGuruCommand(rawInput, guru);
      if (siswa) return handleSiswaCommand(rawInput, siswa);
      if (ortu)  return handleOrtuCommand(rawInput, ortu);
    }

    // ── Step 6: Multi-Role — perlu pilih peran ──────────────────────────────
    // Cek apakah user sudah punya sesi peran aktif
    const currentSession = activeRoleSession.get(rawJid);

    // User mengetik perintah reset menu: "0" atau "MENU"
    if (upperInput === '0' || upperInput === 'MENU') {
      activeRoleSession.delete(rawJid);
    }

    // User memilih peran dari menu
    if (!currentSession || upperInput === '0' || upperInput === 'MENU') {
      // Cek apakah input adalah pilihan peran yang valid
      const chosenRole = roles.find(r => r.key === upperInput);
      if (chosenRole) {
        activeRoleSession.set(rawJid, chosenRole.key);
        // Langsung routing ke handler peran yang dipilih
        if (chosenRole.key === 'G' && guru)  return handleGuruCommand('', guru);
        if (chosenRole.key === 'S' && siswa) return handleSiswaCommand('', siswa);
        if (chosenRole.key === 'O' && ortu)  return handleOrtuCommand('', ortu);
      }

      // Tampilkan menu pemilihan peran
      const nama = guru?.nama_guru ?? siswa?.nama_siswa ?? ortu?.nama ?? 'Pengguna';
      return formatMultiRoleMenu(nama, roles);
    }

    // User sudah memilih peran sebelumnya → routing ke handler peran aktif
    // "0" = kembali ke menu utama (sudah di-handle di atas)
    if (currentSession === 'G' && guru)  return handleGuruCommand(rawInput, guru);
    if (currentSession === 'S' && siswa) return handleSiswaCommand(rawInput, siswa);
    if (currentSession === 'O' && ortu)  return handleOrtuCommand(rawInput, ortu);

    // Fallback: tampilkan menu lagi
    activeRoleSession.delete(rawJid);
    const nama = guru?.nama_guru ?? siswa?.nama_siswa ?? ortu?.nama ?? 'Pengguna';
    return formatMultiRoleMenu(nama, roles);
  }
}

export const waChatbotResolverService = new WaChatbotResolverService();
