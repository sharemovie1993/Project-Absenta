/**
 * briefing.types.ts
 * Tipe data universal untuk Daily Briefing & Tokenized Report Engine.
 *
 * Mendukung arsitektur multi-role yang fleksibel:
 * - KEPALA_SEKOLAH (Eksekutif makro lintas divisi)
 * - WALIKELAS (Data spesifik kelas binaan)
 * - KAPROG (Data spesifik jurusan/konsentrasi)
 * - KURIKULUM (KBM, guru, inval, perangkat)
 * - KESISWAAN (Kedisiplinan, gerbang, pelanggaran)
 * - GURU (Jadwal mengajar, rekap presensi kelasnya)
 */

export type BriefingRole =
  | 'KEPALA_SEKOLAH'
  | 'WALIKELAS'
  | 'KAPROG'
  | 'KURIKULUM'
  | 'KESISWAAN'
  | 'GURU';

export interface BriefingTokenPayload {
  tenantId: string;
  role: BriefingRole;
  targetUserId?: string;
  targetEntityId?: string; // misalnya kelasId atau jurusanId
  tanggal: string;         // YYYY-MM-DD
  scope: 'DAILY_BRIEFING';
  exp?: number;
  iat?: number;
}

export interface BriefingMetricItem {
  id: string;
  label: string;
  value: string | number;
  sub?: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
}

export interface BriefingSectionItem {
  title: string;
  subtitle?: string;
  status?: string;
  badge?: string;
  badgeColor?: string;
  note?: string;
  tags?: string[];
}

export interface BriefingProgressBar {
  label: string;
  value: number; // 0 - 100
  detail?: string;
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo';
}

export interface BriefingChartSlice {
  label: string;
  value: number;
  color: 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'slate' | 'purple';
  unit?: string;
}

export interface BriefingChartBlock {
  type: 'pie' | 'bar';
  title: string;
  subtitle?: string;
  centerLabel?: string;
  maxValue?: number;
  data: BriefingChartSlice[];
}

export interface BriefingSection {
  id: string;
  title: string;
  category: string;
  icon?: string;
  badge?: string;
  summary: string;
  stats?: Array<{ label: string; value: string | number }>;
  todayStats?: Array<{ label: string; value: string | number }>;
  rangeStats?: Array<{ label: string; value: string | number }>;
  progressBars?: BriefingProgressBar[];
  charts?: BriefingChartBlock[];
  items?: BriefingSectionItem[];
}

export interface BriefingLeaderboardPerson {
  rank: number;
  name: string;
  subtitle: string;
  badge: string;
  photoUrl?: string | null;
}

export interface BriefingKbmGalleryItem {
  id: string;
  photoUrl: string;
  mapel: string;
  kelas: string;
  guru: string;
  waktu: string;
  jurnal?: string | null;
}

export interface BriefingAiPillar {
  id: string;
  label: string;
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  status: 'excellent' | 'good' | 'warning' | 'critical';
  summary: string;
}

export interface BriefingAiVerdict {
  overallScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  schoolTitle: string;  // Gelar / Predikat Sekolah
  tagline: string;      // Sub-gelar singkat
  variant: 'emerald' | 'indigo' | 'amber' | 'rose';
  executiveVerdict: string; // Narasi vonis komprehensif AI
  pillars: BriefingAiPillar[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface UniversalBriefingData {
  title: string;
  role: BriefingRole;
  roleLabel: string;
  tenantId: string;
  sekolahNama: string;
  targetName: string;
  tanggalStr: string;   // format: "Rabu, 18 November 2026"
  tanggalIso: string;   // format: "2026-11-18"
  generatedAt: string;
  expiresAt: string;
  statusBadge?: {
    label: string;
    variant: 'success' | 'warning' | 'danger';
    score: number;
  };
  trend?: {
    kehadiranDeltaPct: number | null;
    kemarinKehadiranPct: number | null;
  };
  metrics: BriefingMetricItem[];
  highlights: string[];
  sections: BriefingSection[];
  leaderboard?: {
    academicContext: string;
    topTeachers: BriefingLeaderboardPerson[];
    topStudents: BriefingLeaderboardPerson[];
    rangeTopTeachers?: BriefingLeaderboardPerson[];
    rangeTopStudents?: BriefingLeaderboardPerson[];
  };
  kbmGallery?: {
    isToday: boolean;
    totalPhotosToday: number;
    items: BriefingKbmGalleryItem[];
  };
  aiVerdict?: BriefingAiVerdict;
}
