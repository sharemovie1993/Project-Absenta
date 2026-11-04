/**
 * cbtMgmpHelper.ts
 * Helper untuk manajemen kolaborasi 2 arah Bank Soal MGMP (Pusat & Paralel)
 * - Arah 1 (Push): Pembuat master menceklis rekan guru paralel yang ter-cover
 * - Arah 2 (Pull): Rekan paralel mengklaim master bank untuk kelas mereka
 */

import type { CbtBankSoal } from '@/types/cbt.types';

export interface AuditedTargetItem {
  id: string;
  guru_id: string;
  nama_guru: string;
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
}

const STORAGE_PREFIX = 'cbt_mgmp_shared_teachers_';

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
