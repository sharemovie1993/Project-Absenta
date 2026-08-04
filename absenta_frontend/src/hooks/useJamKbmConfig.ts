import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getTenantById, type ShiftJamPelajaranConfig } from '../api/tenants.api';

export function useJamKbmConfig() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['my-tenant-jam-kbm', user?.tenant_id],
    queryFn: () => (user?.tenant_id ? getTenantById(user.tenant_id).catch(() => null) : null),
    enabled: !!user?.tenant_id,
    staleTime: 10 * 60 * 1000,
  });

  const tenant = query.data?.data || null;
  const shiftJamPelajaran = (tenant?.shift_jam_pelajaran as ShiftJamPelajaranConfig) || null;
  const shifts = shiftJamPelajaran?.shifts || [];
  const classAssignments = shiftJamPelajaran?.class_assignments || {};

  return {
    ...query,
    tenant,
    shiftJamPelajaran,
    shifts,
    classAssignments,
    hasConfiguredShifts: shifts.length > 0 && (shifts[0]?.slots?.length ?? 0) > 0,
  };
}
