import { PdfInvoiceService } from '../services/pdf-invoice.service';
import { prisma } from '@/utils/prisma';
import { requireCapability } from '@/middlewares/requireCapability';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { resolveBaseUrlFromRequest } from '@/utils/url-helper';

// resolvePublicBaseUrlFromRequest telah dikonsolidasi ke src/utils/url-helper.ts

export async function pdfRoutes(fastify: any) {
  fastify.post('/invoice/:id', { preHandler: [requireCapability('billing.invoices.view.detail')] }, async (request: any, reply: any) => {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };

      if (!id || typeof id !== 'string') {
        reply.status(400);
        return { success: false, message: 'Invalid invoice ID' };
      }

      const inv = await prisma.invoice.findUnique({
        where: { id: String(id) },
        include: { Billing: { include: { Subscription: true } } } as any,
      });

      if (!inv) {
        reply.status(404);
        return { success: false, message: 'Invoice not found' };
      }

      const invoiceTenantId = String((inv as any)?.Billing?.Subscription?.tenant_id || (inv as any)?.tenant_id || '');
      const roleName = request.user?.roleName || request.user?.role?.name;
      const isSuper = isSystemSuperAdmin(roleName, tenantId ?? null);
      if (!isSuper && invoiceTenantId && String(invoiceTenantId) !== String(tenantId || '')) {
        reply.status(403);
        return { success: false, message: 'Insufficient permissions' };
      }

      const resolvedTenantId = invoiceTenantId || String(tenantId || '');

      if (!resolvedTenantId) {
        reply.status(400);
        return { success: false, message: 'Tenant context is missing' };
      }

      const svc = new PdfInvoiceService();
      await svc.generateAndStoreInvoicePdf({
        invoiceId: id,
        tenantId: String(resolvedTenantId),
        publicBaseUrl: resolveBaseUrlFromRequest(request),
      });

      reply.status(200);
      const base = resolveBaseUrlFromRequest(request).replace(/\/+$/, '');
      const target = `/invoice/${encodeURIComponent(String(id || ''))}/download`;
      const url = `${base}${target}`;
      return { success: true, message: 'PDF generated', data: { pdf_url: url } };
    } catch (e: any) {
      const message = e?.message || 'Internal server error';
      const status = /not found/i.test(message) ? 404 : 500;
      reply.status(status);
      return { success: false, message };
    }
  });
}
