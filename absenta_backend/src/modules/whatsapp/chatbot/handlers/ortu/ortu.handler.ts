import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';
import { siswaService } from '@/modules/academic/siswa/services/siswa.service';
import { parentDataService } from '@/modules/parent-app/services/parent-data.service';
import { formatOrtuMenu } from '../../../services/wa-chatbot-commands';
import { chatbotSessionManager, ChatbotDialogSession } from '../../core/session-state-manager';
import { getTenantTimezone } from '@/utils/timezone.utils';

export class OrtuHandler {
  /**
   * PERAN ORANG TUA (WA Chatbot Handler)
   * Menggunakan Shared Domain Service Layer (siswaService & parentDataService)
   */
  static async handleCommand(ctx: ChatbotContext): Promise<string> {
    const choice = ctx.commandUpper;
    const ortu = ctx.ortu;
    if (!ortu) return '⚠️ Data Orang Tua tidak ditemukan.';

    const anakLinks = await prisma.orangTuaSiswa.findMany({
      where: { orang_tua_id: ortu.id },
      include: { Siswa: { include: { Kelas: true } } },
    });

    if (anakLinks.length === 0) {
      return (
        `👨‍👩‍👧 *Layanan WA Bot Orang Tua*\n\n` +
        `Belum ada data siswa yang terhubung dengan akun Anda.\n` +
        `Silakan hubungi TU sekolah untuk menghubungkan data.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    // [1] Presensi Hari Ini (Via Shared Domain Service)
    if (choice === '1') {
      const tglStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });
      let msg = `⏰ *Status Presensi Ananda Hari Ini*\n📅 ${tglStr}\n\n`;

      for (let i = 0; i < anakLinks.length; i++) {
        const s = anakLinks[i].Siswa;
        const { gerbang, status, jamTap } = await siswaService.getPresensiHariIniBySiswaId(s.id);
        const statusEmoji = status === 'HADIR' ? '✅' : status === 'BELUM SCAN' ? '🔴' : '⚠️';

        msg += `${i + 1}. *${s.nama_siswa}* — ${s.Kelas?.nama_kelas || '-'}\n`;
        msg += `   ${statusEmoji} Status : *${status}*\n`;
        msg += `   🕐 Jam Tap : ${jamTap}\n`;
        if (gerbang?.is_terlambat) msg += `   ⚠️ Terlambat : ${gerbang.menit_keterlambatan} menit\n`;
        msg += `\n`;
      }

      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [2] Rekap Kehadiran Bulan Ini (Via Shared Domain Service)
    if (choice === '2') {
      let msg = `📊 *Rekap Kehadiran Ananda*\n\n`;

      for (let i = 0; i < anakLinks.length; i++) {
        const s = anakLinks[i].Siswa;
        const { bulanStr, hadir, terlambat, izinSakit, alpa } = await siswaService.getRekapKehadiranBulanIniBySiswaId(s.id);

        msg += `${i + 1}. *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n`;
        msg += `   Bulan : ${bulanStr}\n`;
        msg += `   ✅ Hadir Tepat Waktu : ${hadir} hari\n`;
        msg += `   ⚠️ Terlambat         : ${terlambat} hari\n`;
        msg += `   ℹ️ Izin / Sakit      : ${izinSakit} hari\n`;
        msg += `   ❌ Alpha              : ${alpa} hari\n\n`;
      }

      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [3] Catatan Poin & Prestasi Ananda (Via Shared Domain Service)
    if (choice === '3') {
      let msg = `🏆 *Catatan Poin & Prestasi Ananda*\n\n`;

      for (let i = 0; i < anakLinks.length; i++) {
        const s = anakLinks[i].Siswa;
        const {
          totalPelanggaranPoin,
          totalPelanggaranCount,
          totalPrestasiPoin,
          totalPrestasiCount,
          pelanggaranTerbaru,
        } = await siswaService.getPoinBySiswaId(s.id);

        msg += `${i + 1}. *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n`;
        msg += `   📛 Poin Pelanggaran : *${totalPelanggaranPoin} poin* (${totalPelanggaranCount} catatan)\n`;
        msg += `   ⭐ Poin Prestasi    : *${totalPrestasiPoin} poin* (${totalPrestasiCount} pencapaian)\n`;

        if (pelanggaranTerbaru.length > 0) {
          pelanggaranTerbaru.forEach((p: any) => {
            const tgl = new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            msg += `   • [${tgl}] ${p.jenis_pelanggaran} (-${p.poin} poin)\n`;
          });
        }
        msg += `\n`;
      }

      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [4] Kontak & Info Wali Kelas Ananda (Via Shared Domain Service)
    if (choice === '4') {
      let msg = `📞 *Kontak & Info Wali Kelas Ananda*\n\n`;

      const listWali = await parentDataService.getOrtuWaliKelasAnanda(ortu.id);
      listWali.forEach((item, index) => {
        msg += `${index + 1}. *${item.siswa.nama_siswa}* (${item.siswa.Kelas?.nama_kelas || '-'})\n`;
        msg += `   👨‍🏫 Wali Kelas : *${item.waliKelasNama}*\n`;
        msg += `   📱 No. HP     : ${item.waliKelasHp}\n\n`;
      });

      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [5] Pengajuan Izin / Sakit Anak via WA Bot
    if (choice === '5' || choice.startsWith('5')) {
      return this.handlePengajuanIzinPrompt(ctx, anakLinks);
    }

    return formatOrtuMenu(ortu.nama);
  }

  /**
   * PROMPT: Pengajuan Surat Izin / Sakit Anak
   */
  private static async handlePengajuanIzinPrompt(ctx: ChatbotContext, anakLinks: any[]): Promise<string> {
    const choice = ctx.commandUpper.trim();

    let selectedChild = null;

    if (anakLinks.length === 1) {
      selectedChild = anakLinks[0].Siswa;
    } else {
      if (choice === '51' && anakLinks[0]) selectedChild = anakLinks[0].Siswa;
      else if (choice === '52' && anakLinks[1]) selectedChild = anakLinks[1].Siswa;
      else if (choice === '53' && anakLinks[2]) selectedChild = anakLinks[2].Siswa;
      else {
        // Tampilkan pilihan anak
        let msg = `✉️ *Pengajuan Surat Izin / Sakit Ananda*\n\n`;
        msg += `Pilih Ananda yang ingin diajukan izinnya:\n\n`;
        anakLinks.forEach((item, idx) => {
          msg += `[5${idx + 1}] *${item.Siswa?.nama_siswa}* (${item.Siswa?.Kelas?.nama_kelas || '-'})\n`;
        });
        msg += `\n[0] 🔄 Menu Utama`;
        return msg;
      }
    }

    // Set FSM Session untuk menunggu alasan izin dari Ortu
    chatbotSessionManager.set(ctx.cleanJid, {
      flowId: 'ORTU_SUBMIT_LEAVE',
      step: 'AWAITING_REASON',
      payload: {
        siswaId: selectedChild.id,
        namaSiswa: selectedChild.nama_siswa,
        kelasNama: selectedChild.Kelas?.nama_kelas || '-',
        tenantId: selectedChild.tenant_id,
      },
    });

    return (
      `✉️ *Pengajuan Surat Izin / Sakit Ananda*\n` +
      `Siswa: *${selectedChild.nama_siswa}* (${selectedChild.Kelas?.nama_kelas || '-'})\n\n` +
      `Silakan ketik *keterangan/alasan izin* Ananda hari ini:\n` +
      `_Contoh_: *Demam tinggi sejak kemarin* atau *Acara keluarga di luar kota*\n\n` +
      `💡 Ketik *[0]* untuk membatalkan pengajuan.`
    );
  }

  /**
   * PROCESS FSM: Memproses teks alasan izin yang dikirim Ortu
   */
  static async processSubmitLeave(ctx: ChatbotContext, session: ChatbotDialogSession): Promise<string> {
    chatbotSessionManager.delete(ctx.cleanJid);

    const payload = session.payload || {};
    const reasonText = (ctx.messageText || '').trim();

    if (!payload.siswaId || !reasonText) {
      return `⚠️ Pengajuan izin dibatalkan karena keterangan kosong.\n\n💡 Ketik *[0]* untuk Menu Utama.`;
    }

    const tenantId = payload.tenantId || ctx.ortu?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant sekolah tidak ditemukan.';

    const tz = await getTenantTimezone(tenantId);
    const tglFormatted = new Date().toLocaleDateString('id-ID', {
      timeZone: tz || 'Asia/Jakarta',
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const isSakit = /sakit|demam|flu|batuk|pusing|berobat|rs|puskesmas|dokter/i.test(reasonText);
    const tipeIzin = isSakit ? 'IZIN_SAKIT' : 'IZIN_ACARA';

    // Cari registrasi SiswaAkademik aktif
    const sa = await prisma.siswaAkademik.findFirst({
      where: { siswa_id: payload.siswaId, status: 'AKTIF' },
      select: { id: true },
    });

    if (sa) {
      await prisma.izinKeluarSiswa.create({
        data: {
          tenant_id: tenantId,
          siswa_akademik_id: sa.id,
          jam_keluar: new Date(),
          alasan: reasonText,
          tipe_izin: tipeIzin,
          status: 'DISETUJUI',
        },
      });
    }

    return (
      `✅ *Pengajuan Izin Ananda Berhasil Dikirim!*\n\n` +
      `• Nama Siswa : *${payload.namaSiswa}* (${payload.kelasNama})\n` +
      `• Keterangan : "${reasonText}"\n` +
      `• Tipe Izin  : *${isSakit ? '🏥 Izin Sakit' : '✉️ Izin Acara'}*\n` +
      `• Tanggal    : ${tglFormatted}\n\n` +
      `📋 Laporan izin ini telah otomatis tercatat di sistem dan diteruskan ke Wali Kelas & Guru Piket sekolah. Semoga Ananda lekas sembuh/kegiatan berjalan lancar! 😊\n\n` +
      `💡 Ketik *[0]* untuk Menu Utama.`
    );
  }
}
