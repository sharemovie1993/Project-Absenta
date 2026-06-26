import fp from 'fastify-plugin';
import { ModuleCapability } from '../constants/capabilities';
import { getTenantCapabilities } from '../utils/tenant-capabilities';
import { isSystemSuperAdmin } from '../utils/rbac';

// Extend FastifyContextConfig
declare module 'fastify' {
  interface FastifyContextConfig {
    capability?: ModuleCapability;
  }
}

export const capabilityGuard = fp(async (fastify: any) => {
  fastify.addHook('preHandler', async (req: any, reply: any) => {
    const config = req.routeOptions.config;

    // 1. Skip if route does not require specific capability or is public
    if (!config?.capability || config?.public || config?.skipAuth) {
      return;
    }


    // 2. Skip if capability is CORE (always allowed)
    if (config.capability === ModuleCapability.CORE) {
      return;
    }

    // 3. Ensure user is authenticated and tenant context exists
    // Note: Auth middleware usually runs before this check if registered correctly.
    // However, if we are in a global hook, we need to be careful about order.
    // Assuming auth middleware populates req.user.
    
    const user = req.user;
    const roleName = user?.roleName || user?.Role?.name || user?.role?.name;
    const userTenantId = user?.tenantId || user?.tenant_id;
    const tenantId = req.tenantId || userTenantId;

    if (isSystemSuperAdmin(roleName, userTenantId ?? null)) {
      return;
    }

    if (!tenantId) {
      req.log.warn({
        event: 'GUARD_TENANT_MISSING',
        path: req.url,
        role: roleName,
        userTenantId,
        headerTenantId: req.tenantId
      }, `[GUARD DEBUG] Tenant ID missing for capability-protected route! Path: ${req.url}`);
      return reply.code(401).send({
        code: 'UNAUTHORIZED',
        message: 'Tenant context required for this resource'
      });
    }



    // 4. Check Tenant Capabilities
    try {
      // TODO: Implement caching for performance
      const capabilities = await getTenantCapabilities(tenantId);
      
      if (!capabilities.includes(config.capability)) {
        // ALLOW trial mode access for ABSENSI, KOPERASI, HUBIN, and SARPRAS
        const trialAllowedModules = ['ABSENSI', 'KOPERASI', 'HUBIN', 'SARPRAS'];
        if (trialAllowedModules.includes(config.capability)) {
          return; // Proceed to endpoint
        }

        return reply.code(403).send({
          code: 'FORBIDDEN_CAPABILITY',
          message: `Tenant does not have access to module: ${config.capability}`,
          required: config.capability,
          available: capabilities
        });
      }
    } catch (error) {
      req.log.error(error, 'Capability check failed');
      return reply.code(500).send({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify tenant capabilities'
      });
    }
  });
});
