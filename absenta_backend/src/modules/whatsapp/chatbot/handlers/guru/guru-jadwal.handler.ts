import { ChatbotContext } from '../../core/chatbot-context';
import { jadwalKBMService } from '@/modules/kurikulum/jadwal-kbm/services/jadwal-kbm.service';
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
}
