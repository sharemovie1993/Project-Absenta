import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { requestWithFallback } from '../api/apiUtils';
import { COOP_QUERY_KEYS } from '../lib/coopQueryKeys';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface KoperasiProduct {
  id: string;
  name: string;
  code?: string;
  price: number;
  stock: number;
  category?: string;
}

export function useKoperasiProductOptions(search?: string) {
  const query = useQuery({
    queryKey: COOP_QUERY_KEYS.productOptions(search),
    queryFn: async () => {
      const res = await requestWithFallback<any>('get', '/cooperative/toko/products', { params: { search } });
      const list: KoperasiProduct[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    return query.data || [];
  }, [query.data]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((p: KoperasiProduct) => ({
      value: p.id,
      label: `${p.name}${p.code ? ` (${p.code})` : ''} - Rp${(p.price || 0).toLocaleString('id-ID')} [Stok: ${p.stock}]`,
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
