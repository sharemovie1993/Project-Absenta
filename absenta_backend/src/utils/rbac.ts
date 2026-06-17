import { RoleName } from '../constants/enums';

/**
 * Returns true only for SUPERADMIN belonging to the 'system' tenant.
 * This is the sole case allowed to have global, cross-tenant access.
 */
export function isSystemSuperAdmin(roleName?: RoleName | string, tenantId?: string | null): boolean {
  if (!roleName) return false;
  const role = String(roleName).toUpperCase();
  // Treat SUPERADMIN and all platform subroles (PLATFORM_*) with tenantId 'system' or null as system-level
  const isPlatformRole = role === RoleName.SUPERADMIN || role.startsWith('PLATFORM_');
  if (!isPlatformRole) return false;
  if (tenantId === null || typeof tenantId === 'undefined') return true;
  const t = typeof tenantId === 'string' ? tenantId.toLowerCase() : '';
  return t === 'system';
}

/**
 * Helper to decide tenant filter: returns undefined for global if system superadmin; otherwise the given tenantId.
 */
export function resolveTenantScope(roleName?: RoleName | string, tenantId?: string | null): string | undefined {
  return isSystemSuperAdmin(roleName, tenantId) ? undefined : (tenantId ?? undefined);
}

