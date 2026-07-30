import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';

export class GuruPresensiHandler {
  static async handlePresensi(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const now = new Date();
    const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
    const nowWib = new Date(wibMs);

    const y = nowWib.getFullYear();
    const m = nowWib.getMonth();
    const d = nowWib.getDate();

    const startToday = new Date(Date.UTC(y, m, d, -7, 0, 0, 0));
    const endToday = new Date(Date.UTC(y, m, d, 16, 59, 59, 999));
    const firstDayMonth = new Date(Date.UTC(y, m, 1, -7, 0, 0, 0));

    const bulanStr = nowWib.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const hariTglStr = nowWib.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const gerbangToday = await prisma.absenGerbangGuru.findMany({
      where: {
        guru_id: guru.id,
        created_at: { gte: startToday, lte: endToday }
      },
      orderBy: { created_at: 'asc' }
    }).catch(() => []);

    const sesiTodayList = await prisma.sesiAbsensi.findMany({
      where: {
        guru_id: guru.id,
        tanggal: { gte: startToday, lte: endToday }
      },
      include: { AbsenGuru: { where: { guru_id: guru.id } } },
      orderBy: { waktu_mulai: 'asc' }
    }).catch(() => []);

    const gerbangMonthList = await prisma.absenGerbangGuru.findMany({
      where: {
        guru_id: guru.id,
        created_at: { gte: firstDayMonth }
      }
    }).catch(() => []);

    const sesiMonthList = await prisma.absenGuru.findMany({
      where: {
        guru_id: guru.id,
        created_at: { gte: firstDayMonth }
      }
    }).catch(() => []);

    const tapMasuk = gerbangToday.find(g => String(g.arah || '').toUpperCase().includes('DATANG') || String(g.arah || '').toUpperCase().includes('MASUK'));
    const tapPulang = gerbangToday.find(g => String(g.arah || '').toUpperCase().includes('PULANG'));

    const formatWaktu = (dt?: Date | null) => {
      if (!dt) return null;
      return new Date(dt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) + ' WIB';
    };

    let statusMasukText = '⚪ Belum Tap Masuk';
    if (tapMasuk && tapMasuk.waktu_tap) {
      const jam = formatWaktu(tapMasuk.waktu_tap);
      const isLate = tapMasuk.is_terlambat || String(tapMasuk.status || '').toUpperCase() === 'TERLAMBAT';
      statusMasukText = isLate ? `⚠️ ${jam} (Terlambat)` : `🟢 ${jam} (Tepat Waktu)`;
    }

    let statusPulangText = '⚪ Belum Tap Pulang';
    if (tapPulang && tapPulang.waktu_tap) {
      const jam = formatWaktu(tapPulang.waktu_tap);
      statusPulangText = `🟢 ${jam} (Sudah Tap Pulang)`;
    }

    const totalSesiToday = sesiTodayList.length;
    const sesiHadirCount = sesiTodayList.filter(s => {
      const ag = s.AbsenGuru?.[0];
      const st = String(ag?.status || '').toUpperCase();
      return st === 'HADIR' || st.includes('HADIR') || !!ag?.waktu_tap;
    }).length;

    let statusKbmTodayText = '-';
    if (totalSesiToday === 0) {
      statusKbmTodayText = '☕ Tidak ada jadwal mengajar KBM hari ini';
    } else {
      statusKbmTodayText = `📖 ${sesiHadirCount} dari ${totalSesiToday} Sesi Terkonfirmasi Hadir`;
    }

    const datangsMonth = gerbangMonthList.filter(g => String(g.arah || '').toUpperCase().includes('DATANG') || String(g.arah || '').toUpperCase().includes('MASUK'));
    const totalHadirTepat = datangsMonth.filter(g => !g.is_terlambat && String(g.status || '').toUpperCase() === 'HADIR').length;
    const totalTerlambat = datangsMonth.filter(g => g.is_terlambat || String(g.status || '').toUpperCase() === 'TERLAMBAT').length;
    const totalIzinSakit = datangsMonth.filter(g => ['IZIN', 'SAKIT'].includes(String(g.status || '').toUpperCase())).length;
    const totalAlpa = datangsMonth.filter(g => String(g.status || '').toUpperCase() === 'ALPA').length;

    const totalSesiMonth = sesiMonthList.length;
    const totalKbmHadirMonth = sesiMonthList.filter(s => String(s.status || '').toUpperCase() === 'HADIR' || String(s.status || '').toUpperCase().includes('HADIR') || !!s.waktu_tap).length;

    let msg = `⏰ *Info & Rekap Presensi Guru*\n`;
    msg += `Guru: *${guru.nama_guru}*\n`;
    msg += `Tanggal: *${hariTglStr}*\n\n`;

    msg += `📌 *Presensi Hari Ini (Gerbang & KBM):*\n`;
    msg += `• Presensi Masuk  : ${statusMasukText}\n`;
    msg += `• Presensi Pulang : ${statusPulangText}\n`;
    msg += `• Mengajar Kelas  : ${statusKbmTodayText}\n\n`;

    msg += `📊 *Rekap Bulan ${bulanStr}:*\n`;
    msg += `• ✅ Hadir Tepat Waktu : ${totalHadirTepat} hari\n`;
    msg += `• ⚠️ Terlambat Masuk   : ${totalTerlambat} hari\n`;
    if (totalIzinSakit > 0) msg += `• 🏥 Izin / Sakit      : ${totalIzinSakit} hari\n`;
    if (totalAlpa > 0)      msg += `• ❌ Alpa / Tanpa Ket  : ${totalAlpa} hari\n`;
    if (totalSesiMonth > 0) {
      const rateKbm = Math.round((totalKbmHadirMonth / totalSesiMonth) * 100);
      msg += `• 🎯 Sesi KBM Mengajar : ${totalKbmHadirMonth}/${totalSesiMonth} Sesi (${rateKbm}% Hadir)\n`;
    }

    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }
}
