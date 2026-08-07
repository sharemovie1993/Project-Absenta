import { ChatbotContext } from '../../core/chatbot-context';
import { waliKelasService } from '@/modules/kurikulum/wali-kelas/services/wali-kelas.service';
import { prisma } from '@/utils/prisma';
import { getTenantTimezone } from '@/utils/timezone.utils';

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
    const cleanSearch = rawText.replace(/^(31|32|33|34|35|3|walikelas|wali\s*kelas)\s*/i, '').trim();

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

    // 4. Sub-menu routing [31] .. [34]
    if (cmd.startsWith('31') || cmd === '31') {
      if (!targetKelas) return this.promptInputKelas(cmd);
      return this.handlePresensiSiswaKelas(ctx, targetKelas.id, targetKelas.nama_kelas);
    }

    if (cmd.startsWith('32') || cmd === '32') {
      if (!targetKelas) return this.promptInputKelas(cmd);
      return this.handleIzinSiswaKelas(ctx, targetKelas.id, targetKelas.nama_kelas);
    }

    if (cmd.startsWith('33') || cmd === '33') {
      if (!targetKelas) return this.promptInputKelas(cmd);
      return this.handleKontakOrtuKelas(ctx, targetKelas.id, targetKelas.nama_kelas);
    }

    if (cmd.startsWith('34') || cmd === '34') {
      if (!targetKelas) return this.promptInputKelas(cmd);
      return this.handlePoinPelanggaranKelas(ctx, targetKelas.id, targetKelas.nama_kelas);
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

      const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

      const siswaList = await prisma.siswaAkademik.findMany({
        where: { kelas_id: kelasBinaan.id, status: 'AKTIF' },
        select: { siswa_id: true },
      });

      const totalSiswa = siswaList.length;
      const siswaIds = siswaList.map(s => s.siswa_id);

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
      msg += `[35] 🏫 Daftar Wali Kelas Seluruh Sekolah\n\n`;
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
      `[35] 🏫 Daftar Wali Kelas Seluruh Sekolah\n\n` +
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

    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const siswaList = await prisma.siswaAkademik.findMany({
      where: { kelas_id: kelasId, status: 'AKTIF' },
      include: { siswa: { select: { id: true, nama_siswa: true, nis: true } } },
      orderBy: { siswa: { nama_siswa: 'asc' } },
    });

    if (siswaList.length === 0) {
      return `📋 *Presensi Kelas ${kelasNama}*\n\nBelum ada siswa terdaftar di kelas ini.\n\n💡 Ketik *[3]* untuk Kembali.`;
    }

    const siswaIds = siswaList.map(s => s.siswa_id);
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

    siswaList.forEach((sa, idx) => {
      const sName = sa.siswa?.nama_siswa || 'Siswa';
      const log = gerbangMap.get(sa.siswa_id);

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
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

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

    const siswaList = await prisma.siswaAkademik.findMany({
      where: { kelas_id: kelasId, status: 'AKTIF' },
      include: {
        siswa: {
          select: {
            nama_siswa: true,
            nis: true,
            no_hp: true,
            nama_ayah: true,
            nama_ibu: true,
          },
        },
      },
      orderBy: { siswa: { nama_siswa: 'asc' } },
    });

    if (siswaList.length === 0) {
      return `📞 *Kontak Orang Tua — ${kelasNama}*\n\nBelum ada data siswa terdaftar.\n\n💡 Ketik *[3]* untuk Kembali.`;
    }

    let msg = `📞 *Daftar Kontak Orang Tua — ${kelasNama}*\n`;
    msg += `Total: ${siswaList.length} Siswa\n\n`;

    siswaList.forEach((sa, idx) => {
      const s = sa.siswa;
      const sName = s?.nama_siswa || 'Siswa';
      const hpOrtu = s?.no_hp || '-';
      const namaOrtu = s?.nama_ayah || s?.nama_ibu || 'Ortu';

      msg += `${idx + 1}. *${sName}*\n`;
      msg += `   └ 📱 ${namaOrtu}: ${hpOrtu}\n\n`;
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
}
