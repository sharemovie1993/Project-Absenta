import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { isSystemSuperAdmin } from '@/utils/rbac';

interface RoleSwitchProps {
  superadmin: React.ReactElement;
  admin?: React.ReactElement;
  guru?: React.ReactElement;
  siswa?: React.ReactElement;
  fallback?: React.ReactElement | null;
}

import { Loader } from '../ui/Loader';

/**
 * Render elemen berbeda berdasarkan peran user saat ini.
 * - SUPERADMIN (system-level) -> render `superadmin`
 * - ADMIN -> render `admin`
 * - GURU -> render `guru` (jika ada)
 * - SISWA -> render `siswa` (jika ada)
 * - Lainnya -> render `fallback` jika ada
 */
export function RoleSwitch({ superadmin, admin, guru, siswa, fallback = null }: RoleSwitchProps) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <Loader size="sm" />;
  }

  // Handle both object and string role formats
  const roleName = typeof user?.role === 'string' 
    ? user.role 
    : user?.role?.name;
  const tenantId = (user as any)?.tenant_id;
  const isSuper = isSystemSuperAdmin(roleName, tenantId);

  if (isSuper) return superadmin;
  if (roleName === 'ADMIN' && admin) return admin;
  if (roleName === 'GURU' && guru) return guru;
  if (roleName === 'SISWA' && siswa) return siswa;
  return fallback;
}

export default RoleSwitch;
