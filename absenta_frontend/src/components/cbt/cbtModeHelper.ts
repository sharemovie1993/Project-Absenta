import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtEventItem } from '@/types/cbt.types';

export type CbtOperationMode = 'MANDIRI' | 'ORKESTRASI';

export interface CbtModeConfig {
  mode: CbtOperationMode;
  eventName: string; // Misal: "Penilaian Akhir Semester (PAS) Ganjil"
  eventId?: string;
  targetTingkat?: number[]; // Misal [10, 11, 12] atau [12]
  lockTeacherScheduling: boolean;
  activeSince: string;
  updatedBy?: string;
}

const CBT_MODE_STORAGE_KEY_PREFIX = 'cbt_operation_mode_';

export function getCbtModeConfigKey(tenantId?: string): string {
  return `${CBT_MODE_STORAGE_KEY_PREFIX}${tenantId || 'global'}`;
}

export function getDefaultCbtModeConfig(): CbtModeConfig {
  return {
    mode: 'ORKESTRASI',
    eventName: 'Penilaian Akhir Semester (PAS) Ganjil',
    targetTingkat: [10, 11, 12],
    lockTeacherScheduling: true,
    activeSince: new Date().toISOString(),
  };
}

export function loadCbtModeConfig(tenantId?: string): CbtModeConfig {
  if (typeof window === 'undefined') return getDefaultCbtModeConfig();
  try {
    const raw = localStorage.getItem(getCbtModeConfigKey(tenantId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.mode === 'MANDIRI' || parsed.mode === 'ORKESTRASI')) {
        return {
          ...parsed,
          targetTingkat: Array.isArray(parsed.targetTingkat) && parsed.targetTingkat.length > 0
            ? parsed.targetTingkat
            : [10, 11, 12],
        };
      }
    }
  } catch (err) {
    console.error('Failed to parse cbt mode config', err);
  }
  return getDefaultCbtModeConfig();
}

export function saveCbtModeConfig(config: CbtModeConfig, tenantId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getCbtModeConfigKey(tenantId), JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('cbt-mode-changed', { detail: config }));
  } catch (err) {
    console.error('Failed to save cbt mode config', err);
  }
}

/**
 * Custom Hook untuk Sinkronisasi Real-time Mode Operasional CBT & Active Event
 */
export function useCbtOperationMode() {
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id;

  const [localConfig, setLocalConfig] = useState<CbtModeConfig>(() => loadCbtModeConfig(tenantId));

  // Query Konfigurasi Event Aktif dari Database SSoT Backend
  const { data: eventsData } = useQuery({
    queryKey: cbtQueryKeys.eventsSummary(),
    queryFn: () => cbtApi.getEventsSummary(),
    staleTime: 60 * 1000,
  });

  const activeEvent = eventsData?.active_event;

  useEffect(() => {
    setLocalConfig(loadCbtModeConfig(tenantId));
  }, [tenantId]);

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      const custom = e as CustomEvent<CbtModeConfig>;
      if (custom.detail) {
        setLocalConfig(custom.detail);
      }
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getCbtModeConfigKey(tenantId)) {
        setLocalConfig(loadCbtModeConfig(tenantId));
      }
    };

    window.addEventListener('cbt-mode-changed', handleModeChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('cbt-mode-changed', handleModeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [tenantId]);

  const updateMode = useCallback(
    (newMode: CbtOperationMode, newEventName?: string) => {
      const updated: CbtModeConfig = {
        ...localConfig,
        mode: newMode,
        eventName: newEventName !== undefined ? newEventName : localConfig.eventName,
        lockTeacherScheduling: newMode === 'ORKESTRASI',
        activeSince: new Date().toISOString(),
        updatedBy: user?.nama || user?.name || 'Panitia',
      };
      saveCbtModeConfig(updated, tenantId);
      setLocalConfig(updated);
    },
    [localConfig, tenantId, user]
  );

  const updateActiveEvent = useCallback(
    (event: CbtEventItem) => {
      const isEventMandiri = event.tipe_pelaksanaan === 'MANDIRI';
      const updated: CbtModeConfig = {
        ...localConfig,
        mode: isEventMandiri ? 'MANDIRI' : 'ORKESTRASI',
        eventId: event.id,
        eventName: event.nama_event,
        targetTingkat: Array.isArray(event.target_tingkat) && event.target_tingkat.length > 0
          ? event.target_tingkat
          : [10, 11, 12],
        lockTeacherScheduling: event.lock_teacher_scheduling ?? !isEventMandiri,
        activeSince: new Date().toISOString(),
        updatedBy: user?.nama || user?.name || 'Panitia',
      };
      saveCbtModeConfig(updated, tenantId);
      setLocalConfig(updated);
    },
    [localConfig, tenantId, user]
  );

  const effectiveMode: CbtOperationMode = activeEvent
    ? (activeEvent.tipe_pelaksanaan === 'MANDIRI' ? 'MANDIRI' : 'ORKESTRASI')
    : localConfig.mode;
  const effectiveEventName = activeEvent?.nama_event || localConfig.eventName;
  const effectiveEventId = activeEvent?.id || localConfig.eventId;
  const effectiveTargetTingkat = useMemo(() => {
    if (activeEvent?.target_tingkat && activeEvent.target_tingkat.length > 0) {
      return activeEvent.target_tingkat;
    }
    return localConfig.targetTingkat || [10, 11, 12];
  }, [activeEvent, localConfig.targetTingkat]);
  const effectiveLockTeacherScheduling = activeEvent?.lock_teacher_scheduling ?? localConfig.lockTeacherScheduling;

  return {
    config: {
      ...localConfig,
      eventName: effectiveEventName,
      eventId: effectiveEventId,
      targetTingkat: effectiveTargetTingkat,
      lockTeacherScheduling: effectiveLockTeacherScheduling,
    },
    mode: effectiveMode,
    eventName: effectiveEventName,
    eventId: effectiveEventId,
    targetTingkat: effectiveTargetTingkat,
    isOrkestrasi: effectiveMode === 'ORKESTRASI',
    isMandiri: effectiveMode === 'MANDIRI',
    lockTeacherScheduling: effectiveLockTeacherScheduling,
    activeEvent,
    tokenRefreshInterval: activeEvent?.token_refresh_interval ?? 0,
    strictBrowserGuard: activeEvent?.strict_browser_guard ?? true,
    updateMode,
    updateActiveEvent,
  };
}

