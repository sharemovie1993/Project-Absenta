import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { kurikulumApi, StrukturKurikulum } from '../api/kurikulum.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseStrukturKurikulumOptionsParams {
  tahunPelajaranId?: string;
  tingkat?: number;
  jurusanId?: string;
}

export function useStrukturKurikulumOptions(params: UseStrukturKurikulumOptionsParams = {}) {
  const { tahunPelajaranId, tingkat, jurusanId } = params;

  const query = useQuery({
    queryKey: ['struktur-kurikulum-options-list', tahunPelajaranId, tingkat, jurusanId],
    queryFn: async () => {
      const res = await kurikulumApi.getStruktur({
        tahun_pelajaran_id: tahunPelajaranId,
        tingkat,
        jurusan_id: jurusanId,
        limit: 500
      });
      return res.data || (Array.isArray(res) ? res : []);
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList: StrukturKurikulum[] = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const filteredList = useMemo(() => {
    return rawList.filter((s) => {
      if (tahunPelajaranId && s.tahun_pelajaran_id !== tahunPelajaranId) return false;
      if (tingkat !== undefined && Number(s.tingkat) !== Number(tingkat)) return false;
      if (jurusanId && s.jurusan_id !== jurusanId) return false;
      return true;
    });
  }, [rawList, tahunPelajaranId, tingkat, jurusanId]);

  const totalJp = useMemo(() => {
    return filteredList.reduce((acc, item) => acc + (Number(item.jp_per_minggu) || 0), 0);
  }, [filteredList]);

  const mapelMap = useMemo(() => {
    const map: Record<string, StrukturKurikulum> = {};
    filteredList.forEach(item => {
      if (item.mapel_id) {
        map[item.mapel_id] = item;
      }
    });
    return map;
  }, [filteredList]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return filteredList.map((s) => {
      const namaMapel = s.Mapel?.nama_mapel || (s.Mapel as any)?.nama || 'Mata Pelajaran';
      const kodeMapel = s.Mapel?.kode_mapel || (s.Mapel as any)?.kode;
      return {
        value: s.id,
        label: `${namaMapel}${kodeMapel ? ` (${kodeMapel})` : ''} - [${s.jp_per_minggu || 0} JP]`,
        raw: s
      };
    });
  }, [filteredList]);

  return {
    options,
    rawList: filteredList,
    totalJp,
    mapelMap,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
