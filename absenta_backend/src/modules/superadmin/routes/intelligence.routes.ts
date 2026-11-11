import { requireCapability } from '@/middlewares/requireCapability';
import { superadminIntelligenceService } from '../services/intelligence.service';

async function ensurePlatformSuperadmin(request: any, reply: any) {
  const user: any = request.user;
  const roleName = String(user?.roleName || user?.Role?.name || user?.role?.name || user?.role || '').toUpperCase();
  const tenantId = String(user?.tenantId || user?.tenant_id || '').trim().toLowerCase();

  const isPlatformRole = roleName === 'SUPERADMIN' || roleName.startsWith('PLATFORM_');
  const isSystemTenant = tenantId === '' || tenantId === 'system';

  if (!isPlatformRole || !isSystemTenant) {
    return reply.status(403).send({
      success: false,
      message: 'Akses ditolak: Endpoint khusus Platform Superadmin.',
    });
  }
}

export async function superadminIntelligenceRoutes(fastify: any) {
  const guard = [requireCapability('core.tenants.view.list'), ensurePlatformSuperadmin];

  fastify.get('/overview', { preHandler: guard }, async (_request: any, reply: any) => {
    const data = await superadminIntelligenceService.getOverview();
    return reply.send({ success: true, message: 'OK', data });
  });

  fastify.get('/top-risk', { preHandler: guard }, async (_request: any, reply: any) => {
    const data = await superadminIntelligenceService.getTopRisk();
    return reply.send({ success: true, message: 'OK', data });
  });

  fastify.get('/email-health', { preHandler: guard }, async (_request: any, reply: any) => {
    const data = await superadminIntelligenceService.getEmailHealth();
    return reply.send({ success: true, message: 'OK', data });
  });

  fastify.get('/payment-health', { preHandler: guard }, async (_request: any, reply: any) => {
    const data = await superadminIntelligenceService.getPaymentHealth();
    return reply.send({ success: true, message: 'OK', data });
  });

  fastify.get('/attendance-health', { preHandler: guard }, async (_request: any, reply: any) => {
    const data = await superadminIntelligenceService.getAttendanceHealth();
    return reply.send({ success: true, message: 'OK', data });
  });

  fastify.get('/attendance-tenant/:tenantId/summary', { preHandler: guard }, async (request: any, reply: any) => {
    const { tenantId } = request.params as { tenantId: string };
    const data = await superadminIntelligenceService.getAttendanceTenantSummary(tenantId);
    return reply.send({ success: true, message: 'OK', data });
  });

  fastify.get('/attendance-tenant/:tenantId/trends', { preHandler: guard }, async (request: any, reply: any) => {
    const { tenantId } = request.params as { tenantId: string };
    const { window_days } = (request.query || {}) as { window_days?: string };
    const windowDays = Math.max(1, Math.min(90, Number(window_days) || 30));
    const data = await superadminIntelligenceService.getAttendanceTenantTrends(tenantId, windowDays);
    return reply.send({ success: true, message: 'OK', data });
  });
}
