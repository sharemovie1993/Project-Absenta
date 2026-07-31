import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getMyTenant, updateTenant, Tenant } from '../api/tenants.api';

export function useTenantSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenant_id;

  const query = useQuery({
    queryKey: ['tenant-settings-profile', tenantId],
    queryFn: async () => {
      const res = await getMyTenant();
      return res.data;
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10-minute cache for tenant settings
  });

  const tenant: Tenant | null = useMemo(() => query.data || null, [query.data]);

  // Derived Kop Surat / Letterhead lines
  const printHeader = useMemo(() => {
    if (!tenant) return { lines: [], sekolah: '', logo: '', logoDaerah: '' };
    
    const lines = tenant.print_header_lines || [
      (tenant as any).nama_dinas_atas || 'PEMERINTAH PROVINSI / KABUPATEN',
      (tenant as any).nama_dinas_bawah || 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
      tenant.name || 'NAMA SEKOLAH',
      `${tenant.address || ''}${tenant.phone ? ` Telp: ${tenant.phone}` : ''}${tenant.email ? ` Email: ${tenant.email}` : ''}`
    ];

    return {
      lines,
      sekolah: tenant.name || '',
      logo: tenant.logo_url || '',
      logoDaerah: tenant.logo_daerah_url || '',
    };
  }, [tenant]);

  // Derived shift slots for KBM
  const shiftSlots = useMemo(() => {
    const rawShifts = tenant?.shift_jam_pelajaran?.shifts?.[0]?.slots || [];
    const mapped: Record<number, { start: string; end: string }> = {};
    for (const s of rawShifts) {
      mapped[s.slot] = { start: s.start, end: s.end };
    }
    return mapped;
  }, [tenant]);

  // Mutation to update tenant profile
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Tenant>) => {
      if (!tenantId) throw new Error('Tenant ID tidak ditemukan');
      return updateTenant(tenantId, data as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings-profile', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-profile-jenjang', tenantId] });
    },
  });

  const updateSettings = useCallback((data: Partial<Tenant>) => {
    return updateMutation.mutateAsync(data);
  }, [updateMutation]);

  return {
    tenant,
    tenantId,
    printHeader,
    shiftSlots,
    absensiMode: tenant?.absensi_mode || 'SIMPLE',
    isMultiShift: tenant?.absensi_mode === 'MULTI_SESI',
    isLoading: query.isLoading,
    isUpdating: updateMutation.isPending,
    updateSettings,
    refetch: query.refetch
  };
}
