import { platformIntelligenceService } from '../services/platformIntelligence.service';
import { requireCapability } from '@/middlewares/requireCapability';

export async function platformIntelligenceRoutes(fastify: any) {
  fastify.get('/overview', {
    preHandler: [requireCapability("superadmin.platform.intelligence.view")],
    handler: async (_request: any, reply: any) => {
      const data = await platformIntelligenceService.getPlatformOverview();
      reply.status(200);
      return { success: true, message: 'Platform overview retrieved successfully', data };
    },
  });

  fastify.get('/top-risk', {
    preHandler: [requireCapability("superadmin.platform.intelligence.view")],
    handler: async (_request: any, reply: any) => {
      const data = await platformIntelligenceService.getTopRiskTenants();
      reply.status(200);
      return { success: true, message: 'Top risk tenants retrieved successfully', data };
    },
  });

  fastify.get('/email-health', {
    preHandler: [requireCapability("superadmin.platform.intelligence.view")],
    handler: async (_request: any, reply: any) => {
      const data = await platformIntelligenceService.getEmailHealthSummary();
      reply.status(200);
      return { success: true, message: 'Email health summary retrieved successfully', data };
    },
  });

  fastify.get('/payment-health', {
    preHandler: [requireCapability("superadmin.platform.intelligence.view")],
    handler: async (_request: any, reply: any) => {
      const data = await platformIntelligenceService.getPaymentHealthSummary();
      reply.status(200);
      return { success: true, message: 'Payment health summary retrieved successfully', data };
    },
  });

  fastify.get('/attendance-health', {
    preHandler: [requireCapability("superadmin.platform.intelligence.view")],
    handler: async (_request: any, reply: any) => {
      const data = await platformIntelligenceService.getAttendanceHealth();
      reply.status(200);
      return { success: true, message: 'Attendance health retrieved successfully', data };
    },
  });

  fastify.get('/attendance-tenant/:tenantId/summary', {
    preHandler: [requireCapability("superadmin.platform.intelligence.view")],
    handler: async (request: any, reply: any) => {
      const tenantId = String(request.params.tenantId);
      const data = await platformIntelligenceService.getAttendanceTenantSummary(tenantId);
      reply.status(200);
      return { success: true, message: 'Attendance tenant summary retrieved successfully', data };
    },
  });

  fastify.get('/attendance-tenant/:tenantId/trends', {
    preHandler: [requireCapability("superadmin.platform.intelligence.view")],
    handler: async (request: any, reply: any) => {
      const tenantId = String(request.params.tenantId);
      const windowDaysRaw = request?.query?.window_days
        ? Number(request.query.window_days)
        : undefined;
      const data = await platformIntelligenceService.getAttendanceTenantTrends(tenantId, windowDaysRaw);
      reply.status(200);
      return { success: true, message: 'Attendance tenant trends retrieved successfully', data };
    },
  });
}
