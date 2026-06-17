type RoleLike = string | { id: string; name: string };
type UserLike = { role?: { name?: string } | string; tenant_id?: string };

function normalizeRole(role?: RoleLike): string | undefined {
  if (!role) return undefined;
  if (typeof role === 'string') return role;
  return role.name;
}

export function isSystemSuperAdmin(role?: RoleLike, tenantId?: string) {
  const roleName = normalizeRole(role);
  const normalizedTenant = (tenantId ?? '').trim().toLowerCase();
  const isPlatformRole = roleName === 'SUPERADMIN' || (roleName ?? '').startsWith('PLATFORM_');
  return isPlatformRole && (normalizedTenant === '' || normalizedTenant === 'system');
}

export function isPlatformUser(role?: RoleLike, tenantId?: string) {
  const roleName = normalizeRole(role);
  const normalizedTenant = (tenantId ?? '').trim().toLowerCase();
  const platformRoles = ['SUPERADMIN', 'PLATFORM_FINANCE', 'PLATFORM_SUPPORT', 'PLATFORM_INFRASTRUCTURE'];
  return platformRoles.includes(String(roleName)) && (normalizedTenant === '' || normalizedTenant === 'system');
}

export function isPlatformFinance(role?: RoleLike, tenantId?: string) {
  const roleName = normalizeRole(role);
  const normalizedTenant = (tenantId ?? '').trim().toLowerCase();
  return roleName === 'PLATFORM_FINANCE' && normalizedTenant === 'system';
}

export function isPlatformSupport(role?: RoleLike, tenantId?: string) {
  const roleName = normalizeRole(role);
  const normalizedTenant = (tenantId ?? '').trim().toLowerCase();
  return roleName === 'PLATFORM_SUPPORT' && normalizedTenant === 'system';
}

export function isPlatformInfrastructure(role?: RoleLike, tenantId?: string) {
  const roleName = normalizeRole(role);
  const normalizedTenant = (tenantId ?? '').trim().toLowerCase();
  return roleName === 'PLATFORM_INFRASTRUCTURE' && normalizedTenant === 'system';
}

export function extractRoleAndTenant(user: unknown) {
  const u = user as UserLike | undefined;
  const role = (u?.role && typeof u.role === 'object' ? u.role.name : u?.role) as RoleLike | undefined;
  const tenantId = u?.tenant_id as string | undefined;
  return { role, tenantId };
}

export function getTenantScope(role?: RoleLike, tenantId?: string) {
  return isPlatformUser(role, tenantId) ? undefined : tenantId;
}

export function shouldSkipTenantHeader(role?: RoleLike, tenantId?: string) {
  return isPlatformUser(role, tenantId);
}

export function canManagePlans(role?: RoleLike, tenantId?: string) {
  return isSystemSuperAdmin(role, tenantId) || isPlatformFinance(role, tenantId);
}

export function canManageBilling(role?: RoleLike, tenantId?: string) {
  const roleName = normalizeRole(role);
  return isSystemSuperAdmin(role, tenantId) || isPlatformFinance(role, tenantId) || roleName === 'ADMIN';
}

export function canViewPayments(role?: RoleLike, tenantId?: string) {
  const roleName = normalizeRole(role);
  return isSystemSuperAdmin(role, tenantId) || isPlatformFinance(role, tenantId) || ['ADMIN', 'GURU', 'SISWA'].includes(String(roleName));
}
