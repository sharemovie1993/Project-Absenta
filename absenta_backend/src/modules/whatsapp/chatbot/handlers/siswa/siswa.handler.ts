import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';
import { aggregateJadwal, formatSiswaMenu } from '../../../services/wa-chatbot-commands';

function getHariWIB(): string {
  const jakartaDay = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
  });
  const map: Record<string, string> = {
    Sunday: 'MINGGU', Monday: 'SENIN', Tuesday: 'SELASA',
    Wednesday: 'RABU', Thursday: 'KAMIS', Friday: 'JUMAT', Saturday: 'SABTU',
  };
  return map[jakartaDay] ?? 'SENIN';
}

function getTanggalWIB(): Date {
  const now = new Date();
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
  return new Date(wibMs);
}

export class SiswaHandler {
  static async handleCommand(ctx: ChatbotContext): Promise<string> {
    const choice = ctx.commandUpper;
    const siswa = ctx.siswa;
    if (!siswa) return '⚠️ Data Siswa tidak ditemukan.';

    // [1] Profil Pribadi
    if (choice === '1') {
      const kelas = siswa.Kelas?.nama_kelas || '-';
      const jurusan = siswa.Jurusan?.nama || '-';
      let msg = `👤 *Data Profil Pribadi Siswa*\n\n`;
      msg += `• Nama    : *${siswa.nama_siswa}*\n`;
      msg += `• NIS     : ${siswa.nis || '-'}\n`;
      msg += `• NISN    : ${siswa.nisn || '-'}\n`;
      msg += `• Kelas   : ${kelas}\n`;
      msg += `• Jurusan : ${jurusan}\n`;
      msg += `• Status  : *${siswa.status || 'AKTIF'}*\n`;
      msg += `• RFID    : ${siswa.no_rfid ? '✅ Terhubung' : '❌ Belum Ada'}\n\n`;
      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [2] Presensi Hari Ini
    if (choice === '2') {
      const today = getTanggalWIB();
      today.setUTCHours(0, 0, 0, 0);

      const gerbang = await prisma.absenGerbangSiswa.findFirst({
        where: { siswa_id: siswa.id, created_at: { gte: today } },
        orderBy: { created_at: 'desc' },
      });

      const status = gerbang ? gerbang.status : 'BELUM SCAN';
      const jamTap = gerbang?.waktu_tap
        ? new Date(gerbang.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';
      const tglStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });

      let msg = `⏰ *Status Presensi Hari Ini*\n`;
      msg += `📅 ${tglStr}\n\n`;
      msg += `• Nama         : *${siswa.nama_siswa}*\n`;
      msg += `• Status Gate  : *${status}*\n`;
      msg += `• Jam Tap      : ${jamTap}\n`;
      if (gerbang?.is_terlambat) {
        msg += `• ⚠️ Terlambat  : ${gerbang.menit_keterlambatan || 0} menit\n`;
      }
      msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [3] Poin Pelanggaran & Prestasi
    if (choice === '3') {
      const [pelanggaran, prestasiResult, pelanggaranTerbaru] = await Promise.all([
        prisma.pelanggaranSiswa.aggregate({
          where: { siswa_id: siswa.id },
          _sum: { poin: true },
          _count: { id: true },
        }),
        prisma.prestasiSiswa.aggregate({
          where: { siswa_id: siswa.id },
          _sum: { poin: true },
          _count: { id: true },
        }).catch(() => ({ _sum: { poin: 0 }, _count: { id: 0 } })),
        prisma.pelanggaranSiswa.findMany({
          where: { siswa_id: siswa.id },
          orderBy: { created_at: 'desc' },
          take: 3,
          select: { jenis_pelanggaran: true, poin: true, tanggal: true },
        }),
      ]);

      let msg = `🏆 *Catatan Poin Siswa*\nNama: *${siswa.nama_siswa}*\n\n`;
      msg += `📛 Total Poin Pelanggaran : *${pelanggaran._sum.poin || 0} poin* (${pelanggaran._count.id} catatan)\n`;
      msg += `⭐ Total Poin Prestasi    : *${prestasiResult._sum?.poin || 0} poin* (${prestasiResult._count?.id || 0} pencapaian)\n`;

      if (pelanggaranTerbaru.length > 0) {
        msg += `\n📋 *Pelanggaran Terbaru:*\n`;
        pelanggaranTerbaru.forEach((p: any) => {
          const tgl = new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
          msg += `• [${tgl}] ${p.jenis_pelanggaran} (-${p.poin} poin)\n`;
        });
      }
      msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [4] Jadwal Pelajaran Hari Ini
    if (choice === '4') {
      const currentDay = getHariWIB();

      if (!siswa.kelas_id) {
        return `📅 *Jadwal Pelajaran*\n\nData kelas belum diset. Hubungi TU sekolah.\n\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      }

      const jadwal = await prisma.jadwalKBM.findMany({
        where: { kelas_id: siswa.kelas_id, hari: currentDay as any },
        include: { Mapel: true, Guru: { select: { nama_guru: true } } },
        orderBy: { slot_index: 'asc' },
      });

      if (jadwal.length === 0) {
        return (
          `📅 *Jadwal Pelajaran Hari Ini (${currentDay})*\n\n` +
          `Tidak ada jadwal KBM hari ini. Libur/kosong. 😊\n\n` +
          `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
        );
      }

      const aggregated = aggregateJadwal(jadwal);

      let msg = `📅 *Jadwal Pelajaran Hari Ini (${currentDay})*\nKelas: *${siswa.Kelas?.nama_kelas || '-'}*\n\n`;
      aggregated.forEach((j: any, i: number) => {
        const jamLabel = j.startSlot === j.endSlot
          ? `Jam ke-${j.startSlot}`
          : `Jam ke-${j.startSlot} s/d ${j.endSlot}`;
        msg += `${i + 1}. *${j.jam_mulai} – ${j.jam_selesai}* (${jamLabel})\n`;
        msg += `   📖 ${j.Mapel?.nama_mapel || '-'}\n`;
        msg += `   👨‍🏫 ${j.Guru?.nama_guru || '-'}\n\n`;
      });
      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    // [5] Rekap Kehadiran Bulan Ini
    if (choice === '5') {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const bulan = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      const [hadir, terlambat, izinSakit, alpa] = await Promise.all([
        prisma.absenGerbangSiswa.count({ where: { siswa_id: siswa.id, created_at: { gte: firstDay }, status: 'HADIR' } }),
        prisma.absenGerbangSiswa.count({ where: { siswa_id: siswa.id, created_at: { gte: firstDay }, is_terlambat: true } }),
        prisma.absenGerbangSiswa.count({ where: { siswa_id: siswa.id, created_at: { gte: firstDay }, status: { in: ['IZIN', 'SAKIT', 'DISPEN'] } } }),
        prisma.absenGerbangSiswa.count({ where: { siswa_id: siswa.id, created_at: { gte: firstDay }, status: 'ALPA' } }),
      ]);

      let msg = `📊 *Rekap Kehadiran Bulan ${bulan}*\nNama: *${siswa.nama_siswa}*\n\n`;
      msg += `✅ Hadir Tepat Waktu : ${hadir} hari\n`;
      msg += `⚠️ Terlambat         : ${terlambat} hari\n`;
      msg += `ℹ️ Izin / Sakit      : ${izinSakit} hari\n`;
      msg += `❌ Alpha              : ${alpa} hari\n`;
      msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      return msg;
    }

    return formatSiswaMenu(siswa.nama_siswa);
  }
}
