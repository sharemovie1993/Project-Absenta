import { prisma } from '@/utils/prisma';
import { pendingGuruEditSession } from './wa-chatbot-resolver.service';
import { GuruJadwalHandler } from '../chatbot/handlers/guru/guru-jadwal.handler';
import { GuruWalikelasHandler } from '../chatbot/handlers/guru/guru-walikelas.handler';
import { GuruSupervisiHandler } from '../chatbot/handlers/guru/guru-supervisi.handler';
import { GuruPresensiHandler } from '../chatbot/handlers/guru/guru-presensi.handler';
import { GuruProfileHandler } from '../chatbot/handlers/guru/guru-profile.handler';
import { QuickLoginHandler } from '../chatbot/handlers/common/quick-login.handler';
import { SiswaHandler } from '../chatbot/handlers/siswa/siswa.handler';
import { OrtuHandler } from '../chatbot/handlers/ortu/ortu.handler';



// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE HELPER — selalu gunakan WIB (Asia/Jakarta, UTC+7)
// Server mungkin berjalan di UTC; tanpa ini "SENIN" bisa muncul padahal
// di Indonesia sudah "SELASA" (UTC 23:xx = WIB 06:xx hari berikutnya).
// ─────────────────────────────────────────────────────────────────────────────
export function getHariWIB(): string {
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

export function getTanggalWIB(): Date {
  // Buat Date yang merepresentasikan waktu WIB sekarang
  const now = new Date();
  // Offset WIB = UTC+7 = 7 * 60 * 60 * 1000
  const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
  return new Date(wibMs);
}


/**
 * Resolves active semester for WhatsApp Chatbot with resilient multi-tier fallback:
 * Tier 1: Semester.is_active = true AND TahunPelajaran.is_active = true
 * Tier 2: Semester.is_active = true (regardless of TahunPelajaran status)
 * Tier 3: TahunPelajaran.is_active = true (regardless of Semester status)
 * Tier 4: Latest Semester record in tenant (absolute fallback)
 */
export async function getWhatsappActiveSemester(tenantId?: string) {
  if (!tenantId) return null;

  try {
    // Tier 1: Both Semester and TahunPelajaran are explicitly marked active
    let semester = await prisma.semester.findFirst({
      where: {
        tenant_id: tenantId,
        is_active: true,
        TahunPelajaran: { is_active: true },
      },
      orderBy: { created_at: 'desc' },
      select: { id: true, nama_semester: true, TahunPelajaran: { select: { id: true, tahun: true, is_active: true } } },
    });

    // Tier 2: Active Semester record in tenant
    if (!semester) {
      semester = await prisma.semester.findFirst({
        where: {
          tenant_id: tenantId,
          is_active: true,
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, nama_semester: true, TahunPelajaran: { select: { id: true, tahun: true, is_active: true } } },
      });
    }

    // Tier 3: Semester belonging to active TahunPelajaran
    if (!semester) {
      semester = await prisma.semester.findFirst({
        where: {
          tenant_id: tenantId,
          TahunPelajaran: { is_active: true },
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, nama_semester: true, TahunPelajaran: { select: { id: true, tahun: true, is_active: true } } },
      });
    }

    // Tier 4: Latest Semester record created in tenant
    if (!semester) {
      semester = await prisma.semester.findFirst({
        where: {
          tenant_id: tenantId,
        },
        orderBy: { created_at: 'desc' },
        select: { id: true, nama_semester: true, TahunPelajaran: { select: { id: true, tahun: true, is_active: true } } },
      });
    }

    return semester;
  } catch (error) {
    console.error('[getWhatsappActiveSemester] Error resolving active semester:', error);
    return null;
  }
}

export function formatSemesterInfo(semester: any): string {
  if (!semester) return 'semester tidak terdeteksi';
  const nama = semester.nama_semester || 'Semester Aktif';
  const tahun = semester.TahunPelajaran?.tahun;
  return tahun ? `${nama} (${tahun})` : nama;
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

  // Utamakan Nama Mapel; jika tidak ada, gunakan kode_mapel sebagai fallback
  if (!fullName) return kode || '-';

  const nameUpper = fullName.toUpperCase();

  // Kamus penyederhanaan khusus mapel umum nasional yang sangat panjang
  const mapelDict: Record<string, string> = {
    'PENDIDIKAN AGAMA ISLAM DAN BUDI PEKERTI': 'PAI',
    'PENDIDIKAN AGAMA ISLAM': 'PAI',
    'PENDIDIKAN AGAMA KRISTEN': 'PAK',
    'PENDIDIKAN AGAMA KATOLIK': 'PA Katolik',
    'PENDIDIKAN PANCASILA DAN KEWARGANEGARAAN': 'PPKn',
    'PENDIDIKAN PANCASILA': 'Pancasila',
    'PENDIDIKAN JASMANI OLAHRAGA DAN KESEHATAN': 'PJOK',
    'PENDIDIKAN JASMANI, OLAHRAGA, DAN KESEHATAN': 'PJOK',
    'PROJEK PENGUATAN PROFIL PELAJAR PANCASILA': 'P5',
    'PROJEK KREATIF DAN KEWIRAUSAHAAN': 'PKK',
    'BIMBINGAN DAN KONSELING': 'BK',
    'BIMBINGAN KONSELING': 'BK',
  };

  if (mapelDict[nameUpper]) {
    return mapelDict[nameUpper];
  }

  for (const [key, shortVal] of Object.entries(mapelDict)) {
    if (nameUpper.includes(key)) {
      return shortVal;
    }
  }

  // Untuk mapel Kejuruan, Pilihan, dan mapel lainnya: Gunakan NAMA MAPEL ASLI secara utuh!
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
// MENU FORMATTERS (Maksimal 2 Kata per Opsi Menu)
// ─────────────────────────────────────────────────────────────────────────────

export function formatGuruMenu(nama: string): string {
  return (
    `👨‍🏫 *Halo Bapak/Ibu ${nama}!*\n` +
    `Selamat datang di Layanan WA Bot *Absenta*.\n\n` +
    `Ketik *ANGKA* opsi yang diinginkan:\n\n` +
    `[1] 📚 Jadwal KBM\n` +
    `[2] ⏰ Presensi Saya\n` +
    `[3] 🏫 Wali Kelas\n` +
    `[4] 📊 Supervisi Saya\n` +
    `[5] 👤 Profil Saya\n` +
    `[6] 🔑 Quick Login\n` +
    `[7] 📢 Tarik Guru JP\n` +
    `[8] 📍 Posisi Guru\n` +
    `[0] 🔄 Menu Utama`
  );
}

export function formatJadwalKBMSubMenu(nama: string): string {
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

export function formatPosisiGuruSubMenu(nama: string): string {
  return (
    `📍 *Posisi & Keberadaan Guru — ${nama}*\n\n` +
    `Pilih sub-menu:\n\n` +
    `[81] ⏱️ Posisi Guru Jam Ini (Saat Ini)\n` +
    `[82] 🔍 Cari Posisi Guru (By Nama)\n` +
    `[83] 📋 Semua Posisi Guru Hari Ini\n\n` +
    `[0] 🔄 Menu Utama`
  );
}

export function formatSiswaMenu(nama: string): string {
  return (
    `👦 *Halo ${nama}!*\n` +
    `Selamat datang di Layanan WA Bot *Absenta*.\n\n` +
    `Ketik *ANGKA* opsi yang diinginkan:\n\n` +
    `[1] 👤 Profil Saya\n` +
    `[2] ⏰ Presensi Harian\n` +
    `[3] 🏆 Catatan Poin\n` +
    `[4] 📅 Jadwal Pelajaran\n` +
    `[5] 📊 Rekap Bulanan\n` +
    `[0] 🔄 Menu Utama`
  );
}

export function formatOrtuMenu(nama: string): string {
  return (
    `👨‍👩‍👧 *Halo Bapak/Ibu ${nama}!*\n` +
    `Selamat datang di Layanan WA Bot *Absenta*.\n\n` +
    `Ketik *ANGKA* opsi yang diinginkan:\n\n` +
    `[1] ⏰ Presensi Ananda\n` +
    `[2] 📊 Rekap Bulanan\n` +
    `[3] 🏆 Poin Ananda\n` +
    `[4] 📞 Wali Kelas\n` +
    `[0] 🔄 Menu Utama`
  );
}

export function formatDualRoleMenu(nama: string): string {
  return (
    `👋 *Halo Bapak/Ibu ${nama}!*\n` +
    `Nomor Anda terdaftar sebagai *Guru & Orang Tua* di Absenta.\n\n` +
    `Ketik *huruf* peran yang ingin diakses:\n` +
    `[G] 👨‍🏫 Peran Guru\n` +
    `[O] 👨‍👩‍👧 Peran Ortu`
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

export function formatGuestMessage(_phone?: string): string {
  return '';
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

  // [1] Jadwal Mengajar & Piket Hari Ini
  if (choice === '1') {
    return GuruJadwalHandler.handleJadwalHariIni({ guru, commandUpper: choice } as any);
  }

  // [2] Jadwal Mengajar & Piket Minggu Ini
  if (choice === '2') {
    return GuruJadwalHandler.handleJadwalMingguan({ guru, commandUpper: choice } as any);
  }

  // [3] Info & Rekap Presensi Guru
  if (choice === '3') {
    return GuruPresensiHandler.handlePresensi({ guru, commandUpper: choice } as any);
  }

  // [4] Daftar Semua Wali Kelas Aktif di Sekolah
  if (choice === '4') {
    return GuruWalikelasHandler.handleDaftarWaliKelas({ guru, commandUpper: choice } as any);
  }

  // [5] Info Supervisi Akademik Saya
  if (choice === '5') {
    return GuruSupervisiHandler.handleSupervisi({ guru, commandUpper: choice } as any);
  }

  // [6] Profil Pribadi Guru
  if (choice === '6') {
    return GuruProfileHandler.handleViewProfile({ guru, commandUpper: choice } as any);
  }

  // [7] Quick Login Aplikasi Web
  if (choice === '7') {
    return QuickLoginHandler.handleQuickLogin({ guru, commandUpper: choice } as any);
  }

  // [61] / [51] Edit NIP Guru
  if (choice.startsWith('61') || choice.startsWith('51')) {
    return GuruProfileHandler.handleEditNip({ guru, commandUpper: choice, messageText: choice, cleanJid: jid || '' } as any);
  }

  // [62] / [52] Edit Email Guru
  if (choice.startsWith('62') || choice.startsWith('52')) {
    return GuruProfileHandler.handleEditEmail({ guru, commandUpper: choice, messageText: choice, cleanJid: jid || '' } as any);
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
  return SiswaHandler.handleCommand({ siswa, commandUpper: choice } as any);
}


// ─────────────────────────────────────────────────────────────────────────────
// ORANG TUA COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

export async function handleOrtuCommand(input: string, ortu: any): Promise<string> {
  const choice = String(input || '').trim();
  return OrtuHandler.handleCommand({ ortu, commandUpper: choice } as any);
}

