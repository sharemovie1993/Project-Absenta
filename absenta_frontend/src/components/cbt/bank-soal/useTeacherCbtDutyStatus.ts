import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { kurikulumApi } from '@/api/kurikulum.api';
import { getMyJadwalKBM, getJadwalKBM, type JadwalKBM } from '@/api/attendance/jadwalKBM.api';
import { cbtApi } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { useCbtOperationMode } from '../cbtModeHelper';
import { useJenjang } from '@/hooks/useJenjang';
import { useTahunPelajaranOptions, useSemesterOptions } from '@/components/common';
import {
  evaluateTeacherDutiesSSOT,
  type DutyCoverStatus,
  type TeacherDutyItem,
} from './cbtDutyEngine';

export type { DutyCoverStatus, TeacherDutyItem };

export interface TeacherCbtDutyStatusResult {
  isLoading: boolean;
  activeEventName?: string;
  hasActiveEvent: boolean;
  teacherName?: string;
  totalDuties: number;
  coveredDuties: number;
  draftDuties: number;
  uncreatedDuties: number;
  pendingDuties: number;
  completionPercentage: number;
  isFullyExempt: boolean;
  hasNoDuties: boolean;
  items: TeacherDutyItem[];
  pendingJurusanSummary?: string;
}

export function useTeacherCbtDutyStatus(guruId?: string): TeacherCbtDutyStatusResult {
  const { activeEvent, eventName, targetTingkat } = useCbtOperationMode();
  const { tingkatList } = useJenjang();
  const { activeYear: activeTp } = useTahunPelajaranOptions();
  const { activeSemester, rawList: semRawList = [] } = useSemesterOptions();

  const effectiveTpId = activeTp?.id || activeEvent?.tahun_pelajaran_id;
  const effectiveSemId = useMemo(() => {
    if (activeSemester?.id) return activeSemester.id;
    if (activeEvent?.semester && semRawList.length > 0) {
      const target = String(activeEvent.semester).toUpperCase().trim();
      const matched = semRawList.find((s: any) =>
        String(s.nama_semester || s.nama || '').toUpperCase().includes(target)
      );
      if (matched?.id) return matched.id;
    }
    return undefined;
  }, [activeSemester?.id, activeEvent?.semester, semRawList]);

  // 1. Sumber Kebenaran Tunggal Penugasan Mengajar Guru: SK GuruMapel
  const { data: assignedMapelsRes, isLoading: isMapelLoading } = useQuery({
    queryKey: ['guru-assigned-mapels-for-duty', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: Boolean(guruId),
    staleTime: 60 * 1000,
  });

  // 1b. Ambil Jadwal KBM Mingguan Riil Guru (untuk melengkapi relasi kelas_id & tingkat jika SK GuruMapel belum mengikat kelas_id)
  const { data: jadwalKBMRes, isLoading: isJadwalLoading } = useQuery({
    queryKey: ['guru-jadwal-kbm-for-duty', guruId],
    queryFn: async () => {
      try {
        const res = await getMyJadwalKBM({ weekly: 'true' } as any);
        const list = res?.data || (res as any)?.items;
        if (Array.isArray(list) && list.length > 0) return list;
      } catch {
        // lanjut ke query by guru_id
      }
      if (guruId) {
        try {
          const res2 = await getJadwalKBM({ guru_id: guruId } as any);
          const list2 = res2?.data || (res2 as any)?.items;
          if (Array.isArray(list2)) return list2;
        } catch {
          // ignore
        }
      }
      return [];
    },
    enabled: Boolean(guruId),
    staleTime: 60 * 1000,
  });

  // 2. Bank Soal Relevan (milik sendiri + master MGMP / kontributor, terikat TP & Semester aktif)
  const { data: bankListRes, isLoading: isBankLoading } = useQuery({
    queryKey: ['cbt-bank-soal-for-teacher-duty', guruId, effectiveTpId, effectiveSemId],
    queryFn: () =>
      guruId
        ? cbtApi
            .getBankSoalList({
              guru_id: guruId,
              limit: 200,
              ...(effectiveTpId ? { tahun_pelajaran_id: effectiveTpId } : {}),
              ...(effectiveSemId ? { semester_id: effectiveSemId } : {}),
            })
            .catch(() => null)
        : null,
    enabled: Boolean(guruId),
    staleTime: 5 * 1000,
  });

  const rawAssignedList: GuruMapel[] = useMemo(() => {
    return assignedMapelsRes?.data || [];
  }, [assignedMapelsRes]);

  const rawJadwalList: JadwalKBM[] = useMemo(() => {
    const list = Array.isArray(jadwalKBMRes) ? jadwalKBMRes : (jadwalKBMRes as any)?.data || [];
    if (!guruId) return list;
    return list.filter((j: any) => {
      const directGuruId = j.guru_id || j.guru_pelaksana_id;
      const unitGuruId = j.UnitPengajaran?.guru_id;
      return (directGuruId && directGuruId === guruId) || (unitGuruId && unitGuruId === guruId);
    });
  }, [jadwalKBMRes, guruId]);

  const rawBankList: CbtBankSoal[] = useMemo(() => {
    return bankListRes?.items || (bankListRes as any)?.data?.items || [];
  }, [bankListRes]);

  const effectiveTargetTingkat = useMemo(() => {
    return targetTingkat && targetTingkat.length > 0 ? targetTingkat : tingkatList;
  }, [targetTingkat, tingkatList]);

  const evaluation = useMemo(() => {
    const res = evaluateTeacherDutiesSSOT({
      guruId,
      guruMapelList: rawAssignedList,
      jadwalKbmList: rawJadwalList,
      bankList: rawBankList,
      targetTingkat: effectiveTargetTingkat,
    });
    return {
      ...res,
      isFullyExempt: res.totalDuties > 0 && res.coveredDuties === res.totalDuties,
    };
  }, [guruId, rawAssignedList, rawJadwalList, rawBankList, effectiveTargetTingkat]);

  const detectedTeacherName = useMemo(() => {
    return rawAssignedList.find((gm) => (!guruId || gm.guru_id === guruId) && gm.Guru?.nama_guru)?.Guru?.nama_guru;
  }, [rawAssignedList, guruId]);

  return {
    isLoading: isMapelLoading || isJadwalLoading || isBankLoading,
    activeEventName: eventName || activeEvent?.nama_event || undefined,
    hasActiveEvent: Boolean(activeEvent),
    teacherName: detectedTeacherName,
    ...evaluation,
  };
}
