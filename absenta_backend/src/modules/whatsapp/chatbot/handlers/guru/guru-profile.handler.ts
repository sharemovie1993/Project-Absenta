import { ChatbotContext } from '../../core/chatbot-context';
import { chatbotSessionManager } from '../../core/session-state-manager';
import { guruService } from '@/modules/academic/guru/services/guru.service';

export class GuruProfileHandler {
  /**
   * MENU 5: View Data Profil Guru
   */
  static async handleViewProfile(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data profil Guru tidak ditemukan.';

    let msg = `👤 *Data Profil Pribadi Guru*\n\n`;
    msg += `• Nama              : *${guru.nama_guru}*\n`;
    msg += `• NIP               : ${guru.nip || '-'}\n`;
    msg += `• Email             : ${guru.User?.email || '-'}\n`;
    msg += `• Jabatan           : ${guru.jabatan || '-'}\n`;
    msg += `• Jenis PTK         : ${guru.jenis_ptk || '-'}\n`;
    msg += `• Status Kepegawaian: ${guru.status_kepegawaian || '-'}\n`;
    msg += `• Pendidikan        : ${guru.pendidikan_terakhir || '-'}\n`;
    msg += `• Pangkat/Golongan  : ${guru.pangkat_golongan || '-'}\n`;
    msg += `• Kartu RFID        : ${guru.no_rfid ? '✅ Terhubung' : '❌ Belum Ada'}\n\n`;
    msg += `⚙️ *Opsi Edit Profil:*\n`;
    msg += `[51] ✏️ Edit NIP\n`;
    msg += `[52] 📧 Edit Email\n\n`;
    msg += `💡 Ketik *51* untuk Edit NIP atau *52* untuk Edit Email.\n`;
    msg += `💡 Ketik *[0]* untuk Daftar Menu Utama.`;
    return msg;
  }

  static async handleEditNip(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const match = ctx.messageText.match(/^51(?:\s+(.+))?$/i);
    const inlineNip = (match?.[1] || '').trim();

    if (inlineNip) {
      return this.processUpdateNip(guru, inlineNip, ctx.cleanJid);
    }

    chatbotSessionManager.set(ctx.cleanJid, {
      flowId: 'GURU_EDIT_PROFILE',
      step: 'AWAITING_NEW_NIP',
    });

    return (
      `✏️ *Edit NIP Guru*\n\n` +
      `NIP Anda saat ini: *${guru.nip || '-'}*\n\n` +
      `Silakan ketik nomor *NIP Baru* Anda sekarang:\n` +
      `_(atau ketik *BATAL* untuk membatalkan)_`
    );
  }

  static async processUpdateNip(guru: any, newNip: string, cleanJid: string): Promise<string> {
    if (!newNip) {
      return `⚠️ Nomor NIP tidak boleh kosong.\nSilakan masukkan nomor NIP baru Anda (atau ketik *BATAL*):`;
    }
    try {
      // 🚀 Call Shared Domain Service Layer
      await guruService.updateGuruNip(guru.id, newNip);
      chatbotSessionManager.delete(cleanJid);
      return (
        `✅ *NIP Guru Berhasil Diperbarui!*\n\n` +
        `• Nama     : *${guru.nama_guru}*\n` +
        `• NIP Baru : *${newNip.trim()}*\n\n` +
        `💡 Ketik *5* untuk lihat Profil Pribadi atau *[0]* untuk Menu Utama.`
      );
    } catch (err: any) {
      return `⚠️ Gagal memperbarui NIP: ${err.message || 'Terjadi kesalahan sistem.'}`;
    }
  }

  static async handleEditEmail(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const match = ctx.messageText.match(/^52(?:\s+(.+))?$/i);
    const inlineEmail = (match?.[1] || '').trim().toLowerCase();

    if (inlineEmail) {
      return this.processUpdateEmail(guru, inlineEmail, ctx.cleanJid);
    }

    chatbotSessionManager.set(ctx.cleanJid, {
      flowId: 'GURU_EDIT_PROFILE',
      step: 'AWAITING_NEW_EMAIL',
    });

    return (
      `📧 *Edit Email Guru*\n\n` +
      `Email Anda saat ini: *${guru.User?.email || '-'}*\n\n` +
      `Silakan ketik alamat *Email Baru* Anda sekarang:\n` +
      `_(contoh: guru@sekolah.sch.id)_\n` +
      `_(atau ketik *BATAL* untuk membatalkan)_`
    );
  }

  static async processUpdateEmail(guru: any, newEmail: string, cleanJid: string): Promise<string> {
    if (!guru.user_id) {
      chatbotSessionManager.delete(cleanJid);
      return `⚠️ Akun pengguna untuk Guru ini tidak ditemukan di sistem. Hubungi Admin Sekolah.`;
    }

    try {
      // 🚀 Call Shared Domain Service Layer (Includes validation & duplicate check)
      const updatedUser = await guruService.updateGuruEmail(guru.user_id, newEmail);
      chatbotSessionManager.delete(cleanJid);
      return (
        `✅ *Email Guru Berhasil Diperbarui!*\n\n` +
        `• Nama       : *${guru.nama_guru}*\n` +
        `• Email Baru : *${updatedUser.email}*\n\n` +
        `💡 Ketik *5* untuk lihat Profil Pribadi atau *[0]* untuk Menu Utama.`
      );
    } catch (err: any) {
      return `⚠️ Gagal memperbarui Email: ${err.message || 'Terjadi kesalahan sistem.'}`;
    }
  }
}
