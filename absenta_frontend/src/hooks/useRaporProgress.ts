import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requestWithFallback } from '../api/apiUtils';

export interface TeacherRaporProgress {
  teacherId: string;
  teacherName: string;
  mapelName: string;
  kelasName: string;
  totalStudents: number;
  gradedStudents: number;
  percentage: number;
  status: 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';
}

export function useRaporProgress() {
  const query = useQuery({
    queryKey: ['rapor-teacher-progress'],
    queryFn: async () => {
      const res = await requestWithFallback<any>('get', '/rapor/progress');
      return res.data || { progressList: [], totalGradedPercentage: 0, isLocked: false };
    },
    staleTime: 3 * 60 * 1000,
  });

  const teacherProgress = useMemo(() => {
    return query.data?.progressList || [];
  }, [query.data]);

  const isLocked = useMemo(() => {
    return query.data?.isLocked || false;
  }, [query.data]);

  return {
    teacherProgress,
    isLocked,
    totalPercentage: query.data?.totalGradedPercentage || 0,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
