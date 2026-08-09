import { consentLogService, ConsentType } from '../services/consent-log.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function consentRoutes(fastify: any) {
  fastify.post('/log', {
    preHandler: [requireCapability('consent.logs.create'), determineDataScope()],
    schema: {
      description: 'Create consent log',
      tags: ['Consent'],
      body: {
        type: 'object',
        required: ['consent_type'],
        properties: {
          consent_type: { type: 'string', enum: ['TERMS','PRIVACY','BIOMETRIC','BILLING'] },
          version: { type: ['string', 'null'] },
        },
      },
    },
  }, async (req: any, reply: any) => {
    const tenantId = req.tenantId || (req.user?.tenant_id || req.user?.tenantId) || null;
    const userId = req.user?.id || null;
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;
    const payload = req.body as { consent_type: ConsentType; version?: string | null };
    const created = await consentLogService.create({
      user_id: userId,
      tenant_id: tenantId,
      consent_type: payload.consent_type,
      version: payload.version ?? null,
      ip_address: ip,
      user_agent: typeof userAgent === 'string' ? userAgent : null,
    });
    return reply.code(201).send({ success: true, message: 'Created', data: created });
  });

  fastify.get('/logs', {
    preHandler: [requireCapability('consent.logs.view.list'), determineDataScope()],
    schema: {
      description: 'List consent logs',
      tags: ['Consent'],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['TERMS','PRIVACY','BIOMETRIC','BILLING'] },
        },
      },
    },
  }, async (req: any, reply: any) => {
    const roleName = req.user?.roleName || req.user?.role?.name;
    const tenantId = req.tenantId || (req.user?.tenant_id || req.user?.tenantId) || null;
    const userId = req.user?.id || null;
    const qs = req.query as { type?: ConsentType };
    const logs = await consentLogService.list(roleName, tenantId, userId, qs?.type);
    return reply.send({ success: true, message: 'OK', data: logs });
  });
}
