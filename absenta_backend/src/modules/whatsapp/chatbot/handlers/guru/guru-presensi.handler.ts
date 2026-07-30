import { ChatbotContext } from '../../core/chatbot-context';
import { rekapService } from '@/modules/attendance/rekap/services/rekap.service';

export class GuruPresensiHandler {
  /**
   * MENU 4: Info & Rekap Presensi Guru (Hari Ini & Bulan Ini)
   * Menggunakan Shared Domain Service (rekapService.getRekapPresensiGuruByGuruId)
   */
  static async handlePresensi(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    // 🚀 Call Shared Domain Service Layer
    const summary = await rekapService.getRekapPresensiGuruByGuruId(guru.id, guru.nama_guru);
    const { rekapBulan } = summary;

    let msg = `⏰ *Info & Rekap Presensi Guru*\n`;
    msg += `Guru: *${summary.namaGuru}*\n`;
    msg += `Tanggal: *${summary.hariTglStr}*\n\n`;

    msg += `📌 *Presensi Hari Ini (Gerbang & KBM):*\n`;
    msg += `• Presensi Masuk  : ${summary.statusMasukText}\n`;
    msg += `• Presensi Pulang : ${summary.statusPulangText}\n`;
    msg += `• Mengajar Kelas  : ${summary.statusKbmTodayText}\n\n`;

    msg += `📊 *Rekap Bulan ${summary.bulanStr}:*\n`;
    msg += `• ✅ Hadir Tepat Waktu : ${rekapBulan.totalHadirTepat} hari\n`;
    msg += `• ⚠️ Terlambat Masuk   : ${rekapBulan.totalTerlambat} hari\n`;
    if (rekapBulan.totalIzinSakit > 0) msg += `• 🏥 Izin / Sakit      : ${rekapBulan.totalIzinSakit} hari\n`;
    if (rekapBulan.totalAlpa > 0)      msg += `• ❌ Alpa / Tanpa Ket  : ${rekapBulan.totalAlpa} hari\n`;
    if (rekapBulan.totalSesiMonth > 0) {
      msg += `• 🎯 Sesi KBM Mengajar : ${rekapBulan.totalKbmHadirMonth}/${rekapBulan.totalSesiMonth} Sesi (${rekapBulan.rateKbm}% Hadir)\n`;
    }

    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }
}
