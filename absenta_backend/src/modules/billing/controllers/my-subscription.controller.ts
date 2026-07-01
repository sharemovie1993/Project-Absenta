import { toHttpError } from '../../../utils/error';
import { isSystemSuperAdmin } from '../../../utils/rbac';
import { subscriptionService } from '../services/subscription.service';

export const mySubscriptionController = {
  async getSubscription(req: any, reply: any) {
    const user = req.user || {};
    const roleName = user.roleName || user.role?.name;
    const tenantId = user.tenantId || user.tenant_id || null;

    if (!tenantId) {
      if (!isSystemSuperAdmin(roleName, tenantId)) {
        throw toHttpError(400, 'Tenant context missing');
      }
      return reply.send({
        success: true,
        message: 'Subscription data retrieved',
        data: null,
      });
    }

    const responseData = await subscriptionService.getMySubscriptionOverview(tenantId);

    return reply.send({
      success: true,
      message: 'Subscription data retrieved',
      data: responseData,
    });
  },

  async getInvoices(req: any, reply: any) {
    const tenantId = (req.user?.tenant_id || req.user?.tenantId);
    if (!tenantId) {
      throw toHttpError(400, 'Tenant context missing');
    }

    const axios = require('axios');
    const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
    const coreKey = process.env.LICENSE_KEY || '';

    let invoices: any[] = [];
    try {
      const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/history-by-core-key/${coreKey}`, { timeout: 8000 });
      if (response.data?.success && response.data?.data?.invoices) {
        const rawInvoices = response.data.data.invoices;
        invoices = rawInvoices.map((inv: any) => {
          const mappedStatus = String(inv.status).toUpperCase();
          let status = 'SENT';
          if (mappedStatus === 'PAID') status = 'PAID';
          else if (mappedStatus === 'CANCELLED') status = 'CANCELLED';
          else if (mappedStatus === 'EXPIRED') status = 'OVERDUE';

          // Secara alami ubah status ke OVERDUE jika waktu kedaluwarsa (unix) sudah terlampaui
          const nowUnix = Math.floor(Date.now() / 1000);
          const expTime = Number(inv.expired_time || 0);
          if (status !== 'PAID' && status !== 'CANCELLED' && expTime > 0 && nowUnix > expTime) {
            status = 'OVERDUE';
          }

          return {
            id: String(inv.invoice_number),
            invoice_number: inv.invoice_number,
            amount: inv.amount,
            total_amount: inv.amount,
            currency: 'IDR',
            status: status,
            created_at: inv.created_at,
            paid_at: inv.paid_at,
            expired_time: inv.expired_time,
            plan_id: inv.plan_id || null,
            payment_method: inv.payment_method || null,
            payments: inv.paid_at ? [{ status: 'SUCCESS', payment_method: inv.payment_method || 'TRIPAY' }] : [],
            Subscription: {
              service_code: inv.product_id === 'platform-absenta' ? 'CORE' : (inv.product_id || 'ABSENSI').toUpperCase(),
              Plan: {
                name: inv.product_display_name || inv.product_id || 'Layanan Modular',
                Module: {
                  name: inv.product_display_name || inv.product_id || 'Layanan Modular'
                }
              }
            }
          };
        });
      }
    } catch (err: any) {
      console.error('[mySubscriptionController.getInvoices] Failed to fetch invoices from licensing server:', err.message);
    }

    return reply.send({
      success: true,
      message: 'Invoices retrieved',
      data: invoices
    });
  },

  async getPayments(req: any, reply: any) {
    const tenantId = (req.user?.tenant_id || req.user?.tenantId);
    if (!tenantId) {
        throw toHttpError(400, 'Tenant context missing');
    }

    const axios = require('axios');
    const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
    const coreKey = process.env.LICENSE_KEY || '';

    let payments: any[] = [];
    try {
      const response = await axios.get(`${LICENSE_SERVER_URL}/api/license/history-by-core-key/${coreKey}`, { timeout: 8000 });
      if (response.data?.success && response.data?.data?.invoices) {
        const rawInvoices = response.data.data.invoices;
        payments = rawInvoices
          .filter((inv: any) => inv.paid_at)
          .map((inv: any) => ({
            id: `PAY-${inv.invoice_number}`,
            amount: inv.amount,
            currency: 'IDR',
            status: 'SUCCESS',
            payment_method: inv.payment_method || 'TRIPAY',
            paid_at: inv.paid_at,
            created_at: inv.paid_at,
            invoice_number: inv.invoice_number
          }));
      }
    } catch (err: any) {
      console.error('[mySubscriptionController.getPayments] Failed to fetch payments from licensing server:', err.message);
    }

    return reply.send({
        success: true,
        message: 'Payments retrieved',
        data: payments
    });
  },

  async toggleAutoRenew(req: any, reply: any) {
    const tenantId = (req.user?.tenant_id || req.user?.tenantId);
    const userId = req.user?.id;
    const { id } = req.params;
    const { auto_renew } = req.body;

    if (!tenantId) {
      throw toHttpError(400, 'Tenant context missing');
    }

    if (typeof auto_renew !== 'boolean') {
      throw toHttpError(400, 'Invalid payload: auto_renew must be boolean');
    }

    // Security check: ensure the subscription actually belongs to this tenant
    const existingSubs = await subscriptionService.getSubscriptionsByTenant(tenantId, true);
    const ownsSub = existingSubs.some(sub => sub.id === id);
    
    if (!ownsSub) {
      throw toHttpError(403, 'Forbidden: You do not own this subscription or it does not exist');
    }

    // Call the service to update just the auto_renew flag
    const updated = await subscriptionService.updateSubscription(id, { auto_renew }, userId);

    return reply.send({
      success: true,
      message: `Auto-renewal has been turned ${auto_renew ? 'ON' : 'OFF'}`,
      data: updated
    });
  }
};
