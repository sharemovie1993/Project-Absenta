import { ChatbotContext } from '../../core/chatbot-context';
import { authService } from '@/modules/auth/services/auth.service';

export class QuickLoginHandler {
  /**
   * MENU QUICK LOGIN: Akses Langsung Web tanpa Password
   * Menggunakan Shared Domain Service (authService.generateQuickLoginUrl)
   */
  static async handleQuickLogin(ctx: ChatbotContext): Promise<string> {
    const { guru, siswa, ortu } = ctx;

    const userId = guru?.user_id || siswa?.user_id || ortu?.user_id;
    const name = guru?.nama_guru || siswa?.nama_siswa || ortu?.nama || 'Pengguna';

    // 🚀 Call Shared Domain Service Layer
    const result = await authService.generateQuickLoginUrl(userId, name);

    if (!result.success || !result.loginUrl) {
      return (
        `🔑 *Quick Login Aplikasi Web Absenta*\n\n` +
        `⚠️ *${result.email ? 'Status Akun Tidak Aktif' : 'Akun Web Belum Terhubung'}*\n` +
        `${result.message}\n` +
        `Silakan hubungi Administrator sekolah.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 1) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    let msg = `🔑 *Quick Login Aplikasi Web Absenta*\n\n`;
    msg += `Halo Bapak/Ibu/Saudara *${result.name}*,\n\n`;
    msg += `Gunakan tautan di bawah ini untuk langsung masuk ke aplikasi web Absenta tanpa perlu mengetik email & kata sandi:\n\n`;
    msg += `🚀 *Tautan Akses Langsung:*\n`;
    msg += `${result.loginUrl}\n\n`;
    msg += `⚠️ *Catatan Keamanan:*\n`;
    msg += `• Tautan ini bersifat rahasia dan berlaku selama *24 jam*.\n`;
    msg += `• Jaga kerahasiaan tautan dan jangan bagikan kepada siapapun.\n\n`;
    msg += `💡 Ketik *ANGKA* menu lain (misal: 1) atau ketik *[0]* untuk Daftar Menu.`;

    return msg;
  }
}
