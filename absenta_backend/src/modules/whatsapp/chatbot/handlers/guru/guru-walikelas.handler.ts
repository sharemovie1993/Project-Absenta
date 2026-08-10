import bcrypt from 'bcryptjs';
import { ChatbotContext } from '../../core/chatbot-context';
import { waliKelasService } from '@/modules/kurikulum/wali-kelas/services/wali-kelas.service';
import { prisma } from '@/utils/prisma';
import { getTenantTimezone, getTenantOffsetString } from '@/utils/timezone.utils';
import { chatbotSessionManager, ChatbotDialogSession } from '../../core/session-state-manager';

export class GuruWalikelasHandler {
  /**
   * Helper: Get Homeroom Class (Kelas Binaan) for current teacher
   */
  private static async getKelasBinaan(guruId: string, userId?: string | null, tenantId?: string) {
    if (!tenantId) return null;

    try {
      const assignment = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          is_active: true,
          kelas_id: { not: null },
          Position: { OR: [{ code: 'WALIKELAS' }, { name: { contains: 'Wali', mode: 'insensitive' } }] },
          OR: [
            ...(userId ? [{ user_id: userId }] : []),
            { User: { Guru: { id: guruId } } },
          ],
        },
        include: {
          Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
        },
      });

      if (assignment?.Kelas) {
        return assignment.Kelas;
      }
    } catch {
      // Fallback query if OrganizationalAssignment query fails
    }

    return null;
  }

  /**
   * Helper: Resolve target class from search text or default homeroom class
   */
  private static async resolveTargetKelas(ctx: ChatbotContext, kelasBinaan: any) {
    if (kelasBinaan) return kelasBinaan;

    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return null;

    const rawText = (ctx.messageText || '').trim();
    const cleanSearch = rawText.replace(/^(31|32|33|34|35|36|37|38|3|walikelas|wali\s*kelas)\s*/i, '').trim();

    if (cleanSearch && cleanSearch.length >= 2) {
      const foundKelas = await prisma.kelas.findFirst({
        where: {
          tenant_id: tenantId,
          nama_kelas: { contains: cleanSearch, mode: 'insensitive' },
        },
        select: { id: true, nama_kelas: true, tingkat: true },
      });
      if (foundKelas) return foundKelas;
    }

    return null;
  }

  /**
   * MENU 3: Wali Kelas Portal
   */
  static async handleDaftarWaliKelas(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const cmd = ctx.commandUpper.trim();

    // 1. Opsi [35] -> Daftar Wali Kelas Seluruh Sekolah
    if (cmd === '35') {
      return this.handleDaftarSemuaWaliKelas(ctx);
    }

    // 2. Cek apakah guru terdaftar sebagai Wali Kelas di DB
    const kelasBinaan = await this.getKelasBinaan(guru.id, guru.user_id, guru.tenant_id);

    // 3. Resolve target kelas (kelas binaan atau dari pencarian teks)
    const targetKelas = await this.resolveTargetKelas(ctx, kelasBinaan);

    // 4. Sub-menu routing [31] .. [38]
    if (cmd.startsWith('31') || cmd === '31') {
      if (!targetKelas) return this.promptInputKelas('31');
      return this.handlePresensiSiswaKelas(ctx, targetKelas.id, targetKelas.nama_kelas);
    }

    if (cmd.startsWith('32') || cmd === '32') {
      if (!targetKelas) return this.promptInputKelas('32');
      return this.handleIzinSiswaKelas(ctx, targetKelas.id, targetKelas.nama_kelas);
    }

    if (cmd.startsWith('33') || cmd === '33') {
      if (!targetKelas) return this.promptInputKelas('33');
      return this.handleKontakOrtuKelas(ctx, targetKelas.id, targetKelas.nama_kelas);
    }

    if (cmd.startsWith('34') || cmd === '34') {
      if (!targetKelas) return this.promptInputKelas('34');
      return this.handlePoinPelanggaranKelas(ctx, targetKelas.id, targetKelas.nama_kelas);
    }

    if (cmd.startsWith('36') || cmd === '36') {
      return this.handleUpdateHpSiswaPrompt(ctx, targetKelas);
    }

    if (cmd.startsWith('37') || cmd === '37') {
      return this.handleUpdateHpOrtuPrompt(ctx, targetKelas);
    }

    if (cmd.startsWith('38') || cmd === '38') {
      return this.handleResetPasswordSiswaPrompt(ctx, targetKelas);
    }

    // 5. Tampilan Utama Menu [3] Wali Kelas (Jika Guru Memiliki Kelas Binaan)
    if (kelasBinaan) {
      const tz = await getTenantTimezone(guru.tenant_id);
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Jakarta' });
      const tglFormatted = new Date().toLocaleDateString('id-ID', {
        timeZone: tz || 'Asia/Jakarta',
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const offsetStr = getTenantOffsetString(tz);
      const startOfDay = new Date(`${todayStr}T00:00:00.000${offsetStr}`);
      const endOfDay = new Date(`${todayStr}T23:59:59.999${offsetStr}`);

      const siswaList = await prisma.siswa.findMany({
        where: {
          tenant_id: guru.tenant_id,
          kelas_id: kelasBinaan.id,
          status: 'AKTIF',
        },
        select: { id: true, nama_siswa: true },
      });

      const totalSiswa = siswaList.length;
      const siswaIds = siswaList.map(s => s.id);

      const gerbangToday = await prisma.absenGerbangSiswa.findMany({
        where: {
          tenant_id: guru.tenant_id,
          siswa_id: { in: siswaIds },
          created_at: { gte: startOfDay, lte: endOfDay },
        },
      });

      const hadirCount = new Set(gerbangToday.map(g => g.siswa_id)).size;
      const lateCount = gerbangToday.filter(g => g.is_terlambat || String(g.status || '').toUpperCase() === 'TERLAMBAT').length;
      const belumCount = Math.max(0, totalSiswa - hadirCount);

      let msg = `🏫 *Portal Wali Kelas — ${kelasBinaan.nama_kelas}*\n`;
      msg += `Wali Kelas: *${guru.nama_guru}*\n`;
      msg += `📅 ${tglFormatted}\n\n`;

      msg += `📊 *RINGKASAN KELAS BINAAN HARI INI:*\n`;
      msg += `• Total Siswa      : ${totalSiswa} Siswa\n`;
      msg += `• 🟢 Hadir Gate    : ${hadirCount} Siswa\n`;
      if (lateCount > 0) msg += `• ⚠️ Terlambat     : ${lateCount} Siswa\n`;
      msg += `• 🔴 Belum Tap / Absen: ${belumCount} Siswa\n\n`;

      msg += `Pilih fitur Wali Kelas:\n`;
      msg += `[31] 📋 Presensi Siswa Kelas (Rincian)\n`;
      msg += `[32] 🟨 Siswa Izin / Sakit / Keluar Hari Ini\n`;
      msg += `[33] 📞 Kontak Orang Tua Siswa\n`;
      msg += `[34] 🏆 Catatan Poin Pelanggaran Kelas\n`;
      msg += `[35] 🏫 Daftar Wali Kelas Seluruh Sekolah\n`;
      msg += `[36] 📱 Update No HP Siswa\n`;
      msg += `[37] 👨‍👩‍👧 Update No HP Ortu\n`;
      msg += `[38] 🔑 Reset Password Siswa\n\n`;
      msg += `[0]  🔄 Menu Utama`;

      return msg;
    }

    // 6. Tampilan Utama Menu [3] Wali Kelas (Jika Guru Umum / Belum Terdaftar Kelas Binaan)
    return (
      `🏫 *Portal & Informasi Wali Kelas*\n` +
      `Guru: *${guru.nama_guru}*\n\n` +
      `Pilih fitur Wali Kelas:\n\n` +
      `[31] 📋 Presensi Siswa Kelas (Rincian)\n` +
      `[32] 🟨 Siswa Izin / Sakit / Keluar Hari Ini\n` +
      `[33] 📞 Kontak Orang Tua Siswa\n` +
      `[34] 🏆 Catatan Poin Pelanggaran Kelas\n` +
      `[35] 🏫 Daftar Wali Kelas Seluruh Sekolah\n` +
      `[36] 📱 Update No HP Siswa\n` +
      `[37] 👨‍👩‍👧 Update No HP Ortu\n` +
      `[38] 🔑 Reset Password Siswa\n\n` +
      `[0]  🔄 Menu Utama\n\n` +
      `💡 Ketik *walikelas [nama kelas]* untuk lihat info kelas tertentu.\n` +
      `Contoh: ketik *walikelas X TKJ 1*`
    );
  }

  /**
   * Prompt Minta Input Nama Kelas jika belum terdaftar kelas binaan
   */
  private static promptInputKelas(cmdCode: string): string {
    return (
      `🏫 *Portal Wali Kelas*\n\n` +
      `Ketik *nama kelas* yang ingin dilihat:\n` +
      `Contoh: _ketik_ *${cmdCode} X TKJ 1* atau *${cmdCode} XI IPA 2*\n\n` +
      `💡 Ketik *[35]* untuk lihat Daftar Wali Kelas Sekolah atau *[0]* Menu Utama.`
    );
  }

  /**
   * [31] Presensi Siswa Kelas Hari Ini (Rincian)
   */
  static async handlePresensiSiswaKelas(ctx: ChatbotContext, kelasId: string, kelasNama: string): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const tz = await getTenantTimezone(tenantId);
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Jakarta' });
    const tglFormatted = new Date().toLocaleDateString('id-ID', {
      timeZone: tz || 'Asia/Jakarta',
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    });

    const offsetStr = getTenantOffsetString(tz);
    const startOfDay = new Date(`${todayStr}T00:00:00.000${offsetStr}`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999${offsetStr}`);

    const siswaList = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: kelasId,
        status: 'AKTIF',
      },
      select: { id: true, nama_siswa: true, nis: true },
      orderBy: { nama_siswa: 'asc' },
    });

    if (siswaList.length === 0) {
      return `📋 *Presensi Kelas ${kelasNama}*\n\nBelum ada siswa terdaftar di kelas ini.\n\n💡 Ketik *[3]* untuk Kembali.`;
    }

    const siswaIds = siswaList.map(s => s.id);
    const gerbangToday = await prisma.absenGerbangSiswa.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: { in: siswaIds },
        created_at: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { created_at: 'asc' },
    });

    const gerbangMap = new Map<string, typeof gerbangToday[0]>();
    gerbangToday.forEach(g => {
      if (g.siswa_id && !gerbangMap.has(g.siswa_id)) {
        gerbangMap.set(g.siswa_id, g);
      }
    });

    let msg = `📋 *Presensi Siswa Kelas ${kelasNama} (${tglFormatted})*\n`;
    msg += `Total: ${siswaList.length} Siswa\n\n`;

    siswaList.forEach((s, idx) => {
      const sName = s.nama_siswa || 'Siswa';
      const log = gerbangMap.get(s.id);

      if (log) {
        const jamStr = new Date(log.waktu_tap || log.created_at).toLocaleTimeString('id-ID', {
          timeZone: tz || 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        });
        const isLate = log.is_terlambat || String(log.status || '').toUpperCase() === 'TERLAMBAT';
        const badge = isLate ? `⚠️ ${jamStr} (Terlambat)` : `🟢 ${jamStr} (Hadir)`;
        msg += `${idx + 1}. *${sName}* — ${badge}\n`;
      } else {
        msg += `${idx + 1}. *${sName}* — 🔴 Belum Tap\n`;
      }
    });

    msg += `\n💡 Ketik *[3]* untuk Kembali ke Menu Wali Kelas atau *[0]* Menu Utama.`;
    return msg;
  }

  /**
   * [32] Siswa Izin / Sakit / Keluar Hari Ini
   */
  static async handleIzinSiswaKelas(ctx: ChatbotContext, kelasId: string, kelasNama: string): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const tz = await getTenantTimezone(tenantId);
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Jakarta' });
    const offsetStr = getTenantOffsetString(tz);
    const startOfDay = new Date(`${todayStr}T00:00:00.000${offsetStr}`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999${offsetStr}`);

    const izinList = await prisma.izinKeluarSiswa.findMany({
      where: {
        tenant_id: tenantId,
        jam_keluar: { gte: startOfDay, lte: endOfDay },
        SiswaAkademik: { kelas_id: kelasId },
      },
      include: {
        SiswaAkademik: { include: { siswa: { select: { nama_siswa: true } } } },
        GuruPiket: { select: { nama_guru: true } },
      },
      orderBy: { jam_keluar: 'desc' },
    });

    let msg = `🟨 *Catatan Izin Siswa ${kelasNama} Hari Ini*\n\n`;

    if (izinList.length === 0) {
      msg += `✅ Tidak ada catatan siswa izin keluar / pulang awal di kelas ini hari ini. 😊\n\n`;
    } else {
      izinList.forEach((item, idx) => {
        const sName = item.SiswaAkademik?.siswa?.nama_siswa || 'Siswa';
        const jamStr = new Date(item.jam_keluar).toLocaleTimeString('id-ID', {
          timeZone: tz || 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        });
        const statusStr = item.jam_kembali ? '✅ Sudah Kembali' : '⏱️ Sedang Di Luar';

        msg += `${idx + 1}. *${sName}* (${item.tipe_izin})\n`;
        msg += `   ├ Jam: ${jamStr} WIB │ Status: ${statusStr}\n`;
        msg += `   └ Alasan: "${item.alasan}"\n\n`;
      });
    }

    msg += `💡 Ketik *[3]* untuk Kembali atau *[0]* Menu Utama.`;
    return msg;
  }

  /**
   * [33] Kontak Orang Tua & Daftar Siswa
   */
  static async handleKontakOrtuKelas(ctx: ChatbotContext, kelasId: string, kelasNama: string): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const siswaList = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: kelasId,
        status: 'AKTIF',
      },
      select: {
        id: true,
        nama_siswa: true,
        nis: true,
        no_hp: true,
        nama_ayah: true,
        nama_ibu: true,
        OrangTuaSiswa: {
          select: { OrangTua: { select: { no_hp: true, nama: true } } }
        }
      },
      orderBy: { nama_siswa: 'asc' },
    });

    if (siswaList.length === 0) {
      return `📞 *Kontak Orang Tua — ${kelasNama}*\n\nBelum ada data siswa terdaftar.\n\n💡 Ketik *[3]* untuk Kembali.`;
    }

    let msg = `📞 *Daftar Kontak Orang Tua — ${kelasNama}*\n`;
    msg += `Total: ${siswaList.length} Siswa\n\n`;

    siswaList.forEach((s, idx) => {
      const sName = s.nama_siswa || 'Siswa';
      const hpOrtu = s.OrangTuaSiswa?.[0]?.OrangTua?.no_hp || s.no_hp || '-';
      const namaOrtu = s.OrangTuaSiswa?.[0]?.OrangTua?.nama || s.nama_ayah || s.nama_ibu || 'Ortu';

      msg += `${idx + 1}. *${sName}*\n`;
      msg += `   ├ Ortu: ${namaOrtu}\n`;
      msg += `   └ HP: ${hpOrtu}\n\n`;
    });

    msg += `💡 Ketik *[3]* untuk Kembali atau *[0]* Menu Utama.`;
    return msg;
  }

  /**
   * [34] Catatan Poin Pelanggaran Kelas
   */
  static async handlePoinPelanggaranKelas(ctx: ChatbotContext, kelasId: string, kelasNama: string): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const pelanggaranList = await prisma.pelanggaranSiswa.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { kelas_id: kelasId },
          { SiswaAkademik: { kelas_id: kelasId } },
        ],
      },
      include: {
        Siswa: { select: { nama_siswa: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    let msg = `🏆 *Catatan Kedisiplinan & Poin Pelanggaran — ${kelasNama}*\n\n`;

    if (pelanggaranList.length === 0) {
      msg += `⭐ *Luar biasa!* Tidak ada catatan pelanggaran yang tercatat untuk kelas ${kelasNama}. Pertahankan! 😊\n\n`;
    } else {
      msg += `📋 *Pelanggaran Terbaru Siswa Kelas:*\n\n`;
      pelanggaranList.forEach((p, idx) => {
        const sName = p.Siswa?.nama_siswa || 'Siswa';
        const tglStr = new Date(p.tanggal || p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        msg += `${idx + 1}. *${sName}* [${tglStr}]\n`;
        msg += `   ├ 📛 ${p.jenis_pelanggaran} (-${p.poin} Poin)\n`;
        msg += `   └ 📊 Status: ${p.status}\n\n`;
      });
    }

    msg += `💡 Ketik *[3]* untuk Kembali atau *[0]* Menu Utama.`;
    return msg;
  }

  /**
   * [35] Daftar Wali Kelas Seluruh Sekolah (Fitur Umum)
   */
  static async handleDaftarSemuaWaliKelas(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const { items, totalCount } = await waliKelasService.getDaftarWaliKelasActive(guru.tenant_id);

    if (totalCount === 0) {
      return (
        `🏫 *Daftar Wali Kelas Sekolah*\n\n` +
        `Belum ada penugasan Wali Kelas yang tercatat di sistem.\n` +
        `Hubungi admin untuk mengatur penugasan Wali Kelas.\n\n` +
        `💡 Ketik *[0]* untuk Menu Utama.`
      );
    }

    let msg = `🏫 *Daftar Wali Kelas Aktif Sekolah*\n`;
    msg += `Total: ${totalCount} kelas\n\n`;

    items.forEach((item, i) => {
      msg += `${i + 1}. *${item.kelasNama}* — ${item.guruNama}\n`;
    });

    msg += `\n💡 Ketik *walikelas [nama kelas]* untuk cari wali kelas spesifik.\n`;
    msg += `💡 Ketik *[0]* untuk Menu Utama.`;
    return msg;
  }

  /**
  /**
   * [36] PROMPT: Update No HP Siswa (Daftar Dinamis & Interaktif)
   */
  static async handleUpdateHpSiswaPrompt(ctx: ChatbotContext, targetKelas: any): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const rawText = (ctx.messageText || '').trim();
    const searchArg = rawText.replace(/^(36|hp\s*siswa)\s*/i, '').trim();

    const whereClause: any = {
      tenant_id: tenantId,
      status: 'AKTIF',
    };

    if (targetKelas?.id) {
      whereClause.kelas_id = targetKelas.id;
    }

    const allSiswa = await prisma.siswa.findMany({
      where: whereClause,
      include: { Kelas: { select: { nama_kelas: true } } },
      orderBy: { nama_siswa: 'asc' },
      take: 50,
    });

    if (allSiswa.length === 0) {
      return (
        `📱 *Update Nomor HP Siswa*\n\n` +
        `❌ Tidak ada data siswa aktif yang ditemukan${targetKelas ? ` di kelas *${targetKelas.nama_kelas}*` : ''}.\n\n` +
        `💡 Ketik *[3]* untuk Portal Wali Kelas atau *[0]* Menu Utama.`
      );
    }

    // Direct selection by index number (e.g. 3601, 361, 36 1, or 1)
    const indexMatch = searchArg.match(/^0*(\d+)$/);
    if (indexMatch) {
      const idx = parseInt(indexMatch[1], 10) - 1;
      if (idx >= 0 && idx < allSiswa.length) {
        const s = allSiswa[idx];
        chatbotSessionManager.set(ctx.cleanJid, {
          flowId: 'WALIKELAS_UPDATE_HP_SISWA',
          step: 'AWAITING_NEW_HP',
          payload: {
            siswaId: s.id,
            namaSiswa: s.nama_siswa,
            kelasNama: s.Kelas?.nama_kelas || '-',
            oldHp: s.no_hp || '-',
          },
        });

        return (
          `📱 *Update Nomor HP Siswa*\n\n` +
          `👤 Siswa: *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n` +
          `📞 No. HP Saat Ini: *${s.no_hp || '_Belum diset_'}*\n\n` +
          `Silakan ketik *Nomor HP Baru Siswa* (contoh: 085712345678):\n\n` +
          `💡 Ketik *BATAL* atau *[0]* untuk membatalkan.`
        );
      }
    }

    // Search by text if query provided
    if (searchArg && !indexMatch) {
      const filtered = allSiswa.filter((s) =>
        s.nama_siswa.toLowerCase().includes(searchArg.toLowerCase())
      );

      if (filtered.length === 0) {
        return (
          `📱 *Update Nomor HP Siswa*\n\n` +
          `❌ Siswa dengan nama *"${searchArg}"* tidak ditemukan.\n\n` +
          `💡 Ketik *36* untuk melihat daftar siswa kelas.`
        );
      }

      if (filtered.length === 1) {
        const s = filtered[0];
        chatbotSessionManager.set(ctx.cleanJid, {
          flowId: 'WALIKELAS_UPDATE_HP_SISWA',
          step: 'AWAITING_NEW_HP',
          payload: {
            siswaId: s.id,
            namaSiswa: s.nama_siswa,
            kelasNama: s.Kelas?.nama_kelas || '-',
            oldHp: s.no_hp || '-',
          },
        });

        return (
          `📱 *Update Nomor HP Siswa*\n\n` +
          `👤 Siswa: *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n` +
          `📞 No. HP Saat Ini: *${s.no_hp || '_Belum diset_'}*\n\n` +
          `Silakan ketik *Nomor HP Baru Siswa* (contoh: 085712345678):\n\n` +
          `💡 Ketik *BATAL* atau *[0]* untuk membatalkan.`
        );
      }

      let msg = `📱 *Pencarian Siswa ("${searchArg}"):*\n\n`;
      filtered.forEach((s) => {
        const origIndex = allSiswa.findIndex((item) => item.id === s.id) + 1;
        const code = `36${origIndex < 10 ? '0' + origIndex : origIndex}`;
        msg += `[*${code}*] ${s.nama_siswa} (HP: ${s.no_hp || '-'})\n`;
      });
      msg += `\n💡 Ketik kode pilihan di atas (contoh: *3601*).`;
      return msg;
    }

    // Default: Show numbered list of all students in class
    const kelasLabel = targetKelas?.nama_kelas || 'Kelas Binaan';
    let msg = `📱 *Update Nomor HP Siswa*\n`;
    msg += `🏫 Kelas: *${kelasLabel}*\n\n`;
    msg += `Pilih siswa yang ingin diperbarui HP-nya:\n\n`;

    allSiswa.forEach((s, i) => {
      const num = i + 1;
      const code = `36${num < 10 ? '0' + num : num}`;
      const hp = s.no_hp ? s.no_hp : '_Belum diset_';
      msg += `[*${code}*] ${s.nama_siswa}\n   └ HP: ${hp}\n`;
    });

    msg += `\n💡 Ketik kode pilihan (contoh: *3601*) atau ketik *36 [nama]* untuk mencari.`;
    return msg;
  }

  /**
   * PROCESS FSM: Process New HP Siswa Submission
   */
  static async processUpdateHpSiswa(ctx: ChatbotContext, session: ChatbotDialogSession): Promise<string> {
    chatbotSessionManager.delete(ctx.cleanJid);

    const payload = session.payload || {};
    const newHp = (ctx.messageText || '').trim().replace(/[^0-9+]/g, '');

    if (!payload.siswaId || !newHp || newHp.length < 9) {
      return `⚠️ Nomor HP tidak valid (minimal 9 digit angka).\n\n💡 Ketik *[3]* untuk Portal Wali Kelas.`;
    }

    await prisma.siswa.update({
      where: { id: payload.siswaId },
      data: { no_hp: newHp },
    });

    return (
      `✅ *Nomor HP Siswa Berhasil Diperbarui!*\n\n` +
      `• Nama Siswa : *${payload.namaSiswa}* (${payload.kelasNama})\n` +
      `• No. HP Baru: *${newHp}*\n\n` +
      `💡 Ketik *[3]* untuk Portal Wali Kelas atau *[0]* Menu Utama.`
    );
  }

  /**
   * [37] PROMPT: Update No HP Ortu (Daftar Dinamis & Interaktif)
   */
  static async handleUpdateHpOrtuPrompt(ctx: ChatbotContext, targetKelas: any): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const rawText = (ctx.messageText || '').trim();
    const searchArg = rawText.replace(/^(37|hp\s*ortu)\s*/i, '').trim();

    const whereClause: any = {
      tenant_id: tenantId,
      status: 'AKTIF',
    };

    if (targetKelas?.id) {
      whereClause.kelas_id = targetKelas.id;
    }

    const allSiswa = await prisma.siswa.findMany({
      where: whereClause,
      include: {
        Kelas: { select: { nama_kelas: true } },
        OrangTuaSiswa: {
          select: { OrangTua: { select: { id: true, no_hp: true, nama: true } } }
        }
      },
      orderBy: { nama_siswa: 'asc' },
      take: 50,
    });

    if (allSiswa.length === 0) {
      return (
        `👨‍👩‍👧 *Update Nomor HP Orang Tua*\n\n` +
        `❌ Tidak ada data siswa aktif yang ditemukan${targetKelas ? ` di kelas *${targetKelas.nama_kelas}*` : ''}.\n\n` +
        `💡 Ketik *[3]* untuk Portal Wali Kelas atau *[0]* Menu Utama.`
      );
    }

    const indexMatch = searchArg.match(/^0*(\d+)$/);
    if (indexMatch) {
      const idx = parseInt(indexMatch[1], 10) - 1;
      if (idx >= 0 && idx < allSiswa.length) {
        const s = allSiswa[idx];
        const hpOrtu = s.OrangTuaSiswa?.[0]?.OrangTua?.no_hp || s.no_hp || '-';
        chatbotSessionManager.set(ctx.cleanJid, {
          flowId: 'WALIKELAS_UPDATE_HP_ORTU',
          step: 'AWAITING_NEW_HP_ORTU',
          payload: {
            siswaId: s.id,
            namaSiswa: s.nama_siswa,
            kelasNama: s.Kelas?.nama_kelas || '-',
            oldHp: hpOrtu,
          },
        });

        return (
          `👨‍👩‍👧 *Update Nomor HP Orang Tua*\n\n` +
          `👤 Siswa: *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n` +
          `📞 No. HP Ortu Saat Ini: *${hpOrtu || '_Belum diset_'}*\n\n` +
          `Silakan ketik *Nomor HP Baru Orang Tua* (contoh: 081233445566):\n\n` +
          `💡 Ketik *BATAL* atau *[0]* untuk membatalkan.`
        );
      }
    }

    if (searchArg && !indexMatch) {
      const filtered = allSiswa.filter((s) =>
        s.nama_siswa.toLowerCase().includes(searchArg.toLowerCase())
      );

      if (filtered.length === 0) {
        return (
          `👨‍👩‍👧 *Update Nomor HP Orang Tua*\n\n` +
          `❌ Siswa dengan nama *"${searchArg}"* tidak ditemukan.\n\n` +
          `💡 Ketik *37* untuk melihat daftar siswa kelas.`
        );
      }

      if (filtered.length === 1) {
        const s = filtered[0];
        const hpOrtu = s.OrangTuaSiswa?.[0]?.OrangTua?.no_hp || s.no_hp || '-';
        chatbotSessionManager.set(ctx.cleanJid, {
          flowId: 'WALIKELAS_UPDATE_HP_ORTU',
          step: 'AWAITING_NEW_HP_ORTU',
          payload: {
            siswaId: s.id,
            namaSiswa: s.nama_siswa,
            kelasNama: s.Kelas?.nama_kelas || '-',
            oldHp: hpOrtu,
          },
        });

        return (
          `👨‍👩‍👧 *Update Nomor HP Orang Tua*\n\n` +
          `👤 Siswa: *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n` +
          `📞 No. HP Ortu Saat Ini: *${hpOrtu || '_Belum diset_'}*\n\n` +
          `Silakan ketik *Nomor HP Baru Orang Tua* (contoh: 081233445566):\n\n` +
          `💡 Ketik *BATAL* atau *[0]* untuk membatalkan.`
        );
      }

      let msg = `👨‍👩‍👧 *Pencarian Siswa ("${searchArg}"):*\n\n`;
      filtered.forEach((s) => {
        const origIndex = allSiswa.findIndex((item) => item.id === s.id) + 1;
        const code = `37${origIndex < 10 ? '0' + origIndex : origIndex}`;
        const hpOrtu = s.OrangTuaSiswa?.[0]?.OrangTua?.no_hp || '-';
        msg += `[*${code}*] ${s.nama_siswa} (HP Ortu: ${hpOrtu})\n`;
      });
      msg += `\n💡 Ketik kode pilihan di atas (contoh: *3701*).`;
      return msg;
    }

    const kelasLabel = targetKelas?.nama_kelas || 'Kelas Binaan';
    let msg = `👨‍👩‍👧 *Update Nomor HP Orang Tua*\n`;
    msg += `🏫 Kelas: *${kelasLabel}*\n\n`;
    msg += `Pilih siswa yang HP orang tua-nya ingin diperbarui:\n\n`;

    allSiswa.forEach((s, i) => {
      const num = i + 1;
      const code = `37${num < 10 ? '0' + num : num}`;
      const hpOrtu = s.OrangTuaSiswa?.[0]?.OrangTua?.no_hp || '_Belum diset_';
      msg += `[*${code}*] ${s.nama_siswa}\n   └ HP Ortu: ${hpOrtu}\n`;
    });

    msg += `\n💡 Ketik kode pilihan (contoh: *3701*) atau ketik *37 [nama]* untuk mencari.`;
    return msg;
  }

  /**
   * PROCESS FSM: Process New HP Ortu Submission
   */
  static async processUpdateHpOrtu(ctx: ChatbotContext, session: ChatbotDialogSession): Promise<string> {
    chatbotSessionManager.delete(ctx.cleanJid);

    const payload = session.payload || {};
    const newHp = (ctx.messageText || '').trim().replace(/[^0-9+]/g, '');

    if (!payload.siswaId || !newHp || newHp.length < 9) {
      return `⚠️ Nomor HP Orang Tua tidak valid (minimal 9 digit angka).\n\n💡 Ketik *[3]* untuk Portal Wali Kelas.`;
    }

    // Update Siswa no_hp / OrangTua no_hp
    await prisma.siswa.update({
      where: { id: payload.siswaId },
      data: { no_hp: newHp },
    });

    const otsList = await prisma.orangTuaSiswa.findMany({
      where: { siswa_id: payload.siswaId },
      select: { orang_tua_id: true },
    });

    if (otsList.length > 0) {
      await prisma.orangTua.updateMany({
        where: { id: { in: otsList.map((o) => o.orang_tua_id) } },
        data: { no_hp: newHp },
      });
    }

    return (
      `✅ *Nomor HP Orang Tua Berhasil Diperbarui!*\n\n` +
      `• Nama Siswa : *${payload.namaSiswa}* (${payload.kelasNama})\n` +
      `• No. HP Ortu Baru: *${newHp}*\n\n` +
      `💡 Ketik *[3]* untuk Portal Wali Kelas atau *[0]* Menu Utama.`
    );
  }

  /**
   * [38] Reset Password Siswa (Daftar Dinamis & Interaktif)
   */
  static async handleResetPasswordSiswaPrompt(ctx: ChatbotContext, targetKelas: any): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const rawText = (ctx.messageText || '').trim();
    const searchArg = rawText.replace(/^(38|reset\s*password)\s*/i, '').trim();

    const whereClause: any = {
      tenant_id: tenantId,
      status: 'AKTIF',
    };

    if (targetKelas?.id) {
      whereClause.kelas_id = targetKelas.id;
    }

    const allSiswa = await prisma.siswa.findMany({
      where: whereClause,
      include: {
        Kelas: { select: { nama_kelas: true } },
        User: { select: { id: true, email: true } },
      },
      orderBy: { nama_siswa: 'asc' },
      take: 50,
    });

    if (allSiswa.length === 0) {
      return (
        `🔑 *Reset Password Siswa*\n\n` +
        `❌ Tidak ada data siswa aktif yang ditemukan${targetKelas ? ` di kelas *${targetKelas.nama_kelas}*` : ''}.\n\n` +
        `💡 Ketik *[3]* untuk Portal Wali Kelas atau *[0]* Menu Utama.`
      );
    }

    const indexMatch = searchArg.match(/^0*(\d+)$/);
    let s: any = null;

    if (indexMatch) {
      const idx = parseInt(indexMatch[1], 10) - 1;
      if (idx >= 0 && idx < allSiswa.length) {
        s = allSiswa[idx];
      }
    } else if (searchArg) {
      const filtered = allSiswa.filter((item) =>
        item.nama_siswa.toLowerCase().includes(searchArg.toLowerCase())
      );
      if (filtered.length === 1) {
        s = filtered[0];
      } else if (filtered.length > 1) {
        let msg = `🔑 *Pencarian Siswa ("${searchArg}"):*\n\n`;
        filtered.forEach((item) => {
          const origIndex = allSiswa.findIndex((orig) => orig.id === item.id) + 1;
          const code = `38${origIndex < 10 ? '0' + origIndex : origIndex}`;
          msg += `[*${code}*] ${item.nama_siswa}\n`;
        });
        msg += `\n💡 Ketik kode pilihan di atas (contoh: *3801*).`;
        return msg;
      } else {
        return (
          `🔑 *Reset Password Siswa*\n\n` +
          `❌ Siswa dengan nama *"${searchArg}"* tidak ditemukan.\n\n` +
          `💡 Ketik *38* untuk melihat daftar siswa kelas.`
        );
      }
    }

    if (!s) {
      // Default: Display dynamic list
      const kelasLabel = targetKelas?.nama_kelas || 'Kelas Binaan';
      let msg = `🔑 *Reset Password Siswa*\n`;
      msg += `🏫 Kelas: *${kelasLabel}*\n\n`;
      msg += `Pilih siswa yang password-nya ingin di-reset:\n\n`;

      allSiswa.forEach((item, i) => {
        const num = i + 1;
        const code = `38${num < 10 ? '0' + num : num}`;
        msg += `[*${code}*] ${item.nama_siswa}\n`;
      });

      msg += `\n💡 Ketik kode pilihan (contoh: *3801*) atau ketik *38 [nama]* untuk mencari.`;
      return msg;
    }

    const userId = s.user_id || s.User?.id;
    if (!userId) {
      return `⚠️ Siswa *${s.nama_siswa}* belum memiliki akun login di sistem.\n\n💡 Ketik *[3]* untuk Portal Wali Kelas.`;
    }

    const defaultPassword = `siswa123`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    const usernameStr = s.User?.email || s.nis || '-';
    const kelasName = s.Kelas?.nama_kelas || '-';

    return (
      `✅ *Reset Password Akun Siswa Berhasil!*\n\n` +
      `• Nama Siswa    : *${s.nama_siswa}* (${kelasName})\n` +
      `• Username/NIS  : *${usernameStr}*\n` +
      `• Password Baru : *${defaultPassword}*\n\n` +
      `📋 Berikan informasi password baru ini kepada siswa/orang tua untuk login ke aplikasi.\n\n` +
      `💡 Ketik *[3]* untuk Portal Wali Kelas atau *[0]* Menu Utama.`
    );
  }
}
