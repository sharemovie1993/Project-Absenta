import { studentCardConfigService } from '../services/student-card-config.service';

export class StudentCardConfigController {
  async getConfig(req: any, reply: any) {
    // Robustly get tenant_id from user or request
    const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'];
    
    if (!tenantId) {
       return reply.status(400).send({ success: false, message: 'Tenant ID required' });
    }

    try {
      const config = await studentCardConfigService.getConfig(tenantId);
      return { success: true, data: config };
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({ success: false, message: 'Failed to fetch config' });
    }
  }

  async upsertConfig(req: any, reply: any) {
    const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'];
    
    if (!tenantId) {
       return reply.status(400).send({ success: false, message: 'Tenant ID required' });
    }

    const data = req.body as any;
    try {
      const config = await studentCardConfigService.upsertConfig(tenantId, data);
      return { success: true, data: config };
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({ success: false, message: 'Failed to save config' });
    }
  }
}

export const studentCardConfigController = new StudentCardConfigController();
