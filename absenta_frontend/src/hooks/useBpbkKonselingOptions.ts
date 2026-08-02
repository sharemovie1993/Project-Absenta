import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { bpbkApi, type KonselingRecord } from '../api/bpbk.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useBpbkKonselingOptions(siswaId?: string) {
  const query = useQuery({
    queryKey: ['bpbk-konseling-options-list', siswaId],
    queryFn: async () => {
      const res = await bpbkApi.getKonselingList({ limit: 200, siswa_id: siswaId || undefined });
      const list: KonselingRecord[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((k: KonselingRecord) => ({
      value: k.id,
      label: `${k.Siswa?.nama_siswa || 'Siswa'} - [${k.jenis_konseling || 'Konseling'}] (${k.tanggal_konseling ? String(k.tanggal_konseling).split('T')[0] : ''})`,
      raw: k
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
