import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { sarprasApi } from '../api/sarpras.api';

export interface UseSarprasLoansParams {
  status?: string;
  peminjamId?: string;
  page?: number;
  limit?: number;
}

export function useSarprasLoans(params?: UseSarprasLoansParams) {
  const status = params?.status;
  const peminjamId = params?.peminjamId;
  const page = params?.page || 1;
  const limit = params?.limit || 10;

  const query = useQuery({
    queryKey: ['sarpras-loans-list', status, peminjamId, page, limit],
    queryFn: async () => {
      const res = await sarprasApi.getLoans({
        status: status || undefined,
        peminjam_id: peminjamId || undefined,
        page,
        limit
      });
      return res.data || { list: [], pagination: { total: 0, page: 1, limit: 10 } };
    },
    staleTime: 2 * 60 * 1000,
  });

  const loans = useMemo(() => {
    return query.data?.list || [];
  }, [query.data]);

  const pagination = useMemo(() => {
    return query.data?.pagination || { total: 0, page, limit, totalPages: 1 };
  }, [query.data, page, limit]);

  return {
    loans,
    pagination,
    total: pagination.total,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
