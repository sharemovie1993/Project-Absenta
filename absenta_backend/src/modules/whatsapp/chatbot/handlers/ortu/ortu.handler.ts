import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';
import { siswaService } from '@/modules/academic/siswa/services/siswa.service';
import { parentDataService } from '@/modules/parent-app/services/parent-data.service';
import { formatOrtuMenu } from '../../../services/wa-chatbot-commands';

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

    return formatOrtuMenu(ortu.nama);
  }
}
