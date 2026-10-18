import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 menit: cegah refetch berulang saat berpindah-pindah menu
      gcTime: 10 * 60 * 1000, // 10 menit: simpan data di memori agar transisi navigasi instan
    },
  },
});

