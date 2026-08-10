import { ChatbotContext } from '../../core/chatbot-context';
import { jadwalKBMService } from '@/modules/kurikulum/jadwal-kbm/services/jadwal-kbm.service';
import { sesiService } from '@/modules/attendance/sesi-absensi/services/sesi.service';
import { prisma } from '@/utils/prisma';
import { getTenantTimezone } from '@/utils/timezone.utils';
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
   * User mengetik nama / sebagian nama guru (misal "13 budi" atau "budi")
   */
  static async handleJadwalGuruLain(ctx: ChatbotContext): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const rawText = (ctx.messageText || '').trim();
    // Strip command prefix agar pencarian nama guru tidak terganggu angka '13'
    const input = rawText.replace(/^(?:!|#|\/)?(?:131|132|13|jadwal\s*guru|guru)\s*/i, '').trim();

    // Jika input nama kosong/terlalu pendek, minta input nama
    if (input.length < 2) {
      return (
        `🔍 *Cari Jadwal Guru Lain*\n\n` +
        `Ketik *nama guru* yang ingin dicari (minimal 2 huruf):\n` +
        `Contoh: _ketik_ *budi* atau *13 siti*\n\n` +
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

    // Ambil jadwal hari ini via service layer (ter-enrich jam per hari)
    const jadwalList = await jadwalKBMService.getJadwalByGuruIds(
      tenantId,
      currentDay,
      activeSem.id,
      guruList.map(g => g.id),
    );

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
   * Ketik [14 X TKJ] atau [14 X TKJ minggu]
   */
  static async handleJadwalKelas(ctx: ChatbotContext): Promise<string> {
    const tenantId = ctx.guru?.tenant_id;
    if (!tenantId) return '⚠️ Data tenant tidak ditemukan.';

    const rawText = (ctx.messageText || '').trim();

    // Strip prefix 14 / 141 / 142 / jadwal kelas
    const cleanText = rawText.replace(/^(?:!|#|\/)?(?:141|142|14|jadwal\s*kelas|kelas)\s*/i, '').trim();

    // Cek apakah minta 1 minggu
    const wantWeekly = /minggu|week|semua|7 hari/i.test(cleanText);
    const searchClassName = cleanText.replace(/minggu|week|semua|7 hari/gi, '').trim();

    // Jika hanya ketik "14" tanpa nama kelas → tampilkan prompt
    if (searchClassName.length < 2) {
      return (
        `🏫 *Jadwal Kelas*\n\n` +
        `Ketik *nama kelas* yang ingin dilihat:\n` +
        `Contoh: _ketik_ *XI IPA 1* atau *14 X TKJ*\n\n` +
        `💡 Ketik *[0]* untuk kembali ke Menu Utama.`
      );
    }

    const activeSem = await getWhatsappActiveSemester(tenantId);
    if (!activeSem) return '⚠️ Semester aktif belum diatur.';

    // Cari kelas berdasarkan nama (partial match)
    const kelasList = await prisma.kelas.findMany({
      where: {
        tenant_id: tenantId,
        nama_kelas: { contains: searchClassName, mode: 'insensitive' },
      },
      select: { id: true, nama_kelas: true },
      take: 3,
    });

    if (kelasList.length === 0) {
      return (
        `🏫 *Jadwal Kelas*\n\n` +
        `❌ Kelas dengan nama *"${searchClassName}"* tidak ditemukan.\n\n` +
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
      msg += `\nKetik nama kelas lebih spesifik (contoh: *14 ${kelasList[0].nama_kelas}*) untuk melihat jadwalnya.`;
      return msg;
    }

    const kelas = kelasList[0];

    if (wantWeekly) {
      // Jadwal 1 Minggu via service layer (ter-enrich jam per hari)
      const jadwalMinggu = await jadwalKBMService.getJadwalKelas(tenantId, activeSem.id, kelas.id);

      if (jadwalMinggu.length === 0) {
        return `🏫 *Jadwal ${kelas.nama_kelas}*\n\nBelum ada jadwal KBM untuk kelas ini.\n\n💡 Ketik *[0]* untuk Menu Utama.`;
      }

      const grouped: Record<string, typeof jadwalMinggu> = {};
      jadwalMinggu.forEach((j: any) => {
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
        items.forEach((j: any, idx: number) => {
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

    // Default: Jadwal Hari Ini via service layer (ter-enrich jam per hari)
    const jadwalHariIni = await jadwalKBMService.getJadwalKelas(tenantId, activeSem.id, kelas.id, currentDay);

    if (jadwalHariIni.length === 0) {
      return (
        `🏫 *Jadwal ${kelas.nama_kelas} — ${currentDay}*\n\n` +
        `Tidak ada jadwal KBM hari ini. 😊\n\n` +
        `💡 Tambahkan kata _minggu_ untuk lihat 1 minggu\n` +
        `Contoh: ketik *14 ${kelas.nama_kelas} minggu*\n` +
        `Atau ketik *[0]* untuk Menu Utama.`
      );
    }

    let msg = `🏫 *Jadwal KBM ${kelas.nama_kelas} — ${currentDay}*\n\n`;
    jadwalHariIni.forEach((j: any, idx: number) => {
      const mapel = (j as any).Mapel?.nama_mapel || '-';
      const guru = (j as any).Guru?.nama_guru || '-';
      msg += `${idx + 1}. ⏱️ ${j.jam_mulai}–${j.jam_selesai} │ 📖 ${mapel}\n`;
      msg += `   👨‍🏫 Guru: ${guru}\n\n`;
    });

    msg += `💡 Tambah kata _minggu_ untuk 1 minggu penuh\n`;
    msg += `Contoh: ketik *14 ${kelas.nama_kelas} minggu*\n`;
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
      `[81] ⏱️ Posisi Guru Jam Ini\n` +
      `[82] 🔍 Cari Guru by Nama\n` +
      `[83] 📋 Semua Jadwal Guru Hari Ini\n` +
      `[84] 🚨 Guru Belum Masuk (Jam Ini)\n` +
      `[85] 📊 Rekap KBM Hari Ini\n` +
      `[86] 🏫 Kelas Kosong Sekarang\n\n` +
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
  /** Hapus gelar akademik dari nama guru agar tampil singkat di WA */
  private static pruneGelar(nama: string): string {
    // Panjang variants diurutkan terdahulu agar tidak partial-match (S.ST sebelum S.T)
    const stripped = nama
      .replace(/,?\s*(Prof\.|Dr\.|Drs\.|Dra\.|Ir\.|H\.|Hj\.|S\.ST\.?|S\.Tr\.?|S\.Pd\.I|S\.Pd|S\.T\.I|S\.T|M\.Pd\.I|M\.Pd|S\.Kom|S\.Gz|S\.Sos|S\.IP|S\.STP|S\.Si|S\.Ag|S\.H|S\.E|M\.Kom|M\.Si|M\.T|M\.M|M\.Ag|M\.H|A\.Md\.Kep|A\.Md)\s*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    // Truncate maksimal 12 karakter, tambah ellipsis jika terpotong
    return stripped.length > 12 ? stripped.slice(0, 12) + '…' : stripped;
  }

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

    // 3. Menu 84 / 85 / 86 — butuh query sendiri, return early
    if (cmd === '84' || cmd === '85' || cmd === '86') {
      return GuruJadwalHandler.handleRekapKBM(cmd, tenantId);
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



    let filterMode: 'NOW' | 'ALL' | 'SEARCH' = 'ALL';
    let filterName = '';

    if (cmd === '81' || cmd === '151') {
      filterMode = 'NOW';
    } else if (cmd === '83' || cmd === '153') {
      filterMode = 'ALL';
    } else {
      filterMode = 'SEARCH';
      // Strip command prefixes if any e.g. "82 firman", "posisi firman", "15 firman"
      filterName = rawText.replace(/^(82|152|81|151|83|153|84|85|86|15|8|posisi\s*guru|posisi)\s*/i, '').trim();
    }

    // ── Query menggunakan service layer (bukan direct Prisma) ──
    const jadwalList = (filterMode === 'SEARCH' && filterName && filterName.length >= 2)
      ? await jadwalKBMService.getJadwalHariIniByNama(tenantId, currentDay, activeSem.id, filterName)
      : await jadwalKBMService.getJadwalHariIniSemua(tenantId, currentDay, activeSem.id);

    const sesiList = await sesiService.listByTanggal(tenantId, new Date());

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

    // Urutkan daftar guru secara alfabetis A-Z berdasarkan nama_guru
    targetJadwal.sort((a: any, b: any) => {
      const nameA = (a.Guru?.nama_guru || '').toUpperCase();
      const nameB = (b.Guru?.nama_guru || '').toUpperCase();
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    });

    // Helper: resolve status icon + label dari sesiList
    const resolveStatus = (j: any): { icon: string; label: string } => {
      const sesi = sesiList.find(s =>
        (s.jadwal_kbm_id && s.jadwal_kbm_id === j.id) ||
        (s.guru_id === j.guru_id && s.kelas_id === j.kelas_id)
      );
      if (!sesi) return { icon: '🔴', label: 'Belum Masuk' };
      if (sesi.status === 'BERLANGSUNG') return { icon: '🟢', label: 'Mengajar' };
      if (sesi.status === 'SELESAI')     return { icon: '✅', label: 'Selesai' };
      if (sesi.status === 'IZIN')        return { icon: '🟡', label: 'Izin' };
      return { icon: '🟡', label: sesi.status };
    };

    // Helper: build agregasi per guru (untuk mode 82 dan 83)
    const buildAggregated = (list: any[]): string => {
      const grouped = new Map<string, { shortName: string; slots: any[] }>();
      list.forEach((j: any) => {
        const guruId    = j.guru_id || j.Guru?.id || j.id;
        const rawName   = j.Guru?.nama_guru || 'Guru';
        const shortName = GuruJadwalHandler.pruneGelar(rawName);
        if (!grouped.has(guruId)) grouped.set(guruId, { shortName, slots: [] });
        grouped.get(guruId)!.slots.push(j);
      });

      // Merge slot berurutan (kelas sama, jam_selesai[i] == jam_mulai[i+1])
      const mergeConsecutive = (slots: any[]): Array<{ kelas: string; jamMulai: string; jamSelesai: string; bestStatus: { icon: string; label: string } }> => {
        // Sort by jam_mulai dulu
        slots.sort((a: any, b: any) => (a.jam_mulai || '').localeCompare(b.jam_mulai || ''));

        const merged: Array<{ kelas: string; kelasId: string; jamMulai: string; jamSelesai: string; rawSlots: any[] }> = [];
        for (const slot of slots) {
          const kelasId   = slot.kelas_id || slot.Kelas?.id || '';
          const kelasName = slot.Kelas?.nama_kelas || '-';
          const last = merged[merged.length - 1];
          // Gabung jika kelas sama dan jam berurutan (jam_selesai last == jam_mulai slot ini)
          if (last && last.kelasId === kelasId && last.jamSelesai === slot.jam_mulai) {
            last.jamSelesai = slot.jam_selesai;
            last.rawSlots.push(slot);
          } else {
            merged.push({ kelas: kelasName, kelasId, jamMulai: slot.jam_mulai, jamSelesai: slot.jam_selesai, rawSlots: [slot] });
          }
        }

        // Resolve status terbaik dari tiap grup: BERLANGSUNG > SELESAI > IZIN > Belum Masuk
        const statusPriority = (icon: string) =>
          icon === '🟢' ? 4 : icon === '✅' ? 3 : icon === '🟡' ? 2 : 1;

        return merged.map(m => {
          const statuses = m.rawSlots.map((s: any) => resolveStatus(s));
          const bestStatus = statuses.reduce((best, cur) =>
            statusPriority(cur.icon) > statusPriority(best.icon) ? cur : best
          );
          return { kelas: m.kelas, jamMulai: m.jamMulai, jamSelesai: m.jamSelesai, bestStatus };
        });
      };

      const sortedGuru = Array.from(grouped.values()).sort((a, b) =>
        a.shortName.localeCompare(b.shortName, 'id', { sensitivity: 'base' })
      );

      let out = '';
      sortedGuru.forEach(({ shortName, slots }) => {
        const mergedSlots = mergeConsecutive(slots);
        // Status dominan guru: ambil dari merged slots
        const statusPriority = (icon: string) =>
          icon === '🟢' ? 4 : icon === '✅' ? 3 : icon === '🟡' ? 2 : 1;
        const dominant = mergedSlots.reduce((best, cur) =>
          statusPriority(cur.bestStatus.icon) > statusPriority(best.bestStatus.icon) ? cur : best
        ).bestStatus;

        out += `${dominant.icon} *${shortName}*\n`;
        mergedSlots.forEach(({ kelas, jamMulai, jamSelesai, bestStatus }) => {
          out += `  ${bestStatus.icon} ${kelas} (${jamMulai}–${jamSelesai}) — ${bestStatus.label}\n`;
        });
        out += `\n`;
      });
      return out;
    };


    if (filterMode === 'SEARCH') {
      // ── MODE 82: Agregasi per guru + slot indent ──
      const aggregated = buildAggregated(targetJadwal);
      if (!aggregated) {
        msg += `❌ Tidak ada jadwal ditemukan untuk *"${filterName}"* hari ini.\n\n`;
        msg += `💡 Ketik *[82]* untuk cari nama lain atau *[8]* untuk Sub-menu.`;
        return msg;
      }
      msg += aggregated;

    } else if (filterMode === 'ALL') {
      // ── MODE 83: Agregasi semua guru hari ini + slot+jam ──
      msg += buildAggregated(targetJadwal);

    } else {
      // ── MODE 81 (NOW): Compact single-line per slot — ringkas karena hanya jam aktif ──
      targetJadwal.forEach((j: any) => {
        const rawName   = j.Guru?.nama_guru || 'Guru';
        const shortName = GuruJadwalHandler.pruneGelar(rawName);
        const kelasName = j.Kelas?.nama_kelas || '-';
        const jam       = `${j.jam_mulai}–${j.jam_selesai}`;
        const { icon, label } = resolveStatus(j);
        msg += `${icon} *${shortName}* | ${kelasName} (${jam}) — ${label}\n`;
      });
    }

    if (filterMode === 'NOW' && targetJadwal.length === 0) {
      msg += `ℹ️ _Saat ini tidak ada slot mengajar aktif pada jam ini (${nowWibStr} WIB)._\n\n`;
      msg += `💡 Ketik *[83]* untuk lihat seluruh jadwal guru hari ini.`;
    } else {
      msg += `\n💡 Ketik *[8]* untuk Sub-menu Posisi Guru atau *[0]* Menu Utama.`;
    }

    return msg;
  }

  /** ─────────────────────────────────────────────────────────────
   *  Menu 84 / 85 / 86: Rekap & Monitoring KBM untuk Kurikulum
   * ──────────────────────────────────────────────────────────── */
  static async handleRekapKBM(cmd: string, tenantId: string): Promise<string> {
    const activeSem = await getWhatsappActiveSemester(tenantId);
    if (!activeSem) return '⚠️ Semester aktif sekolah belum diatur.';

    const tz = await getTenantTimezone(tenantId);
    const currentDay = getHariByTimezone(tz);
    const nowWibStr  = new Date().toLocaleTimeString('en-US', {
      timeZone: tz || 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit',
    });


    // ── Query menggunakan service layer ──
    const jadwalList: any[] = await jadwalKBMService.getJadwalHariIniSemua(tenantId, currentDay, activeSem.id);
    const sesiList: any[]   = await sesiService.listByTanggal(tenantId, new Date());


    const resolveStatus = (j: any): { icon: string; label: string } => {
      const sesi = sesiList.find((s: any) =>
        (s.jadwal_kbm_id && s.jadwal_kbm_id === j.id) ||
        (s.guru_id === j.guru_id && s.kelas_id === j.kelas_id)
      );
      if (!sesi) return { icon: '🔴', label: 'Belum Masuk' };
      if (sesi.status === 'BERLANGSUNG') return { icon: '🟢', label: 'Mengajar' };
      if (sesi.status === 'SELESAI')     return { icon: '✅', label: 'Selesai' };
      if (sesi.status === 'IZIN')        return { icon: '🟡', label: 'Izin' };
      return { icon: '🟡', label: sesi.status };
    };

    // ── MENU 84: Guru Belum Masuk Jam Ini ──────────────────────
    if (cmd === '84') {
      const activeNow = jadwalList.filter((j: any) =>
        j.jam_mulai <= nowWibStr && j.jam_selesai >= nowWibStr
      );
      const belumMasuk = activeNow.filter((j: any) => resolveStatus(j).icon === '🔴');

      let msg = `🚨 *Guru Belum Masuk — ${currentDay}, ${nowWibStr} WIB*\n\n`;

      if (belumMasuk.length === 0) {
        msg += `✅ _Semua guru yang dijadwalkan jam ini sudah masuk kelas._\n`;
      } else {
        msg += `⚠️ *${belumMasuk.length} guru* belum masuk saat ini:\n\n`;
        // Agregasi per guru
        const byGuru = new Map<string, { nama: string; kelasList: string[] }>();
        belumMasuk.forEach((j: any) => {
          const gId   = j.guru_id;
          const nama  = GuruJadwalHandler.pruneGelar(j.Guru?.nama_guru || 'Guru');
          const kelas = `${j.Kelas?.nama_kelas || '-'} (${j.jam_mulai}–${j.jam_selesai})`;
          if (!byGuru.has(gId)) byGuru.set(gId, { nama, kelasList: [] });
          byGuru.get(gId)!.kelasList.push(kelas);
        });
        Array.from(byGuru.values())
          .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }))
          .forEach(({ nama, kelasList }) => {
            msg += `🔴 *${nama}*\n`;
            kelasList.forEach(k => { msg += `  📚 ${k}\n`; });
            msg += `\n`;
          });
      }

      msg += `\n💡 Ketik *[85]* Rekap KBM | *[86]* Kelas Kosong | *[8]* Sub-menu`;
      return msg;
    }

    // ── MENU 85: Rekap KBM Hari Ini ────────────────────────────
    if (cmd === '85') {
      const total     = jadwalList.length;
      let mengajar    = 0, selesai = 0, izin = 0, belumMasuk = 0;

      jadwalList.forEach((j: any) => {
        const { icon } = resolveStatus(j);
        if (icon === '🟢') mengajar++;
        else if (icon === '✅') selesai++;
        else if (icon === '🟡') izin++;
        else belumMasuk++;
      });

      const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

      // Hitung slot aktif jam ini
      const activeNow    = jadwalList.filter((j: any) => j.jam_mulai <= nowWibStr && j.jam_selesai >= nowWibStr);
      const belumJamIni  = activeNow.filter((j: any) => resolveStatus(j).icon === '🔴').length;

      let msg  = `📊 *Rekap KBM Hari Ini — ${currentDay}*\n`;
          msg += `🕐 Per pukul: ${nowWibStr} WIB\n\n`;
          msg += `📋 Total slot jadwal : *${total}*\n`;
          msg += `🟢 Mengajar          : *${mengajar}* (${pct(mengajar)})\n`;
          msg += `✅ Selesai           : *${selesai}* (${pct(selesai)})\n`;
          msg += `🔴 Belum Masuk       : *${belumMasuk}* (${pct(belumMasuk)})\n`;
          msg += `🟡 Izin              : *${izin}* (${pct(izin)})\n`;

      if (belumJamIni > 0) {
        msg += `\n⚠️ *${belumJamIni} guru* belum masuk di jam aktif sekarang!\n`;
        msg += `💡 Ketik *[84]* untuk lihat daftarnya.\n`;
      } else if (activeNow.length > 0) {
        msg += `\n✅ _Semua guru jam ini sudah masuk kelas._\n`;
      }

      msg += `\n💡 Ketik *[84]* Belum Masuk | *[86]* Kelas Kosong | *[8]* Sub-menu`;
      return msg;
    }

    // ── MENU 86: Kelas Kosong Sekarang ─────────────────────────
    if (cmd === '86') {
      const activeNow  = jadwalList.filter((j: any) =>
        j.jam_mulai <= nowWibStr && j.jam_selesai >= nowWibStr
      );
      const kosong = activeNow.filter((j: any) => resolveStatus(j).icon === '🔴');

      let msg = `🏫 *Kelas Kosong Sekarang — ${currentDay}, ${nowWibStr} WIB*\n\n`;

      if (kosong.length === 0) {
        msg += `✅ _Tidak ada kelas kosong saat ini. Semua kelas terisi._\n`;
      } else {
        msg += `⚠️ *${kosong.length} kelas* tidak ada guru saat ini:\n\n`;
        // Urutkan per kelas
        const byKelas = new Map<string, { namaKelas: string; slots: any[] }>();
        kosong.forEach((j: any) => {
          const kId = j.kelas_id;
          const namaKelas = j.Kelas?.nama_kelas || '-';
          if (!byKelas.has(kId)) byKelas.set(kId, { namaKelas, slots: [] });
          byKelas.get(kId)!.slots.push(j);
        });
        Array.from(byKelas.values())
          .sort((a, b) => a.namaKelas.localeCompare(b.namaKelas, 'id', { sensitivity: 'base' }))
          .forEach(({ namaKelas, slots }) => {
            msg += `🏫 *${namaKelas}*\n`;
            slots.forEach((j: any) => {
              const guru  = GuruJadwalHandler.pruneGelar(j.Guru?.nama_guru || 'Guru');
              const mapel = j.MataPelajaran?.nama_mapel || '-';
              msg += `  🔴 ${mapel} — ${guru} (${j.jam_mulai}–${j.jam_selesai})\n`;
            });
            msg += `\n`;
          });
      }

      msg += `\n💡 Ketik *[84]* Guru Belum Masuk | *[85]* Rekap | *[8]* Sub-menu`;
      return msg;
    }

    return '⚠️ Perintah tidak dikenali.';
  }
}
