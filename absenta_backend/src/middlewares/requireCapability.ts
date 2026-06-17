import { authorizationService } from '@/modules/auth/services/authorization.service';
import { RoleName } from '../constants/enums';

interface RequireCapabilityOptions {
  checkGuruOnly?: boolean; // Legacy option
  exemptRoles?: RoleName[]; // Roles that skip this check (e.g. SISWA for self-view)
}

export const requireCapability = (capabilityOrCapabilities: string | string[], options: RequireCapabilityOptions = {}) => {
  return async (request: any, reply: any) => {
    const user = (request as any).user;
    if (!user) {
      request.log.warn({
        event: 'REQUIRE_CAP_USER_MISSING',
        path: request.url,
        ip: request.ip
      }, `[REQUIRE_CAP_DEBUG] User object missing from request! Path: ${request.url}`);
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }



    const userId = (user as any).id ?? (user as any).userId ?? (user as any).user_id;
    const roleName = user.roleName || user.Role?.name || user.role?.name;
    const tenantId = (request as any).tenantId || (user as any).tenantId || (user as any).tenant_id;
    const endpoint = String((request as any).url || '').split('?')[0];

    const capabilities = Array.isArray(capabilityOrCapabilities) ? capabilityOrCapabilities : [capabilityOrCapabilities];

    // Superadmin bypass (System Owner - Operator Platform)
    // Kecuali untuk modul keuangan/koperasi (agar Superadmin tidak mencampuri urusan keuangan)
    if (roleName === RoleName.SUPERADMIN) {
        const hasCoopCapability = capabilities.some(cap => cap.startsWith('cooperative.'));
        if (!hasCoopCapability) {
            return;
        }
    }

    // Check Exempt Roles
    if (options.exemptRoles && options.exemptRoles.includes(roleName as RoleName)) {
        return;
    }

    const res = await authorizationService.isUserAuthorized(String(userId), capabilities, { user });
    if (res.allowed) return;

    console.warn(`[AUTH] Access Denied (403) | User: ${user.email} | Role: ${roleName} | Missing Caps: ${capabilities.join(', ')}`);
    try {
      console.warn(JSON.stringify({
        event: 'CAPABILITY_ACCESS_DENIED',
        tenantId: tenantId ?? null,
        userId: userId ?? null,
        capability: capabilities.join(', '),
        endpoint,
        timestamp: new Date().toISOString()
      }));
    } catch {}
    return reply.status(403).send({ 
        error: 'CAPABILITY_ACCESS_DENIED',
        code: 'FORBIDDEN',
        message:
          roleName === RoleName.ADMIN
            ? res.reason === 'ADMIN_DENIED_CAPABILITY'
              ? `Forbidden: Admin restricted from capability: ${capabilities.join(', ')}`
              : `Forbidden: Admin missing required capability: ${capabilities.join(', ')}`
            : `Forbidden: Missing required capability. Required one of: ${capabilities.join(', ')}`
    });
  };
};
