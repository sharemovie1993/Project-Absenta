export function canCreateSession(params: {
  absensiMode: 'SIMPLE' | 'MULTI_SESI';
  role: string;
  isPetugasActive: boolean;
}) {
  const { absensiMode, role, isPetugasActive } = params;
  if (absensiMode !== 'MULTI_SESI') return false;
  if (role === 'ADMIN' || role === 'SUPERADMIN') return true;
  // ONLY SISWA Petugas can create session
  if (role === 'SISWA' && isPetugasActive) return true;
  // GURU is explicitly excluded from creating sessions
  return false;
}

