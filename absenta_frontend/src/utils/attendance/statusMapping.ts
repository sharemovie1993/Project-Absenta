/**
 * 🚦 Unified Attendance & Session Status Mapping Utility
 * Single Source of Truth for canonical status normalization and Tailwind CSS Design Tokens.
 */

// 1. Canonical Sesi KBM Status Enum
export type CanonicalSesiStatus = 'MENDATANG' | 'BERLANGSUNG' | 'SELESAI';

// 2. Canonical Guru Attendance Status Enum
export type CanonicalAbsenGuruStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'PENUGASAN' | 'BELUM_HADIR';

// 3. Canonical Siswa Attendance Status Enum
export type CanonicalAbsenSiswaStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPA';

/**
 * Normalize any raw session status string to canonical CanonicalSesiStatus
 */
export function normalizeSesiStatus(rawStatus?: string | null): CanonicalSesiStatus {
  if (!rawStatus) return 'MENDATANG';
  const clean = String(rawStatus).trim().toUpperCase();
  if (['AKTIF', 'BERLANGSUNG', 'LIVE', 'OPEN', 'IN_PROGRESS'].includes(clean)) {
    return 'BERLANGSUNG';
  }
  if (['SELESAI', 'FINISHED', 'CLOSED', 'DONE'].includes(clean)) {
    return 'SELESAI';
  }
  return 'MENDATANG';
}

/**
 * Normalize raw teacher attendance status to CanonicalAbsenGuruStatus
 */
export function normalizeAbsenGuruStatus(rawStatus?: string | null): CanonicalAbsenGuruStatus {
  if (!rawStatus) return 'BELUM_HADIR';
  const clean = String(rawStatus).trim().toUpperCase();
  if (['HADIR', 'TEPAT_WAKTU', 'PRESENT'].includes(clean)) return 'HADIR';
  if (['TERLAMBAT', 'LATE'].includes(clean)) return 'TERLAMBAT';
  if (['IZIN', 'PERMIT', 'LEAVE'].includes(clean)) return 'IZIN';
  if (['SAKIT', 'SICK'].includes(clean)) return 'SAKIT';
  if (['PENUGASAN', 'TUGAS_LUAR', 'ASSIGNMENT'].includes(clean)) return 'PENUGASAN';
  return 'BELUM_HADIR';
}

/**
 * Normalize raw student attendance status to CanonicalAbsenSiswaStatus
 */
export function normalizeAbsenSiswaStatus(rawStatus?: string | null): CanonicalAbsenSiswaStatus {
  if (!rawStatus) return 'ALPA';
  const clean = String(rawStatus).trim().toUpperCase();
  if (['HADIR', 'TEPAT_WAKTU', 'PRESENT'].includes(clean)) return 'HADIR';
  if (['TERLAMBAT', 'LATE'].includes(clean)) return 'TERLAMBAT';
  if (['IZIN', 'PERMIT', 'LEAVE'].includes(clean)) return 'IZIN';
  if (['SAKIT', 'SICK'].includes(clean)) return 'SAKIT';
  return 'ALPA';
}

/**
 * Design Token Props for Session Badges
 */
export function getSesiStatusBadgeProps(status: CanonicalSesiStatus) {
  switch (status) {
    case 'BERLANGSUNG':
      return {
        label: 'SESI BERLANGSUNG',
        containerClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
        dotClass: 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse',
      };
    case 'SELESAI':
      return {
        label: 'SELESAI',
        containerClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
        dotClass: 'w-1.5 h-1.5 rounded-full bg-slate-400',
      };
    case 'MENDATANG':
    default:
      return {
        label: 'TERJADWAL',
        containerClass: 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/20',
        dotClass: 'w-1.5 h-1.5 rounded-full bg-blue-400',
      };
  }
}

/**
 * Design Token Props for Attendance Status Badges (Guru & Siswa)
 */
export function getAttendanceStatusBadgeProps(status: CanonicalAbsenGuruStatus | CanonicalAbsenSiswaStatus) {
  switch (status) {
    case 'HADIR':
      return {
        label: 'Hadir',
        containerClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
      };
    case 'TERLAMBAT':
      return {
        label: 'Terlambat',
        containerClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30',
      };
    case 'IZIN':
      return {
        label: 'Izin',
        containerClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30',
      };
    case 'SAKIT':
      return {
        label: 'Sakit',
        containerClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
      };
    case 'PENUGASAN':
      return {
        label: 'Penugasan Mandiri',
        containerClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30',
      };
    case 'BELUM_HADIR':
      return {
        label: 'Belum Hadir',
        containerClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30',
      };
    case 'ALPA':
    default:
      return {
        label: 'Alpa',
        containerClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30',
      };
  }
}
