/**
 * cbtMgmpHelper.ts
 * Helper untuk manajemen kolaborasi 2 arah Bank Soal MGMP (Pusat & Paralel)
 * - Arah 1 (Push): Pembuat master menceklis rekan guru paralel yang ter-cover
 * - Arah 2: Rekan paralel mengadopsi & mengaktifkan master bank untuk kelas mereka tanpa duplikasi
 * - Pelacak Colek WhatsApp terintegrasi kontak guru & riwayat pengingat
 */

import type { CbtBankSoal } from '@/types/cbt.types';
import { cbtApi } from '@/api/cbt.api';

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

/**
 * Mengambil daftar ID guru kontributor/MGMP untuk Bank Soal.
 * Sumber kebenaran utama berasal dari relasi DB (`bank.Kontributor`),
 * dengan fallback ke localStorage untuk kompatibilitas data lama.
 */
export function getMgmpSharedTeacherIds(
  bankOrId: string | CbtBankSoal,
  tenantId = 'default'
): string[] {
  if (typeof bankOrId !== 'string') {
    if (Array.isArray(bankOrId.Kontributor)) {
      return Array.from(
        new Set(
          bankOrId.Kontributor
            .filter((c) => c.can_edit_soal !== false)
            .map((c) => c.guru_id)
            .filter(Boolean)
        )
      );
    }
    return getMgmpSharedTeacherIds(bankOrId.id, tenantId);
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tenantId}_${bankOrId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setMgmpSharedTeacherIds(bankId: string, teacherIds: string[], tenantId = 'default'): void {
  try {
    if (!teacherIds || teacherIds.length === 0) {
      localStorage.removeItem(`${STORAGE_PREFIX}${tenantId}_${bankId}`);
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${tenantId}_${bankId}`, JSON.stringify(teacherIds));
    }
    window.dispatchEvent(new CustomEvent('cbt-mgmp-sharing-updated', { detail: { bankId, teacherIds } }));
  } catch (e) {
    console.error('Failed to save MGMP sharing state:', e);
  }
}

/**
 * Membangun map `{ [bankId]: guruId[] }` dari daftar Bank Soal DB terlebih dahulu,
 * lalu melengkapi fallback legacy localStorage bila belum ada di DB.
 */
export function getAllMgmpSharedMap(
  tenantId = 'default',
  bankSoals?: CbtBankSoal[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  try {
    const keyPrefix = `${STORAGE_PREFIX}${tenantId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(keyPrefix)) {
        const bankId = key.replace(keyPrefix, '');
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            result[bankId] = parsed;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  if (Array.isArray(bankSoals)) {
    for (const bank of bankSoals) {
      if (Array.isArray(bank.Kontributor)) {
        result[bank.id] = Array.from(
          new Set(
            bank.Kontributor.filter((c) => c.can_edit_soal !== false)
              .map((c) => c.guru_id)
              .filter(Boolean)
          )
        );
      }
    }
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

export function syncNudgeHistoryFromServer(
  serverData: Record<string, CbtNudgeMeta>,
  tenantId = 'default'
): Record<string, CbtNudgeMeta> {
  try {
    const local = getNudgeHistory(tenantId);
    const merged = { ...local };

    Object.entries(serverData || {}).forEach(([key, sMeta]) => {
      const lMeta = local[key];
      if (!lMeta) {
        merged[key] = sMeta;
      } else {
        const sTime = new Date(sMeta.sent_at).getTime();
        const lTime = new Date(lMeta.sent_at).getTime();
        if (sTime > lTime) {
          merged[key] = sMeta;
        }
      }
    });

    localStorage.setItem(`${NUDGE_STORAGE_PREFIX}${tenantId}`, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('cbt-nudge-updated', { detail: { merged } }));
    return merged;
  } catch (e) {
    console.error('Failed to sync CBT nudge history from server:', e);
    return getNudgeHistory(tenantId);
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

    // Simpan ke database server backend secara asinkron (multi-device sync)
    cbtApi.recordNudge(targetKey, senderName).catch((err) => {
      console.warn('Background sync CBT nudge to server failed:', err);
    });
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
