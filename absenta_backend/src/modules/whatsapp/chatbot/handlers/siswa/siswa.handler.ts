import { ChatbotContext } from '../../core/chatbot-context';
import { siswaService } from '@/modules/academic/siswa/services/siswa.service';
import { jadwalKBMService } from '@/modules/kurikulum/jadwal-kbm/services/jadwal-kbm.service';
import { formatSiswaMenu } from '../../../services/wa-chatbot-commands';
import { getTenantTimezone } from '@/utils/timezone.utils';

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

    // [4] Jadwal Pelajaran Hari Ini (Via Shared Domain Service)
    if (choice === '4') {
      const tz = await getTenantTimezone(siswa.tenant_id);
      const currentDay = getHariByTimezone(tz);

      if (!siswa.kelas_id) {
        return `📅 *Jadwal Pelajaran*\n\nData kelas belum diset. Hubungi TU sekolah.\n\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
      }

      const { items: dayItems } = await jadwalKBMService.getJadwalHariIniByGuru(siswa.id, siswa.tenant_id, currentDay);


      let msg = `📅 *Jadwal Pelajaran Hari Ini (${currentDay})*\nKelas: *${siswa.Kelas?.nama_kelas || '-'}*\n\n`;
      if (dayItems.length === 0) {
        return (
          `📅 *Jadwal Pelajaran Hari Ini (${currentDay})*\n\n` +
          `Tidak ada jadwal KBM hari ini. Libur/kosong. 😊\n\n` +
          `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
        );
      }

      dayItems.forEach((j: any, i: number) => {
        const timeHeader = j.jamMulai && j.jamSelesai ? `${j.jamMulai} – ${j.jamSelesai}` : j.jamLabel;
        msg += `${i + 1}. *${timeHeader}* (${j.jamLabel})\n`;
        msg += `   📖 ${j.title}\n\n`;
      });

      msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
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
