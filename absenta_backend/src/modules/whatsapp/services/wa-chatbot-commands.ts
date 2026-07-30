import { prisma } from '@/utils/prisma';
import { pendingGuruEditSession } from './wa-chatbot-resolver.service';

// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE HELPER — selalu gunakan WIB (Asia/Jakarta, UTC+7)
// Server mungkin berjalan di UTC; tanpa ini "SENIN" bisa muncul padahal
// di Indonesia sudah "SELASA" (UTC 23:xx = WIB 06:xx hari berikutnya).
// ─────────────────────────────────────────────────────────────────────────────
function getHariWIB(): string {
  // Ambil hari dalam timezone Asia/Jakarta
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

function getTanggalWIB(): Date {
  // Buat Date yang merepresentasikan waktu WIB sekarang
  const now = new Date();
  // Offset WIB = UTC+7 = 7 * 60 * 60 * 1000
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
  return new Date(wibMs);
}

/**
 * Singkat nama mata pelajaran agar tampilan WhatsApp Chatbot compact & bersih.
 * Menggunakan kode_mapel, kamus akronim mapel nasional, atau generator akronim otomatis.
 */
export function formatShortMapelName(mapelInput?: any): string {
  if (!mapelInput) return '-';

  let fullName = '';
  let kode = '';

  if (typeof mapelInput === 'string') {
    fullName = mapelInput.trim();
  } else {
    fullName = (mapelInput.nama_mapel || '').trim();
    kode = (mapelInput.kode_mapel || '').trim();
  }

  // Jika kode_mapel sudah ada dan pendek (2-10 karakter), utamakan kode_mapel
  if (kode && kode.length <= 10 && kode.length >= 2) {
    return kode.toUpperCase();
  }

  if (!fullName) return kode || '-';

  const nameUpper = fullName.toUpperCase();

  const mapelDict: Record<string, string> = {
    'PEMROGRAMAN BERORIENTASI OBJEK': 'PBO',
    'PEMROGRAMAN WEB DAN PERANGKAT BERGERAK': 'PWEB',
    'PEMROGRAMAN WEB': 'PWEB',
    'BASIS DATA': 'Basdat',
    'PENDIDIKAN AGAMA ISLAM DAN BUDI PEKERTI': 'PAI',
    'PENDIDIKAN AGAMA ISLAM': 'PAI',
    'PENDIDIKAN AGAMA KRISTEN': 'PAK',
    'PENDIDIKAN AGAMA KATOLIK': 'PA Katolik',
    'PENDIDIKAN PANCASILA DAN KEWARGANEGARAAN': 'PPKn',
    'PENDIDIKAN PANCASILA': 'Pancasila',
    'BAHASA INDONESIA': 'B. Indo',
    'BAHASA INGGRIS': 'B. Inggris',
    'BAHASA SUNDA': 'B. Sunda',
    'BAHASA JEPANG': 'B. Jepang',
    'MATEMATIKA': 'MTK',
    'MATEMATIKA TINGKAT LANJUT': 'MTK Lanjut',
    'PENDIDIKAN JASMANI OLAHRAGA DAN KESEHATAN': 'PJOK',
    'PENDIDIKAN JASMANI, OLAHRAGA, DAN KESEHATAN': 'PJOK',
    'PROJEK PENGUATAN PROFIL PELAJAR PANCASILA': 'P5',
    'PROJEK KREATIF DAN KEWIRAUSAHAAN': 'PKK',
    'DASAR-DASAR PENGEMBANGAN PERANGKAT LUNAK DAN GIM': 'Dasar PPLG',
    'DASAR-DASAR TEKNIK KOMPUTER DAN JARINGAN': 'Dasar TJKT',
    'BIMBINGAN DAN KONSELING': 'BK',
    'BIMBINGAN KONSELING': 'BK',
    'INFORMATIKA': 'Informatika',
    'SEJARAH INDONESIA': 'Sejarah',
    'SEJARAH': 'Sejarah',
    'SENI BUDAYA': 'Seni Budaya',
    'FISIKA': 'Fisika',
    'KIMIA': 'Kimia',
    'BIOLOGI': 'Biologi',
  };

  if (mapelDict[nameUpper]) {
    return mapelDict[nameUpper];
  }

  for (const [key, shortVal] of Object.entries(mapelDict)) {
    if (nameUpper.includes(key)) {
      return shortVal;
    }
  }

  if (fullName.length > 20) {
    const words = fullName.split(/\s+/).filter(w => !['dan', 'atau', 'pada', 'yang', 'untuk', '&'].includes(w.toLowerCase()));
    if (words.length >= 3) {
      const acronym = words.map(w => w[0].toUpperCase()).join('');
      if (acronym.length >= 2 && acronym.length <= 6) {
        return acronym;
      }
    }
    return fullName.substring(0, 18) + '...';
  }

  return fullName;
}

/**
 * Menggabungkan (aggregate) slot jadwal KBM berturutan
 * dengan mapel, kelas, guru, dan jenis kegiatan yang sama.
 * Contoh: Jam 1 (07:35-08:10), Jam 2 (08:10-08:45), Jam 3 (08:45-09:20) PAI
 * di-aggregate menjadi 1 block: 07:35 - 09:20 (Jam ke-1 s/d 3)
 */
export function aggregateJadwal(items: any[]): any[] {
  if (!items || items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    if (a.slot_index !== undefined && b.slot_index !== undefined) {
      return a.slot_index - b.slot_index;
    }
    return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
  });

  const merged: any[] = [];
  let current = {
    ...sorted[0],
    startSlot: sorted[0].slot_index || 1,
    endSlot: sorted[0].slot_index || 1,
  };
  merged.push(current);

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    const sameContext =
      String(current.kelas_id || '') === String(next.kelas_id || '') &&
      String(current.guru_id || '') === String(next.guru_id || '') &&
      String(current.mapel_id || '') === String(next.mapel_id || '') &&
      String(current.jenis_kegiatan || 'KBM').toUpperCase() === String(next.jenis_kegiatan || 'KBM').toUpperCase();

    if (sameContext) {
      const [currH, currM] = (current.jam_selesai || '').split(':').map(Number);
      const [nextH, nextM] = (next.jam_mulai || '').split(':').map(Number);
      const currMins = (currH || 0) * 60 + (currM || 0);
      const nextMins = (nextH || 0) * 60 + (nextM || 0);
      const gap = nextMins - currMins;

      // Jika jeda <= 35 menit (menutup jam istirahat standar), gabungkan!
      if (gap <= 35) {
        current.jam_selesai = next.jam_selesai;
        current.endSlot = next.slot_index || (current.endSlot + 1);
        continue;
      }
    }

    current = {
      ...next,
      startSlot: next.slot_index || 1,
      endSlot: next.slot_index || 1,
    };
    merged.push(current);
  }

  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatGuruMenu(nama: string): string {
  return (
    `👨‍🏫 *Halo Bapak/Ibu ${nama}!*\n` +
    `Selamat datang di Layanan WA Bot *Absenta*.\n\n` +
    `Ketik *ANGKA* opsi yang diinginkan:\n\n` +
    `[1] 📋 Jadwal Mengajar & Piket Hari Ini\n` +
    `[2] 🏫 Daftar Wali Kelas Sekolah\n` +
    `[3] 📊 Info Supervisi Akademik Saya\n` +
    `[4] ⏰ Info & Rekap Presensi Guru\n` +
    `[5] 👤 Data Profil Pribadi Saya\n` +
    `[6] 📅 Jadwal Mengajar & Piket Minggu Ini\n` +
    `[0] 🔄 Tampilkan Kembali Menu Ini`
  );
}

