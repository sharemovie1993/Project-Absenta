import { ChatbotContext } from './chatbot-context';
import { chatbotSessionManager } from './session-state-manager';
import { GuruProfileHandler } from '../handlers/guru/guru-profile.handler';
import { GuruJadwalHandler } from '../handlers/guru/guru-jadwal.handler';
import { GuruSupervisiHandler } from '../handlers/guru/guru-supervisi.handler';
import { GuruPresensiHandler } from '../handlers/guru/guru-presensi.handler';
import { GuruWalikelasHandler } from '../handlers/guru/guru-walikelas.handler';
import { SiswaHandler } from '../handlers/siswa/siswa.handler';
import { OrtuHandler } from '../handlers/ortu/ortu.handler';
import { RoleSelectorHandler } from '../handlers/common/role-selector.handler';
import { formatGuruMenu } from '../../services/wa-chatbot-commands';

export class ChatbotRouter {
  static async route(ctx: ChatbotContext): Promise<string> {
    const { cleanJid, commandUpper, messageText, guru, siswa, ortu, activeCount, activeRole, roles } = ctx;

    // 1. Cek Sesi Dialog FSM yang Sedang Aktif
    const pendingSession = chatbotSessionManager.get(cleanJid);

    if (pendingSession) {
      if (chatbotSessionManager.isCancellation(messageText)) {
        chatbotSessionManager.delete(cleanJid);
        return (
          `🚫 *Pengubahan Dibatalkan.*\n\n` +
          `💡 Ketik *5* untuk Profil Pribadi atau *[0]* untuk Menu Utama.`
        );
      }

      if (pendingSession.flowId === 'GURU_EDIT_PROFILE') {
        if (pendingSession.step === 'AWAITING_NEW_NIP' && guru) {
          return GuruProfileHandler.processUpdateNip(guru, messageText.trim(), cleanJid);
        }
        if (pendingSession.step === 'AWAITING_NEW_EMAIL' && guru) {
          return GuruProfileHandler.processUpdateEmail(guru, messageText.trim(), cleanJid);
        }
      }
    }

    // 2. Routing Persona Guru
    if (activeRole === 'G' && guru) {
      return this.routeGuru(ctx);
    }

    // 3. Routing Persona Siswa
    if (activeRole === 'S' && siswa) {
      return SiswaHandler.handleCommand(ctx);
    }

    // 4. Routing Persona Orang Tua
    if (activeRole === 'O' && ortu) {
      return OrtuHandler.handleCommand(ctx);
    }

    // 5. Guest / Unregistered User
    if (activeCount === 0) {
      return RoleSelectorHandler.formatGuest(ctx.resolvedPhone);
    }

    // 6. Multi-Role Menu Fallback
    const nama = guru?.nama_guru ?? siswa?.nama_siswa ?? ortu?.nama ?? 'Pengguna';
    return RoleSelectorHandler.formatMultiRole(nama, roles);
  }

  private static async routeGuru(ctx: ChatbotContext): Promise<string> {
    const choice = ctx.commandUpper;

    if (choice === '1') return GuruJadwalHandler.handleJadwalHariIni(ctx);
    if (choice === '2') return GuruWalikelasHandler.handleDaftarWaliKelas(ctx);
    if (choice === '3') return GuruSupervisiHandler.handleSupervisi(ctx);
    if (choice === '4') return GuruPresensiHandler.handlePresensi(ctx);
    if (choice === '5') return GuruProfileHandler.handleViewProfile(ctx);
    if (choice === '6') return GuruJadwalHandler.handleJadwalMingguan(ctx);

    if (choice.startsWith('51')) return GuruProfileHandler.handleEditNip(ctx);
    if (choice.startsWith('52')) return GuruProfileHandler.handleEditEmail(ctx);

    if (choice === '' || choice === '0') {
      return formatGuruMenu(ctx.guru.nama_guru);
    }

    return formatGuruMenu(ctx.guru.nama_guru);
  }
}
