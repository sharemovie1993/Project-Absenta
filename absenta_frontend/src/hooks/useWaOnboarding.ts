import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWaOnboardingUsers,
  sendWaGreeting,
  sendWaGreetingBulk,
  type WaOnboardingUser,
  type WaOnboardingSummary,
} from '@/api/whatsapp.api';
import { toast } from 'sonner';

export type RoleFilterType =
  | 'ALL'
  | 'GURU'
  | 'SISWA'
  | 'ORTU'
  | 'KEPALA_SEKOLAH'
  | 'WALIKELAS'
  | 'PETUGAS_KELAS'
  | 'PETUGAS_GERBANG'
  | 'KAPROG'
  | 'WAKA'
  | 'TOOLMAN'
  | 'TU'
  | 'BPBK'
  | 'KOPERASI';

export type StatusFilterType = 'ALL' | 'BELUM' | 'SUDAH';

export interface UseWaOnboardingParams {
  role: RoleFilterType;
  status: StatusFilterType;
  search: string;
  page: number;
  limit?: number;
}

export function useWaOnboarding(params: UseWaOnboardingParams) {
  const { role, status, search, page, limit = 20 } = params;
  const queryClient = useQueryClient();

  // Query Key for cache identification
  const queryKey = ['wa-onboarding-users', role, status, search, page, limit];

  // Fetch Onboarding Users & Stats
  const usersQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await getWaOnboardingUsers({
        role,
        status,
        search,
        page,
        limit,
      });
      return res;
    },
    staleTime: 60 * 1000, // 1 minute fresh cache
  });

  // Mutation: Send Single Greeting
  const sendSingleMutation = useMutation({
    mutationFn: async (payload: {
      userType: 'GURU' | 'SISWA' | 'ORTU';
      nama: string;
      no_hp: string;
      detailInfo?: string;
      customMessage?: string;
    }) => {
      return await sendWaGreeting(payload);
    },
    onSuccess: (res, variables) => {
      if (res.success) {
        toast.success(`Pesan sapaan berhasil dijadwalkan ke ${variables.nama}`);
        // Invalidate cache to immediately reflect communication status update
        queryClient.invalidateQueries({ queryKey: ['wa-onboarding-users'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengirim pesan sapaan WA.');
    },
  });

  // Mutation: Send Bulk Greeting
  const sendBulkMutation = useMutation({
    mutationFn: async (payload: { role: string; search: string }) => {
      return await sendWaGreetingBulk(payload);
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message);
        // Invalidate cache to refresh list & stats after bulk sapa
        queryClient.invalidateQueries({ queryKey: ['wa-onboarding-users'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengirim pesan sapaan masal WA.');
    },
  });

  const users: WaOnboardingUser[] = usersQuery.data?.data || [];
  const summary: WaOnboardingSummary = usersQuery.data?.summary || {
    totalTotal: 0,
    totalGuru: 0,
    totalSiswa: 0,
    totalOrtu: 0,
    totalBelum: 0,
    totalSudah: 0,
  };
  const pagination = usersQuery.data?.pagination || { page: 1, limit, total: 0, totalPages: 1 };

  return {
    users,
    summary,
    pagination,
    isLoading: usersQuery.isLoading,
    isRefetching: usersQuery.isRefetching,
    refetch: usersQuery.refetch,
    sendSingle: sendSingleMutation.mutateAsync,
    isSendingSingle: sendSingleMutation.isPending,
    sendBulk: sendBulkMutation.mutateAsync,
    isSendingBulk: sendBulkMutation.isPending,
  };
}
