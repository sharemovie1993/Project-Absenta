/**
 * dailyBriefing.api.ts
 * API Client untuk Daily Briefing & Tokenized Reports.
 */

import axiosInstance from '@/lib/axiosInstance';

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
  value: number;
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
  score: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  status: 'excellent' | 'good' | 'warning' | 'critical';
  summary: string;
}

export interface BriefingAiVerdict {
  overallScore: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  schoolTitle: string;
  tagline: string;
  variant: 'emerald' | 'indigo' | 'amber' | 'rose';
  executiveVerdict: string;
  pillars: BriefingAiPillar[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface UniversalBriefingData {
  title: string;
  role: string;
  roleLabel: string;
  tenantId: string;
  sekolahNama: string;
  targetName: string;
  tanggalStr: string;
  tanggalIso: string;
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

export interface DailyBriefingResponse {
  success: boolean;
  message?: string;
  data: UniversalBriefingData;
}

export interface TriggerSendResponse {
  success: boolean;
  message: string;
  recipient?: string;
  tokenUrl?: string;
}

/**
 * Mengambil data laporan harian publik berdasarkan token
 */
export async function getDailyBriefingByToken(token: string): Promise<UniversalBriefingData> {
  const res = await axiosInstance.get<DailyBriefingResponse>('/reports/daily-briefing', {
    params: { token },
  });
  return res.data.data;
}

/**
 * Mengambil pratinjau data laporan langsung (autentikasi pimpinan/admin)
 */
export async function getDailyBriefingPreview(
  role: string = 'KEPALA_SEKOLAH',
  tanggal?: string
): Promise<UniversalBriefingData> {
  const res = await axiosInstance.get<DailyBriefingResponse>('/reports/daily-briefing/preview', {
    params: { role, tanggal },
  });
  return res.data.data;
}

/**
 * Memicu pengiriman laporan harian ke WhatsApp (manual / test)
 */
export async function triggerDailyBriefingSend(params?: {
  role?: string;
  tanggal?: string;
  targetPhoneOverride?: string;
}): Promise<TriggerSendResponse> {
  const res = await axiosInstance.post<TriggerSendResponse>(
    '/reports/daily-briefing/trigger-send',
    params || {}
  );
  return res.data;
}

export interface WaGroupOption {
  id: string;
  subject: string;
  participantsCount?: number;
}

export interface BriefingGroupTarget {
  groupJid: string;
  groupName: string;
}

export async function getWhatsappGroupsForBriefing(): Promise<WaGroupOption[]> {
  try {
    const res = await axiosInstance.get<{ success: boolean; data?: WaGroupOption[]; groups?: WaGroupOption[] }>('/whatsapp/groups');
    return res.data?.data || res.data?.groups || [];
  } catch {
    return [];
  }
}

export async function getDailyBriefingGroupTarget(): Promise<BriefingGroupTarget | null> {
  try {
    const res = await axiosInstance.get<{ success: boolean; data: BriefingGroupTarget | null }>('/reports/daily-briefing/group-target');
    return res.data?.data || null;
  } catch {
    return null;
  }
}

export async function saveDailyBriefingGroupTarget(
  groupJid: string | null,
  groupName?: string
): Promise<{ success: boolean; message: string; data: BriefingGroupTarget | null }> {
  const res = await axiosInstance.post('/reports/daily-briefing/group-target', { groupJid, groupName });
  return res.data;
}
