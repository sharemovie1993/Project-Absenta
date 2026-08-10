import { ChatbotContext } from '../../core/chatbot-context';
import { siswaService } from '@/modules/academic/siswa/services/siswa.service';
import { jadwalKBMService } from '@/modules/kurikulum/jadwal-kbm/services/jadwal-kbm.service';
import { sesiService } from '@/modules/attendance/sesi-absensi/services/sesi.service';
import { formatSiswaMenu, getWhatsappActiveSemester, aggregateJadwal } from '../../../services/wa-chatbot-commands';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { prisma } from '@/utils/prisma';
import { chatbotSessionManager, type ChatbotDialogSession } from '../../core/session-state-manager';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

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

/** Helper: Cek apakah siswa terdaftar sebagai Petugas Absensi Kelas */
export async function isPetugasKelas(tenantId: string, userId?: string | null, kelasId?: string | null): Promise<boolean> {
  if (!userId || !kelasId) return false;
  const assignment = await prisma.organizationalAssignment.findFirst({
    where: {
      tenant_id: tenantId,
      user_id: userId,
      kelas_id: kelasId,
      is_active: true,
      Position: { code: 'PETUGAS_KELAS' },
    },
    select: { id: true },
  });
  return !!assignment;
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
      const tinggi = siswa.tinggi_badan ? `${siswa.tinggi_badan} cm` : '-';
      const berat = siswa.berat_badan ? `${siswa.berat_badan} kg` : '-';

      let msg = `👤 *Data Profil Pribadi Siswa*\n\n`;
      msg += `• Nama    : *${siswa.nama_siswa}*\n`;
      msg += `• NIS     : ${siswa.nis || '-'}\n`;
      msg += `• NISN    : ${siswa.nisn || '-'}\n`;
      msg += `• Kelas   : ${kelas}\n`;
      msg += `• Jurusan : ${jurusan}\n`;
      msg += `• Status  : *${siswa.status || 'AKTIF'}*\n`;
      msg += `• Tinggi  : *${tinggi}*\n`;
      msg += `• Berat   : *${berat}*\n`;
      msg += `• RFID    : ${siswa.no_rfid ? '✅ Terhubung' : '❌ Belum Ada'}\n\n`;
      msg += `⚙️ *Pilihan Menu Profil:*\n`;
      msg += `[11] 📏 Update Tinggi & Berat Badan\n\n`;
      msg += `💡 Ketik *11* untuk update fisik (TB/BB) atau *[0]* untuk Menu Utama.`;
      return msg;
    }

    // [11] Initiator untuk Update Tinggi & Berat Badan Siswa
    if (choice === '11' || choice.includes('UPDATE FISIK') || choice.includes('UPDATE TB') || choice.includes('UPDATE BB')) {
      chatbotSessionManager.set(ctx.cleanJid, {
        flowId: 'SISWA_UPDATE_PHYSICAL',
        step: 'AWAITING_INPUT',
        payload: {
          siswaId: siswa.id,
          namaSiswa: siswa.nama_siswa,
        },
      });

      return (
        `📏 *Update Tinggi & Berat Badan*\n` +
        `👤 Siswa: *${siswa.nama_siswa}*\n\n` +
        `Silakan balas pesan ini dengan format:\n` +
        `*<Tinggi Badan (cm)> <Berat Badan (kg)>*\n\n` +
        `*Contoh:* \`170 65\` (Tinggi 170 cm, Berat 65 kg)\n` +
        `Atau bisa juga tulis \`170cm 65kg\`\n\n` +
        `💡 Ketik *[0]* atau *BATAL* untuk membatalkan.`
      );
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
      const rawJadwal = await jadwalKBMService.getJadwalKelas(
        siswa.tenant_id,
        activeSem ? activeSem.id : '',
        siswa.kelas_id,
        currentDay
      );
      const jadwalHariIni = aggregateJadwal(rawJadwal);

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
        const slotInfo = (j.startSlot && j.endSlot && j.startSlot !== j.endSlot)
          ? ` (Jam ${j.startSlot}–${j.endSlot})`
          : (j.startSlot ? ` (Jam ${j.startSlot})` : '');
        msg += `${idx + 1}. ⏱️ ${j.jam_mulai}–${j.jam_selesai}${slotInfo} │ 📖 ${mapel}\n`;
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

      const rawJadwal = await jadwalKBMService.getJadwalKelas(
        siswa.tenant_id,
        activeSem ? activeSem.id : '',
        siswa.kelas_id
      );

      if (rawJadwal.length === 0) {
        return (
          `📅 *Jadwal 1 Minggu*\n` +
          `🏫 Kelas: *${siswa.Kelas?.nama_kelas || '-'}*\n\n` +
          `Belum ada jadwal KBM untuk kelas ini.\n\n` +
          `💡 Ketik *[0]* untuk Menu Utama.`
        );
      }

      const grouped: Record<string, typeof rawJadwal> = {};
      rawJadwal.forEach(j => {
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
        const aggregatedItems = aggregateJadwal(items);
        aggregatedItems.forEach((j, idx) => {
          const isLast = idx === aggregatedItems.length - 1;
          const branch = isLast ? '└' : '├';
          const mapel = (j as any).Mapel?.nama_mapel || '-';
          const guru = (j as any).Guru?.nama_guru || '-';
          const slotInfo = (j.startSlot && j.endSlot && j.startSlot !== j.endSlot)
            ? ` (Jam ${j.startSlot}–${j.endSlot})`
            : (j.startSlot ? ` (Jam ${j.startSlot})` : '');
          msg += ` ${branch} ⏱️ ${j.jam_mulai}–${j.jam_selesai}${slotInfo} │ 📖 ${mapel} (${guru})\n`;
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

    // [6] Presensi Guru KBM — khusus Petugas Kelas
    if (choice === '6' || choice === '60' || choice.startsWith('6') || choice.includes('PETUGAS') || choice.includes('ABSEN GURU')) {
      return SiswaHandler.handlePetugasMenu(ctx);
    }

    const isPetugas = await isPetugasKelas(siswa.tenant_id, siswa.user_id, siswa.kelas_id);
    return formatSiswaMenu(siswa.nama_siswa, isPetugas);
  }

  /**
   * MENU 6: Daftar Presensi Guru KBM Hari Ini untuk Petugas Kelas
   */
  static async handlePetugasMenu(ctx: ChatbotContext): Promise<string> {
    const siswa = ctx.siswa;
    if (!siswa) return '⚠️ Data Siswa tidak ditemukan.';
    if (!siswa.kelas_id) return '⚠️ Data kelas Siswa belum diset. Hubungi Admin Sekolah.';

    const tenantId = siswa.tenant_id;

    // Cek Otorisasi Petugas Kelas
    const isPetugas = await isPetugasKelas(tenantId, siswa.user_id, siswa.kelas_id);
    if (!isPetugas) {
      return (
        `⚠️ *Akses Terbatas*\n\n` +
        `Fitur ini khusus untuk *Petugas Absensi Kelas* yang telah ditugaskan oleh sekolah.\n` +
        `Nama Anda (*${siswa.nama_siswa}*) belum terdaftar sebagai Petugas Absensi di kelas *${siswa.Kelas?.nama_kelas || '-'}*.\n\n` +
        `💡 Silakan hubungi Wali Kelas atau Admin Sekolah untuk didaftarkan sebagai Petugas Kelas.`
      );
    }

    const choice = ctx.commandUpper.trim();
    const tz = await getTenantTimezone(tenantId);
    const currentDay = getHariByTimezone(tz);
    const activeSem = await getWhatsappActiveSemester(tenantId);
    if (!activeSem) return '⚠️ Semester aktif sekolah belum diatur.';

    // Ambil jadwal KBM kelas hari ini (ter-enrich jam per hari & ter-agregasi)
    const rawJadwalList = await jadwalKBMService.getJadwalKelas(tenantId, activeSem.id, siswa.kelas_id, currentDay);
    const jadwalList = aggregateJadwal(rawJadwalList);

    if (jadwalList.length === 0) {
      return (
        `📋 *Presensi Guru KBM — ${siswa.Kelas?.nama_kelas || '-'}*\n` +
        `📅 Hari ini: ${currentDay}\n\n` +
        `Tidak ada jadwal KBM kelas hari ini. 😊\n\n` +
        `💡 Ketik *[0]* untuk Menu Utama.`
      );
    }

    // 🚀 Support pintasan 3-digit langsung e.g. "611", "612", "621"
    const direct3DigitMatch = choice.match(/^6([1-9])([1-4])$/);
    if (direct3DigitMatch) {
      const slotIdx = parseInt(direct3DigitMatch[1], 10) - 1;
      const statusCode = direct3DigitMatch[2]; // '1', '2', '3', '4'
      if (slotIdx >= 0 && slotIdx < jadwalList.length) {
        const selectedJadwal = jadwalList[slotIdx];
        const dummySession = {
          payload: {
            jadwalId: selectedJadwal.id,
            guruId: selectedJadwal.guru_id,
            mapelId: selectedJadwal.mapel_id,
            mapelName: selectedJadwal.Mapel?.nama_mapel || '-',
            guruName: selectedJadwal.Guru?.nama_guru || 'Guru',
            jamRange: `${selectedJadwal.jam_mulai}–${selectedJadwal.jam_selesai}`,
            slotLabel: (selectedJadwal.startSlot && selectedJadwal.endSlot && selectedJadwal.startSlot !== selectedJadwal.endSlot)
              ? `Jam ${selectedJadwal.startSlot}–${selectedJadwal.endSlot}`
              : `Jam ${selectedJadwal.startSlot || 1}`,
            kelasName: siswa.Kelas?.nama_kelas || '-',
            kelasId: siswa.kelas_id,
          }
        };
        const newCtx = { ...ctx, messageText: statusCode, commandUpper: statusCode };
        return SiswaHandler.processPetugasUpdateStatus(newCtx, dummySession);
      }
    }

    // Ambil sesi absensi & absen guru hari ini
    const sesiList = await sesiService.listByTanggal(tenantId, new Date());

    // Cek jika pengguna memilih nomor slot spesifik e.g. "61", "62", atau "1"
    const slotChoiceMatch = choice.match(/^6([1-9])$/) || (choice.length === 1 && choice !== '6' && choice !== '0' ? choice.match(/^([1-9])$/) : null);
    
    if (slotChoiceMatch) {
      const targetIndex = parseInt(slotChoiceMatch[1], 10) - 1;
      if (targetIndex >= 0 && targetIndex < jadwalList.length) {
        const selected = jadwalList[targetIndex];
        return SiswaHandler.promptUpdateGuruStatus(ctx, selected);
      }
    }

    // Tampilkan daftar jadwal & status guru saat ini
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz });
    let msg = `📋 *Presensi Guru KBM — ${siswa.Kelas?.nama_kelas || '-'}*\n`;
    msg += `📅 ${currentDay}, ${todayStr}\n\n`;
    msg += `Pilih jam pelajaran yang ingin diupdate status gurunya:\n\n`;

    jadwalList.forEach((j: any, idx: number) => {
      const num = idx + 1;
      const jamRange = `${j.jam_mulai}–${j.jam_selesai}`;
      const slotLabel = (j.startSlot && j.endSlot && j.startSlot !== j.endSlot)
        ? `Jam ${j.startSlot}–${j.endSlot}`
        : (j.startSlot ? `Jam ${j.startSlot}` : `Slot ${num}`);
      const mapel = j.Mapel?.nama_mapel || '-';
      const guru = j.Guru?.nama_guru || 'Guru';

      // Find matching session
      const sesi = sesiList.find((s: any) =>
        (s.jadwal_kbm_id && s.jadwal_kbm_id === j.id) ||
        (s.guru_id === j.guru_id && s.kelas_id === j.kelas_id)
      );

      let statusBadge = '🔴 Belum Masuk';
      if (sesi) {
        if (sesi.status === 'BERLANGSUNG') statusBadge = '🟢 Mengajar / Hadir';
        else if (sesi.status === 'SELESAI') statusBadge = '✅ Selesai';
        else if (sesi.status === 'IZIN') statusBadge = '🟡 Izin / Tugas';
        else if (sesi.status === 'SAKIT') statusBadge = '🟠 Sakit';
        else if (sesi.status === 'ALPA') statusBadge = '🔴 Alpa';
        else statusBadge = `🟡 ${sesi.status}`;
      }

      msg += `[*6${num}*] ⏱️ ${jamRange} (${slotLabel})\n`;
      msg += `      📖 ${mapel} — ${guru}\n`;
      msg += `      Status: ${statusBadge}\n\n`;
    });

    msg += `💡 Ketik nomor opsi (contoh: *61*) untuk update status guru.\n`;
    msg += `💡 Ketik *[0]* untuk Menu Utama.`;
    return msg;
  }

  /**
   * Prompt Pilihan Status Guru setelah Petugas memilih Slot
   */
  static promptUpdateGuruStatus(ctx: ChatbotContext, selectedJadwal: any): string {
    const siswa = ctx.siswa!;
    const mapel = selectedJadwal.Mapel?.nama_mapel || '-';
    const guru = selectedJadwal.Guru?.nama_guru || 'Guru';
    const jamRange = `${selectedJadwal.jam_mulai}–${selectedJadwal.jam_selesai}`;
    const slotLabel = (selectedJadwal.startSlot && selectedJadwal.endSlot && selectedJadwal.startSlot !== selectedJadwal.endSlot)
      ? `Jam ${selectedJadwal.startSlot}–${selectedJadwal.endSlot}`
      : `Jam ${selectedJadwal.startSlot || 1}`;

    // Simpan dialog session FSM
    chatbotSessionManager.set(ctx.cleanJid, {
      flowId: 'PETUGAS_UPDATE_STATUS',
      step: 'AWAITING_STATUS_CHOICE',
      payload: {
        jadwalId: selectedJadwal.id,
        guruId: selectedJadwal.guru_id,
        mapelId: selectedJadwal.mapel_id,
        mapelName: mapel,
        guruName: guru,
        jamRange,
        slotLabel,
        kelasName: siswa.Kelas?.nama_kelas || '-',
        kelasId: siswa.kelas_id,
      },
    });

    return (
      `✏️ *Update Status Guru KBM*\n\n` +
      `🏫 Kelas : *${siswa.Kelas?.nama_kelas || '-'}*\n` +
      `📖 Mapel : *${mapel}*\n` +
      `👨‍🏫 Guru  : *${guru}*\n` +
      `⏱️ Waktu : ${jamRange} (${slotLabel})\n\n` +
      `Pilih status kehadiran guru:\n\n` +
      `[1] 🟢 HADIR / MENGAJAR\n` +
      `[2] 🟡 IZIN / TUGAS\n` +
      `[3] 🟠 SAKIT\n` +
      `[4] 🔴 ALPA / TANPA KETERANGAN\n\n` +
      `💡 Ketik nomor *1*, *2*, *3*, atau *4* untuk menyimpan.\n` +
      `💡 Ketik *batal* untuk membatalkan.`
    );
  }

  /**
   * Eksekusi Simpan Status Guru dari Dialog FSM
   */
  static async processPetugasUpdateStatus(ctx: ChatbotContext, pendingSession: any): Promise<string> {
    const siswa = ctx.siswa;
    if (!siswa) return '⚠️ Data Siswa tidak ditemukan.';

    const text = (ctx.messageText || '').trim().toUpperCase();
    const payload = pendingSession.payload || {};

    let chosenStatus = '';
    let statusLabel = '';
    let sesiStatus = 'BERLANGSUNG';

    if (text === '1' || text === '611' || text.endsWith('1') || text.includes('HADIR') || text.includes('MENGAJAR')) {
      chosenStatus = 'HADIR';
      statusLabel = 'Hadir / Mengajar';
      sesiStatus = 'BERLANGSUNG';
    } else if (text === '2' || text === '612' || text.endsWith('2') || text.includes('IZIN') || text.includes('TUGAS')) {
      chosenStatus = 'IZIN';
      statusLabel = 'IZIN';
      sesiStatus = 'IZIN';
    } else if (text === '3' || text === '613' || text.endsWith('3') || text.includes('SAKIT')) {
      chosenStatus = 'SAKIT';
      statusLabel = 'SAKIT';
      sesiStatus = 'SAKIT';
    } else if (text === '4' || text === '614' || text.endsWith('4') || text.includes('ALPA') || text.includes('ALPHA')) {
      chosenStatus = 'ALPA';
      statusLabel = 'ALPA';
      sesiStatus = 'ALPA';
    } else {
      return (
        `⚠️ Pilihan tidak valid. Silakan ketik angka status:\n\n` +
        `[1] 🟢 HADIR / MENGAJAR\n` +
        `[2] 🟡 IZIN / TUGAS\n` +
        `[3] 🟠 SAKIT\n` +
        `[4] 🔴 ALPA / TANPA KETERANGAN\n\n` +
        `Atau ketik *batal* untuk membatalkan.`
      );
    }

    const tenantId = siswa.tenant_id;
    const activeSem = await getWhatsappActiveSemester(tenantId);
    if (!activeSem) {
      chatbotSessionManager.delete(ctx.cleanJid);
      return '⚠️ Semester aktif sekolah belum diatur.';
    }

    const activeYear = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true },
    });

    const tz = await getTenantTimezone(tenantId);
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Jakarta' });

    const TZ_OFFSET_MAP: Record<string, string> = {
      'Asia/Jakarta': '+07:00',
      'Asia/Makassar': '+08:00',
      'Asia/Jayapura': '+09:00'
    };
    const offsetStr = TZ_OFFSET_MAP[tz || 'Asia/Jakarta'] || '+07:00';
    const startOfDay = new Date(`${todayStr}T00:00:00.000${offsetStr}`);

    // Parse jamRange e.g. "07:15–08:35"
    let waktuMulai: Date | null = null;
    let waktuSelesai: Date | null = null;
    if (payload.jamRange) {
      const parts = String(payload.jamRange).split('–').map(p => p.trim());
      if (parts[0]) waktuMulai = new Date(`${todayStr}T${parts[0]}:00.000${offsetStr}`);
      if (parts[1]) waktuSelesai = new Date(`${todayStr}T${parts[1]}:00.000${offsetStr}`);
    }

    const now = new Date();

    // 1. Validasi Batas Awal: Maksimal 15 menit sebelum kelas dimulai
    if (waktuMulai) {
      const earlyThreshold = waktuMulai.getTime() - 15 * 60 * 1000;
      if (now.getTime() < earlyThreshold) {
        chatbotSessionManager.delete(ctx.cleanJid);
        return (
          `⚠️ *Presensi Ditolak*\n\n` +
          `Sesi KBM *${payload.mapelName}* (${payload.jamRange}) belum dimulai.\n` +
          `Absensi hanya dapat diisi maksimal 15 menit sebelum kelas dimulai.\n\n` +
          `💡 Ketik *[6]* untuk kembali ke daftar presensi kelas.`
        );
      }
    }

    // 2. Validasi Batas Akhir: Jam KBM sudah selesai
    if (waktuSelesai && now.getTime() > waktuSelesai.getTime()) {
      chatbotSessionManager.delete(ctx.cleanJid);
      return (
        `⚠️ *Presensi Ditolak*\n\n` +
        `Jam pelajaran KBM untuk *${payload.mapelName}* (${payload.jamRange}) sudah selesai.\n` +
        `Presensi tidak dapat diubah setelah jam KBM berakhir.\n\n` +
        `💡 Ketik *[6]* untuk kembali ke daftar presensi kelas.`
      );
    }

    const waktuTap = chosenStatus === 'HADIR' ? new Date() : null;

    try {
      // 1. Find or create SesiAbsensi
      let sesi = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: tenantId,
          jadwal_kbm_id: payload.jadwalId,
          tanggal: { gte: startOfDay },
        },
      });

      if (!sesi) {
        sesi = await prisma.sesiAbsensi.create({
          data: {
            tenant_id: tenantId,
            tahun_pelajaran_id: activeYear?.id || '',
            semester_id: activeSem.id,
            kelas_id: payload.kelasId,
            guru_id: payload.guruId || null,
            mapel_id: payload.mapelId || null,
            jadwal_kbm_id: payload.jadwalId,
            tanggal: new Date(),
            waktu_mulai: waktuMulai || new Date(),
            waktu_selesai: waktuSelesai,
            jenis_kegiatan: 'KBM',
            status: sesiStatus,
            created_by_user_id: siswa.user_id || null,
          },
        });
      } else {
        await prisma.sesiAbsensi.update({
          where: { id: sesi.id },
          data: { status: sesiStatus },
        });
      }

      // 2. Upsert AbsenGuru (if guru_id exists)
      if (payload.guruId) {
        await prisma.absenGuru.upsert({
          where: {
            sesi_id_guru_id: {
              sesi_id: sesi.id,
              guru_id: payload.guruId,
            },
          },
          create: {
            tenant_id: tenantId,
            sesi_id: sesi.id,
            guru_id: payload.guruId,
            status: statusLabel,
            waktu_tap: waktuTap,
            catatan: `Diupdate via WA oleh Petugas Kelas (${siswa.nama_siswa})`,
            tahun_pelajaran_id: activeYear?.id || '',
            semester_id: activeSem.id,
          },
          update: {
            status: statusLabel,
            waktu_tap: waktuTap,
            catatan: `Diupdate via WA oleh Petugas Kelas (${siswa.nama_siswa})`,
          },
        });
      }
    } catch (err: any) {
      console.error('[PETUGAS_WA_UPDATE_ERROR]', err);
      chatbotSessionManager.delete(ctx.cleanJid);
      return `❌ *Gagal Update Status Guru*\n\nTerjadi kesalahan: ${err.message || 'Error database'}\n\n💡 Ketik *[6]* untuk coba lagi.`;
    }

    // Clear cache & clear session
    void cacheInvalidationService.invalidateAttendanceCache(tenantId);
    chatbotSessionManager.delete(ctx.cleanJid);

    const iconMap: Record<string, string> = {
      HADIR: '🟢 HADIR / MENGAJAR',
      IZIN: '🟡 IZIN / TUGAS',
      SAKIT: '🟠 SAKIT',
      ALPA: '🔴 ALPA / TANPA KETERANGAN',
    };

    return (
      `✅ *Berhasil Update Status Guru!*\n\n` +
      `🏫 Kelas : *${payload.kelasName}*\n` +
      `📖 Mapel : *${payload.mapelName}*\n` +
      `👨‍🏫 Guru  : *${payload.guruName}*\n` +
      `⏱️ Waktu : ${payload.jamRange} (${payload.slotLabel})\n` +
      `📌 Status Baru : *${iconMap[chosenStatus]}*\n` +
      `👤 Petugas : ${siswa.nama_siswa}\n\n` +
      `💡 Ketik *[6]* untuk kembali ke presensi guru kelas atau *[0]* Menu Utama.`
    );
  }

  /** Process dialog FSM for updating Siswa height (Tinggi) & weight (Berat) */
  static async processUpdatePhysical(ctx: ChatbotContext, session: ChatbotDialogSession): Promise<string> {
    const text = ctx.messageText.trim();
    const siswaId = session.payload?.siswaId;
    if (!siswaId) {
      chatbotSessionManager.delete(ctx.cleanJid);
      return '❌ Sesi update telah kadaluarsa. Silakan ulangi dari menu profil (*ketik 1*).';
    }

    const matches = text.match(/\d+/g);
    if (!matches || matches.length === 0) {
      return (
        `⚠️ *Format Tidak Valid*\n\n` +
        `Silakan masukkan angka Tinggi & Berat Badan.\n` +
        `*Contoh:* \`170 65\` (Tinggi 170 cm, Berat 65 kg)\n\n` +
        `💡 Ketik *[0]* atau *BATAL* untuk membatalkan.`
      );
    }

    let tb: number | null = null;
    let bb: number | null = null;

    if (matches.length >= 2) {
      tb = parseInt(matches[0], 10);
      bb = parseInt(matches[1], 10);
    } else {
      const val = parseInt(matches[0], 10);
      if (val >= 100) {
        tb = val;
      } else {
        bb = val;
      }
    }

    // Validation ranges
    if (tb !== null && (tb < 50 || tb > 250)) {
      return `⚠️ Tinggi badan (${tb} cm) di luar rentang wajar (50-250 cm). Silakan masukkan kembali (contoh: *170 65*).`;
    }
    if (bb !== null && (bb < 15 || bb > 300)) {
      return `⚠️ Berat badan (${bb} kg) di luar rentang wajar (15-300 kg). Silakan masukkan kembali (contoh: *170 65*).`;
    }

    const updateData: any = {};
    if (tb !== null) updateData.tinggi_badan = tb;
    if (bb !== null) updateData.berat_badan = bb;

    if (Object.keys(updateData).length === 0) {
      return `⚠️ Tidak ada angka valid terdeteksi. Silakan balas dengan contoh: *170 65*.`;
    }

    try {
      const updated = await prisma.siswa.update({
        where: { id: siswaId },
        data: updateData,
        select: {
          nama_siswa: true,
          tinggi_badan: true,
          berat_badan: true,
          tenant_id: true,
          Kelas: { select: { nama_kelas: true } },
        },
      });

      // Clear Redis cache
      void cacheInvalidationService.invalidateSiswaCache(updated.tenant_id, siswaId);
      chatbotSessionManager.delete(ctx.cleanJid);

      const kelasStr = updated.Kelas?.nama_kelas || '-';
      const tbStr = updated.tinggi_badan ? `${updated.tinggi_badan} cm` : '-';
      const bbStr = updated.berat_badan ? `${updated.berat_badan} kg` : '-';

      return (
        `✅ *Berhasil Memutakhirkan Data Fisik Siswa!*\n\n` +
        `• Nama         : *${updated.nama_siswa}*\n` +
        `• Kelas        : ${kelasStr}\n` +
        `• Tinggi Badan : *${tbStr}* 📏\n` +
        `• Berat Badan  : *${bbStr}* ⚖️\n\n` +
        `Data fisik Anda telah tersimpan secara resmi di database sekolah.\n\n` +
        `💡 Ketik *[1]* untuk Profil Siswa atau *[0]* Menu Utama.`
      );
    } catch (err: any) {
      console.error('[CHATBOT_UPDATE_PHYSICAL_ERROR]', err);
      chatbotSessionManager.delete(ctx.cleanJid);
      return `❌ Gagal mengupdate data fisik: ${err.message || 'Terjadi kesalahan sistem.'}`;
    }
  }
}

