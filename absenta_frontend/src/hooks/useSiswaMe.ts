import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSiswaMe, updateSiswaMe, getSiswaById, updateSiswa, siswaQueryKeys } from '@/api/academic/siswa.api';
import { useAuthStore } from '@/store/authStore';
import type { Siswa } from '@/types/academic';

export const SISWA_ME_QUERY_KEY = ['siswa-profile-me'] as const;

/**
 * Hook to fetch logged in student's profile data with smart fallbacks
 */
export function useSiswaMe() {
  const { user } = useAuthStore();
  const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const isSiswaUser = roleName === 'SISWA' || !!user?.siswa_id || !!(user as any)?.siswa_profile;

  const query = useQuery({
    queryKey: [...SISWA_ME_QUERY_KEY, user?.siswa_id, (user as any)?.siswa_profile?.id, user?.id],
    queryFn: async (): Promise<Siswa | null> => {
      // 1. Dedicated endpoint /academic/siswa/me
      try {
        const meRes = await getSiswaMe();
        if (meRes) return meRes;
      } catch {
        // Silent fallback to ID lookup
      }

      // 2. Direct ID getById
      const targetId = user?.siswa_id || (user as any)?.siswa_profile?.id || (user as any)?.siswa?.id;
      if (targetId) {
        try {
          const res = await getSiswaById(targetId);
          if (res) return res;
        } catch {
          // Silent fallback
        }
      }

      // 3. Fallback embedded profile on user
      return (user as any)?.siswa_profile || (user as any)?.siswa || null;
    },
    enabled: !!user && isSiswaUser,
  });

  return {
    siswaProfile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isApiConnected: !query.isError && (!!query.data || !!user),
  };
}

/**
 * Hook to update logged in student's profile data
 */
export function useUpdateSiswaMe() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Partial<Siswa>) => {
      // 1. Try dedicated endpoint /academic/siswa/me
      try {
        const meRes = await updateSiswaMe(data);
        if (meRes?.success) return meRes;
      } catch (err) {
        console.warn('updateSiswaMe failed, falling back to updateSiswa by targetId:', err);
      }

      // 2. Fallback to updateSiswa by ID
      const targetId = user?.siswa_id || (user as any)?.siswa_profile?.id || (user as any)?.siswa?.id;
      if (!targetId) {
        throw new Error('ID siswa tidak ditemukan.');
      }
      return updateSiswa(targetId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: SISWA_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
    },
  });
}