export function formatSiswaMenu(nama: string): string {
  return (
    `👦 *Halo ${nama}!*\n` +
    `Selamat datang di Layanan WA Bot *Absenta*.\n\n` +
    `Ketik *ANGKA* opsi yang diinginkan:\n\n` +
    `[1] 👤 Data Profil Pribadi & NIS\n` +
    `[2] ⏰ Status Presensi Saya Hari Ini\n` +
    `[3] 🏆 Catatan Poin Pelanggaran & Prestasi\n` +
    `[4] 📅 Jadwal Pelajaran Saya Hari Ini\n` +
    `[5] 📊 Rekap Kehadiran Bulan Ini\n` +
    `[0] 🔄 Tampilkan Kembali Menu Ini`
  );
}

export function formatOrtuMenu(nama: string): string {
  return (
    `👨‍👩‍👧 *Halo Bapak/Ibu ${nama}!*\n` +
    `Selamat datang di Layanan WA Bot *Absenta*.\n\n` +
    `Ketik *ANGKA* opsi yang diinginkan:\n\n` +
    `[1] ⏰ Status Presensi Ananda Hari Ini\n` +
    `[2] 📊 Rekap Kehadiran Ananda Bulan Ini\n` +
    `[3] 🏆 Catatan Poin & Prestasi Ananda\n` +
    `[4] 📞 Kontak & Info Wali Kelas Ananda\n` +
    `[0] 🔄 Tampilkan Kembali Menu Ini`
  );
}

export function formatDualRoleMenu(nama: string): string {
  return (
    `👋 *Halo Bapak/Ibu ${nama}!*\n` +
    `Nomor Anda terdaftar sebagai *Guru & Orang Tua* di Absenta.\n\n` +
    `Ketik *huruf* peran yang ingin diakses:\n` +
    `[G] 👨‍🏫 Masuk sebagai GURU\n` +
    `[O] 👨‍👩‍👧 Masuk sebagai ORANG TUA`
  );
}

export function formatMultiRoleMenu(nama: string, roles: { key: string; label: string }[]): string {
  const lines = roles.map(r => `[${r.key}] ${r.label}`).join('\n');
  return (
    `👋 *Halo ${nama}!*\n` +
    `Nomor Anda terdaftar dengan *${roles.length} peran* di Sistem Absenta.\n\n` +
    `Ketik *huruf* peran yang ingin diakses:\n` +
    `${lines}`
  );
}

export function formatGuestMessage(phone: string): string {
  return (
    `👋 *Halo!*\n` +
    `Nomor Anda (${phone}) *belum terdaftar* di Sistem Absenta.\n\n` +
    `Jika Anda adalah Orang Tua, Guru, atau Siswa di sekolah ini,\n` +
    `silakan hubungi bagian *Tata Usaha (TU)* sekolah untuk memverifikasi pendaftaran nomor HP Anda.`
  );
}

