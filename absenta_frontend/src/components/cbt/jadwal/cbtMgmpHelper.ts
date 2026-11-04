/**
 * cbtMgmpHelper.ts
 * Helper untuk manajemen kolaborasi 2 arah Bank Soal MGMP (Pusat & Paralel)
 * - Arah 1 (Push): Pembuat master menceklis rekan guru paralel yang ter-cover
 * - Arah 2 (Pull): Rekan paralel mengklaim master bank untuk kelas mereka
 * - Pelacak Colek WhatsApp terintegrasi kontak guru & riwayat pengingat
 */

import type { CbtBankSoal } from '@/types/cbt.types';

export interface CbtNudgeMeta {
  sent_at: string;
  sent_by: string;
}

export interface AuditedTargetItem {
  id: string;
  guru_id: string;
  nama_guru: string;
  no_hp?: string;
  mapel_id: string;
  nama_mapel: string;
  tingkat: number;
  assignedTeachers: Array<{ id: string; nama_guru: string; no_hp?: string }>;
  bankSoal?: CbtBankSoal;
  soalCount: number;
  status: 'READY' | 'DRAFT_EMPTY' | 'UNCREATED';
  isShared: boolean;
  creatorName: string;
  isCoveredByMaster?: boolean;
  masterAuthorName?: string;
  coveredCoTeachers?: string[];
  nudgeMeta?: CbtNudgeMeta;
}

export interface MapelPaketTeoriItem {
  id: string;
  mapel_id: string;
  nama_mapel: string;
  tingkat: number;
  assignedTeachers: Array<{ id: string; nama_guru: string }>;
  isReady: boolean;
  bankSoal?: CbtBankSoal;
  masterAuthor?: string;
  soalCount: number;
}

const STORAGE_PREFIX = 'cbt_mgmp_shared_teachers_';
const NUDGE_STORAGE_PREFIX = 'cbt_nudge_history_';

export function getMgmpSharedTeacherIds(bankId: string, tenantId = 'default'): string[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tenantId}_${bankId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setMgmpSharedTeacherIds(bankId: string, teacherIds: string[], tenantId = 'default'): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tenantId}_${bankId}`, JSON.stringify(teacherIds));
    window.dispatchEvent(new CustomEvent('cbt-mgmp-sharing-updated', { detail: { bankId, teacherIds } }));
  } catch (e) {
    console.error('Failed to save MGMP sharing state:', e);
  }
}

export function getAllMgmpSharedMap(tenantId = 'default'): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  try {
    const keyPrefix = `${STORAGE_PREFIX}${tenantId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(keyPrefix)) {
        const bankId = key.replace(keyPrefix, '');
        const val = localStorage.getItem(key);
        if (val) {
          result[bankId] = JSON.parse(val);
        }
      }
    }
  } catch {
    // ignore
  }
  return result;
}

// ── RIWAYAT COLEK WHATSAPP PANITIA CBT ──
export function getNudgeHistory(tenantId = 'default'): Record<string, CbtNudgeMeta> {
  try {
    const raw = localStorage.getItem(`${NUDGE_STORAGE_PREFIX}${tenantId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function recordNudge(targetKey: string, senderName: string, tenantId = 'default'): void {
  try {
    const history = getNudgeHistory(tenantId);
    history[targetKey] = {
      sent_at: new Date().toISOString(),
      sent_by: senderName || 'Panitia CBT',
    };
    localStorage.setItem(`${NUDGE_STORAGE_PREFIX}${tenantId}`, JSON.stringify(history));
    window.dispatchEvent(new CustomEvent('cbt-nudge-updated', { detail: { targetKey, meta: history[targetKey] } }));
  } catch (e) {
    console.error('Failed to record CBT nudge:', e);
  }
}

export function formatNudgeMinutesAgo(isoString?: string): string | null {
  if (!isoString) return null;
  try {
    const sentTime = new Date(isoString).getTime();
    const diffMs = Date.now() - sentTime;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}h lalu`;
  } catch {
    return null;
  }
}
