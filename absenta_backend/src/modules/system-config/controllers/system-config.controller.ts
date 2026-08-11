import { systemConfigService, SystemConfigPayload } from '../services/system-config.service';

export const systemConfigController = {
  async getActive(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenantId || request.user?.tenant_id || null;
      const data = await systemConfigService.getActive(tenantId);
      return reply.send({ success: true, message: 'OK', data });
    } catch (err: any) {
      console.error('[SystemConfig] getActive error:', err);
      return reply.status(500).send({
        success: false,
        message: err.message || 'Failed to fetch system config',
      });
    }
  },

  async upsert(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const payload = request.body as SystemConfigPayload;
      const tenantId = payload.tenant_id || request.tenantId || request.user?.tenantId || request.user?.tenant_id || null;
      
      console.log('[SystemConfig] Upsert Payload:', JSON.stringify(payload, null, 2));
      console.log('[SystemConfig] User:', { roleName, tenantId });

      const data = await systemConfigService.upsert(payload, roleName, tenantId);
      return reply.send({ success: true, message: 'Saved', data });
    } catch (err: any) {
      console.error('[SystemConfig] upsert error:', err);
      return reply.status(500).send({
        success: false,
        message: err.message || 'Failed to save system config',
      });
    }
  },
};
