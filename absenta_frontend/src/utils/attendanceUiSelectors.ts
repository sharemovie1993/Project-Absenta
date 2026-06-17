/**
 * Pure selector helpers for attendance UI.
 * Tidak melakukan fetch atau akses hook.
 */
export function hasPendingStudents(pending: Array<any>) {
  return Array.isArray(pending) && pending.length > 0;
}

export function canShowCreateSessionCard(params: {
  absensiMode: 'SIMPLE' | 'MULTI_SESI' | null;
  petugasSiswaActive: boolean;
  role?: string;
}) {
  const { absensiMode, petugasSiswaActive, role } = params;
  if (absensiMode !== 'MULTI_SESI') return false;
  if (role === 'ADMIN' || role === 'SUPERADMIN') return true;
  // ONLY SISWA Petugas can create session
  if (role === 'SISWA' && petugasSiswaActive) return true;
  // GURU is explicitly excluded from creating sessions
  return false;
}

