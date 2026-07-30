import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';

export class GuruSupervisiHandler {
  static async handleSupervisi(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const supervisiList = await prisma.supervisiGuru.findMany({
      where: { guru_id: guru.id },
      orderBy: { tanggal: 'desc' },
      include: { Supervisor: { select: { nama_guru: true } } },
      take: 5,
    });

    if (supervisiList.length === 0) {
      return (
        `📊 *Info Supervisi Akademik*\n\n` +
        `Belum ada riwayat atau jadwal supervisi akademik yang terdaftar untuk Bapak/Ibu *${guru.nama_guru}*.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    let msg = `📊 *Info Supervisi Akademik Saya*\n`;
    msg += `Guru: *${guru.nama_guru}*\n`;
    msg += `Total: ${supervisiList.length} supervisi terbaru\n\n`;

    supervisiList.forEach((s: any, i: number) => {
      const tglStr = new Date(s.tanggal).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const statusUpper = String(s.status || '').toUpperCase();
      let statusBadge = `⚪ *${statusUpper}*`;
      if (statusUpper === 'COMPLETED' || statusUpper === 'SELESAI') {
        statusBadge = '🟢 *SELESAI*';
      } else if (statusUpper === 'SCHEDULED' || statusUpper === 'TERJADWAL') {
        statusBadge = '🟡 *TERJADWAL*';
      } else if (statusUpper === 'DRAFT' || statusUpper === 'PROSES') {
        statusBadge = '🔵 *PROSES*';
      }

      let predikat = '';
      if (typeof s.nilai === 'number') {
        if (s.nilai >= 90) predikat = '(Sangat Baik 🌟)';
        else if (s.nilai >= 80) predikat = '(Baik 👍)';
        else if (s.nilai >= 70) predikat = '(Cukup 👌)';
        else predikat = '(Perlu Perbaikan ⚠️)';
      }

      msg += `${i + 1}. 📅 *${tglStr}*\n`;
      msg += `   • Status        : ${statusBadge}\n`;
      msg += `   • Supervisor    : ${s.Supervisor?.nama_guru || 'Tim Penilai'}\n`;

      if (s.mapel || s.kelas || s.jam_ke) {
        const detailParts: string[] = [];
        if (s.mapel)  detailParts.push(`📖 ${s.mapel}`);
        if (s.kelas)  detailParts.push(`🏫 ${s.kelas}`);
        if (s.jam_ke) detailParts.push(`Jam ke-${s.jam_ke}`);
        msg += `   • Kegiatan      : ${detailParts.join(' | ')}\n`;
      }

      if (typeof s.nilai === 'number') {
        msg += `   • Nilai Hasil   : 💯 *${s.nilai}/100* ${predikat}\n`;
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
