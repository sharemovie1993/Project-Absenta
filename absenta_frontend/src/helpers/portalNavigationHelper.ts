import { type User } from '@/store/authStore';

export interface UserDashboardTarget {
  label: string;
  tab: string;
  path?: string;
  badge?: string;
}

/**
 * Normalisasi position_codes dari data user
 */
export function getUserPositionCodes(user: any): string[] {
  if (!user) return [];
  const rawList: string[] = [];

  if (Array.isArray(user.position_codes)) {
    user.position_codes.forEach((p: any) => {
      if (p) rawList.push(String(p).toUpperCase().trim());
    });
  }

  // Fallback dari jabatan string jika ada
  if (typeof user.jabatan === 'string' && user.jabatan) {
    rawList.push(user.jabatan.toUpperCase().trim());
  }

  return Array.from(new Set(rawList));
}

/**
 * Normalisasi capabilities dari data user
 */
export function getUserCapabilities(user: any): string[] {
  if (!user) return [];
  if (Array.isArray(user.capabilities)) {
    return user.capabilities.map((c: any) => String(c).trim());
  }
  if (typeof user.capabilities === 'string') {
    try {
      const parsed = JSON.parse(user.capabilities);
      if (Array.isArray(parsed)) return parsed.map((c: any) => String(c).trim());
    } catch {
      return user.capabilities.split(',').map((c: string) => c.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Resolusi Dashboard dan label kontekstual berdasarkan Base Role & STRUKTUR_CODES (Position Capabilities)
 */
export function resolveUserDashboardTarget(user: any): UserDashboardTarget {
  if (!user) {
    return { label: 'Beranda Utama', tab: 'ringkasan' };
  }

  const roleRaw = typeof user.role === 'string' ? user.role : user.role?.name || (user as any).roleName || '';
  const roleName = roleRaw.toUpperCase().trim();
  const positionCodes = getUserPositionCodes(user);
  const capabilities = getUserCapabilities(user);

  const hasPos = (...codes: string[]) => positionCodes.some(p => codes.includes(p));
  const hasCap = (...caps: string[]) => capabilities.some(c => caps.some(prefix => c.startsWith(prefix) || c === prefix));

  // 1. Superadmin / Platform Admin
  if (roleName === 'SUPERADMIN' || roleName.startsWith('PLATFORM_')) {
    return { label: 'Dashboard Platform', tab: 'admin', path: '/superadmin' };
  }

  // 2. Kepala Sekolah (Level 5 Eksekutif)
  if (hasPos('KEPALA_SEKOLAH') || roleName === 'KEPALA_SEKOLAH' || roleName === 'KEPSEK') {
    return { label: 'Overview Eksekutif', tab: 'ringkasan', badge: 'KEPSEK' };
  }

  // 3. Admin Sekolah murni (Tenant Admin)
  if (roleName === 'ADMIN') {
    return { label: 'Dashboard Admin', tab: 'admin', badge: 'ADMIN' };
  }

  // 4. Siswa / Peserta Didik
  if (roleName === 'SISWA' || roleName === 'STUDENT') {
    return { label: 'Dashboard Siswa', tab: 'ringkasan', path: '/dashboard', badge: 'SISWA' };
  }

  // 5. Anggota Koperasi Eksternal
  if (roleName === 'ANGGOTA_KOPERASI_EXTERNAL') {
    return { label: 'Dashboard Koperasi', tab: 'koperasi', path: '/cooperative/dashboard', badge: 'KOPERASI' };
  }

  // 6. Petugas Gerbang / Keamanan (Satpam Murni)
  const isSecurity = hasPos('GERBANG') || roleName === 'GERBANG' || hasCap('attendance.gate.scan');
  const isPendidik = roleName === 'GURU' || (user as any)?.guru_profile?.jenis_ptk === 'PENDIDIK';
  if (isSecurity && !isPendidik) {
    return { label: 'Pos Keamanan', tab: 'ringkasan', badge: 'SCAN' };
  }

  // 7. Staf Tata Usaha Fungsional Murni (tanpa mengajar)
  const isTu = hasPos('TU_KEPALA', 'TU', 'TU_KEPEGAWAIAN', 'TU_PERSURATAN', 'TU_KEUANGAN', 'TU_SARPRAS') ||
    (user as any)?.guru_profile?.jenis_ptk === 'TENAGA_KEPENDIDIKAN';
  if (isTu && !isPendidik) {
    if (hasPos('TU_KEPALA', 'TU')) return { label: 'Dashboard Tata Usaha', tab: 'kepegawaian', badge: 'KOR TU' };
    if (hasPos('TU_KEPEGAWAIAN')) return { label: 'TU Kepegawaian', tab: 'kepegawaian', badge: 'DAPODIK' };
    if (hasPos('TU_PERSURATAN')) return { label: 'TU Persuratan', tab: 'kepegawaian', badge: 'SURAT' };
    if (hasPos('TU_KEUANGAN')) return { label: 'TU Keuangan & SPP', tab: 'kepegawaian', badge: 'SPP' };
    if (hasPos('TU_SARPRAS')) return { label: 'TU Sarpras & KIB', tab: 'kepegawaian', badge: 'KIB' };
    return { label: 'Tata Usaha', tab: 'kepegawaian', badge: 'TU' };
  }

  // 8. Pengelola Usaha Koperasi Murni
  if (hasPos('MANAJER_TOKO_KOPERASI', 'BENDAHARA_KOPERASI', 'KETUA_KOPERASI', 'SEKRETARIS_KOPERASI', 'PENGAWAS_KOPERASI') && !isPendidik) {
    return { label: 'Dashboard Koperasi', tab: 'ringkasan', path: '/cooperative/dashboard', badge: 'KOPERASI' };
  }

  // 9. Default untuk Guru / Pendidik / Wali Kelas
  return { label: 'Beranda Guru', tab: 'ringkasan', badge: 'GURU' };
}
