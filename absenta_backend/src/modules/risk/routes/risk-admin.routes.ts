import { prisma } from '../../../utils/prisma';
import { tenantRiskService } from '../services/tenantRisk.service';
import { requireCapability } from '@/middlewares/requireCapability';

export async function riskAdminRoutes(fastify: any) {
  fastify.get('/overview', {
    preHandler: [requireCapability('superadmin.risk.view')],
    handler: async (_request: any, reply: any) => {
      const [totalTenants, scoredTenants, grouped, topTen] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenantRiskScore.count(),
        prisma.tenantRiskScore.groupBy({
          by: ['risk_level'],
          _count: { _all: true },
        }),
        prisma.tenantRiskScore.findMany({
          orderBy: [{ risk_score: 'desc' }, { updated_at: 'desc' }],
          take: 10,
          include: { Tenant: { select: { id: true, name: true } } },
        }),
      ]);

      const byLevel: Record<string, number> = {};
      for (const row of grouped) byLevel[String(row.risk_level)] = Number((row as any)?._count?._all ?? 0);

      reply.status(200);
      return {
        success: true,
        message: 'Tenant risk overview retrieved successfully',
        data: {
          total_tenant: totalTenants,
          uncalculated_tenant: Math.max(0, totalTenants - scoredTenants),
          HEALTHY: byLevel.HEALTHY ?? 0,
          WARNING: byLevel.WARNING ?? 0,
          HIGH_RISK: byLevel.HIGH_RISK ?? 0,
          CRITICAL: byLevel.CRITICAL ?? 0,
          top_10: topTen.map((r) => ({
            tenant_id: r.tenant_id,
            tenant_name: (r as any)?.Tenant?.name ?? null,
            risk_score: r.risk_score,
            risk_level: r.risk_level,
            last_calculated_at: r.last_calculated_at,
          })),
        },
      };
    },
  });

  fastify.get('/tenant/:id', {
    preHandler: [requireCapability('superadmin.risk.view')],
    handler: async (request: any, reply: any) => {
      const tenantId = String((request?.params as any)?.id || '').trim();
      if (!tenantId) {
        reply.status(400);
        return { success: false, code: 'VALIDATION_ERROR', message: 'tenant id is required', details: {} };
      }

      const data = await tenantRiskService.getTenantRisk(tenantId);
      reply.status(200);
      return { success: true, message: 'Tenant risk retrieved successfully', data };
    },
  });
}
