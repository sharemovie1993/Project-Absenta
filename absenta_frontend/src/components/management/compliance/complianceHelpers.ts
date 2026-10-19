import { formatDate } from '@/utils/date.utils';

export interface TeacherComplianceItem {
  id: string;
  nama: string;
  nip: string;
  noWa: string;
  mapel: string;
  jabatan: string;
  rfidEnrolled: boolean;
  hasUserAccount: boolean;
  lastLogin: string | null;
  complianceScore: number;
  issues: string[];
}

export interface StudentComplianceItem {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  noWaOrtu: string;
  rfidEnrolled: boolean;
  hasUserAccount: boolean;
  lastLogin: string | null;
  complianceScore: number;
  issues: string[];
}

export interface ComplianceStats {
  totalGuru: number;
  totalSiswa: number;
  teacherRfidPct: number;
  teacherWaPct: number;
  teacherLoginPct?: number;
  studentRfidPct: number;
  studentWaPct: number;
  studentLoginPct?: number;
  guruActiveCount: number;
  guruPassiveCount: number;
  guruDormantCount: number;
  siswaActiveCount?: number;
  siswaPassiveCount?: number;
  siswaDormantCount?: number;
}

export function formatLastLogin(dateStr?: string | Date | null): { text: string; isRecent: boolean } {
  if (!dateStr) return { text: 'Belum Pernah', isRecent: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: 'Belum Pernah', isRecent: false };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    const hours = Math.max(1, Math.floor(diffHours));
    return { text: `${hours} jam lalu`, isRecent: true };
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return { text: `${diffDays} hari lalu`, isRecent: true };
  }

  return {
    text: formatDate(d),
    isRecent: false
  };
}

export function getComplianceBadge(score: number) {
  if (score >= 80) return { label: 'Lengkap', grade: 'Lengkap', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' };
  if (score >= 50) return { label: 'Sebagian', grade: 'Sebagian', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800' };
  return { label: 'Belum Lengkap', grade: 'Belum Lengkap', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-200 dark:border-rose-800' };
}

export function computeComplianceScore(params: {
  rfidEnrolled: boolean;
  noWa: string;
  hasUserAccount: boolean;
  lastLogin: string | null;
  rfidMissingMsg: string;
  waMissingMsg: string;
  accountMissingMsg: string;
}): { complianceScore: number; issues: string[] } {
  const issues: string[] = [];
  let score = 30;

  if (params.rfidEnrolled) {
    score += 30;
  } else {
    issues.push(params.rfidMissingMsg);
  }

  const cleanWa = params.noWa.replace(/\D/g, '');
  if (cleanWa && cleanWa.length >= 8) {
    score += 20;
  } else {
    issues.push(params.waMissingMsg);
  }

  if (params.hasUserAccount) {
    score += 10;
  } else {
    issues.push(params.accountMissingMsg);
  }

  if (params.lastLogin) {
    const lastLoginDate = new Date(params.lastLogin);
    const daysSinceLogin = (Date.now() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin <= 14) {
      score += 10;
    } else {
      issues.push(`Aktivitas login terakhir sudah lebih dari ${Math.floor(daysSinceLogin)} hari.`);
    }
  } else {
    issues.push('Belum pernah login ke portal aplikasi Absenta.');
  }

  return { complianceScore: Math.min(100, score), issues };
}
