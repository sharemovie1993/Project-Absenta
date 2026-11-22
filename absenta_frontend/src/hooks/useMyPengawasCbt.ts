import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { cbtApi } from '@/api/cbt.api';
import type { CbtJadwalUjian } from '@/types/cbt.types';

export function useMyPengawasCbt(overrideGuruId?: string) {
  const user = useAuthStore((state) => state.user);
  const rawRole = String(
    user?.role?.name ||
      (typeof user?.role === 'string' ? user.role : (user as any)?.roleName) ||
      ''
  ).toUpperCase();
  const isSiswa = rawRole === 'SISWA';

  const effectiveGuruId = isSiswa
    ? null
    : (overrideGuruId ||
      user?.guru_profile?.id ||
      (user as any)?.guru_id ||
      (user as any)?.ptk_id ||
      user?.id ||
      null);

  const { data: myPengawasCbtData, isLoading, refetch } = useQuery<CbtJadwalUjian[]>({
    queryKey: ['my-pengawas-cbt-schedules', effectiveGuruId],
    queryFn: async () => {
      if (!effectiveGuruId || isSiswa) return [];
      // Prioritaskan pengawas_guru_id langsung di query backend
      const res = await cbtApi
        .getJadwalList({ limit: 500, pengawas_guru_id: effectiveGuruId })
        .catch(() => null);
      let list = res?.items || [];

      // Fallback jika backend versi lama belum memfilter pengawas_guru_id
      if (list.length === 0) {
        const fallbackRes = await cbtApi
          .getJadwalList({ limit: 500, guru_id: effectiveGuruId })
          .catch(() => null);
        list = fallbackRes?.items || [];
      }

      return list.filter((item) => {
        const rawCfg = item.setting_keamanan;
        const cfg = typeof rawCfg === 'string' ? JSON.parse(rawCfg) : rawCfg;

        // ── Meja Pengawas murni untuk tugas pengawasan orkestrasi panitia ──
        // Sesi remedial & susulan mandiri guru mapel TIDAK dimasukkan ke Meja Pengawas
        const isRemedial = Boolean(
          cfg?.is_remedial ||
          item.nama_sesi?.toUpperCase()?.includes('REMEDIAL') ||
          item.nama_sesi?.toUpperCase()?.includes('SUSULAN')
        );
        if (isRemedial) return false;

        return Boolean(
          cfg &&
            (cfg.pengawas_1_id === effectiveGuruId ||
              cfg.pengawas_2_id === effectiveGuruId ||
              cfg.proktor_id === effectiveGuruId)
        );
      });
    },
    enabled: Boolean(effectiveGuruId) && !isSiswa,
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
