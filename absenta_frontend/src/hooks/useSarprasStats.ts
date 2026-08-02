import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { sarprasApi, type SarprasStats } from '../api/sarpras.api';

export function useSarprasStats() {
  const query = useQuery({
    queryKey: ['sarpras-stats'],
    queryFn: async () => {
      const res = await sarprasApi.getStats();
      return (res.data as SarprasStats) || {
        totalAssets: 0,
        totalLoaned: 0,
        totalBroken: 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats: SarprasStats = useMemo(() => {
    return query.data || {
      totalAssets: 0,
      totalLoaned: 0,
      totalBroken: 0
    };
  }, [query.data]);

  return {
    stats,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
