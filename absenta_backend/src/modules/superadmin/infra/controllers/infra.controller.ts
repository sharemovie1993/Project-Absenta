import { SocketMonitor } from '@/infra/realtime/socket.monitor';
import { isSystemSuperAdmin } from '@/utils/rbac';

export class InfraController {
  
  /**
   * Get global socket infrastructure stats
   */
  async getGlobalStats(request: any, reply: any) {
    try {
      // Validate role: only SUPERADMIN from system tenant
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied. Only SUPERADMIN can access this endpoint.'
        });
      }

      const monitor = SocketMonitor.getInstance();
      const globalStats = await monitor.getGlobalStats();

      return reply.status(200).send({
        success: true,
        message: 'Global socket stats retrieved successfully',
        data: globalStats
      });

    } catch (error) {
      console.error('Error in getGlobalStats:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error'
      });
    }
  }

  /**
   * Get tenant-specific socket stats
   */
  async getTenantStats(request: any, reply: any) {
    try {
      // Validate role: only SUPERADMIN from system tenant
      if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied. Only SUPERADMIN can access this endpoint.'
        });
      }

      const monitor = SocketMonitor.getInstance();
      const stats = await monitor.getStats();

      return reply.status(200).send({
        success: true,
        message: 'Tenant socket stats retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('Error in getTenantStats:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error'
      });
    }
  }
}
