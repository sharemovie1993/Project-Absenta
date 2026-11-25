import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { kurikulumApi } from '@/api/kurikulum.api';
import { cbtApi } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { useCbtOperationMode } from '../cbtModeHelper';
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

  // 1. Sumber Kebenaran Tunggal Penugasan Mengajar Guru: SK GuruMapel
  const { data: assignedMapelsRes, isLoading: isMapelLoading } = useQuery({
    queryKey: ['guru-assigned-mapels-for-duty', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: Boolean(guruId),
    staleTime: 60 * 1000,
  });

  // 2. Bank Soal Relevan (milik sendiri + master MGMP / kontributor)
  const { data: bankListRes, isLoading: isBankLoading } = useQuery({
    queryKey: ['cbt-bank-soal-for-teacher-duty', guruId],
    queryFn: () =>
      guruId
        ? cbtApi
            .getBankSoalList({
              guru_id: guruId,
              limit: 200,
            })
            .catch(() => null)
        : null,
    enabled: Boolean(guruId),
    staleTime: 5 * 1000,
  });

  const rawAssignedList: GuruMapel[] = useMemo(() => {
    return assignedMapelsRes?.data || [];
  }, [assignedMapelsRes]);

  const rawBankList: CbtBankSoal[] = useMemo(() => {
    return bankListRes?.items || (bankListRes as any)?.data?.items || [];
  }, [bankListRes]);

  const evaluation = useMemo(() => {
    const res = evaluateTeacherDutiesSSOT({
      guruId,
      guruMapelList: rawAssignedList,
      bankList: rawBankList,
      targetTingkat,
    });
    return {
      ...res,
      isFullyExempt: res.totalDuties > 0 && res.coveredDuties === res.totalDuties,
    };
  }, [guruId, rawAssignedList, rawBankList, targetTingkat]);

  const detectedTeacherName = useMemo(() => {
    return rawAssignedList.find((gm) => (!guruId || gm.guru_id === guruId) && gm.Guru?.nama_guru)?.Guru?.nama_guru;
  }, [rawAssignedList, guruId]);

  return {
    isLoading: isMapelLoading || isBankLoading,
    activeEventName: eventName || activeEvent?.nama_event || undefined,
    hasActiveEvent: Boolean(activeEvent),
    teacherName: detectedTeacherName,
    ...evaluation,
  };
}
