import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';
import { getSmartParentAppUrl, getSmartFrontendBaseUrl } from '@/utils/url-helper';

export class QuickLoginHandler {
  static async handleQuickLogin(ctx: ChatbotContext): Promise<string> {
    const { guru, siswa, ortu } = ctx;

    const userId = guru?.user_id || siswa?.user_id || ortu?.user_id;
    const name = guru?.nama_guru || siswa?.nama_siswa || ortu?.nama || 'Pengguna';

    if (!userId) {
      return (
        `🔑 *Quick Login Aplikasi Web Absenta*\n\n` +
        `⚠️ *Akun Web Belum Terhubung*\n` +
        `Data profil WhatsApp Anda belum terhubung dengan akun pengguna aplikasi web.\n` +
        `Silakan hubungi Administrator TU sekolah untuk menautkan akun Anda.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 1) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Role: { select: { id: true, name: true } },
        Tenant: { select: { id: true, subdomain: true, custom_domain: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return (
        `🔑 *Quick Login Aplikasi Web Absenta*\n\n` +
        `⚠️ *Status Akun Tidak Aktif*\n` +
        `Akun pengguna web (${user?.email || 'User'}) dalam status non-aktif.\n` +
        `Silakan hubungi Administrator sekolah.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 1) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const secret = process.env.JWT_SECRET || 'absenta-secret-key';
    const payload = {
      id: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      roleId: user.Role?.id || '',
      roleName: user.Role?.name || 'USER',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Berlaku 24 jam
    };

    const token = jwt.sign(payload, secret);

    let baseUrl = getSmartParentAppUrl(user.Tenant, user.tenant_id);
    if (!baseUrl || baseUrl.includes('localhost:5173')) {
      baseUrl = getSmartFrontendBaseUrl();
    }
    baseUrl = baseUrl.replace(/\/+$/, '');

    const loginUrl = `${baseUrl}/login?quick_login_token=${token}`;

    let msg = `🔑 *Quick Login Aplikasi Web Absenta*\n\n`;
    msg += `Halo Bapak/Ibu/Saudara *${name}*,\n\n`;
    msg += `Gunakan tautan di bawah ini untuk langsung masuk ke aplikasi web Absenta tanpa perlu mengetik email & kata sandi:\n\n`;
    msg += `🚀 *Tautan Akses Langsung:*\n`;
    msg += `${loginUrl}\n\n`;
    msg += `⚠️ *Catatan Keamanan:*\n`;
    msg += `• Tautan ini bersifat rahasia dan berlaku selama *24 jam*.\n`;
    msg += `• Jaga kerahasiaan tautan dan jangan bagikan kepada siapapun.\n\n`;
    msg += `💡 Ketik *ANGKA* menu lain (misal: 1) atau ketik *[0]* untuk Daftar Menu.`;

    return msg;
  }
}
