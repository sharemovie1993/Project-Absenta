import { ChatbotContext } from '../../core/chatbot-context';
import { rekapService } from '@/modules/attendance/rekap/services/rekap.service';
import { prisma } from '@/utils/prisma';
import { getTenantTimezone, formatTenantTime } from '@/utils/timezone.utils';

export class GuruPresensiHandler {
  /**
   * MENU 2: Presensi Saya & Rekap Presensi Guru
   */
  static async handlePresensi(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const cmd = ctx.commandUpper.trim();

    if (cmd === '21') return this.handleDetailHariIni(ctx);
    if (cmd === '22') return this.handleDetailBulanIni(ctx);
    if (cmd === '23') return this.handleRiwayat7Hari(ctx);

    // Call Shared Domain Service Layer for monthly & today summary
    const summary = await rekapService.getRekapPresensiGuruByGuruId(guru.id, guru.nama_guru);
    const { rekapBulan } = summary;

    let msg = `⏰ *Presensi & Rekap Kehadiran Guru*\n`;
    msg += `Guru: *${summary.namaGuru}*\n`;
    msg += `Tanggal: *${summary.hariTglStr}*\n\n`;

    msg += `📌 *STATUS HARI INI:*\n`;
    msg += `• Presensi Masuk  : ${summary.statusMasukText}\n`;
    msg += `• Presensi Pulang : ${summary.statusPulangText}\n`;
    msg += `• Mengajar KBM   : ${summary.statusKbmTodayText}\n\n`;

    msg += `📊 *REKAP PRESENSI (${summary.bulanStr.toUpperCase()}):*\n`;
    msg += `• ✅ Hadir Tepat Waktu : ${rekapBulan.totalHadirTepat} Hari\n`;
    msg += `• ⚠️ Terlambat Masuk   : ${rekapBulan.totalTerlambat} Hari\n`;
    if (rekapBulan.totalIzinSakit > 0) msg += `• 🏥 Izin / Sakit      : ${rekapBulan.totalIzinSakit} Hari\n`;
    if (rekapBulan.totalAlpa > 0)      msg += `• ❌ Alpa / Tanpa Ket  : ${rekapBulan.totalAlpa} Hari\n`;
    if (rekapBulan.totalSesiMonth > 0) {
      msg += `• 📖 Sesi Mengajar KBM : ${rekapBulan.totalKbmHadirMonth}/${rekapBulan.totalSesiMonth} Sesi (${rekapBulan.rateKbm}% Realisasi)\n`;
    }

    msg += `\nPilih detail presensi:\n`;
    msg += `[21] 📋 Detail Presensi Hari Ini\n`;
    msg += `[22] 📊 Detail Rekap Bulan Ini\n`;
    msg += `[23] 📅 Riwayat 7 Hari Terakhir\n\n`;
    msg += `[0]  🔄 Menu Utama`;
    return msg;
  }

  /**
   * [21] Detail Presensi Hari Ini
   */
  static async handleDetailHariIni(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const summary = await rekapService.getRekapPresensiGuruByGuruId(guru.id, guru.nama_guru);
    let msg = `📋 *Detail Presensi Hari Ini*\n`;
    msg += `Guru: *${guru.nama_guru}*\n`;
    msg += `📅 ${summary.hariTglStr}\n\n`;

    msg += `🚪 *PRESENSI GERBANG SEKOLAH:*\n`;
    msg += `• Tap Masuk  : ${summary.statusMasukText}\n`;
    msg += `• Tap Pulang : ${summary.statusPulangText}\n\n`;

    msg += `🏫 *SESI MENGAJAR KBM HARI INI:*\n`;
    msg += `${summary.statusKbmTodayText}\n\n`;

    msg += `💡 Ketik *[2]* untuk Kembali ke Menu Presensi atau *[0]* Menu Utama.`;
    return msg;
  }

