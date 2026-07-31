import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getRoles, RoleItem } from '../api/user.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export function useRoleOptions() {
  const query = useQuery({
    queryKey: ['role-options-list'],
    queryFn: async () => {
      const res = await getRoles();
      return res.data || (Array.isArray(res) ? res : []);
    },
    staleTime: 10 * 60 * 1000,
  });

  const rawList: RoleItem[] = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((r) => ({
      value: r.id || r.name,
      label: `${r.display_name || r.name}${r.description ? ` - ${r.description}` : ''}`,
      raw: r
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