function invalidCommand(menu: string): string {
  return `⚠️ Perintah tidak dikenali.\n\nKetik *ANGKA* sesuai menu di bawah ini:\n\n${menu}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GURU COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

export async function handleGuruCommand(input: string, guru: any, jid?: string): Promise<string> {
  const choice = String(input || '').trim();

  // ── Interseptor Sesi Pending Edit Profil (NIP / Email) ────────────────────
  const pendingEdit = jid ? (pendingGuruEditSession.get(jid) || pendingGuruEditSession.get(jid.split('@')[0])) : null;

  if (pendingEdit) {
    const rawVal = choice;
    const upperVal = rawVal.toUpperCase();

    if (upperVal === '0' || upperVal === 'BATAL' || upperVal === 'CANCEL' || upperVal === 'MENU') {
      if (jid) {
        pendingGuruEditSession.delete(jid);
        pendingGuruEditSession.delete(jid.split('@')[0]);
      }
      return (
        `🚫 *Pengubahan ${pendingEdit === 'EDIT_NIP' ? 'NIP' : 'Email'} Dibatalkan.*\n\n` +
        `💡 Ketik *5* untuk Profil Pribadi atau *[0]* untuk Menu Utama.`
      );
    }

    if (pendingEdit === 'EDIT_NIP') {
      if (!rawVal) {
        return `⚠️ Nomor NIP tidak boleh kosong.\nSilakan masukkan nomor NIP baru Anda (atau ketik *BATAL*):`;
      }
      try {
        await prisma.guru.update({
          where: { id: guru.id },
          data: { nip: rawVal },
        });
        if (jid) {
          pendingGuruEditSession.delete(jid);
          pendingGuruEditSession.delete(jid.split('@')[0]);
        }
        return (
          `✅ *NIP Guru Berhasil Diperbarui!*\n\n` +
          `• Nama     : *${guru.nama_guru}*\n` +
          `• NIP Baru : *${rawVal}*\n\n` +
          `💡 Ketik *5* untuk lihat Profil Pribadi atau *[0]* untuk Menu Utama.`
        );
      } catch (err: any) {
        return `⚠️ Gagal memperbarui NIP: ${err.message || 'Terjadi kesalahan sistem.'}`;
      }
    }

    if (pendingEdit === 'EDIT_EMAIL') {
      const newEmail = rawVal.toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return (
          `⚠️ *Format Email Tidak Valid*\n\n` +
          `Format email (*${rawVal}*) tidak valid.\n` +
          `Silakan ketik ulang alamat email yang benar (contoh: *guru@sekolah.sch.id*) atau ketik *BATAL*:`
        );
      }

      if (!guru.user_id) {
        if (jid) {
          pendingGuruEditSession.delete(jid);
          pendingGuruEditSession.delete(jid.split('@')[0]);
        }
        return `⚠️ Akun pengguna untuk Guru ini tidak ditemukan di sistem. Hubungi Admin Sekolah.`;
      }

      try {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: newEmail,
            id: { not: guru.user_id },
          },
        });

        if (existingUser) {
          return (
            `⚠️ *Email Sudah Terdaftar*\n\n` +
            `Email *${newEmail}* sudah digunakan oleh pengguna lain di sistem.\n` +
            `Silakan masukkan alamat email yang lain (atau ketik *BATAL*):`
          );
        }

        await prisma.user.update({
          where: { id: guru.user_id },
          data: { email: newEmail },
        });

        if (jid) {
          pendingGuruEditSession.delete(jid);
          pendingGuruEditSession.delete(jid.split('@')[0]);
        }
        return (
          `✅ *Email Guru Berhasil Diperbarui!*\n\n` +
          `• Nama       : *${guru.nama_guru}*\n` +
          `• Email Baru : *${newEmail}*\n\n` +
          `💡 Ketik *5* untuk lihat Profil Pribadi atau *[0]* untuk Menu Utama.`
        );
      } catch (err: any) {
        return `⚠️ Gagal memperbarui Email: ${err.message || 'Terjadi kesalahan sistem.'}`;
      }
    }
  }

  // [1] Jadwal Mengajar Hari Ini
  if (choice === '1') {
    const currentDay = getHariWIB(); // WIB timezone

    // Cari semester aktif terlebih dahulu
    const semesterAktif = await prisma.semester.findFirst({
      where: {
        tenant_id: guru.tenant_id,
        is_active: true,
        TahunPelajaran: { is_active: true },
      },
      orderBy: { created_at: 'desc' }, // ambil semester aktif paling baru
      select: { id: true, nama_semester: true, TahunPelajaran: { select: { tahun: true } } },
    });

    // Query jadwal — filter semester aktif jika ada, fallback tanpa filter semester
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

  // [2] Daftar Semua Wali Kelas Aktif di Sekolah
  if (choice === '2') {
    // Query semua penugasan WALI_KELAS aktif untuk seluruh kelas di tenant
    let waliAssignments: any[] = [];
    try {
      waliAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: guru.tenant_id,
          is_active: true,
          kelas_id:  { not: null },
          Position:  { code: 'WALIKELAS' },
        },
        include: {
          Kelas: { select: { nama_kelas: true, tingkat: true } },
          User:  { include: { Guru: { select: { nama_guru: true, no_hp: true } } } },
        },
        take: 50,
      });
    } catch {
      // Jika model OrganizationalAssignment belum ada data posisi WALI_KELAS,
      // coba juga dengan nama posisi mengandung "Wali"
      try {
        waliAssignments = await prisma.organizationalAssignment.findMany({
          where: {
            tenant_id: guru.tenant_id,
            is_active: true,
            kelas_id:  { not: null },
            Position:  { OR: [{ code: 'WALIKELAS' }, { name: { contains: 'Wali', mode: 'insensitive' } }] },
          },
          include: {
            Kelas: { select: { nama_kelas: true, tingkat: true } },
            User:  { include: { Guru: { select: { nama_guru: true, no_hp: true } } } },
          },
          take: 50,
        });
      } catch {
        waliAssignments = [];
      }
    }

    if (waliAssignments.length === 0) {
      return (
        `🏫 *Daftar Wali Kelas Sekolah*\n\n` +
        `Belum ada penugasan Wali Kelas yang tercatat di sistem.\n` +
        `Hubungi admin untuk mengatur penugasan Wali Kelas.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    // Sort manual berdasarkan nama kelas (tingkat lalu nama)
    waliAssignments.sort((a: any, b: any) => {
      const ka = `${a.Kelas?.tingkat || 0}-${a.Kelas?.nama_kelas || ''}`;
      const kb = `${b.Kelas?.tingkat || 0}-${b.Kelas?.nama_kelas || ''}`;
      return ka.localeCompare(kb);
    });

    let msg = `🏫 *Daftar Wali Kelas Aktif*\n`;
    msg += `Total: ${waliAssignments.length} kelas\n\n`;
    waliAssignments.forEach((w: any, i: number) => {
      const kelasNama = w.Kelas?.nama_kelas || '-';
      const guruNama  = w.User?.Guru?.nama_guru || w.User?.name || 'Belum ditentukan';
      msg += `${i + 1}. *${kelasNama}* — ${guruNama}\n`;
    });
    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  // [3] Info Supervisi Akademik Saya
  if (choice === '3') {
    const supervisiList = await prisma.supervisiGuru.findMany({
      where: { guru_id: guru.id },
      orderBy: { tanggal: 'desc' },
      include: { Supervisor: { select: { nama_guru: true } } },
      take: 5,
    });

    if (supervisiList.length === 0) {
      return (
        `📊 *Info Supervisi Akademik*\n\n` +
        `Belum ada riwayat atau jadwal supervisi akademik yang terdaftar untuk Bapak/Ibu *${guru.nama_guru}*.\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    let msg = `📊 *Info Supervisi Akademik Saya*\n`;
    msg += `Guru: *${guru.nama_guru}*\n`;
    msg += `Total: ${supervisiList.length} supervisi terbaru\n\n`;

    supervisiList.forEach((s: any, i: number) => {
      const tglStr = new Date(s.tanggal).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      // Format status badge
      const statusUpper = String(s.status || '').toUpperCase();
      let statusBadge = `⚪ *${statusUpper}*`;
      if (statusUpper === 'COMPLETED' || statusUpper === 'SELESAI') {
        statusBadge = '🟢 *SELESAI*';
      } else if (statusUpper === 'SCHEDULED' || statusUpper === 'TERJADWAL') {
        statusBadge = '🟡 *TERJADWAL*';
      } else if (statusUpper === 'DRAFT' || statusUpper === 'PROSES') {
        statusBadge = '🔵 *PROSES*';
      }

      // Predikat Nilai
      let predikat = '';
      if (typeof s.nilai === 'number') {
        if (s.nilai >= 90) predikat = '(Sangat Baik 🌟)';
        else if (s.nilai >= 80) predikat = '(Baik 👍)';
        else if (s.nilai >= 70) predikat = '(Cukup 👌)';
        else predikat = '(Perlu Perbaikan ⚠️)';
      }

      msg += `${i + 1}. 📅 *${tglStr}*\n`;
      msg += `   • Status        : ${statusBadge}\n`;
      msg += `   • Supervisor    : ${s.Supervisor?.nama_guru || 'Tim Penilai'}\n`;

      if (s.mapel || s.kelas || s.jam_ke) {
        const detailParts: string[] = [];
        if (s.mapel)  detailParts.push(`📖 ${s.mapel}`);
        if (s.kelas)  detailParts.push(`🏫 ${s.kelas}`);
        if (s.jam_ke) detailParts.push(`Jam ke-${s.jam_ke}`);
        msg += `   • Kegiatan      : ${detailParts.join(' | ')}\n`;
      }

      if (typeof s.nilai === 'number') {
        msg += `   • Nilai Hasil   : 💯 *${s.nilai}/100* ${predikat}\n`;
      }

      if (s.target_pembelajaran) {
        msg += `   • Target KBM    : ${s.target_pembelajaran}\n`;
      }

      if (s.catatan) {
        msg += `   • Catatan Appr  : 📝 "${s.catatan}"\n`;
      }

      if (s.is_self_evaluated && s.nilai_self) {
        msg += `   • Self Evaluate : ⭐ ${s.nilai_self}/100`;
        if (s.catatan_self) msg += ` ("${s.catatan_self}")`;
        msg += `\n`;
      }

      msg += `\n`;
    });

    msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  // [4] Info & Rekap Presensi Guru (Hari Ini & Bulan Ini)
  if (choice === '4') {
    const now = new Date();
    // Offset WIB (UTC+7)
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

    // 1. Fetch Today's Gate Attendance (AbsenGerbangGuru)
    const gerbangToday = await prisma.absenGerbangGuru.findMany({
      where: {
        guru_id: guru.id,
        created_at: { gte: startToday, lte: endToday }
      },
      orderBy: { created_at: 'asc' }
    }).catch(() => []);

    // 2. Fetch Today's KBM Sessions (SesiAbsensi & AbsenGuru)
    const sesiTodayList = await prisma.sesiAbsensi.findMany({
      where: {
        guru_id: guru.id,
        tanggal: { gte: startToday, lte: endToday }
      },
      include: { AbsenGuru: { where: { guru_id: guru.id } } },
      orderBy: { waktu_mulai: 'asc' }
    }).catch(() => []);

    // 3. Fetch Monthly Gate Attendance (AbsenGerbangGuru)
    const gerbangMonthList = await prisma.absenGerbangGuru.findMany({
      where: {
        guru_id: guru.id,
        created_at: { gte: firstDayMonth }
      }
    }).catch(() => []);

    // 4. Fetch Monthly KBM Sessions (AbsenGuru)
    const sesiMonthList = await prisma.absenGuru.findMany({
      where: {
        guru_id: guru.id,
        created_at: { gte: firstDayMonth }
      }
    }).catch(() => []);

    // Process Today's Gate Status
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

    // Process Today's KBM Sesi Status
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

    // Process Monthly Gate Summary
    const datangsMonth = gerbangMonthList.filter(g => String(g.arah || '').toUpperCase().includes('DATANG') || String(g.arah || '').toUpperCase().includes('MASUK'));
    const totalHadirTepat = datangsMonth.filter(g => !g.is_terlambat && String(g.status || '').toUpperCase() === 'HADIR').length;
    const totalTerlambat = datangsMonth.filter(g => g.is_terlambat || String(g.status || '').toUpperCase() === 'TERLAMBAT').length;
    const totalIzinSakit = datangsMonth.filter(g => ['IZIN', 'SAKIT'].includes(String(g.status || '').toUpperCase())).length;
    const totalAlpa = datangsMonth.filter(g => String(g.status || '').toUpperCase() === 'ALPA').length;

    // Process Monthly KBM Summary
    const totalSesiMonth = sesiMonthList.length;
    const totalKbmHadirMonth = sesiMonthList.filter(s => String(s.status || '').toUpperCase() === 'HADIR' || String(s.status || '').toUpperCase().includes('HADIR') || !!s.waktu_tap).length;

    // Construct response message
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

  // [0] atau apapun → tampilkan menu
  // [6] Jadwal Mengajar Minggu Ini (semua hari)
  if (choice === '6') {
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

    // Group per hari & aggregate masing-masing hari
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

  // [5] Profil Pribadi Guru
  if (choice === '5') {
    let msg = `👤 *Data Profil Pribadi Guru*\n\n`;
    msg += `• Nama              : *${guru.nama_guru}*\n`;
    msg += `• NIP               : ${guru.nip || '-'}\n`;
    msg += `• Email             : ${guru.User?.email || '-'}\n`;
    msg += `• Jabatan           : ${guru.jabatan || '-'}\n`;
    msg += `• Jenis PTK         : ${guru.jenis_ptk || '-'}\n`;
    msg += `• Status Kepegawaian: ${guru.status_kepegawaian || '-'}\n`;
    msg += `• Pendidikan        : ${guru.pendidikan_terakhir || '-'}\n`;
    msg += `• Pangkat/Golongan  : ${guru.pangkat_golongan || '-'}\n`;
    msg += `• Kartu RFID        : ${guru.no_rfid ? '✅ Terhubung' : '❌ Belum Ada'}\n\n`;
    msg += `⚙️ *Opsi Edit Profil:*\n`;
    msg += `[51] ✏️ Edit NIP\n`;
    msg += `[52] 📧 Edit Email\n\n`;
    msg += `💡 Ketik *51* untuk Edit NIP atau *52* untuk Edit Email.\n`;
    msg += `💡 Ketik *[0]* untuk Daftar Menu Utama.`;
    return msg;
  }

  // [51] Edit NIP Guru (Interactive Question Flow)
  const nipMatch = choice.match(/^51(?:\s+(.+))?$/i);
  if (nipMatch) {
    const inlineNip = (nipMatch[1] || '').trim();
    if (inlineNip) {
      try {
        await prisma.guru.update({
          where: { id: guru.id },
          data: { nip: inlineNip },
        });
        if (jid) {
          pendingGuruEditSession.delete(jid);
          pendingGuruEditSession.delete(jid.split('@')[0]);
        }
        return (
          `✅ *NIP Guru Berhasil Diperbarui!*\n\n` +
          `• Nama     : *${guru.nama_guru}*\n` +
          `• NIP Baru : *${inlineNip}*\n\n` +
          `💡 Ketik *5* untuk lihat Profil Pribadi atau *[0]* untuk Menu Utama.`
        );
      } catch (err: any) {
        return `⚠️ Gagal memperbarui NIP: ${err.message || 'Terjadi kesalahan sistem.'}`;
      }
    }

    if (jid) {
      pendingGuruEditSession.set(jid, 'EDIT_NIP');
      pendingGuruEditSession.set(jid.split('@')[0], 'EDIT_NIP');
    }
    return (
      `✏️ *Edit NIP Guru*\n\n` +
      `NIP Anda saat ini: *${guru.nip || '-'}*\n\n` +
      `Silakan ketik nomor *NIP Baru* Anda sekarang:\n` +
      `_(atau ketik *BATAL* untuk membatalkan)_`
    );
  }

  // [52] Edit Email Guru (Interactive Question Flow)
  const emailMatch = choice.match(/^52(?:\s+(.+))?$/i);
  if (emailMatch) {
    const inlineEmail = (emailMatch[1] || '').trim().toLowerCase();
    if (inlineEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inlineEmail)) {
        return `⚠️ Format email (*${inlineEmail}*) tidak valid. Silakan contoh: *guru@sekolah.sch.id*`;
      }
      if (!guru.user_id) {
        return `⚠️ Akun pengguna untuk Guru ini tidak ditemukan di sistem.`;
      }
      try {
        const existingUser = await prisma.user.findFirst({
          where: { email: inlineEmail, id: { not: guru.user_id } },
        });
        if (existingUser) {
          return `⚠️ Email *${inlineEmail}* sudah terdaftar untuk pengguna lain di sistem.`;
        }
        await prisma.user.update({
          where: { id: guru.user_id },
          data: { email: inlineEmail },
        });
        if (jid) {
          pendingGuruEditSession.delete(jid);
          pendingGuruEditSession.delete(jid.split('@')[0]);
        }
        return (
          `✅ *Email Guru Berhasil Diperbarui!*\n\n` +
          `• Nama       : *${guru.nama_guru}*\n` +
          `• Email Baru : *${inlineEmail}*\n\n` +
          `💡 Ketik *5* untuk lihat Profil Pribadi atau *[0]* untuk Menu Utama.`
        );
      } catch (err: any) {
        return `⚠️ Gagal memperbarui Email: ${err.message || 'Terjadi kesalahan sistem.'}`;
      }
    }

    if (jid) {
      pendingGuruEditSession.set(jid, 'EDIT_EMAIL');
      pendingGuruEditSession.set(jid.split('@')[0], 'EDIT_EMAIL');
    }
    return (
      `📧 *Edit Email Guru*\n\n` +
      `Email Anda saat ini: *${guru.User?.email || '-'}*\n\n` +
      `Silakan ketik alamat *Email Baru* Anda sekarang:\n` +
      `_(contoh: guru@sekolah.sch.id)_\n` +
      `_(atau ketik *BATAL* untuk membatalkan)_`
    );
  }

  if (choice !== '' && choice !== '0') {
    return invalidCommand(formatGuruMenu(guru.nama_guru));
  }

  return formatGuruMenu(guru.nama_guru);
}

// ─────────────────────────────────────────────────────────────────────────────
// SISWA COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

export async function handleSiswaCommand(input: string, siswa: any): Promise<string> {
  const choice = String(input || '').trim();

  // [1] Profil Pribadi
  if (choice === '1') {
    const kelas   = siswa.Kelas?.nama_kelas || '-';
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

  // [2] Presensi Hari Ini
  if (choice === '2') {
    const today = getTanggalWIB();
    today.setUTCHours(0, 0, 0, 0); // mulai tengah malam WIB

    const gerbang = await prisma.absenGerbangSiswa.findFirst({
      where: { siswa_id: siswa.id, created_at: { gte: today } },
      orderBy: { created_at: 'desc' },
    });

    const status  = gerbang ? gerbang.status : 'BELUM SCAN';
    const jamTap  = gerbang?.waktu_tap
      ? new Date(gerbang.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '-';
    const tglStr  = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });

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

  // [3] Poin Pelanggaran & Prestasi
  if (choice === '3') {
    const [pelanggaran, prestasiResult, pelanggaranTerbaru] = await Promise.all([
      prisma.pelanggaranSiswa.aggregate({
        where: { siswa_id: siswa.id },
        _sum: { poin: true },
        _count: { id: true },
      }),
      prisma.prestasiSiswa.aggregate({
        where: { siswa_id: siswa.id },
        _sum: { poin: true },
        _count: { id: true },
      }).catch(() => ({ _sum: { poin: 0 }, _count: { id: 0 } })),
      prisma.pelanggaranSiswa.findMany({
        where: { siswa_id: siswa.id },
        orderBy: { created_at: 'desc' },
        take: 3,
        select: { jenis_pelanggaran: true, poin: true, tanggal: true },
      }),
    ]);

    let msg = `🏆 *Catatan Poin Siswa*\nNama: *${siswa.nama_siswa}*\n\n`;
    msg += `📛 Total Poin Pelanggaran : *${pelanggaran._sum.poin || 0} poin* (${pelanggaran._count.id} catatan)\n`;
    msg += `⭐ Total Poin Prestasi    : *${prestasiResult._sum?.poin || 0} poin* (${prestasiResult._count?.id || 0} pencapaian)\n`;

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

  // [4] Jadwal Pelajaran Hari Ini
  if (choice === '4') {
    const currentDay = getHariWIB(); // WIB timezone

    if (!siswa.kelas_id) {
      return `📅 *Jadwal Pelajaran*\n\nData kelas belum diset. Hubungi TU sekolah.\n\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    }

    const jadwal = await prisma.jadwalKBM.findMany({
      where: { kelas_id: siswa.kelas_id, hari: currentDay as any },
      include: { Mapel: true, Guru: { select: { nama_guru: true } } },
      orderBy: { slot_index: 'asc' },
    });

    if (jadwal.length === 0) {
      return (
        `📅 *Jadwal Pelajaran Hari Ini (${currentDay})*\n\n` +
        `Tidak ada jadwal KBM hari ini. Libur/kosong. 😊\n\n` +
        `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
      );
    }

    const aggregated = aggregateJadwal(jadwal);

    let msg = `📅 *Jadwal Pelajaran Hari Ini (${currentDay})*\nKelas: *${siswa.Kelas?.nama_kelas || '-'}*\n\n`;
    aggregated.forEach((j: any, i: number) => {
      const jamLabel = j.startSlot === j.endSlot
        ? `Jam ke-${j.startSlot}`
        : `Jam ke-${j.startSlot} s/d ${j.endSlot}`;
      msg += `${i + 1}. *${j.jam_mulai} – ${j.jam_selesai}* (${jamLabel})\n`;
      msg += `   📖 ${j.Mapel?.nama_mapel || '-'}\n`;
      msg += `   👨‍🏫 ${j.Guru?.nama_guru || '-'}\n\n`;
    });
    msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  // [5] Rekap Kehadiran Bulan Ini
  if (choice === '5') {
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const bulan    = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const [hadir, terlambat, izinSakit, alpa] = await Promise.all([
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswa.id, created_at: { gte: firstDay }, status: 'HADIR' } }),
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswa.id, created_at: { gte: firstDay }, is_terlambat: true } }),
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswa.id, created_at: { gte: firstDay }, status: { in: ['IZIN', 'SAKIT', 'DISPEN'] } } }),
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswa.id, created_at: { gte: firstDay }, status: 'ALPA' } }),
    ]);

    let msg = `📊 *Rekap Kehadiran Bulan ${bulan}*\nNama: *${siswa.nama_siswa}*\n\n`;
    msg += `✅ Hadir Tepat Waktu : ${hadir} hari\n`;
    msg += `⚠️ Terlambat         : ${terlambat} hari\n`;
    msg += `ℹ️ Izin / Sakit      : ${izinSakit} hari\n`;
    msg += `❌ Alpha              : ${alpa} hari\n`;
    msg += `\n💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  if (choice !== '' && choice !== '0') {
    return invalidCommand(formatSiswaMenu(siswa.nama_siswa));
  }

  return formatSiswaMenu(siswa.nama_siswa);
}

// ─────────────────────────────────────────────────────────────────────────────
// ORANG TUA COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

export async function handleOrtuCommand(input: string, ortu: any): Promise<string> {
  const choice = String(input || '').trim();

  const anakLinks = await prisma.orangTuaSiswa.findMany({
    where: { orang_tua_id: ortu.id },
    include: { Siswa: { include: { Kelas: true } } },
  });

  if (anakLinks.length === 0) {
    return (
      `👨‍👩‍👧 *Layanan WA Bot Orang Tua*\n\n` +
      `Belum ada data siswa yang terhubung dengan akun Anda.\n` +
      `Silakan hubungi TU sekolah untuk menghubungkan data.\n\n` +
      `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`
    );
  }

  // [1] Presensi Hari Ini
  if (choice === '1') {
    const today = getTanggalWIB();
    today.setUTCHours(0, 0, 0, 0); // mulai tengah malam WIB
    const tglStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });

    let msg = `⏰ *Status Presensi Ananda Hari Ini*\n📅 ${tglStr}\n\n`;

    for (let i = 0; i < anakLinks.length; i++) {
      const s = anakLinks[i].Siswa;
      const gerbang = await prisma.absenGerbangSiswa.findFirst({
        where: { siswa_id: s.id, created_at: { gte: today } },
        orderBy: { created_at: 'desc' },
      });
      const status = gerbang ? gerbang.status : 'BELUM SCAN';
      const jam    = gerbang?.waktu_tap
        ? new Date(gerbang.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';

      const statusEmoji = status === 'HADIR' ? '✅' : status === 'BELUM SCAN' ? '🔴' : '⚠️';
      msg += `${i + 1}. *${s.nama_siswa}* — ${s.Kelas?.nama_kelas || '-'}\n`;
      msg += `   ${statusEmoji} Status : *${status}*\n`;
      msg += `   🕐 Jam Tap : ${jam}\n`;
      if (gerbang?.is_terlambat) msg += `   ⚠️ Terlambat : ${gerbang.menit_keterlambatan} menit\n`;
      msg += `\n`;
    }

    msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  // [2] Rekap Kehadiran Bulan Ini
  if (choice === '2') {
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const bulan    = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    let msg = `📊 *Rekap Kehadiran Ananda — ${bulan}*\n\n`;

    for (let i = 0; i < anakLinks.length; i++) {
      const s = anakLinks[i].Siswa;
      const [hadir, terlambat, izin, alpa] = await Promise.all([
        prisma.absenGerbangSiswa.count({ where: { siswa_id: s.id, created_at: { gte: firstDay }, status: 'HADIR' } }),
        prisma.absenGerbangSiswa.count({ where: { siswa_id: s.id, created_at: { gte: firstDay }, is_terlambat: true } }),
        prisma.absenGerbangSiswa.count({ where: { siswa_id: s.id, created_at: { gte: firstDay }, status: { in: ['IZIN', 'SAKIT', 'DISPEN'] } } }),
        prisma.absenGerbangSiswa.count({ where: { siswa_id: s.id, created_at: { gte: firstDay }, status: 'ALPA' } }),
      ]);

      msg += `${i + 1}. *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n`;
      msg += `   ✅ Hadir Tepat Waktu : ${hadir} hari\n`;
      msg += `   ⚠️ Terlambat         : ${terlambat} hari\n`;
      msg += `   ℹ️ Izin / Sakit      : ${izin} hari\n`;
      msg += `   ❌ Alpha              : ${alpa} hari\n\n`;
    }

    msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  // [3] Catatan Poin & Prestasi Ananda
  if (choice === '3') {
    let msg = `🏆 *Catatan Poin & Prestasi Ananda*\n\n`;

    for (let i = 0; i < anakLinks.length; i++) {
      const s = anakLinks[i].Siswa;
      const [pelanggaran, prestasi, pelanggaranTerbaru] = await Promise.all([
        prisma.pelanggaranSiswa.aggregate({
          where: { siswa_id: s.id },
          _sum: { poin: true },
          _count: { id: true },
        }),
        prisma.prestasiSiswa.aggregate({
          where: { siswa_id: s.id },
          _sum: { poin: true },
          _count: { id: true },
        }).catch(() => ({ _sum: { poin: 0 }, _count: { id: 0 } })),
        prisma.pelanggaranSiswa.findMany({
          where: { siswa_id: s.id },
          orderBy: { created_at: 'desc' },
          take: 2,
          select: { jenis_pelanggaran: true, poin: true, tanggal: true },
        }),
      ]);

      msg += `${i + 1}. *${s.nama_siswa}* (${s.Kelas?.nama_kelas || '-'})\n`;
      msg += `   📛 Poin Pelanggaran : *${pelanggaran._sum.poin || 0} poin* (${pelanggaran._count.id} catatan)\n`;
      msg += `   ⭐ Poin Prestasi    : *${prestasi._sum?.poin || 0} poin* (${prestasi._count?.id || 0} pencapaian)\n`;

      if (pelanggaranTerbaru.length > 0) {
        pelanggaranTerbaru.forEach((p: any) => {
          const tgl = new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
          msg += `   • [${tgl}] ${p.jenis_pelanggaran} (-${p.poin} poin)\n`;
        });
      }
      msg += `\n`;
    }

    msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  // [4] Kontak Wali Kelas
  if (choice === '4') {
    let msg = `📞 *Info Wali Kelas Ananda*\n\n`;

    for (let i = 0; i < anakLinks.length; i++) {
      const s = anakLinks[i].Siswa;
      msg += `${i + 1}. *${s.nama_siswa}* — Kelas ${s.Kelas?.nama_kelas || '-'}\n`;

      if (!s.kelas_id) {
        msg += `   Belum ada data kelas.\n\n`;
        continue;
      }

      // Cari wali kelas via OrganizationalAssignment
      const wali = await prisma.organizationalAssignment.findFirst({
        where: {
          kelas_id: s.kelas_id,
          is_active: true,
          Position: { code: 'WALIKELAS' },
        },
        include: {
          User: {
            include: { Guru: { select: { nama_guru: true, no_hp: true } } },
          },
        },
      }).catch(() => null);

      if (wali && wali.User?.Guru) {
        const g = wali.User.Guru;
        msg += `   👨‍🏫 Wali Kelas : *${g.nama_guru}*\n`;
        msg += `   📱 No. HP    : ${g.no_hp || 'Tidak tersedia'}\n\n`;
      } else {
        msg += `   👨‍🏫 Wali Kelas belum ditentukan di sistem.\n\n`;
      }
    }

    msg += `💡 Ketik *ANGKA* menu lain (misal: 2) atau ketik *[0]* untuk Daftar Menu.`;
    return msg;
  }

  if (choice !== '' && choice !== '0') {
    return invalidCommand(formatOrtuMenu(ortu.nama));
  }

  return formatOrtuMenu(ortu.nama);
}
