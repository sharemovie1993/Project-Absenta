import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { guruApi } from '../api/academic.api';
import type { Guru } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useWaliKelasOptions() {
  const query = useQuery({
    queryKey: ['wali-kelas-options-list'],
    queryFn: () => guruApi.getAll({ limit: 1000, jenis_ptk: 'PENDIDIK' }),
    staleTime: 5 * 60 * 1000,
  });

  const rawList: Guru[] = useMemo(() => {
    return query.data?.data || (Array.isArray(query.data) ? (query.data as unknown as Guru[]) : []);
  }, [query.data]);

  const filteredList = useMemo(() => {
    return rawList.filter((g) => {
      // Filter teachers assigned as Wali Kelas
      const hasWali = Boolean(g.wali_kelas_di?.nama_kelas || (g.WaliKelas && g.WaliKelas.length > 0));
      return hasWali;
    });
  }, [rawList]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return filteredList.map((g) => {
      const namaKelas = g.wali_kelas_di?.nama_kelas || (g.WaliKelas?.[0] as any)?.Kelas?.nama_kelas || 'Wali Kelas';
      return {
        value: g.id,
        label: `${g.nama_guru}${g.nip ? ` (NIP: ${g.nip})` : ''} - [Wali Kelas: ${namaKelas}]`,
        raw: g
      };
    });
  }, [filteredList]);

  return {
    options,
    rawList: filteredList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
