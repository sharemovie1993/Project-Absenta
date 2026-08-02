import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requestWithFallback } from '../api/apiUtils';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface P5Project {
  id: string;
  title: string;
  theme: string;
  description?: string;
  targetDimension?: string[];
}

export function useP5ProjectOptions(kelasId?: string) {
  const query = useQuery({
    queryKey: ['rapor-p5-project-options-list', kelasId],
    queryFn: async () => {
      const res = await requestWithFallback<any>('get', '/rapor/p5/projects', { params: { kelas_id: kelasId } });
      const list: P5Project[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((p: P5Project) => ({
      value: p.id,
      label: `[P5] ${p.title} - Theme: ${p.theme}`,
      raw: p
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
