import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requestWithFallback } from '../api/apiUtils';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface KoperasiMember {
  id: string;
  name: string;
  memberNo?: string;
  type?: 'SISWA' | 'GURU' | 'STAFF' | 'UMUM';
}

export function useKoperasiMemberOptions(search?: string) {
  const query = useQuery({
    queryKey: ['koperasi-members-options-list', search],
    queryFn: async () => {
      const res = await requestWithFallback<any>('get', '/cooperative/members', { params: { search } });
      const list: KoperasiMember[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((m: KoperasiMember) => ({
      value: m.id,
      label: `${m.name}${m.memberNo ? ` (${m.memberNo})` : ''} - [${m.type || 'Anggota'}]`,
      raw: m
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
