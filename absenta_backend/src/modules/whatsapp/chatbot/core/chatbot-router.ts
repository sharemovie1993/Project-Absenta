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
import { QuickLoginHandler } from '../handlers/common/quick-login.handler';
import { GuruPiketHandler } from '../handlers/guru/guru-piket.handler';
import { formatGuruMenu } from '../../services/wa-chatbot-commands';

export class ChatbotRouter {
  static async route(ctx: ChatbotContext): Promise<string> {
    const { cleanJid, messageText, guru, siswa, ortu, activeCount, activeRole, roles, commandUpper } = ctx;

    // 0. Quick Login (Pintasan 6) Universal
    if (commandUpper === '6' || commandUpper === 'LOGIN' || commandUpper === 'QUICK LOGIN') {
      return QuickLoginHandler.handleQuickLogin(ctx);
    }

    // 0b. Global Intent Matcher: Tarik Guru JP Command & Posisi Guru
    const upperMsg = (messageText || '').toUpperCase();
    if (
      upperMsg.includes('TARIK GURU') || 
      upperMsg.includes('TARIKGURU') || 
      upperMsg.includes('TARIK JP') || 
      upperMsg.includes('TARIK JADWAL') || 
      upperMsg.startsWith('!TARIKGURU')
    ) {
      return GuruJadwalHandler.handleTarikGuruJP(ctx);
    }

    if (
      upperMsg.includes('POSISI GURU') || 
      upperMsg.startsWith('POSISI ') || 
      upperMsg === 'POSISI' ||
      upperMsg === 'CEK POSISI'
    ) {
      return GuruJadwalHandler.handlePosisiGuru(ctx);
    }

    if (
      upperMsg.includes('IZIN KELUAR') ||
      upperMsg.includes('SISWA IZIN') ||
      upperMsg.includes('PIKET IZIN') ||
      upperMsg.includes('IZIN PIKET')
    ) {
      return GuruPiketHandler.handleSiswaIzinKeluar(ctx);
    }

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

    // 5. Guest / Unregistered User (Silent Mode: Jangan membalas pesan nomor luar/publik)
    if (activeCount === 0) {
      return '';
    }

    // 6. Multi-Role Menu Fallback
    const nama = guru?.nama_guru ?? siswa?.nama_siswa ?? ortu?.nama ?? 'Pengguna';
    return RoleSelectorHandler.formatMultiRole(nama, roles);
  }

  private static async routeGuru(ctx: ChatbotContext): Promise<string> {
    const choice = ctx.commandUpper;

    // [1] Jadwal KBM → masuk sub-menu
    if (choice === '1') return GuruJadwalHandler.handleJadwalKBMMenu(ctx);

    // Sub-menu Jadwal KBM
    if (choice === '11') return GuruJadwalHandler.handleJadwalHariIni(ctx);
    if (choice === '12') return GuruJadwalHandler.handleJadwalMingguan(ctx);
    if (choice === '13' || (choice.startsWith('13') && choice.length > 2)) {
      return GuruJadwalHandler.handleJadwalGuruLain(ctx);
    }
    if (choice === '14') return GuruJadwalHandler.handleJadwalKelas(ctx);
    if (choice === '15' || (choice.startsWith('15') && choice.length > 2)) {
      return GuruJadwalHandler.handlePosisiGuru(ctx);
    }

    // Pesan teks bebas — kemungkinan input nama guru (konteks [13]) atau nama kelas (konteks [14])
    const isNumericMenu = /^\d{1,2}$/.test(choice);
    if (!isNumericMenu && choice.length >= 2) {
      const isKnownCommand = ['LOGIN','QUICK LOGIN','TARIK GURU','TARIKGURU','TARIK JP','TARIK JADWAL','POSISI','IZIN','PIKET'].some(c => choice.includes(c));
      if (!isKnownCommand) {
        // Coba jadual kelas dulu jika input mirip nama kelas (ada huruf + angka/romawi)
        const looksLikeKelas = /[XIVLCD]{1,3}\s|kelas|IPA|IPS|TKJ|RPL|AK|MM|TKR/i.test(ctx.messageText || '');
        if (looksLikeKelas) {
          return GuruJadwalHandler.handleJadwalKelas(ctx);
        }
        return GuruJadwalHandler.handleJadwalGuruLain(ctx);
      }
    }

    // Menu utama (nomor baru)
    if (choice === '2' || choice === '21' || choice === '22' || choice === '23') return GuruPresensiHandler.handlePresensi(ctx);
    if (choice === '3') return GuruWalikelasHandler.handleDaftarWaliKelas(ctx);
    if (choice === '4') return GuruSupervisiHandler.handleSupervisi(ctx);
    if (choice === '5') return GuruProfileHandler.handleViewProfile(ctx);
    if (choice === '6') return QuickLoginHandler.handleQuickLogin(ctx);
    if (choice === '7' || choice.startsWith('7')) return GuruJadwalHandler.handleTarikGuruJP(ctx);
    if (choice === '8' || choice.startsWith('8')) return GuruJadwalHandler.handlePosisiGuru(ctx);
    if (choice === '9' || choice.startsWith('9')) return GuruPiketHandler.handleSiswaIzinKeluar(ctx);

    if (choice.startsWith('51') || choice.startsWith('41')) return GuruProfileHandler.handleEditNip(ctx);
    if (choice.startsWith('52') || choice.startsWith('42')) return GuruProfileHandler.handleEditEmail(ctx);

    if (choice === '' || choice === '0') {
      return formatGuruMenu(ctx.guru.nama_guru);
    }

    return formatGuruMenu(ctx.guru.nama_guru);
  }
}
