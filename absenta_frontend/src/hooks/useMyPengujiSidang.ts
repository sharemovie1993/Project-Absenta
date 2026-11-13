import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { hubinApi } from '@/api/hubin.api';

export function useMyPengujiSidang() {
  const user = useAuthStore((state) => state.user);
  const effectiveGuruId =
    user?.guru_profile?.id ||
    (user as any)?.guru_id ||
    (user as any)?.ptk_id ||
    user?.id ||
    null;

  const { data: mySidangData, isLoading, refetch } = useQuery({
    queryKey: ['my-penguji-sidang-students', effectiveGuruId],
    queryFn: async () => {
      if (!effectiveGuruId) return [];
      const res = await hubinApi
        .getRekapPklSiswa({
          status: 'ELIGIBLE',
        })
        .catch(() => null);
      const list: any[] = Array.isArray(res) ? res : res?.data?.list || res?.data || [];
      return list.filter((item: any) => {
        const pId = item.nilai_json?.penguji_id;
        // KETAT: Sub-tab Sidang PKL HANYA muncul untuk guru yang BENAR-BENAR terdaftar di ploting penguji (penguji_id).
        return Boolean(pId && pId === effectiveGuruId);
      });
    },
    enabled: Boolean(effectiveGuruId),
    staleTime: 60 * 1000,
  });

  const isPengujiSidang = (mySidangData?.length ?? 0) > 0;
  const pengujiSidangUnexaminedCount = useMemo(() => {
    if (!mySidangData) return 0;
    return mySidangData.filter((item: any) => {
      const n = item.nilai_json?.nilai_sidang;
      return n === null || n === undefined || n === '' || Number(n) === 0;
    }).length;
  }, [mySidangData]);

  return {
    isPengujiSidang,
    pengujiSidangUnexaminedCount,
    mySidangData: mySidangData || [],
    isLoading,
    refetch,
    effectiveGuruId,
  };
}

export default useMyPengujiSidang;
