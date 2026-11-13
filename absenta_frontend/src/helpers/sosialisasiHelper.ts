import type { RapatSosialisasiSession } from '@/api/academic/sosialisasi.api';

/**
 * Memeriksa apakah rapat sosialisasi saat ini sedang berada dalam masa jadwal berlangsung (WIB).
 * Aturan bisnis:
 * 1. Status sesi harus 'AKTIF'
 * 2. Tanggal pelaksanaan harus sama dengan hari ini (YYYY-MM-DD dalam timezone Asia/Jakarta / WIB)
 * 3. Waktu sekarang (WIB) harus berada dalam rentang:
 *    [waktu_mulai - 30 menit buffer presensi] s/d [waktu_selesai + 30 menit buffer toleransi]
 *
 * Di luar rentang ini, rapat dianggap BELUM MULAI atau SUDAH SELESAI, sehingga banner TIDAK ditampilkan.
 */
export function isSosialisasiInSchedule(session: RapatSosialisasiSession | null | undefined): boolean {
  if (!session || session.status !== 'AKTIF') return false;
  if (!session.tanggal) return false;

  const now = new Date();

  // Tanggal hari ini dalam WIB (YYYY-MM-DD)
  const nowWibDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  if (session.tanggal !== nowWibDate) {
    return false;
  }

  // Jam sekarang dalam WIB (HH:mm)
  const nowWibTime = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now).replace('.', ':');

  const [curH, curM] = nowWibTime.split(':').map(Number);
  const curMinutes = (curH || 0) * 60 + (curM || 0);

  const [startH, startM] = (session.waktu_mulai || '08:00').split(':').map(Number);
  const [endH, endM] = (session.waktu_selesai || '11:30').split(':').map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  const EARLY_BUFFER = 30; // 30 menit sebelum acara untuk persiapan presensi peserta
  const LATE_BUFFER = 30;  // 30 menit setelah acara untuk toleransi panitia

  return curMinutes >= (startMinutes - EARLY_BUFFER) && curMinutes <= (endMinutes + LATE_BUFFER);
}

/**
 * Format label status penjadwalan rapat sosialisasi untuk admin/panitia.
 */
export function getSosialisasiScheduleStatus(session: RapatSosialisasiSession | null | undefined): {
  label: string;
  variant: 'live' | 'upcoming' | 'ended';
  description: string;
} {
  if (!session || session.status === 'SELESAI') {
    return {
      label: 'Selesai / Ditutup',
      variant: 'ended',
      description: 'Sesi rapat telah ditutup atau masa jadwal telah berakhir.',
    };
  }

  const inSchedule = isSosialisasiInSchedule(session);
  if (inSchedule) {
    return {
      label: 'Sedang Berlangsung (Live)',
      variant: 'live',
      description: `Rapat sedang berlangsung hari ini (${session.waktu_mulai} - ${session.waktu_selesai} WIB). Banner presensi aktif.`,
    };
  }

  const now = new Date();
  const nowWibDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);

  if (session.tanggal > nowWibDate) {
    return {
      label: 'Dijadwalkan (Akan Datang)',
      variant: 'upcoming',
      description: `Rapat dijadwalkan pada tanggal ${session.tanggal} pukul ${session.waktu_mulai} WIB. Banner akan muncul otomatis pada hari H.`,
    };
  }

  if (session.tanggal < nowWibDate) {
    return {
      label: 'Jadwal Telah Lewat',
      variant: 'ended',
      description: `Tanggal rapat (${session.tanggal}) telah lewat. Silakan buat sesi baru atau sesuaikan tanggal.`,
    };
  }

  return {
    label: 'Menunggu Waktu Mulai',
    variant: 'upcoming',
    description: `Hari ini, dijadwalkan pukul ${session.waktu_mulai} - ${session.waktu_selesai} WIB. Banner akan muncul 30 menit sebelum mulai.`,
  };
}
