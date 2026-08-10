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
  /**
   * SUB-MENU: Jadwal KBM — Entry point baru yang membungkus semua menu jadwal
   */
  static handleJadwalKBMMenu(ctx: ChatbotContext): string {
    const guru = ctx.guru;
    const nama = guru?.nama_guru || 'Bapak/Ibu';
    return (
      `📚 *Jadwal KBM — ${nama}*\n\n` +
      `Pilih sub-menu:\n\n` +
      `[11] 📋 Jadwal Saya Hari Ini\n` +
      `[12] 📅 Jadwal Saya 1 Minggu\n` +
      `[13] 🔍 Lihat Jadwal Guru Lain\n` +
      `[14] 🏫 Jadwal Kelas\n` +
      `[15] 📍 Posisi Guru Saat Ini\n\n` +
      `[0] 🔄 Menu Utama`
    );
  }

  /**
   * MENU 13: Lihat Jadwal KBM Guru Lain (hari ini)
   * User mengetik nama / sebagian nama guru
   */
  static async handleJadwalGuruLain(ctx: ChatbotContext): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const input = (ctx.messageText || '').trim();

    // Jika hanya mengetik "13" tanpa nama, minta input nama
    const isJustCommand = /^13$/.test(ctx.commandUpper.trim());
    if (isJustCommand || input.length < 2) {
      return (
        `🔍 *Cari Jadwal Guru Lain*\n\n` +
        `Ketik *nama guru* yang ingin dicari (minimal 2 huruf):\n` +
        `Contoh: _ketik_ *budi* atau *siti*\n\n` +
        `💡 Atau ketik *[0]* untuk kembali ke Menu Utama.`
      );
    }

    const tz = await getTenantTimezone(tenantId);
    const currentDay = getHariByTimezone(tz);
    const activeSem = await getWhatsappActiveSemester(tenantId);
    if (!activeSem) return '⚠️ Semester aktif belum diatur.';

    // Cari guru berdasarkan nama (case-insensitive partial match)
    const guruList = await prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
        nama_guru: { contains: input, mode: 'insensitive' },
      },
      select: { id: true, nama_guru: true },
      take: 5,
    });

    if (guruList.length === 0) {
      return (
        `🔍 *Cari Jadwal Guru Lain*\n\n` +
        `❌ Tidak ada guru dengan nama *"${input}"* ditemukan.\n\n` +
        `Coba ketik nama lain atau ketik *[13]* untuk mencari lagi.`
      );
    }

    // Ambil jadwal hari ini untuk semua guru yang ditemukan
    const jadwalList = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        semester_id: activeSem.id,
        hari: currentDay as any,
        guru_id: { in: guruList.map(g => g.id) },
      },
      include: {
        Guru: { select: { nama_guru: true } },
        Mapel: { select: { nama_mapel: true } },
        Kelas: { select: { nama_kelas: true } },
      },
      orderBy: { slot_index: 'asc' },
    });

    if (jadwalList.length === 0) {
      const namaGuru = guruList.map(g => g.nama_guru).join(', ');
      return (
        `📋 *Jadwal Hari Ini (${currentDay})*\n\n` +
        `Guru *${namaGuru}* tidak memiliki jadwal KBM hari ini. 😊\n\n` +
        `💡 Ketik *[0]* untuk Menu Utama.`
      );
    }

    // Kelompokkan per guru
    const grouped = new Map<string, typeof jadwalList>();
    jadwalList.forEach(j => {
      const key = (j as any).Guru?.nama_guru || 'Unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(j);
    });

    let msg = `📋 *Jadwal KBM Hari Ini (${currentDay})*\n`;
    msg += `🔍 Kata kunci: "${input}"\n\n`;

    grouped.forEach((items, namaGuru) => {
      msg += `👨‍🏫 *${namaGuru}*\n`;
      items.forEach((j, idx) => {
        const jamMulai = j.jam_mulai || '-';
        const jamSelesai = j.jam_selesai || '-';
        const mapel = (j as any).Mapel?.nama_mapel || '-';
        const kelas = (j as any).Kelas?.nama_kelas || '-';
        msg += `  ${idx + 1}. ⏱️ ${jamMulai}–${jamSelesai} │ 📖 ${mapel} (${kelas})\n`;
      });
      msg += `\n`;
    });

    msg += `💡 Ketik *[13]* untuk cari guru lain atau *[0]* untuk Menu Utama.`;
    return msg;
  }

  /**
   * MENU 14: Jadwal Kelas (Guru lihat jadwal kelas tertentu)
   * Ketik [14] → prompt input nama kelas
   * Ketik [141] atau [14 hari ini] → hari ini, [142] atau [14 minggu] → 1 minggu
   */
  static async handleJadwalKelas(ctx: ChatbotContext): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const input = (ctx.messageText || '').trim();
    const cmd = ctx.commandUpper.trim();

    // Jika hanya ketik "14" tanpa parameter → tampilkan prompt
    if (cmd === '14' || input.length < 2) {
      return (
        `🏫 *Jadwal Kelas*\n\n` +
        `Ketik *nama kelas* yang ingin dilihat:\n` +
        `Contoh: _ketik_ *XI IPA 1* atau *X TKJ*\n\n` +
        `💡 Ketik *[0]* untuk kembali ke Menu Utama.`
      );
    }

    const activeSem = await getWhatsappActiveSemester(tenantId);
    if (!activeSem) return '⚠️ Semester aktif belum diatur.';

    // Cari kelas berdasarkan nama (partial match)
    const kelasList = await prisma.kelas.findMany({
      where: {
        tenant_id: tenantId,
        nama_kelas: { contains: input, mode: 'insensitive' },
      },
      select: { id: true, nama_kelas: true },
      take: 3,
    });

    if (kelasList.length === 0) {
      return (
        `🏫 *Jadwal Kelas*\n\n` +
        `❌ Kelas dengan nama *"${input}"* tidak ditemukan.\n\n` +
        `Coba ketik nama lain. Contoh: *XI IPA* atau *X TKJ*\n` +
        `Atau ketik *[14]* untuk coba lagi.`
      );
    }

    const tz = await getTenantTimezone(tenantId);
    const currentDay = getHariByTimezone(tz);
    const hariUrut = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

    // Jika lebih dari 1 kelas ditemukan, tampilkan pilihan
    if (kelasList.length > 1) {
      let msg = `🏫 *Kelas ditemukan:*\n\n`;
      kelasList.forEach((k, i) => {
        msg += `[${i + 1}] ${k.nama_kelas}\n`;
      });
      msg += `\nKetik nama kelas lebih spesifik untuk melihat jadwalnya.`;
      return msg;
    }

    const kelas = kelasList[0];

    // Cek apakah minta hari ini atau 1 minggu (default: hari ini)
    const wantWeekly = /minggu|week|semua|7 hari/i.test(input);

    if (wantWeekly) {
      // Jadwal 1 Minggu
      const jadwalMinggu = await prisma.jadwalKBM.findMany({
        where: { tenant_id: tenantId, semester_id: activeSem.id, kelas_id: kelas.id },
        include: {
          Guru: { select: { nama_guru: true } },
          Mapel: { select: { nama_mapel: true } },
        },
        orderBy: [{ hari: 'asc' }, { slot_index: 'asc' }],
      });

      if (jadwalMinggu.length === 0) {
        return `🏫 *Jadwal ${kelas.nama_kelas}*\n\nBelum ada jadwal KBM untuk kelas ini.\n\n💡 Ketik *[0]* untuk Menu Utama.`;
      }

      const grouped: Record<string, typeof jadwalMinggu> = {};
      jadwalMinggu.forEach(j => {
        const h = j.hari as string;
        if (!grouped[h]) grouped[h] = [];
        grouped[h].push(j);
      });

      let msg = `🏫 *Jadwal KBM ${kelas.nama_kelas} — 1 Minggu*\n`;
      msg += `📅 Semester: ${activeSem.nama_semester || '-'}\n\n`;

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

      msg += `💡 Ketik *[14]* untuk cari kelas lain atau *[0]* Menu Utama.`;
      return msg;
    }

    // Default: Jadwal Hari Ini
    const jadwalHariIni = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        semester_id: activeSem.id,
        kelas_id: kelas.id,
        hari: currentDay as any,
      },
      include: {
        Guru: { select: { nama_guru: true } },
        Mapel: { select: { nama_mapel: true } },
      },
      orderBy: { slot_index: 'asc' },
    });

    if (jadwalHariIni.length === 0) {
      return (
        `🏫 *Jadwal ${kelas.nama_kelas} — ${currentDay}*\n\n` +
        `Tidak ada jadwal KBM hari ini. 😊\n\n` +
        `💡 Tambahkan kata _minggu_ untuk lihat 1 minggu\n` +
        `Contoh: ketik *${input} minggu*\n` +
        `Atau ketik *[0]* untuk Menu Utama.`
      );
    }

    let msg = `🏫 *Jadwal KBM ${kelas.nama_kelas} — ${currentDay}*\n\n`;
    jadwalHariIni.forEach((j, idx) => {
      const mapel = (j as any).Mapel?.nama_mapel || '-';
      const guru = (j as any).Guru?.nama_guru || '-';
      msg += `${idx + 1}. ⏱️ ${j.jam_mulai}–${j.jam_selesai} │ 📖 ${mapel}\n`;
      msg += `   👨‍🏫 Guru: ${guru}\n\n`;
    });

    msg += `💡 Tambah kata _minggu_ untuk 1 minggu penuh\n`;
    msg += `Contoh: ketik *${input} minggu*\n`;
    msg += `Atau ketik *[0]* untuk Menu Utama.`;
    return msg;
  }

  /**
   * SUB-MENU: Posisi Guru
   */
  static handlePosisiGuruSubMenu(ctx: ChatbotContext): string {
    const guru = ctx.guru;
    const nama = guru?.nama_guru || 'Bapak/Ibu';
    return (
      `📍 *Posisi & Keberadaan Guru — ${nama}*\n\n` +
      `Pilih sub-menu:\n\n` +
      `[81] ⏱️ Posisi Guru Jam Ini (Saat Ini)\n` +
      `[82] 🔍 Cari Posisi Guru (By Nama)\n` +
      `[83] 📋 Semua Posisi Guru Hari Ini\n\n` +
      `[0] 🔄 Menu Utama`
    );
  }

  /**
   * MENU 8 / 15 / POSISI GURU: Cek Posisi & Status Mengajar Guru
   * Options:
   * 8 / 15 / POSISI -> Sub Menu
   * 81 / 151 -> Jam ini
   * 82 / 152 -> By nama (prompt if no name)
   * 83 / 153 -> Semua hari ini
   * "posisi firman" / "82 firman" -> Search teacher name
   */
  static async handlePosisiGuru(ctx: ChatbotContext): Promise<string> {
    const tenantId = ctx.guru?.tenant_id || ctx.siswa?.tenant_id || ctx.ortu?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant sekolah tidak ditemukan.';

    const cmd = ctx.commandUpper.trim();
    const rawText = (ctx.messageText || '').trim();

    // 1. Sub-menu Trigger (hanya ketik "8", "15", "POSISI", "POSISI GURU", "CEK POSISI")
    if (cmd === '8' || cmd === '15' || cmd === 'POSISI' || cmd === 'POSISI GURU' || cmd === 'CEK POSISI') {
      return GuruJadwalHandler.handlePosisiGuruSubMenu(ctx);
    }

    // 2. Opsi 82 / 152 tanpa nama -> Prompt minta input nama
    if (cmd === '82' || cmd === '152') {
      return (
        `🔍 *Cari Posisi Guru*\n\n` +
        `Ketik *nama guru* yang ingin dicari (minimal 2 huruf):\n` +
        `Contoh: _ketik_ *firman* atau *budi*\n\n` +
        `💡 Ketik *[0]* untuk kembali ke Menu Utama.`
      );
    }

    const activeSem = await getWhatsappActiveSemester(tenantId);
    if (!activeSem) return '⚠️ Semester aktif sekolah belum diatur.';

    const tz = await getTenantTimezone(tenantId);
    const currentDay = getHariByTimezone(tz);

    // Ambil waktu WIB saat ini (HH:mm)
    const nowWibStr = new Date().toLocaleTimeString('en-US', {
      timeZone: tz || 'Asia/Jakarta',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    // Tanggal WIB hari ini
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Jakarta' }); // YYYY-MM-DD
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    let filterMode: 'NOW' | 'ALL' | 'SEARCH' = 'ALL';
    let filterName = '';

    if (cmd === '81' || cmd === '151') {
      filterMode = 'NOW';
    } else if (cmd === '83' || cmd === '153') {
      filterMode = 'ALL';
    } else {
      filterMode = 'SEARCH';
      // Strip command prefixes if any e.g. "82 firman", "posisi firman", "15 firman"
      filterName = rawText.replace(/^(82|152|81|151|83|153|15|8|posisi\s*guru|posisi)\s*/i, '').trim();
    }

    // Query JadwalKBM hari ini
    const whereJadwal: any = {
      tenant_id: tenantId,
      semester_id: activeSem.id,
      hari: currentDay as any,
    };

    if (filterMode === 'SEARCH' && filterName && filterName.length >= 2) {
      whereJadwal.Guru = {
        nama_guru: { contains: filterName, mode: 'insensitive' },
      };
    }

    const jadwalList = await prisma.jadwalKBM.findMany({
      where: whereJadwal,
      include: {
        Guru: { select: { id: true, nama_guru: true } },
        Kelas: { 
          select: { 
            id: true, 
            nama_kelas: true,
            tingkat: true,
            Jurusan: { select: { id: true, nama: true, kode: true } }
          } 
        },
        Mapel: { select: { id: true, nama_mapel: true } },
      },
      orderBy: [
        { slot_index: 'asc' }
      ],
    });

    if (jadwalList.length === 0) {
      if (filterMode === 'SEARCH' && filterName) {
        return (
          `📍 *Posisi & Status Guru*\n\n` +
          `❌ Tidak ada jadwal KBM hari ini (${currentDay}) untuk guru dengan nama *"${filterName}"*.\n\n` +
          `💡 Ketik *[82]* untuk cari guru lain atau *[8]* untuk Sub-menu Posisi Guru.`
        );
      }
      return (
        `📍 *Posisi & Status Guru Hari Ini (${currentDay})*\n\n` +
        `Belum ada jadwal KBM yang tercatat untuk hari ini. 😊\n\n` +
        `💡 Ketik *[0]* untuk Menu Utama.`
      );
    }

    // Query SesiAbsensi hari ini
    const sesiList = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        id: true,
        guru_id: true,
        kelas_id: true,
        jadwal_kbm_id: true,
        status: true,
      },
    });

    let targetJadwal = jadwalList;

    if (filterMode === 'NOW') {
      targetJadwal = jadwalList.filter(j => j.jam_mulai <= nowWibStr && j.jam_selesai >= nowWibStr);
    }

    // Header message
    let msg = `📍 *Posisi & Status Guru (${currentDay}, ${nowWibStr} WIB)*\n`;
    if (filterMode === 'SEARCH' && filterName) {
      msg += `🔍 Hasil Pencarian: "${filterName}"\n\n`;
    } else if (filterMode === 'NOW') {
      msg += `⏱️ *Daftar Guru pada Sesi Jam Ini:*\n\n`;
    } else {
      msg += `📋 *Daftar Jadwal Mengajar Guru Hari Ini:*\n\n`;
    }

    // Grouping berdasarkan Tingkat & Jurusan
    const groupedByTingkatJurusan: Record<string, { groupName: string; tingkatNum: number; items: any[] }> = {};

    targetJadwal.forEach((j: any) => {
      const tingkat = j.Kelas?.tingkat || 0;
      const jurusanName = j.Kelas?.Jurusan?.nama || j.Kelas?.Jurusan?.kode || 'Umum';
      const groupKey = `tingkat_${tingkat}_${jurusanName}`;
      const groupHeader = tingkat > 0
        ? `🏫 *Tingkat ${tingkat} — ${jurusanName}*`
        : `🏫 *Kelompok ${jurusanName}*`;

      if (!groupedByTingkatJurusan[groupKey]) {
        groupedByTingkatJurusan[groupKey] = { groupName: groupHeader, tingkatNum: tingkat, items: [] };
      }
      groupedByTingkatJurusan[groupKey].items.push(j);
    });

    const groups = Object.values(groupedByTingkatJurusan).sort((a, b) => a.tingkatNum - b.tingkatNum);
    const formattedSections: string[] = [];

    groups.forEach(group => {
      let section = `${group.groupName}\n`;
      group.items.forEach(j => {
        const teacherName = j.Guru?.nama_guru || 'Guru';
        const kelasName = j.Kelas?.nama_kelas || '-';
        const mapelName = j.Mapel?.nama_mapel || '-';
        const timeRange = `${j.jam_mulai}–${j.jam_selesai}`;
        const jp = j.slot_index ? `JP ${j.slot_index}` : '';

        const matchedSesi = sesiList.find(s => 
          (s.jadwal_kbm_id && s.jadwal_kbm_id === j.id) || 
          (s.guru_id === j.guru_id && s.kelas_id === j.kelas_id)
        );

        let statusStr = 'Belum Masuk Kelas';
        if (matchedSesi) {
          if (matchedSesi.status === 'BERLANGSUNG') {
            statusStr = 'Mengajar';
          } else if (matchedSesi.status === 'SELESAI') {
            statusStr = 'Selesai';
          } else if (matchedSesi.status === 'IZIN') {
            statusStr = 'Izin';
          } else {
            statusStr = matchedSesi.status;
          }
        }

        section += `${teacherName} di ${kelasName} : ${statusStr}\n`;
      });
      formattedSections.push(section);
    });

    msg += formattedSections.join('\n');

    if (filterMode === 'NOW' && targetJadwal.length === 0) {
      msg += `ℹ️ _Saat ini tidak ada slot mengajar aktif pada jam ini (${nowWibStr} WIB)._\n\n`;
      msg += `💡 Ketik *[83]* untuk lihat seluruh jadwal guru hari ini.`;
    } else {
      msg += `\n💡 Ketik *[8]* untuk Sub-menu Posisi Guru atau *[0]* Menu Utama.`;
    }

    return msg;
  }
}
