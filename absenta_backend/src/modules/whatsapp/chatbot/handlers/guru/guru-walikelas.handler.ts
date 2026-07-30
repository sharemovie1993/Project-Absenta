import { ChatbotContext } from '../../core/chatbot-context';
import { waliKelasService } from '@/modules/kurikulum/wali-kelas/services/wali-kelas.service';

export class GuruWalikelasHandler {
  /**
   * MENU 2: Daftar Wali Kelas Sekolah
   * Menggunakan Shared Domain Service (waliKelasService.getDaftarWaliKelasActive)
   */
  static async handleDaftarWaliKelas(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    // 🚀 Call Shared Domain Service Layer
    const { items, totalCount } = await waliKelasService.getDaftarWaliKelasActive(guru.tenant_id);

    if (totalCount === 0) {
      return (
        `🏫 *Daftar Wali Kelas Sekolah*\n\n` +
        `Belum ada penugasan Wali Kelas yang tercatat di sistem.\n` +
        `Hubungi admin untuk mengatur penugasan Wali Kelas.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    let msg = `🏫 *Daftar Wali Kelas Aktif*\n`;
    msg += `Total: ${totalCount} kelas\n\n`;

    items.forEach((item, i) => {
      msg += `${i + 1}. *${item.kelasNama}* — ${item.guruNama}\n`;
    });

    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }
}
