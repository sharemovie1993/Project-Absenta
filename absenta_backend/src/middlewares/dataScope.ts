import { RoleName } from '../constants/enums';
import { DataScope } from '../types/fastify';
import { isSystemSuperAdmin } from '../utils/rbac';

export const determineDataScope = () => {
  return async (request: any, reply: any) => {
    const user = request.user;
    if (!user) return;

    // Default scope: Tenant isolation
    const scope: DataScope = {};

    // Determine Tenant Scope
    // Logic similar to isSystemSuperAdmin but populating scope
    const userTenantId = user.tenantId ?? user.tenant_id;
    const systemSuperAdmin = isSystemSuperAdmin(user.roleName, userTenantId);

    if (user.roleName === RoleName.SUPERADMIN || systemSuperAdmin) {
        const skipTenantHeader = request.headers['x-skip-tenant'];
        const skipTenant = typeof skipTenantHeader !== 'undefined' && (
          skipTenantHeader === 'true' || skipTenantHeader === '1' || skipTenantHeader === true
        );

        if (skipTenant) {
          if (!systemSuperAdmin) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'Only SUPERADMIN from system tenant can use X-Skip-Tenant'
            });
          }
          scope.tenantId = undefined;
        } else {
          const headerTenantId = request.headers['x-tenant-id'];
          if (headerTenantId) {
              if (!systemSuperAdmin) {
                const requestedTenantId = String(headerTenantId);
                if (userTenantId && requestedTenantId === userTenantId) {
                  scope.tenantId = userTenantId;
                } else {
                  return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Only SUPERADMIN from system tenant can use X-Tenant-ID'
                  });
                }
              } else {
                scope.tenantId = String(headerTenantId);
              }
          } else if (!systemSuperAdmin && userTenantId) {
              scope.tenantId = userTenantId;
          }
        }
    } else {
        // Non-Superadmin always scoped to their tenant
        scope.tenantId = user.tenantId ?? user.tenant_id;
    }

    // Determine User Scope (Row-Level Security)
    if (user.roleName === RoleName.SISWA) {
      let canViewAll = false;
      const org = request.organizationalScope;
      if (org?.tenant_wide === true) canViewAll = true;
      if (Array.isArray(org?.kelas_ids) && org.kelas_ids.length > 0) canViewAll = true;

      if (!canViewAll) {
        scope.userId = user.id;
      }
    }

    const org = request.organizationalScope;
    if (org) {
      scope.kelasIds = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : undefined;
      scope.unitIds = Array.isArray(org.unit_ids) ? org.unit_ids.map((x: any) => String(x)) : undefined;
      scope.tenantWide = org.tenant_wide === true;
    }

    // Inject scope into request
    request.dataScope = scope;
  };
};
