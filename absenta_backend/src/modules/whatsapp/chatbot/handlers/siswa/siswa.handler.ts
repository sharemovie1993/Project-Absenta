import { ChatbotContext } from '../../core/chatbot-context';
import { siswaService } from '@/modules/academic/siswa/services/siswa.service';
import { formatSiswaMenu, getWhatsappActiveSemester } from '../../../services/wa-chatbot-commands';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '@/utils/prisma';

function getHariByTimezone(timezone = 'Asia/Jakarta'): string {
  const localDay = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(new Date());
  const map: Record<string, string> = {
    Sunday: 'MINGGU', Monday: 'SENIN', Tuesday: 'SELASA',
    Wednesday: 'RABU', Thursday: 'KAMIS', Friday: 'JUMAT', Saturday: 'SABTU',
  };
  return map[localDay] ?? 'SENIN';
}

export class SiswaHandler {
  static async handleCommand(ctx: ChatbotContext): Promise<string> {
    const choice = ctx.commandUpper;
    const siswa = ctx.siswa;
    if (!siswa) return '⚠️ Data Siswa tidak ditemukan.';

    // [1] Profil Pribadi Siswa
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

    // [2] Presensi Hari Ini (Via Shared Domain Service)
    if (choice === '2') {
      const { gerbang, status, jamTap, tglStr } = await siswaService.getPresensiHariIniBySiswaId(siswa.id);

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

    // [3] Poin Pelanggaran & Prestasi Siswa (Via Shared Domain Service)
    if (choice === '3') {
      const {
        totalPelanggaranPoin,
        totalPelanggaranCount,
        totalPrestasiPoin,
        totalPrestasiCount,
        pelanggaranTerbaru,
      } = await siswaService.getPoinBySiswaId(siswa.id);

      let msg = `🏆 *Catatan Poin Siswa*\nNama: *${siswa.nama_siswa}*\n\n`;
      msg += `📛 Total Poin Pelanggaran : *${totalPelanggaranPoin} poin* (${totalPelanggaranCount} catatan)\n`;
      msg += `⭐ Total Poin Prestasi    : *${totalPrestasiPoin} poin* (${totalPrestasiCount} pencapaian)\n`;

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

    // [4] Jadwal Pelajaran — Sub-menu entry point
    if (choice === '4') {
      const nama = siswa.Kelas?.nama_kelas || 'kelas Anda';
      return (
        `📅 *Jadwal Pelajaran — ${siswa.nama_siswa}*\n` +
        `🏫 Kelas: ${nama}\n\n` +
        `Pilih tampilan:\n\n` +
        `[41] 📋 Jadwal Hari Ini\n` +
        `[42] 📅 Jadwal 1 Minggu\n\n` +
        `[0] 🔄 Menu Utama`
      );
    }

    // [41] Jadwal Pelajaran Hari Ini
    if (choice === '41') {
      const tz = await getTenantTimezone(siswa.tenant_id);
      const currentDay = getHariByTimezone(tz);

      if (!siswa.kelas_id) {
        return `📅 *Jadwal Pelajaran*\n\nData kelas belum diset. Hubungi TU sekolah.\n\n💡 Ketik *[0]* untuk Menu Utama.`;
      }

      const activeSem = await getWhatsappActiveSemester(siswa.tenant_id);
      const jadwalHariIni = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: siswa.tenant_id,
          kelas_id: siswa.kelas_id,
          hari: currentDay as any,
          ...(activeSem ? { semester_id: activeSem.id } : {}),
        },
        include: {
          Mapel: { select: { nama_mapel: true } },
          Guru: { select: { nama_guru: true } },
        },
        orderBy: { slot_index: 'asc' },
      });

      if (jadwalHariIni.length === 0) {
        return (
          `📋 *Jadwal Hari Ini (${currentDay})*\n` +
          `🏫 Kelas: *${siswa.Kelas?.nama_kelas || '-'}*\n\n` +
          `Tidak ada jadwal KBM hari ini. 😊\n\n` +
          `💡 Ketik *[42]* untuk lihat 1 minggu atau *[0]* Menu Utama.`
        );
      }

      let msg = `📋 *Jadwal Pelajaran Hari Ini (${currentDay})*\n`;
      msg += `🏫 Kelas: *${siswa.Kelas?.nama_kelas || '-'}*\n\n`;
      jadwalHariIni.forEach((j, idx) => {
        const mapel = (j as any).Mapel?.nama_mapel || '-';
        const guru = (j as any).Guru?.nama_guru || '-';
        msg += `${idx + 1}. ⏱️ ${j.jam_mulai}–${j.jam_selesai} │ 📖 ${mapel}\n`;
        msg += `   👨‍🏫 ${guru}\n\n`;
      });
      msg += `💡 Ketik *[42]* untuk jadwal 1 minggu atau *[0]* Menu Utama.`;
      return msg;
    }

    // [42] Jadwal Pelajaran 1 Minggu
    if (choice === '42') {
      if (!siswa.kelas_id) {
        return `📅 *Jadwal Pelajaran*\n\nData kelas belum diset. Hubungi TU sekolah.\n\n💡 Ketik *[0]* untuk Menu Utama.`;
      }

      const activeSem = await getWhatsappActiveSemester(siswa.tenant_id);
      const hariUrut = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

      const jadwalMinggu = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: siswa.tenant_id,
          kelas_id: siswa.kelas_id,
          ...(activeSem ? { semester_id: activeSem.id } : {}),
        },
        include: {
          Mapel: { select: { nama_mapel: true } },
          Guru: { select: { nama_guru: true } },
        },
        orderBy: [{ hari: 'asc' }, { slot_index: 'asc' }],
      });

      if (jadwalMinggu.length === 0) {
        return (
          `📅 *Jadwal 1 Minggu*\n` +
          `🏫 Kelas: *${siswa.Kelas?.nama_kelas || '-'}*\n\n` +
          `Belum ada jadwal KBM untuk kelas ini.\n\n` +
          `💡 Ketik *[0]* untuk Menu Utama.`
        );
      }

      const grouped: Record<string, typeof jadwalMinggu> = {};
      jadwalMinggu.forEach(j => {
        const h = j.hari as string;
        if (!grouped[h]) grouped[h] = [];
        grouped[h].push(j);
      });

      let msg = `📅 *Jadwal Pelajaran 1 Minggu*\n`;
      msg += `🏫 Kelas: *${siswa.Kelas?.nama_kelas || '-'}*\n\n`;

      hariUrut.forEach(hari => {
        const items = grouped[hari];
        if (!items || items.length === 0) return;
        msg += `📌 *${hari}*\n`;
        items.forEach((j, idx) => {
          const isLast = idx === items.length - 1;
          const branch = isLast ? '└' : '├';
          const mapel = (j as any).Mapel?.nama_mapel || '-';
          const guru = (j as any).Guru?.nama_guru || '-';
          msg += ` ${branch} ⏱️ ${j.jam_mulai}–${j.jam_selesai} │ 📖 ${mapel} (${guru})\n`;
        });
        msg += `\n`;
      });

      msg += `💡 Ketik *[41]* untuk hari ini atau *[0]* Menu Utama.`;
      return msg;
    }

    // [5] Rekap Kehadiran Bulan Ini (Via Shared Domain Service)
    if (choice === '5') {
      const { bulanStr, hadir, terlambat, izinSakit, alpa } = await siswaService.getRekapKehadiranBulanIniBySiswaId(siswa.id);

      let msg = `📊 *Rekap Kehadiran Bulan ${bulanStr}*\nNama: *${siswa.nama_siswa}*\n\n`;
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