/**
 * Resolusi Tahun Pelajaran & Semester efektif untuk sebuah Event CBT.
 * Prioritaskan konteks akademik milik Event CBT terlebih dahulu (mencegah event Genap
 * tersimpan dengan semester_id Ganjil saat persiapan pra-pergantian semester).
 */
export function resolveEventAcademicContext(params: {
  activeEvent?: Pick<CbtEventItem, 'tahun_pelajaran_id' | 'semester'> | null;
  activeTp?: { id?: string } | null;
  activeSemester?: { id?: string; tahun_pelajaran_id?: string; nama_semester?: string } | null;
  allSemesters?: Array<{ id: string; tahun_pelajaran_id?: string; nama_semester?: string; nama?: string; is_active?: boolean }>;
}): { effectiveTpId?: string; effectiveSemId?: string } {
  const { activeEvent, activeTp, activeSemester, allSemesters = [] } = params;
  const effectiveTpId = activeEvent?.tahun_pelajaran_id || activeTp?.id;

  const tpSemesters = effectiveTpId
    ? allSemesters.filter((s) => !s.tahun_pelajaran_id || s.tahun_pelajaran_id === effectiveTpId)
    : allSemesters;

  let effectiveSemId: string | undefined;

  if (activeEvent?.semester && tpSemesters.length > 0) {
    const target = String(activeEvent.semester).toUpperCase().trim();
    const isGenapTarget = target.includes('GENAP') || target === '2';
    const isGanjilTarget = target.includes('GANJIL') || target.includes('GASAL') || target === '1';

    const matched = tpSemesters.find((s) => {
      const semName = String(s.nama_semester || s.nama || '').toUpperCase().trim();
      if (isGenapTarget) return semName.includes('GENAP') || /\b2\b/.test(semName);
      if (isGanjilTarget) return semName.includes('GANJIL') || semName.includes('GASAL') || /\b1\b/.test(semName);
      return semName.includes(target);
    });
    if (matched?.id) {
      effectiveSemId = matched.id;
    }
  }

  if (!effectiveSemId) {
    if (activeSemester?.id && (!effectiveTpId || !activeSemester.tahun_pelajaran_id || activeSemester.tahun_pelajaran_id === effectiveTpId)) {
      effectiveSemId = activeSemester.id;
    } else {
      effectiveSemId = tpSemesters.find((s) => s.is_active)?.id || tpSemesters[0]?.id || activeSemester?.id;
    }
  }

  return { effectiveTpId, effectiveSemId };
}
