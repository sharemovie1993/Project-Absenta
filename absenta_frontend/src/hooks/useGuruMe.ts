import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guruApi } from '../api/academic.api';
import { useAuthStore } from '../store/authStore';

export const GURU_ME_QUERY_KEY = ['guru-profile-me'] as const;

/**
 * Hook to fetch logged in teacher's profile data with smart fallbacks
 */
export function useGuruMe() {
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: [...GURU_ME_QUERY_KEY, user?.guru_profile?.id, user?.id],
    queryFn: async (): Promise<any | null> => {
      // 1. Dedicated endpoint /academic/guru/me
      try {
        const meRes = await guruApi.getMe();
        if (meRes?.data) return meRes.data;
      } catch (err) {
        console.warn('guruApi.getMe endpoint fallback:', err);
      }

      // 2. Direct ID getById if ID exists
      const targetId = user?.guru_profile?.id || (user as any)?.guru?.id;
      if (targetId) {
        try {
          const res = await guruApi.getById(targetId);
          if (res?.data) return res.data;
        } catch (err) {
          console.warn('guruApi.getById fallback:', err);
        }
      }

      // 3. Fallback embedded profile on user
      return (user as any)?.guru_profile || (user as any)?.guru || null;
    },
    enabled: !!user?.id,
  });

  return {
    guruProfile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isApiConnected: !query.isError && (!!query.data || !!user),
  };
}

/**
 * Hook to update logged in teacher's profile data via dedicated /me endpoint.
 * Guru role always uses PUT /guru/me (exempted from capability check).
 * Does NOT fall back to PUT /:id to avoid triggering organizationalScope
 * middleware and ZodParse that can produce 500 errors for GURU role.
 */
export function useUpdateGuruMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      // Always use the dedicated /me endpoint — it's exempted for GURU role
      const meRes = await guruApi.updateMe(data);
      return meRes;
    },
    onSuccess: () => {
      // Invalidate relevant React Query caches
      queryClient.invalidateQueries({ queryKey: GURU_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['guru-profile-me'] });
      queryClient.invalidateQueries({ queryKey: ['guru-me'] });
      queryClient.invalidateQueries({ queryKey: ['guru-options'] });
      queryClient.invalidateQueries({ queryKey: ['my-tenant'] });
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
    },
  });
}
