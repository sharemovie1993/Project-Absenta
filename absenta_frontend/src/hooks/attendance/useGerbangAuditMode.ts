import { useQuery } from '@tanstack/react-query';
import { checkSchoolDay } from '../../api/attendanceGerbang.api';

export function useGerbangAuditMode(date?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['gerbang-school-day-check', date || 'today'],
    queryFn: () => checkSchoolDay(date),
    staleTime: 1000 * 60 * 30, // 30 menit
    refetchOnWindowFocus: false,
  });

  return {
    isAuditMode: data?.isAuditMode ?? false,
    isWorkingDay: data?.isWorkingDay ?? true,
    auditReason: data?.reason ?? '',
    isLoading,
    error,
    refetch,
  };
}
