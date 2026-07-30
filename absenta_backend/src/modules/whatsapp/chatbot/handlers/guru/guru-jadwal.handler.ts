import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';
import { aggregateJadwal } from '../../../services/wa-chatbot-commands';

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

export class GuruJadwalHandler {
  static async handleJadwalHariIni(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const currentDay = getHariWIB();

    const semesterAktif = await prisma.semester.findFirst({
      where: {
        tenant_id: guru.tenant_id,
        is_active: true,
        TahunPelajaran: { is_active: true },
      },
      orderBy: { created_at: 'desc' },
      select: { id: true, nama_semester: true, TahunPelajaran: { select: { tahun: true } } },
    });

    const jadwalList = await prisma.jadwalKBM.findMany({
      where: {
        guru_id: guru.id,
        hari: currentDay as any,
        ...(semesterAktif ? { semester_id: semesterAktif.id } : {}),
      },
      include: { Kelas: true, Mapel: true },
      orderBy: { slot_index: 'asc' },
    });

    if (jadwalList.length === 0) {
      const semInfo = semesterAktif
        ? `${semesterAktif.nama_semester} (${semesterAktif.TahunPelajaran?.tahun})`
        : 'semester tidak terdeteksi';
      return (
        `📋 *Jadwal Mengajar Hari Ini (${currentDay})*\n` +
        `📚 Semester: ${semInfo}\n\n` +
        `Bapak/Ibu *${guru.nama_guru}*, tidak ada jadwal mengajar KBM hari ini. 😊\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const aggregated = aggregateJadwal(jadwalList);
    const semInfo = semesterAktif
      ? `${semesterAktif.nama_semester} (${semesterAktif.TahunPelajaran?.tahun})`
      : '-';
    let msg = `📋 *Jadwal Mengajar Hari Ini (${currentDay})*\n`;
    msg += `Guru: *${guru.nama_guru}* | Semester: ${semInfo}\n\n`;

    aggregated.forEach((j: any, i: number) => {
      const jamLabel = j.startSlot === j.endSlot
        ? `Jam ke-${j.startSlot}`
        : `Jam ke-${j.startSlot} s/d ${j.endSlot}`;
      msg += `${i + 1}. *${j.jam_mulai} – ${j.jam_selesai}* (${jamLabel})\n`;
      msg += `   📖 ${j.Mapel?.nama_mapel || '-'}\n`;
      msg += `   🏫 ${j.Kelas?.nama_kelas || '-'}\n\n`;
    });
    msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  static async handleJadwalMingguan(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const hariUrut = ['SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'];

    const semesterAktif = await prisma.semester.findFirst({
      where: { tenant_id: guru.tenant_id, is_active: true, TahunPelajaran: { is_active: true } },
      select: { id: true, nama_semester: true, TahunPelajaran: { select: { tahun: true } } },
    });

    const semuaJadwal = await prisma.jadwalKBM.findMany({
      where: {
        guru_id: guru.id,
        hari: { in: hariUrut as any[] },
        ...(semesterAktif ? { semester_id: semesterAktif.id } : {}),
      },
      include: { Kelas: true, Mapel: true },
      orderBy: [{ hari: 'asc' }, { slot_index: 'asc' }],
    });

    const semInfo = semesterAktif
      ? `${semesterAktif.nama_semester} (${semesterAktif.TahunPelajaran?.tahun})`
      : '-';

    if (semuaJadwal.length === 0) {
      return (
        `📅 *Jadwal Mengajar Minggu Ini*\n` +
        `📚 Semester: ${semInfo}\n\n` +
        `Belum ada jadwal KBM yang tercatat untuk Bapak/Ibu *${guru.nama_guru}*.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const grouped: Record<string, typeof semuaJadwal> = {};
    hariUrut.forEach(h => { grouped[h] = []; });
    semuaJadwal.forEach((j: any) => { if (grouped[j.hari]) grouped[j.hari].push(j); });

    let msg = `📅 *Jadwal Mengajar Minggu Ini*\n`;
    msg += `Guru: *${guru.nama_guru}* | ${semInfo}\n`;

    hariUrut.forEach(hari => {
      const list = grouped[hari];
      if (list.length === 0) return;
      const aggregatedDay = aggregateJadwal(list);
      msg += `\n*📌 ${hari}*\n`;
      aggregatedDay.forEach((j: any, i: number) => {
        const jamLabel = j.startSlot === j.endSlot ? `Jam ${j.startSlot}` : `Jam ${j.startSlot}-${j.endSlot}`;
        msg += `  ${i + 1}. ${j.jam_mulai}–${j.jam_selesai} (${jamLabel}) | ${j.Mapel?.nama_mapel || '-'} (${j.Kelas?.nama_kelas || '-'})\n`;
      });
    });

    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }
}
