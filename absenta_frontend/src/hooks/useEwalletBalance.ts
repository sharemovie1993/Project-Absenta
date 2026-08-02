import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requestWithFallback } from '../api/apiUtils';

export interface EwalletData {
  balance: number;
  memberId: string;
  rfidCardNumber?: string;
  transactions?: any[];
}

export function useEwalletBalance(memberId?: string) {
  const query = useQuery({
    queryKey: ['ewallet-balance-member', memberId],
    queryFn: async () => {
      if (!memberId) return { balance: 0, memberId: '' };
      const res = await requestWithFallback<any>('get', `/cooperative/toko/ewallet/balance/${memberId}`);
      return (res.data as EwalletData) || { balance: res.data?.balance || 0, memberId };
    },
    enabled: !!memberId,
    staleTime: 2 * 60 * 1000,
  });

  const balance = useMemo(() => {
    return query.data?.balance || 0;
  }, [query.data]);

  return {
    balance,
    data: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
