import { useQuery } from '@tanstack/react-query';
import { fetchActiveSystemConfig } from '@/services/systemConfig';

export const useSystemConfig = () => {
  const { data: systemConfig, isLoading, error } = useQuery({
    queryKey: ['system-config', 'active', 'public'],
    queryFn: fetchActiveSystemConfig,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { systemConfig, isLoading, error };
};
