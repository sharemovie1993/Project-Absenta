import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getWaliKelasStrukturList } from '../api/kurikulum/waliKelas.api';
import type { WaliKelasStrukturAssignment } from '../types/academic';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseWaliKelasOptionsParams {
  onlyActive?: boolean;
  valueKey?: 'guru_id' | 'kelas_id' | 'assignment_id';
  tahunPelajaranId?: string;
  enabled?: boolean;
}

export function useWaliKelasOptions(params: UseWaliKelasOptionsParams = {}) {
  const { onlyActive = true, valueKey = 'guru_id', tahunPelajaranId, enabled = true } = params;

  const query = useQuery({
    queryKey: ['wali-kelas-options-list', onlyActive, tahunPelajaranId],
    queryFn: () =>
      getWaliKelasStrukturList(1, 1000, '', {
        include_inactive: !onlyActive,
        tahun_pelajaran_id: tahunPelajaranId,
      }).catch(() => ({ data: [] as any })),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const rawList: WaliKelasStrukturAssignment[] = useMemo(() => {
    const list = query.data?.data || [];
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => ({
      ...item,
      kelas_id: item.kelas_id || item.StrukturOrganisasi?.kelas_id || item.Kelas?.id || item.StrukturOrganisasi?.Kelas?.id,
      Kelas: item.Kelas || item.StrukturOrganisasi?.Kelas,
    }));
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((item) => {
      const namaGuru = item.Guru?.nama_guru || (item.User?.Guru?.nama_guru) || 'Guru';
      const nip = item.Guru?.nip || item.User?.Guru?.nip;
      const nipLabel = nip ? ` (NIP: ${nip})` : '';
      const namaKelas = item.Kelas?.nama_kelas || item.StrukturOrganisasi?.Kelas?.nama_kelas || 'Kelas';

      let optionValue = item.guru_id;
      if (valueKey === 'kelas_id') {
        optionValue = item.kelas_id || item.StrukturOrganisasi?.kelas_id;
      } else if (valueKey === 'assignment_id') {
        optionValue = item.id;
      }

      return {
        value: optionValue,
        label: `${namaGuru}${nipLabel} - [Wali Kelas ${namaKelas}]`,
        raw: item
      };
    });
  }, [rawList, valueKey]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
