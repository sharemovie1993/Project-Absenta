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

    const semFilter = semesterAktif ? { semester_id: semesterAktif.id } : {};

    const [jadwalList, piketList] = await Promise.all([
      prisma.jadwalKBM.findMany({
        where: {
          guru_id: guru.id,
          hari: currentDay as any,
          ...semFilter,
        },
        include: { Kelas: true, Mapel: true },
        orderBy: { slot_index: 'asc' },
      }),
      prisma.jadwalPiketGuru.findMany({
        where: {
          guru_id: guru.id,
          hari: currentDay as any,
          ...semFilter,
        },
        orderBy: [{ slot_mulai: 'asc' }, { created_at: 'asc' }],
      }).catch(() => []),
    ]);

    if (jadwalList.length === 0 && piketList.length === 0) {
      const semInfo = semesterAktif
        ? `${semesterAktif.nama_semester} (${semesterAktif.TahunPelajaran?.tahun})`
        : 'semester tidak terdeteksi';
      return (
        `📋 *Jadwal Mengajar & Piket Hari Ini (${currentDay})*\n` +
        `📚 Semester: ${semInfo}\n\n` +
        `Bapak/Ibu *${guru.nama_guru}*, tidak ada jadwal mengajar KBM maupun penugasan piket hari ini. 😊\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const semInfo = semesterAktif
      ? `${semesterAktif.nama_semester} (${semesterAktif.TahunPelajaran?.tahun})`
      : '-';
    let msg = `📋 *Jadwal Mengajar & Piket Hari Ini (${currentDay})*\n`;
    msg += `Guru: *${guru.nama_guru}* | Semester: ${semInfo}\n\n`;

    if (jadwalList.length > 0) {
      const aggregated = aggregateJadwal(jadwalList);
      msg += `📚 *Jadwal KBM Mengajar:*\n`;
      aggregated.forEach((j: any, i: number) => {
        const jamLabel = j.startSlot === j.endSlot
          ? `Jam ke-${j.startSlot}`
          : `Jam ke-${j.startSlot} s/d ${j.endSlot}`;
        msg += `${i + 1}. *${j.jam_mulai} – ${j.jam_selesai}* (${jamLabel})\n`;
        msg += `   📖 ${j.Mapel?.nama_mapel || '-'}\n`;
        msg += `   🏫 ${j.Kelas?.nama_kelas || '-'}\n\n`;
      });
    } else {
      msg += `☕ *Jadwal KBM:* Tidak ada jadwal mengajar KBM hari ini.\n\n`;
    }

    if (piketList.length > 0) {
      msg += `🛡️ *Penugasan Guru Piket:*\n`;
      piketList.forEach((p: any, i: number) => {
        const slotText = p.slot_mulai && p.slot_selesai
          ? `Jam ke-${p.slot_mulai} s/d ${p.slot_selesai}`
          : 'Full Day';
        const jamText = p.jam_mulai && p.jam_selesai ? ` (${p.jam_mulai} - ${p.jam_selesai})` : '';
        msg += `${i + 1}. 📍 *${p.pos_piket || 'Piket Utama'}* — ${slotText}${jamText}\n`;
        if (p.catatan) msg += `   📝 Catatan: "${p.catatan}"\n`;
      });
      msg += `\n`;
    }

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

    const semFilter = semesterAktif ? { semester_id: semesterAktif.id } : {};

    const [semuaJadwal, semuaPiket] = await Promise.all([
      prisma.jadwalKBM.findMany({
        where: {
          guru_id: guru.id,
          hari: { in: hariUrut as any[] },
          ...semFilter,
        },
        include: { Kelas: true, Mapel: true },
        orderBy: [{ hari: 'asc' }, { slot_index: 'asc' }],
      }),
      prisma.jadwalPiketGuru.findMany({
        where: {
          guru_id: guru.id,
          hari: { in: hariUrut as any[] },
          ...semFilter,
        },
        orderBy: [{ hari: 'asc' }, { slot_mulai: 'asc' }],
      }).catch(() => []),
    ]);

    const semInfo = semesterAktif
      ? `${semesterAktif.nama_semester} (${semesterAktif.TahunPelajaran?.tahun})`
      : '-';

    if (semuaJadwal.length === 0 && semuaPiket.length === 0) {
      return (
        `📅 *Jadwal Mengajar & Piket Minggu Ini*\n` +
        `📚 Semester: ${semInfo}\n\n` +
        `Belum ada jadwal KBM atau penugasan piket yang tercatat untuk Bapak/Ibu *${guru.nama_guru}*.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const groupedKbm: Record<string, typeof semuaJadwal> = {};
    const groupedPiket: Record<string, typeof semuaPiket> = {};
    hariUrut.forEach(h => {
      groupedKbm[h] = [];
      groupedPiket[h] = [];
    });

    semuaJadwal.forEach((j: any) => { if (groupedKbm[j.hari]) groupedKbm[j.hari].push(j); });
    semuaPiket.forEach((p: any) => { if (groupedPiket[p.hari]) groupedPiket[p.hari].push(p); });

    let msg = `📅 *Jadwal Mengajar & Piket Minggu Ini*\n`;
    msg += `Guru: *${guru.nama_guru}* | ${semInfo}\n`;

    hariUrut.forEach(hari => {
      const listKbm = groupedKbm[hari];
      const listPiket = groupedPiket[hari];
      if (listKbm.length === 0 && listPiket.length === 0) return;

      msg += `\n*📌 ${hari}*\n`;

      if (listKbm.length > 0) {
        const aggregatedDay = aggregateJadwal(listKbm);
        aggregatedDay.forEach((j: any, i: number) => {
          const jamLabel = j.startSlot === j.endSlot ? `Jam ${j.startSlot}` : `Jam ${j.startSlot}-${j.endSlot}`;
          msg += `  ${i + 1}. 📖 ${j.jam_mulai}–${j.jam_selesai} (${jamLabel}) | ${j.Mapel?.nama_mapel || '-'} (${j.Kelas?.nama_kelas || '-'})\n`;
        });
      }

      if (listPiket.length > 0) {
        listPiket.forEach((p: any) => {
          const slotText = p.slot_mulai && p.slot_selesai ? `Jam ${p.slot_mulai}-${p.slot_selesai}` : 'Full Day';
          msg += `  🛡️ *Piket:* ${p.pos_piket || 'Piket Utama'} (${slotText})\n`;
        });
      }
    });

    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }
}
