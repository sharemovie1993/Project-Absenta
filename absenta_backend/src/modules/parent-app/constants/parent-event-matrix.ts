export enum ParentEventType {
  STUDENT_PRESENT = 'STUDENT_PRESENT',
  STUDENT_LATE = 'STUDENT_LATE',
  STUDENT_ABSENT = 'STUDENT_ABSENT',
  STUDENT_PERMISSION = 'STUDENT_PERMISSION',
  STUDENT_LEFT_EARLY = 'STUDENT_LEFT_EARLY',
  STUDENT_RETURN = 'STUDENT_RETURN',
  STUDENT_MULTI_SCAN = 'STUDENT_MULTI_SCAN',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  NO_ACTIVE_STUDENT = 'NO_ACTIVE_STUDENT',
  SESSION_PRESENT = 'SESSION_PRESENT'
}

export enum NotificationChannel {
  PWA = 'PWA', // In-App / Push
  WA = 'WA',
  PUSH = 'PUSH', // Firebase / Web Push
  EMAIL = 'EMAIL'
}

export interface ParentEventConfig {
  channels: NotificationChannel[];
  titleTemplate: string;
  messageTemplate: string;
}

export const PARENT_EVENT_MATRIX: Record<ParentEventType, ParentEventConfig> = {
  [ParentEventType.STUDENT_PRESENT]: {
    channels: [NotificationChannel.PWA], // PWA notification enabled
    titleTemplate: 'Siswa Hadir',
    messageTemplate: '{nama_siswa} telah hadir di sekolah pada {waktu}.'
  },
  [ParentEventType.STUDENT_LATE]: {
    channels: [NotificationChannel.PWA], // PWA Only
    titleTemplate: 'Siswa Terlambat',
    messageTemplate: '{nama_siswa} terlambat hadir pada {waktu}.'
  },
  [ParentEventType.STUDENT_ABSENT]: {
    channels: [NotificationChannel.WA, NotificationChannel.PWA], // WA + PWA (Wajib)
    titleTemplate: 'Siswa Tidak Hadir (Alpa)',
    messageTemplate: '{nama_siswa} tidak hadir hari ini tanpa keterangan.'
  },
  [ParentEventType.STUDENT_PERMISSION]: {
    channels: [NotificationChannel.PWA], // PWA Only
    titleTemplate: 'Izin/Sakit Siswa',
    messageTemplate: '{nama_siswa} tercatat {status} hari ini. Keterangan: {keterangan}'
  },
  [ParentEventType.STUDENT_LEFT_EARLY]: {
    channels: [NotificationChannel.PWA], // PWA Only (WA optional via config)
    titleTemplate: 'Siswa Pulang Cepat',
    messageTemplate: '{nama_siswa} pulang lebih awal pada {waktu}.'
  },
  [ParentEventType.STUDENT_RETURN]: {
    channels: [NotificationChannel.PWA], // PWA notification enabled
    titleTemplate: 'Siswa Pulang',
    messageTemplate: '{nama_siswa} telah pulang sekolah pada {waktu}.'
  },
  [ParentEventType.STUDENT_MULTI_SCAN]: {
    channels: [NotificationChannel.PWA],
    titleTemplate: 'Peringatan Scan Ganda',
    messageTemplate: 'Terdeteksi scan ganda untuk {nama_siswa} pada {waktu}. Mohon verifikasi.'
  },
  [ParentEventType.TOKEN_REVOKED]: {
    channels: [NotificationChannel.WA],
    titleTemplate: 'Akses Parent App Nonaktif',
    messageTemplate: 'Akses Parent App Anda telah dinonaktifkan. Hubungi admin jika ini kesalahan.'
  },
  [ParentEventType.NO_ACTIVE_STUDENT]: {
    channels: [NotificationChannel.WA],
    titleTemplate: 'Tidak Ada Siswa Aktif',
    messageTemplate: 'Tidak ada siswa aktif yang terhubung dengan akun Anda. Akses Parent App ditangguhkan.'
  },
  [ParentEventType.SESSION_PRESENT]: {
    channels: [NotificationChannel.PWA],
    titleTemplate: 'Absensi Kelas',
    messageTemplate: '{nama_siswa} hadir di {mapel} pada {waktu}.'
  }
};
