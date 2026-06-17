export type AbsensiMode = 'SIMPLE' | 'MULTI_SESI' | null;

export function getModeLabel(mode: AbsensiMode) {
  if (mode === 'MULTI_SESI') return 'Absensi per Jam Pelajaran';
  if (mode === 'SIMPLE') return 'Absensi Datang & Pulang';
  return '-';
}

export function getAttendanceBadgeVariant(status?: string) {
  const s = String(status || '').toUpperCase();
  if (s === 'HADIR' || s === 'HADIR / MENGAJAR' || s.includes('HADIR')) return 'success' as const;
  if (s === 'TERLAMBAT') return 'warning' as const;
  if (s === 'IZIN') return 'info' as const;
  if (s === 'SAKIT') return 'warning' as const;
  if (s === 'DISPEN') return 'info' as const;
  if (s === 'ALPA') return 'error' as const;
  return 'outline' as const;
}
