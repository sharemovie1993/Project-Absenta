import { presenceService } from './presence.service';
import { isSystemSuperAdmin } from '@/utils/rbac';

export const presenceRoutes = async (fastify: any) => {
  /**
   * GET /api/presence/active-users
   * Returns realtime active users summary for current tenant (or global for superadmin with query all=true)
   */
  fastify.get('/active-users', async (request: any, reply: any) => {
    try {
      const tenantId = request.tenantId || request.user?.tenantId || request.user?.tenant_id;
      const user = request.user || {};
      const isSuper = isSystemSuperAdmin(user.roleName, tenantId);

      const queryAll = request.query?.all === 'true' || request.query?.all === true;

      if (isSuper && queryAll) {
        const globalSummary = presenceService.getGlobalSummary();
        return reply.status(200).send({
          success: true,
          data: globalSummary
        });
      }

      if (!tenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant ID required'
        });
      }

      const summary = presenceService.getTenantSummary(String(tenantId));
      return reply.status(200).send({
        success: true,
        data: summary
      });
    } catch (err: any) {
      request.log.error(err, '[Presence API] Failed to get active users');
      return reply.status(500).send({
        success: false,
        message: err.message || 'Internal server error'
      });
    }
  });

  /**
   * GET /api/presence/count
   * Lightweight endpoint to just fetch active user count
   */
  fastify.get('/count', async (request: any, reply: any) => {
    try {
      const tenantId = request.tenantId || request.user?.tenantId || request.user?.tenant_id;
      const count = presenceService.getActiveUserCount(tenantId ? String(tenantId) : undefined);
      return reply.status(200).send({
        success: true,
        data: {
          totalOnline: count,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Internal server error'
      });
    }
  });
};