  /**
   * [22] Detail Rekap Bulan Ini
   */
  static async handleDetailBulanIni(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const summary = await rekapService.getRekapPresensiGuruByGuruId(guru.id, guru.nama_guru);
    const { rekapBulan } = summary;

    const totalHariKerja = rekapBulan.totalHadirTepat + rekapBulan.totalTerlambat + rekapBulan.totalIzinSakit + rekapBulan.totalAlpa;
    const rateGerbang = totalHariKerja > 0 ? Math.round((rekapBulan.totalHadirTepat / totalHariKerja) * 100) : 100;

    let msg = `📊 *Detail Rekap Presensi Bulan ${summary.bulanStr}*\n`;
    msg += `Guru: *${guru.nama_guru}*\n\n`;

    msg += `🚪 *KEDISIPLINAN GERBANG SEKOLAH:*\n`;
    msg += `• Total Hari Kerja   : ${totalHariKerja} hari\n`;
    msg += `• Hadir Tepat Waktu  : ${rekapBulan.totalHadirTepat} hari (${rateGerbang}% Rate)\n`;
    msg += `• Terlambat Masuk    : ${rekapBulan.totalTerlambat} hari\n`;
    msg += `• Izin / Sakit       : ${rekapBulan.totalIzinSakit} hari\n`;
    msg += `• Alpa               : ${rekapBulan.totalAlpa} hari\n\n`;

    msg += `📖 *REALISASI MENGAJAR KBM:*\n`;
    msg += `• Target Sesi KBM    : ${rekapBulan.totalSesiMonth} Sesi\n`;
    msg += `• Sesi Terlaksana    : ${rekapBulan.totalKbmHadirMonth} Sesi\n`;
    msg += `• Persentase KBM     : ${rekapBulan.rateKbm}%\n\n`;

    msg += `💡 Ketik *[23]* untuk Riwayat 7 Hari atau *[0]* Menu Utama.`;
    return msg;
  }

  /**
   * [23] Riwayat 7 Hari Terakhir
   */
  static async handleRiwayat7Hari(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const tz = await getTenantTimezone(guru.tenant_id);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const gerbangLogs = await prisma.absenGerbangGuru.findMany({
      where: {
        guru_id: guru.id,
        created_at: { gte: sevenDaysAgo },
      },
      orderBy: { created_at: 'desc' },
    });

    if (gerbangLogs.length === 0) {
      return (
        `📅 *Riwayat Presensi 7 Hari Terakhir*\n` +
        `Guru: *${guru.nama_guru}*\n\n` +
        `Belum ada data rekaman tap gerbang 7 hari terakhir.\n\n` +
        `💡 Ketik *[2]* untuk Kembali atau *[0]* Menu Utama.`
      );
    }

    // Group logs by YYYY-MM-DD
    const grouped = new Map<string, typeof gerbangLogs>();
    gerbangLogs.forEach(log => {
      const dateKey = new Date(log.created_at).toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Jakarta' });
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(log);
    });

    let msg = `📅 *Riwayat Presensi 7 Hari Terakhir*\n`;
    msg += `Guru: *${guru.nama_guru}*\n\n`;

    grouped.forEach((logs, dateKey) => {
      const tglFormatted = new Date(dateKey).toLocaleDateString('id-ID', {
        timeZone: tz || 'Asia/Jakarta',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });

      const tapMasuk = logs.find(g => String(g.arah || '').toUpperCase().includes('DATANG') || String(g.arah || '').toUpperCase().includes('MASUK'));
      const tapPulang = logs.find(g => String(g.arah || '').toUpperCase().includes('PULANG'));

      const formatJam = (dt?: Date | null) => {
        if (!dt) return '-';
        return formatTenantTime(dt, tz, true);
      };

      const jamMasuk = formatJam(tapMasuk?.waktu_tap || tapMasuk?.created_at);
      const jamPulang = formatJam(tapPulang?.waktu_tap || tapPulang?.created_at);

      const isLate = tapMasuk?.is_terlambat || String(tapMasuk?.status || '').toUpperCase() === 'TERLAMBAT';
      const statusIcon = isLate ? '⚠️ (Terlambat)' : '🟢 (Tepat)';

      msg += `📌 *${tglFormatted}*\n`;
      msg += `   └ 🚪 Masuk: ${jamMasuk} ${statusIcon} │ Pulang: ${jamPulang}\n\n`;
    });

    msg += `💡 Ketik *[2]* untuk Kembali ke Menu Presensi atau *[0]* Menu Utama.`;
    return msg;
  }
}
