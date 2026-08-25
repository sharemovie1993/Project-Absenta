import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';
import { appLogger } from '@/utils/app-logger';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { z } from 'zod';

export const pdfRequestSchema = z.object({
  id: z.string().optional()
});

export async function pdfRoutes(fastify: any) {
  fastify.post('/invoice/:id', { preHandler: [requireCapability('billing.invoices.view.detail'), determineDataScope()] }, async (request: any, reply: any) => {
    try {
      const tenantId = request.tenantId || request.dataScope?.tenantId;
      const tz = await getTenantTimezone(tenantId);
      appLogger.info({ id: request.params?.id, tz }, 'PDF invoice request received');
      return reply.status(404).send({
        success: false,
        message: 'Invoice PDF generation is deprecated. Use central billing instead.'
      });
    } catch (e: any) {
      appLogger.error({ err: e }, 'PDF generation error');
      return reply.status(500).send({ success: false, message: e.message });
    }
  });
}
