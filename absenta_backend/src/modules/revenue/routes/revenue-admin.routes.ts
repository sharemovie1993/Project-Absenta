import { revenueIntelligenceService } from '../services/revenueIntelligence.service';
import { requireCapability } from '@/middlewares/requireCapability';

export async function revenueAdminRoutes(fastify: any) {
  fastify.get('/overview', {
    preHandler: [requireCapability('superadmin.revenue.view.overview')],
    handler: async (_request: any, reply: any) => {
      const data = await revenueIntelligenceService.getGlobalRevenueOverview();
      reply.status(200);
      return { success: true, message: 'Revenue overview retrieved successfully', data };
    },
  });

  fastify.get('/trend', {
    preHandler: [requireCapability('superadmin.revenue.view.overview')],
    handler: async (request: any, reply: any) => {
      const lastNMonthsRaw = Number((request.query as any)?.lastNMonths ?? (request.query as any)?.months ?? 6);
      const lastNMonths = Number.isFinite(lastNMonthsRaw) && lastNMonthsRaw > 0 ? Math.floor(lastNMonthsRaw) : 6;
      const data = await revenueIntelligenceService.getMonthlyTrend(lastNMonths);
      reply.status(200);
      return { success: true, message: 'Revenue trend retrieved successfully', data };
    },
  });

  fastify.get('/churn', {
    preHandler: [requireCapability('superadmin.revenue.view.overview')],
    handler: async (request: any, reply: any) => {
      const lastNMonthsRaw = Number((request.query as any)?.lastNMonths ?? (request.query as any)?.months ?? 6);
      const lastNMonths = Number.isFinite(lastNMonthsRaw) && lastNMonthsRaw > 0 ? Math.floor(lastNMonthsRaw) : 6;
      const data = await revenueIntelligenceService.getChurnAnalysis(lastNMonths);
      reply.status(200);
      return { success: true, message: 'Churn analysis retrieved successfully', data };
    },
  });

  fastify.get('/exposure', {
    preHandler: [requireCapability('superadmin.revenue.view.overview')],
    handler: async (_request: any, reply: any) => {
      const data = await revenueIntelligenceService.getTenantRevenueExposure();
      reply.status(200);
      return { success: true, message: 'Revenue exposure retrieved successfully', data };
    },
  });
}
