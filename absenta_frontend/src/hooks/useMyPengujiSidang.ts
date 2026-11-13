import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { hubinApi } from '@/api/hubin.api';

export const SIDANG_SYNC_CHANNEL = 'absenta-sidang-sync';
export const SIDANG_SYNC_STORAGE_KEY = 'absenta_last_sidang_ploting_sync';

/**
 * 📡 Utility broadcast lintas-tab & lintas-komponen agar perubahan ploting sidang instan
 */
export const notifySidangPlotingUpdated = () => {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(SIDANG_SYNC_CHANNEL);
      bc.postMessage({ type: 'PKL_PLOTING_UPDATED', timestamp: Date.now() });
      bc.close();
    }
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SIDANG_SYNC_STORAGE_KEY, String(Date.now()));
    }
  } catch (_) {}
};

export function useMyPengujiSidang() {
  const queryClient = useQueryClient();
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
    staleTime: 5 * 1000, // ⚡ 5 detik: Sangat responsif terhadap perubahan ploting
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 15 * 1000, // Polling ringan 15s jika aplikasi sedang dibuka di HP
  });

  // 🔔 Dengarkan Notifikasi Lintas-Tab / Lintas-Komponen saat Ploting Berubah
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel(SIDANG_SYNC_CHANNEL);
        bc.onmessage = (event) => {
          if (event.data?.type === 'PKL_PLOTING_UPDATED') {
            queryClient.invalidateQueries({ queryKey: ['my-penguji-sidang-students'] });
            refetch();
          }
        };
      }
    } catch (_) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === SIDANG_SYNC_STORAGE_KEY) {
        queryClient.invalidateQueries({ queryKey: ['my-penguji-sidang-students'] });
        refetch();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [refetch, queryClient]);

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
