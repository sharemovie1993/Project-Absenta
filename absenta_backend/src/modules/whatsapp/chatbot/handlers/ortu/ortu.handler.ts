import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';
import { formatOrtuMenu } from '../../../services/wa-chatbot-commands';

function getTanggalWIB(): Date {
  const now = new Date();
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
  return new Date(wibMs);
}

export class OrtuHandler {
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

    // [1] Presensi Hari Ini
    if (choice === '1') {
      const today = getTanggalWIB();
      today.setUTCHours(0, 0, 0, 0);
      const tglStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });

      let msg = `⏰ *Status Presensi Ananda Hari Ini*\n📅 ${tglStr}\n\n`;

      for (let i = 0; i < anakLinks.length; i++) {
        const s = anakLinks[i].Siswa;
        const gerbang = await prisma.absenGerbangSiswa.findFirst({
          where: { siswa_id: s.id, created_at: { gte: today } },
          orderBy: { created_at: 'desc' },
        });
        const status = gerbang ? gerbang.status : 'BELUM SCAN';
        const jam = gerbang?.waktu_tap
          ? new Date(gerbang.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-';

        const statusEmoji = status === 'HADIR' ? '✅' : status === 'BELUM SCAN' ? '🔴' : '⚠️';
        msg += `${i + 1}. *${s.nama_siswa}* — ${s.Kelas?.nama_kelas || '-'}\n`;
        msg += `   ${statusEmoji} Status : *${status}*\n`;
        msg += `   🕐 Jam Tap : ${jam}\n`;
        if (gerbang?.is_terlambat) msg += `   ⚠️ Terlambat : ${gerbang.menit_keterlambatan} menit\n`;
        msg += `\n`;
      }

      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [2] Rekap Kehadiran Bulan Ini
    if (choice === '2') {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const bulan = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      let msg = `📊 *Rekap Kehadiran Ananda — ${bulan}*\n\n`;

      for (let i = 0; i < anakLinks.length; i++) {
        const s = anakLinks[i].Siswa;
        const [hadir, terlambat, izin, alpa] = await Promise.all([
          prisma.absenGerbangSiswa.count({ where: { siswa_id: s.id, created_at: { gte: firstDay }, status: 'HADIR' } }),
          prisma.absenGerbangSiswa.count({ where: { siswa_id: s.id, created_at: { gte: firstDay }, is_terlambat: true } }),
          prisma.absenGerbangSiswa.count({ where: { siswa_id: s.id, created_at: { gte: firstDay }, status: { in: ['IZIN', 'SAKIT', 'DISPEN'] } } }),
          prisma.absenGerbangSiswa.count({ where: { siswa_id: s.id, created_at: { gte: firstDay }, status: 'ALPA' } }),
        ]);

        msg += `${i + 1}. *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n`;
        msg += `   ✅ Hadir Tepat Waktu : ${hadir} hari\n`;
        msg += `   ⚠️ Terlambat         : ${terlambat} hari\n`;
        msg += `   ℹ️ Izin / Sakit      : ${izin} hari\n`;
        msg += `   ❌ Alpha              : ${alpa} hari\n\n`;
      }

      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [3] Catatan Poin & Prestasi Ananda
    if (choice === '3') {
      let msg = `🏆 *Catatan Poin & Prestasi Ananda*\n\n`;

      for (let i = 0; i < anakLinks.length; i++) {
        const s = anakLinks[i].Siswa;
        const [pelanggaran, prestasi, pelanggaranTerbaru] = await Promise.all([
          prisma.pelanggaranSiswa.aggregate({
            where: { siswa_id: s.id },
            _sum: { poin: true },
            _count: { id: true },
          }),
          prisma.prestasiSiswa.aggregate({
            where: { siswa_id: s.id },
            _sum: { poin: true },
            _count: { id: true },
          }).catch(() => ({ _sum: { poin: 0 }, _count: { id: 0 } })),
          prisma.pelanggaranSiswa.findMany({
            where: { siswa_id: s.id },
            orderBy: { created_at: 'desc' },
            take: 2,
            select: { jenis_pelanggaran: true, poin: true, tanggal: true },
          }),
        ]);

        msg += `${i + 1}. *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n`;
        msg += `   📛 Poin Pelanggaran : *${pelanggaran._sum.poin || 0} poin* (${pelanggaran._count.id} catatan)\n`;
        msg += `   ⭐ Poin Prestasi    : *${prestasi._sum?.poin || 0} poin* (${prestasi._count?.id || 0} pencapaian)\n`;

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

    // [4] Kontak & Info Wali Kelas Ananda
    if (choice === '4') {
      let msg = `📞 *Kontak & Info Wali Kelas Ananda*\n\n`;

      for (let i = 0; i < anakLinks.length; i++) {
        const s = anakLinks[i].Siswa;
        let wali: any = null;

        if (s.kelas_id) {
          try {
            wali = await prisma.organizationalAssignment.findFirst({
              where: {
                kelas_id: s.kelas_id,
                is_active: true,
                Position: { OR: [{ code: 'WALIKELAS' }, { name: { contains: 'Wali', mode: 'insensitive' } }] },
              },
              include: {
                User: { include: { Guru: { select: { nama_guru: true, no_hp: true } } } },
              },
            });
          } catch {
            wali = null;
          }
        }

        const waliNama = wali?.User?.Guru?.nama_guru || wali?.User?.name || 'Belum ditentukan';
        const waliHp = wali?.User?.Guru?.no_hp || wali?.User?.no_hp || '-';

        msg += `${i + 1}. *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n`;
        msg += `   👨‍🏫 Wali Kelas : *${waliNama}*\n`;
        msg += `   📱 No. HP     : ${waliHp}\n\n`;
      }

      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    return formatOrtuMenu(ortu.nama);
  }
}
