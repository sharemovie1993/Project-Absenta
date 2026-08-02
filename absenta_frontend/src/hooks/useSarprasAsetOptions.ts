import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { sarprasApi, type Asset } from '../api/sarpras.api';
import type { SearchableSelectOption } from '../components/ui/SearchableSelect';

export interface UseSarprasAsetOptionsParams {
  categoryId?: string;
  isLoanable?: boolean;
  kondisi?: string;
}

export function useSarprasAsetOptions(params?: UseSarprasAsetOptionsParams) {
  const categoryId = params?.categoryId;
  const isLoanable = params?.isLoanable;
  const kondisi = params?.kondisi;

  const query = useQuery({
    queryKey: ['sarpras-assets-options-list', categoryId, isLoanable, kondisi],
    queryFn: async () => {
      const res = await sarprasApi.getAssets({
        limit: 200,
        category_id: categoryId || undefined,
        kondisi: kondisi || undefined
      });
      const list: Asset[] = res.data?.list || res.data || (Array.isArray(res) ? res : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawList = useMemo(() => {
    let list = query.data || [];
    if (typeof isLoanable === 'boolean') {
      list = list.filter((a: Asset) => a.is_loanable === isLoanable);
    }
    return list;
  }, [query.data, isLoanable]);

  const options: SearchableSelectOption[] = useMemo(() => {
    return rawList.map((a: Asset) => ({
      value: a.id,
      label: `${a.nama}${a.kode ? ` (${a.kode})` : ''} - [Stok: ${a.jumlah}]`,
      raw: a
    }));
  }, [rawList]);

  return {
    options,
    rawList,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
