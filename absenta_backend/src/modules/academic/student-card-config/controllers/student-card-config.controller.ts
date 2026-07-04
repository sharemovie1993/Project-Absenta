import { studentCardConfigService } from '../services/student-card-config.service';
import { upsertStudentCardConfigSchema } from '../../services/academic-validation.schema';
import { z } from 'zod';

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

    try {
      const parsed = upsertStudentCardConfigSchema.parse(req.body);
      const config = await studentCardConfigService.upsertConfig(tenantId, parsed);
      return { success: true, data: config };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      req.log.error(error);
      return reply.status(500).send({ success: false, message: 'Failed to save config' });
    }
  }
}

export const studentCardConfigController = new StudentCardConfigController();
