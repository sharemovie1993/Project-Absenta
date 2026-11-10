import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { cbtApi } from '@/api/cbt.api';
import type { CbtJadwalUjian } from '@/types/cbt.types';

export function useMyPengawasCbt() {
  const user = useAuthStore((state) => state.user);
  const effectiveGuruId =
    user?.guru_profile?.id ||
    (user as any)?.guru_id ||
    (user as any)?.ptk_id ||
    null;

  const { data: myPengawasCbtData, isLoading, refetch } = useQuery<CbtJadwalUjian[]>({
    queryKey: ['my-pengawas-cbt-schedules', effectiveGuruId],
    queryFn: async () => {
      if (!effectiveGuruId) return [];
      const res = await cbtApi.getJadwalList({ limit: 50, guru_id: effectiveGuruId }).catch(() => null);
      const list = res?.items || [];
      return list.filter((item) => {
        const cfg = item.setting_keamanan;
        return Boolean(
          cfg &&
            (cfg.pengawas_1_id === effectiveGuruId ||
              cfg.pengawas_2_id === effectiveGuruId ||
              cfg.proktor_id === effectiveGuruId)
        );
      });
    },
    enabled: Boolean(effectiveGuruId),
    staleTime: 30 * 1000,
  });

  const isPengawasCbt = (myPengawasCbtData?.length ?? 0) > 0;
  const pengawasCbtActiveCount = useMemo(() => {
    if (!myPengawasCbtData) return 0;
    const activeOrDraft = myPengawasCbtData.filter(
      (j) => j.status === 'ACTIVE' || j.status === 'DRAFT' || j.status === 'PAUSED'
    ).length;
    return activeOrDraft > 0 ? activeOrDraft : myPengawasCbtData.length;
  }, [myPengawasCbtData]);

  return {
    isPengawasCbt,
    pengawasCbtActiveCount,
    myPengawasCbtData: myPengawasCbtData || [],
    isLoading,
    refetch,
    effectiveGuruId,
  };
}

export default useMyPengawasCbt;
