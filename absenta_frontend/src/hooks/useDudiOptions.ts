import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { hubinApi, type MitraIndustri } from '../api/hubin.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useDudiOptions(search?: string) {
  const query = useQuery({
    queryKey: ['hubin-dudi-options-list', search],
    queryFn: async () => {
      const res = await hubinApi.getMitra({ limit: 200, search: search || undefined });
      const list: MitraIndustri[] = Array.isArray(res.data) 
        ? res.data 
        : res.data?.list || res.data?.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 10 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((m: MitraIndustri) => {
      const terisi = m._count?.SiswaPkl ?? 0;
      const kuota = m.kuota_pkl ?? 0;
      let slotText = '';
      if (kuota > 0) {
        if (terisi >= kuota) {
          slotText = ` • [PENUH: ${terisi}/${kuota}]`;
        } else {
          slotText = ` • (Sisa ${kuota - terisi}/${kuota} slot)`;
        }
      } else if (terisi > 0) {
        slotText = ` • (${terisi} siswa aktif)`;
      }

      return {
        value: m.id,
        label: `${m.nama}${m.bidang ? ` (${m.bidang})` : ''}${slotText}`,
        raw: {
          ...m,
          terisi,
          kuota,
          sisa: Math.max(0, kuota - terisi),
          isPenuh: kuota > 0 && terisi >= kuota,
        }
      };
    });
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
