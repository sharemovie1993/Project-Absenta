import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requestWithFallback } from '../api/apiUtils';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UserAccountItem {
  id: string;
  email: string;
  full_name: string;
  role: {
    id: string;
    name: string;
  };
  status: string;
}

export function useUserListOptions(role?: string, status?: string) {
  const query = useQuery({
    queryKey: ['users-options-list', role, status],
    queryFn: async () => {
      const res = await requestWithFallback<any>('get', '/user', { params: { role, status: status || 'ACTIVE', limit: 300 } });
      const list: UserAccountItem[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((u: UserAccountItem) => ({
      value: u.id,
      label: `${u.full_name || 'User'} (${u.email}) - [${u.role?.name || 'Role'}]`,
      raw: u
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
