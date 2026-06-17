import { invoiceService, CreateInvoiceInput, UpdateInvoiceInput, GetInvoicesParams } from '../services/invoice.service';
import { RoleName } from '../../../constants/enums';
import { isSystemSuperAdmin } from '../../../utils/rbac';
import { InvoiceStatus } from '@prisma/client';
import { cacheService } from '../../../utils/cache.service';
import { CACHE_KEYS } from '../../../constants/cache-keys';
import { storageService } from '../../../infra/storage/storage.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { getSmartApiBaseUrl, resolveBaseUrlFromRequest } from '@/utils/url-helper';

// resolvePublicAppBaseUrlFromRequest telah dikonsolidasi ke src/utils/url-helper.ts;

export class InvoiceController {
  async getInvalidPeriodInvoices(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;

      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const query = request.query as any;
      const limit = query.limit ? parseInt(query.limit) : undefined;

      const items = await invoiceService.getInvoicesWithInvalidPeriod(roleName, tenantId, {
        tenant_id: undefined,
        limit
      });

      return reply.status(200).send({
        success: true,
        message: 'Invoices retrieved successfully',
        data: items
      });
    } catch (error: any) {
      console.error('Error in getInvalidPeriodInvoices:', error);

      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /invoice - Mendapatkan semua invoice dengan pagination dan filter
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  async getAllInvoices(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;

      // Validasi RBAC - hanya SUPERADMIN, PLATFORM_*, dan ADMIN yang diizinkan
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Parse query parameters
      const query = request.query as any;
      const params: GetInvoicesParams = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
        status: query.status as InvoiceStatus,
        tenant_id: undefined,
        billing_id: query.billing_id
      };

      // Validasi pagination parameters
      if (params.page && params.page < 1) {
        return reply.status(400).send({
          success: false,
          message: 'Page must be greater than 0'
        });
      }

      if (params.limit && (params.limit < 1 || params.limit > 100)) {
        return reply.status(400).send({
          success: false,
          message: 'Limit must be between 1 and 100'
        });
      }

      // Validasi status jika disediakan
      if (params.status && !Object.values(InvoiceStatus).includes(params.status)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid status value'
        });
      }

      const result = await invoiceService.getAllInvoices(roleName, tenantId, params);

      return reply.status(200).send({
        success: true,
        message: 'Invoices retrieved successfully',
        data: result
      });

    } catch (error: any) {
      console.error('Error in getAllInvoices:', error);
      
      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /invoice/:id - Mendapatkan invoice berdasarkan ID
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  async getInvoiceById(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };

      // Validasi RBAC - hanya SUPERADMIN, PLATFORM_*, dan ADMIN yang diizinkan
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Validasi ID parameter
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({
          success: false,
          message: 'Invalid invoice ID'
        });
      }

      const invoice = await invoiceService.getInvoiceById(id, roleName, tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Invoice retrieved successfully',
        data: invoice
      });

    } catch (error: any) {
      console.error('Error in getInvoiceById:', error);
      
      if (error.message === 'Invoice not found') {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found'
        });
      }

      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /invoice/:id/public-link - Mendapatkan link publik untuk invoice
   * RBAC: SUPERADMIN, ADMIN
   */
  async getPublicInvoiceLink(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };

      // Validasi RBAC
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const invoiceTenantId = await invoiceService.getInvoiceTenantIdForAccess(String(id));
      if (!invoiceTenantId) {
        return reply.status(404).send({ success: false, message: 'Invoice not found' });
      }
      if (!isSystemAdmin && roleName !== RoleName.SUPERADMIN && invoiceTenantId && String(tenantId) !== String(invoiceTenantId)) {
        return reply.status(403).send({ success: false, message: 'Insufficient permissions' });
      }

      // Cek apakah sudah ada token yang valid di cache
      const existingToken = await cacheService.get(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(id));
      
      let token = typeof existingToken === 'string' ? existingToken : '';
      
      if (!token) {
        // Generate token baru
        token = require('crypto').randomBytes(32).toString('hex');
        const expirySeconds = (() => {
          const raw = parseInt(String(process.env.INVOICE_PUBLIC_LINK_TTL_SECONDS || '').trim() || '');
          return Number.isFinite(raw) && raw > 0 ? raw : (24 * 60 * 60);
        })();
        
        // Simpan mapping token -> invoice_id dan sebaliknya
        await Promise.all([
            cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(token), { invoice_id: id, tenant_id: tenantId, expiry: Date.now() + (expirySeconds * 1000) }, expirySeconds),
            cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(id), token, expirySeconds)
        ]);
        try {
          const { persistPublicInvoiceToken } = await import('../../../utils/publicInvoiceToken');
          await persistPublicInvoiceToken(id, tenantId, token, expirySeconds);
        } catch {}
      }

      const base = resolveBaseUrlFromRequest(request, { fallbackVar: 'API_URL' });
      const url = `${base}/invoice/public/${token}`;

      return reply.status(200).send({
        success: true,
        message: 'Public link retrieved successfully',
        data: { url, token }
      });

    } catch (error: any) {
      console.error('Error in getPublicInvoiceLink:', error);
      const message = error?.message || 'Internal server error';
      if (message === 'Insufficient permissions') {
        return reply.status(403).send({ success: false, message: 'Insufficient permissions' });
      }
      if (message === 'Invoice not found') {
        return reply.status(404).send({ success: false, message: 'Invoice not found' });
      }
      return reply.status(500).send({ success: false, message });
    }
  }

  /**
   * GET /invoice/:id/download - Download cached official PDF (server-side)
   * RBAC: SUPERADMIN, ADMIN
   */
  async downloadInvoicePdf(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };

      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      if (!id || typeof id !== 'string') {
        return reply.status(400).send({
          success: false,
          message: 'Invalid invoice ID',
        });
      }

      const inv = await invoiceService.getInvoiceById(id, roleName, tenantId);
      const resolvedTenantId =
        (inv as any)?.Billing?.Subscription?.tenant_id ||
        (inv as any)?.tenant?.id ||
        String(tenantId || '');

      if (!resolvedTenantId) {
        return reply.status(400).send({
          success: false,
          message: 'Tenant context is missing',
        });
      }

      const publicBaseUrl = resolveBaseUrlFromRequest(request);
      const storageKey = await invoiceService.resolveExistingPdfStorageKey({ invoiceId: id });
      if (!storageKey) {
        try {
          await emitDomainEvent({
            event_type: 'invoice.pdf.requested',
            tenant_id: String(resolvedTenantId),
            source_service: 'invoice',
            metadata: { idempotency_key: `invoice_pdf_${String(id)}` },
            payload: {
              invoice_id: String(id),
              tenant_id: String(resolvedTenantId),
              public_base_url: String(publicBaseUrl || '').trim() || getSmartApiBaseUrl(),
            },
          });
        } catch {}

        const p = String((request.raw && (request.raw as any).url) || request.url || '');
        const full = `${String(publicBaseUrl || '').replace(/\/+$/, '')}${p.startsWith('/') ? p : `/${p}`}`;
        return reply.status(202).send({
          success: false,
          message: 'PDF sedang diproses, silakan coba lagi beberapa saat',
          data: { pdf_url: full },
        });
      }

      const accept = String(request.headers?.accept || '');
      if (accept.includes('application/json')) {
        const p = String((request.raw && (request.raw as any).url) || request.url || '');
        const full = `${String(publicBaseUrl || '').replace(/\/+$/, '')}${p.startsWith('/') ? p : `/${p}`}`;
        return reply.status(200).send({
          success: true,
          message: 'OK',
          data: { pdf_url: full },
        });
      }

      const invoiceLabel = String((inv as any)?.invoice_number || (inv as any)?.invoiceNumber || id).trim() || 'invoice';
      const safeName = invoiceLabel.replace(/[^\w.\- ]+/g, '_').trim() || 'invoice';
      const fileName = `${safeName}.pdf`;

      const stream = storageService.createReadStream(storageKey);
      stream.on('error', () => {
        if (reply.sent || reply.raw.headersSent) {
          try {
            reply.raw.destroy();
          } catch {}
          return;
        }
        reply.status(404);
        reply.header('Content-Type', 'text/plain; charset=utf-8');
        void reply.send('PDF file not found');
      });
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      return reply.send(stream);
    } catch (error: any) {
      const message = error?.message || 'Internal server error';
      if (message === 'Insufficient permissions') {
        return reply.status(403).send({ success: false, message: 'Insufficient permissions' });
      }
      if (message === 'Invoice not found') {
        return reply.status(404).send({ success: false, message: 'Invoice not found' });
      }
      return reply.status(500).send({ success: false, message });
    }
  }


  /**
   * GET /invoice/:id/preview - Mendapatkan preview invoice format publik
   * RBAC: SUPERADMIN, ADMIN
   */
  async getInvoicePreview(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };

      // Validasi RBAC
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const result = await invoiceService.getInvoicePreview(id, roleName, tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Invoice preview retrieved successfully',
        data: result
      });

    } catch (error: any) {
      console.error('Error in getInvoicePreview:', error);
      
      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      if (error.message === 'Invoice not found') {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /invoice - Membuat invoice baru
   * RBAC: SUPERADMIN (semua billing), ADMIN (billing tenant sendiri)
   */
  async createInvoice(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;

      // Validasi RBAC - hanya SUPERADMIN, PLATFORM_*, dan ADMIN yang diizinkan
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const body = request.body as CreateInvoiceInput;

      // Validasi input wajib
      if (!body.billing_id || !body.due_date) {
        return reply.status(400).send({
          success: false,
          message: 'billing_id and due_date are required'
        });
      }

      // Validasi format due_date
      const dueDate = new Date(body.due_date);
      if (isNaN(dueDate.getTime())) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid due_date format'
        });
      }

      // Validasi due_date tidak boleh di masa lalu
      if (dueDate < new Date()) {
        return reply.status(400).send({
          success: false,
          message: 'due_date cannot be in the past'
        });
      }

      const input: CreateInvoiceInput = {
        billing_id: body.billing_id,
        invoice_number: body.invoice_number,
        due_date: dueDate,
        notes: body.notes
      };

      const invoice = await invoiceService.createInvoice(input, roleName, tenantId);

      return reply.status(201).send({
        success: true,
        message: 'Invoice created successfully',
        data: invoice
      });

    } catch (error: any) {
      console.error('Error in createInvoice:', error);
      
      if (error.message === 'Billing not found') {
        return reply.status(404).send({
          success: false,
          message: 'Billing not found'
        });
      }

      if (error.message === 'Invoice already exists for this billing') {
        return reply.status(409).send({
          success: false,
          message: 'Invoice already exists for this billing'
        });
      }

      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /invoice/:id - Update invoice (hanya status DRAFT)
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  async updateInvoice(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };

      // Validasi RBAC - hanya SUPERADMIN, PLATFORM_*, dan ADMIN yang diizinkan
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Validasi ID parameter
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({
          success: false,
          message: 'Invalid invoice ID'
        });
      }

      const body = request.body as UpdateInvoiceInput;

      // Validasi minimal ada satu field yang diupdate
      if (!body.due_date && body.notes === undefined) {
        return reply.status(400).send({
          success: false,
          message: 'At least one field (due_date or notes) must be provided'
        });
      }

      const input: UpdateInvoiceInput = {};

      // Validasi due_date jika disediakan
      if (body.due_date) {
        const dueDate = new Date(body.due_date);
        if (isNaN(dueDate.getTime())) {
          return reply.status(400).send({
            success: false,
            message: 'Invalid due_date format'
          });
        }

        if (dueDate < new Date()) {
          return reply.status(400).send({
            success: false,
            message: 'due_date cannot be in the past'
          });
        }

        input.due_date = dueDate;
      }

      // Notes bisa null atau string
      if (body.notes !== undefined) {
        input.notes = body.notes;
      }

      const invoice = await invoiceService.updateInvoice(id, input, roleName, tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Invoice updated successfully',
        data: invoice
      });

    } catch (error: any) {
      console.error('Error in updateInvoice:', error);
      
      if (error.message === 'Invoice not found') {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found'
        });
      }

      if (error.message === 'Only DRAFT invoices can be updated') {
        return reply.status(400).send({
          success: false,
          message: 'Only DRAFT invoices can be updated'
        });
      }

      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /invoice/:id/send - Mengirim invoice (update status ke SENT)
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  async sendInvoice(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };
      const { recipient_email, subject, message, attach_pdf } = (request.body || {}) as {
        recipient_email?: string;
        subject?: string;
        message?: string;
        attach_pdf?: boolean;
      };

      // Validasi RBAC - hanya SUPERADMIN, PLATFORM_*, dan ADMIN yang diizinkan
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Validasi ID parameter
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({
          success: false,
          message: 'Invalid invoice ID'
        });
      }

      const invoice = await invoiceService.sendInvoice(id, roleName, tenantId, {
        recipient_email,
        subject,
        message,
        attach_pdf,
      });

      return reply.status(200).send({
        success: true,
        message: 'Invoice sent successfully',
        data: invoice
      });

    } catch (error: any) {
      console.error('Error in sendInvoice:', error);
      
      if (error.message === 'Invoice not found') {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found'
        });
      }

      if (error.message === 'Only DRAFT invoices can be sent') {
        return reply.status(400).send({
          success: false,
          message: 'Only DRAFT invoices can be sent'
        });
      }

      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /invoice/:id/pay - Menandai invoice sebagai lunas
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  async markAsPaid(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };

      // Validasi RBAC - hanya SUPERADMIN, PLATFORM_*, dan ADMIN yang diizinkan
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Validasi ID parameter
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({
          success: false,
          message: 'Invalid invoice ID'
        });
      }

      const invoice = await invoiceService.markAsPaid(id, roleName, tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Invoice marked as paid successfully',
        data: invoice
      });

    } catch (error: any) {
      console.error('Error in markAsPaid:', error);
      
      if (error.message === 'Invoice not found') {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found'
        });
      }

      if (error.message === 'Only SENT invoices can be marked as paid') {
        return reply.status(400).send({
          success: false,
          message: 'Only SENT invoices can be marked as paid'
        });
      }

      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * DELETE /invoice/:id - Menghapus invoice (hanya status DRAFT)
   * RBAC: SUPERADMIN (semua invoice), ADMIN (invoice tenant sendiri)
   */
  async deleteInvoice(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };

      // Validasi RBAC - hanya SUPERADMIN, PLATFORM_*, dan ADMIN yang diizinkan
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Validasi ID parameter
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({
          success: false,
          message: 'Invalid invoice ID'
        });
      }

      await invoiceService.deleteInvoice(id, roleName, tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Invoice deleted successfully'
      });

    } catch (error: any) {
      console.error('Error in deleteInvoice:', error);
      
      if (error.message === 'Invoice not found') {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found'
        });
      }

      if (error.message === 'Only DRAFT invoices can be deleted') {
        return reply.status(400).send({
          success: false,
          message: 'Only DRAFT invoices can be deleted'
        });
      }

      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /invoice/stats - Mendapatkan statistik invoice
   * RBAC: SUPERADMIN (semua statistik), ADMIN (statistik tenant sendiri)
   */
  async getInvoiceStats(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;

      // Validasi RBAC - hanya SUPERADMIN, PLATFORM_*, dan ADMIN yang diizinkan
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      const stats = await invoiceService.getInvoiceStats(roleName, tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Invoice statistics retrieved successfully',
        data: stats
      });

    } catch (error: any) {
      console.error('Error in getInvoiceStats:', error);
      
      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * DELETE /invoice/public-link/:id - Revoke token publik untuk invoice
   * RBAC: SUPERADMIN (semua), ADMIN (tenant sendiri)
   */
  async revokePublicLink(request: any, reply: any) {
    try {
      const roleName = request.user?.roleName || request.user?.role?.name;
      const tenantId = request.tenantId ?? request.user?.tenantId ?? request.user?.tenant_id;
      const { id } = request.params as { id: string };
      const isSystemAdmin = isSystemSuperAdmin(roleName, tenantId);
      if (!isSystemAdmin && ![RoleName.SUPERADMIN, RoleName.ADMIN].includes(roleName)) {
        return reply.status(403).send({ success: false, message: 'Insufficient permissions' });
      }
      if (!id || typeof id !== 'string') {
        return reply.status(400).send({ success: false, message: 'Invalid invoice ID' });
      }
      const invoice = await invoiceService.getInvoiceById(id, roleName, tenantId);
      if (!invoice) {
        return reply.status(404).send({ success: false, message: 'Invoice not found' });
      }
      const token = await cacheService.get<string>(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(id));
      if (token && token.length > 0) {
        await cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(id));
        await cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(token));
      }
      return reply.status(200).send({ success: true, message: 'Public link revoked' });
    } catch (error: any) {
      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({ success: false, message: 'Insufficient permissions' });
      }
      if (error.message === 'Invoice not found') {
        return reply.status(404).send({ success: false, message: 'Invoice not found' });
      }
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  }
}

export const invoiceController = new InvoiceController();
