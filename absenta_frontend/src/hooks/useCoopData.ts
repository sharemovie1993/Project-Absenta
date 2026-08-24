import { useQuery } from '@tanstack/react-query';
import api from '../lib/axiosInstance';
import { COOP_QUERY_KEYS } from '../lib/coopQueryKeys';

export interface CoopProduct {
  id: string;
  code: string;
  name: string;
  price: string | number;
  costPrice: string | number;
  stock: number;
  minStock?: number;
  category: string;
  imageUrl?: string | null;
  unit?: string | null;
  useStock?: boolean;
}

export interface CoopCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  order: number;
}

export interface CoopSupplier {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  totalPurchases?: number;
  totalValue?: number;
  createdAt?: string;
}

/**
 * Hook to fetch cooperative products catalog.
 */
export function useCoopProducts(options?: { enabled?: boolean }) {
  return useQuery<CoopProduct[]>({
    queryKey: COOP_QUERY_KEYS.productsCatalog,
    queryFn: async () => {
      const response = await api.get('/cooperative/toko');
      return (Array.isArray(response.data) ? response.data : []) as CoopProduct[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch cooperative product categories.
 */
export function useCoopCategories(options?: { enabled?: boolean }) {
  return useQuery<CoopCategory[]>({
    queryKey: COOP_QUERY_KEYS.categories,
    queryFn: async () => {
      const response = await api.get('/cooperative/toko/categories');
      return (Array.isArray(response.data) ? response.data : []) as CoopCategory[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch cooperative suppliers list.
 */
export function useCoopSuppliers(options?: { enabled?: boolean }) {
  return useQuery<CoopSupplier[]>({
    queryKey: COOP_QUERY_KEYS.suppliers,
    queryFn: async () => {
      const response = await api.get('/cooperative/suppliers');
      return (Array.isArray(response.data) ? response.data : []) as CoopSupplier[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
