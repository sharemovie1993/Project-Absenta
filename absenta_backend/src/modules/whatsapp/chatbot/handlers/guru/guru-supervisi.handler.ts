import { ChatbotContext } from '../../core/chatbot-context';
import { SupervisiService } from '@/modules/kurikulum/services/supervisi.service';

export class GuruSupervisiHandler {
  /**
   * MENU 3: Info Supervisi Akademik Saya
   * Menggunakan Shared Domain Service (SupervisiService.getSupervisiByGuru)
   */
  static async handleSupervisi(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    // 🚀 Call Shared Domain Service Layer
    const { items, totalCount } = await SupervisiService.getSupervisiByGuru(guru.id, 5);

    if (totalCount === 0) {
      return (
        `📊 *Info Supervisi Akademik*\n\n` +
        `Belum ada riwayat atau jadwal supervisi akademik yang terdaftar untuk Bapak/Ibu *${guru.nama_guru}*.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    let msg = `📊 *Info Supervisi Akademik Saya*\n`;
    msg += `Guru: *${guru.nama_guru}*\n`;
    msg += `Total: ${totalCount} supervisi terbaru\n\n`;

    items.forEach((s, i) => {
      msg += `${i + 1}. 📅 *${s.tglStr}*\n`;
      msg += `   • Status        : ${s.statusBadge}\n`;
      msg += `   • Supervisor    : ${s.supervisorNama}\n`;

      if (s.mapel || s.kelas || s.jam_ke) {
        const detailParts: string[] = [];
        if (s.mapel)  detailParts.push(`📖 ${s.mapel}`);
        if (s.kelas)  detailParts.push(`🏫 ${s.kelas}`);
        if (s.jam_ke) detailParts.push(`Jam ke-${s.jam_ke}`);
        msg += `   • Kegiatan      : ${detailParts.join(' | ')}\n`;
      }

      if (typeof s.nilai === 'number') {
        msg += `   • Nilai Hasil   : 💯 *${s.nilai}/100* ${s.predikat}\n`;
      }

      if (s.target_pembelajaran) {
        msg += `   • Target KBM    : ${s.target_pembelajaran}\n`;
      }

      if (s.catatan) {
        msg += `   • Catatan Appr  : 📝 "${s.catatan}"\n`;
      }

      if (s.is_self_evaluated && s.nilai_self) {
        msg += `   • Self Evaluate : ⭐ ${s.nilai_self}/100`;
        if (s.catatan_self) msg += ` ("${s.catatan_self}")`;
        msg += `\n`;
      }

      msg += `\n`;
    });

    msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }
}
