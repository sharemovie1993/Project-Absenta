import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

// resolvePublicBaseUrlFromRequest telah dikonsolidasi ke src/utils/url-helper.ts

export async function pdfRoutes(fastify: any) {
  fastify.post('/invoice/:id', { preHandler: [requireCapability('billing.invoices.view.detail'), determineDataScope()] }, async (_request: any, reply: any) => {
    reply.status(404).send({
      success: false,
      message: 'Invoice PDF generation is deprecated. Use central billing instead.'
    });
  });
}
