import { prisma } from '@/utils/prisma';
import { ChatbotContext } from '../../core/chatbot-context';
import { aggregateJadwal, formatShortMapelName } from '../../../services/wa-chatbot-commands';

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

interface TimelineItem {
  type: 'KBM' | 'PIKET';
  slotMulai: number;
  jamMulai: string;
  jamSelesai: string;
  jamLabel: string;
  title: string;
  subTitle?: string;
  catatan?: string;
}

function buildDayTimeline(jadwalList: any[], piketList: any[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (jadwalList && jadwalList.length > 0) {
    const aggregated = aggregateJadwal(jadwalList);
    aggregated.forEach((j: any) => {
      const jamLabel = j.startSlot === j.endSlot
        ? `Jam ke-${j.startSlot}`
        : `Jam ke-${j.startSlot} s/d ${j.endSlot}`;
      items.push({
        type: 'KBM',
        slotMulai: j.startSlot || 1,
        jamMulai: j.jam_mulai || '',
        jamSelesai: j.jam_selesai || '',
        jamLabel,
        title: formatShortMapelName(j.Mapel),
        subTitle: j.Kelas?.nama_kelas || 'Kelas',
      });
    });
  }

  if (piketList && piketList.length > 0) {
    piketList.forEach((p: any) => {
      const jamLabel = p.slot_mulai && p.slot_selesai
        ? `Jam ke-${p.slot_mulai} s/d ${p.slot_selesai}`
        : 'Full Day';
      items.push({
        type: 'PIKET',
        slotMulai: p.slot_mulai ?? 1,
        jamMulai: p.jam_mulai || '07:00',
        jamSelesai: p.jam_selesai || '15:30',
        jamLabel,
        title: p.pos_piket || 'Piket Utama',
        catatan: p.catatan,
      });
    });
  }

  items.sort((a, b) => {
    if (a.slotMulai !== b.slotMulai) return a.slotMulai - b.slotMulai;
    return a.jamMulai.localeCompare(b.jamMulai);
  });

  return items;
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

    const timelineItems = buildDayTimeline(jadwalList, piketList);

    if (timelineItems.length === 0) {
      const semInfo = semesterAktif
        ? `${semesterAktif.nama_semester} (${semesterAktif.TahunPelajaran?.tahun})`
        : 'semester tidak terdeteksi';
      return (
        `📋 *Timeline Jadwal Hari Ini (${currentDay})*\n` +
        `📚 Semester: ${semInfo}\n\n` +
        `Bapak/Ibu *${guru.nama_guru}*, tidak ada jadwal mengajar KBM maupun penugasan piket hari ini. 😊\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const semInfo = semesterAktif
      ? `${semesterAktif.nama_semester} (${semesterAktif.TahunPelajaran?.tahun})`
      : '-';
    let msg = `📋 *Timeline Jadwal Mengajar & Piket (${currentDay})*\n`;
    msg += `Guru: *${guru.nama_guru}* | Semester: ${semInfo}\n\n`;
    msg += `⏱️ *TIMELINE AGENDA HARI INI:*\n\n`;

    timelineItems.forEach((item, index) => {
      const timeHeader = item.jamMulai && item.jamSelesai
        ? `${item.jamMulai} – ${item.jamSelesai} (${item.jamLabel})`
        : item.jamLabel;

      msg += `*${index + 1}. ${timeHeader}*\n`;
      if (item.type === 'KBM') {
        msg += `   └ 📖 *KBM*: ${item.title} (🏫 ${item.subTitle || '-'})\n\n`;
      } else {
        msg += `   └ 🛡️ *PENUGASAN PIKET*: ${item.title}\n`;
        if (item.catatan) {
          msg += `      📝 Catatan: "${item.catatan}"\n`;
        }
        msg += `\n`;
      }
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
        `📅 *Timeline Jadwal Minggu Ini*\n` +
        `📚 Semester: ${semInfo}\n\n` +
        `Belum ada jadwal KBM atau penugasan piket yang tercatat untuk Bapak/Ibu *${guru.nama_guru}*.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const groupedKbm: Record<string, any[]> = {};
    const groupedPiket: Record<string, any[]> = {};
    hariUrut.forEach(h => {
      groupedKbm[h] = [];
      groupedPiket[h] = [];
    });

    semuaJadwal.forEach((j: any) => { if (groupedKbm[j.hari]) groupedKbm[j.hari].push(j); });
    semuaPiket.forEach((p: any) => { if (groupedPiket[p.hari]) groupedPiket[p.hari].push(p); });

    let msg = `📅 *Timeline Jadwal Mengajar & Piket Minggu Ini*\n`;
    msg += `Guru: *${guru.nama_guru}* | ${semInfo}\n`;

    hariUrut.forEach(hari => {
      const listKbm = groupedKbm[hari];
      const listPiket = groupedPiket[hari];
      const timeline = buildDayTimeline(listKbm, listPiket);

      if (timeline.length === 0) return;

      msg += `\n📌 *${hari}*\n`;

      timeline.forEach((item, index) => {
        const isLast = index === timeline.length - 1;
        const branchChar = isLast ? '└' : '├';
        const timePart = item.jamMulai && item.jamSelesai ? `${item.jamMulai}–${item.jamSelesai}` : item.jamLabel;

        if (item.type === 'KBM') {
          msg += ` ${branchChar} ⏱️ ${timePart} │ 📖 *KBM*: ${item.title} (${item.subTitle || '-'})\n`;
        } else {
          msg += ` ${branchChar} ⏱️ ${timePart} │ 🛡️ *PIKET*: ${item.title}\n`;
        }
      });
    });

    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }
}
