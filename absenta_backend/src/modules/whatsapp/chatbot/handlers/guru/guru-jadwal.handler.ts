import { ChatbotContext } from '../../core/chatbot-context';
import { jadwalKBMService } from '@/modules/kurikulum/jadwal-kbm/services/jadwal-kbm.service';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '@/utils/prisma';
import { getWhatsappActiveSemester } from '@/modules/whatsapp/services/wa-chatbot-commands';

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

export class GuruJadwalHandler {
  /**
   * MENU 1: Jadwal Mengajar & Piket Hari Ini
   * Menggunakan Shared Domain Service (JadwalKBMService.getJadwalHariIniByGuru)
   */
  static async handleJadwalHariIni(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const tz = await getTenantTimezone(guru.tenant_id);
    const currentDay = getHariByTimezone(tz);

    // 🚀 Call Shared Domain Service Layer
    const { semInfo, items } = await jadwalKBMService.getJadwalHariIniByGuru(
      guru.id,
      guru.tenant_id,
      currentDay,
    );

    if (items.length === 0) {
      return (
        `📋 *Timeline Jadwal Hari Ini (${currentDay})*\n` +
        `📚 Semester: ${semInfo}\n\n` +
        `Bapak/Ibu *${guru.nama_guru}*, tidak ada jadwal mengajar KBM maupun penugasan piket hari ini. 😊\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    let msg = `📋 *Timeline Jadwal Mengajar & Piket (${currentDay})*\n`;
    msg += `Guru: *${guru.nama_guru}* | Semester: ${semInfo}\n\n`;
    msg += `⏱️ *TIMELINE AGENDA HARI INI:*\n\n`;

    items.forEach((item, index) => {
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

  /**
   * MENU 6: Jadwal Mengajar & Piket Minggu Ini (semua hari)
   * Menggunakan Shared Domain Service (JadwalKBMService.getJadwalMingguanByGuru)
   */
  static async handleJadwalMingguan(ctx: ChatbotContext): Promise<string> {
    const guru = ctx.guru;
    if (!guru) return '⚠️ Data Guru tidak ditemukan.';

    const hariUrut = ['SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'];

    // 🚀 Call Shared Domain Service Layer
    const { semInfo, groupedByDay, totalCount } = await jadwalKBMService.getJadwalMingguanByGuru(
      guru.id,
      guru.tenant_id,
    );

    if (totalCount === 0) {
      return (
        `📅 *Timeline Jadwal Minggu Ini*\n` +
        `📚 Semester: ${semInfo}\n\n` +
        `Belum ada jadwal KBM atau penugasan piket yang tercatat untuk Bapak/Ibu *${guru.nama_guru}*.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    let msg = `📅 *Timeline Jadwal Mengajar & Piket Minggu Ini*\n`;
    msg += `Guru: *${guru.nama_guru}* | ${semInfo}\n`;

    hariUrut.forEach(hari => {
      const timeline = groupedByDay[hari] || [];
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

  /**
   * CHATBOT COMMAND: Tarik Guru Pada JP (misal: !tarikguru 1-5 XI atau "tarik guru jam 1-5")
   */
  static async handleTarikGuruJP(ctx: ChatbotContext): Promise<string> {
    const tenantId = ctx.guru?.tenant_id || ctx.siswa?.tenant_id || ctx.ortu?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant sekolah tidak ditemukan.';

    const activeSem = await getWhatsappActiveSemester(tenantId);
    if (!activeSem) return '⚠️ Semester aktif sekolah belum diatur.';

    const text = (ctx.messageText || '').toUpperCase();

    // Parse Day (default today)
    const daysList = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
    let targetHari = daysList.find(d => text.includes(d));
    if (!targetHari) {
      const tz = await getTenantTimezone(tenantId);
      targetHari = getHariByTimezone(tz);
    }

    // Parse JP Range (e.g. 1-5 or 1 S/D 5 or JAM 1-5 or JP 1-5)
    let startJP = 1;
    let endJP = 5;

    const jpRangeMatch = text.match(/(?:JAM|JP)?\s*(\d+)\s*(?:-|S\/D|SD|SAMPAI|TO)\s*(\d+)/i);
    if (jpRangeMatch) {
      startJP = parseInt(jpRangeMatch[1], 10);
      endJP = parseInt(jpRangeMatch[2], 10);
    }

    // Parse Tingkat Kelas (e.g. XI or KELAS 11)
    let targetTingkat: string | null = null;
    const tingkatMatch = text.match(/(?:KELAS|TINGKAT)?\s*(10|11|12|X|XI|XII)\b/i);
    if (tingkatMatch) {
      const matchedStr = tingkatMatch[1].toUpperCase();
      if (['10', 'X'].includes(matchedStr)) targetTingkat = 'X';
      else if (['11', 'XI'].includes(matchedStr)) targetTingkat = 'XI';
      else if (['12', 'XII'].includes(matchedStr)) targetTingkat = 'XII';
    }

    // Query KBM Schedules
    const kbmItems = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        semester_id: activeSem.id,
        hari: targetHari as any,
        slot_index: { gte: startJP, lte: endJP },
      },
      include: {
        Guru: { select: { nama_guru: true, User: { select: { full_name: true } } } },
        Kelas: { select: { nama_kelas: true, tingkat: true, jurusan_id: true, Jurusan: true } },
      },
    });

    // Group by Jurusan
    const grouped = new Map<string, Set<string>>();

    kbmItems.forEach((item: any) => {
      if (targetTingkat) {
        const clsTingkat = String(item.Kelas?.tingkat || '').toUpperCase();
        const clsName = String(item.Kelas?.nama_kelas || '').toUpperCase();
        const matched = 
          clsTingkat === targetTingkat ||
          clsTingkat === (targetTingkat === 'X' ? '10' : targetTingkat === 'XI' ? '11' : '12') ||
          clsName.startsWith(targetTingkat) ||
          clsName.startsWith(targetTingkat === 'X' ? '10' : targetTingkat === 'XI' ? '11' : '12');

        if (!matched) return;
      }

      const teacherName = item.Guru?.nama_guru || item.Guru?.User?.full_name;
      if (!teacherName) return;

      const rawJur = item.Kelas?.Jurusan?.nama_jurusan || item.Kelas?.Jurusan?.singkatan || item.Kelas?.Jurusan?.kode;
      let jurusanName = rawJur;
      if (!jurusanName) {
        const parts = String(item.Kelas?.nama_kelas || '').trim().split(/\s+/);
        if (parts.length >= 2) {
          const token = parts[1].toUpperCase();
          if (!['KBM', 'KELAS', 'RUANG'].includes(token)) jurusanName = token;
        }
      }
      if (!jurusanName) jurusanName = 'Umum / Lainnya';

      const groupKey = jurusanName.toUpperCase().startsWith('JURUSAN') ? jurusanName : `Jurusan ${jurusanName}`;
      if (!grouped.has(groupKey)) grouped.set(groupKey, new Set<string>());
      grouped.get(groupKey)!.add(teacherName.trim());
    });

    const namaPengirim = ctx.guru?.nama_guru || 'Admin Sekolah';
    const tingkatLabel = targetTingkat ? `kelas ${targetTingkat}` : 'semua kelas';

    let msg = `*${namaPengirim}*\n`;
    msg += `Assalamualaikum wr wb ...\n`;
    msg += `Bapak ibu mohon izin untuk menyampaikan daftar nama guru yang mengajar di ${tingkatLabel} pada jam Ke ${startJP} - ${endJP} (${targetHari}) utk bisa hadir di apel pagi utk memberikan contoh dan motivasi terhadap siswa/i kita.\n\n`;

    if (grouped.size === 0) {
      msg += `(Tidak ada jadwal guru yang ditemukan pada hari ${targetHari} jam Ke ${startJP} - ${endJP})`;
      return msg;
    }

    const sortedGroups = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));
    sortedGroups.forEach(gName => {
      msg += `*${gName}*\n`;
      const teacherList = Array.from(grouped.get(gName)!).sort((a, b) => a.localeCompare(b));
      teacherList.forEach((tName, idx) => {
        msg += `${idx + 1}. ${tName}\n`;
      });
      msg += `\n`;
    });

    return msg.trim();
  }
}
