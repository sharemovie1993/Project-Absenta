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

export interface BriefingSection {
  id: string;
  title: string;
  category: string;
  icon?: string;
  badge?: string;
  summary: string;
  stats?: Array<{ label: string; value: string | number }>;
  items?: BriefingSectionItem[];
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
