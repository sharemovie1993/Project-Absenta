import { toHttpError } from '../../../utils/error';
import { isSystemSuperAdmin } from '../../../utils/rbac';
import { subscriptionService } from '../services/subscription.service';
import { getInvoicesByTenantQuery, getPaymentsByTenantQuery, getLicenseServerConnectivity } from '../services/queries/subscription-overview.query';
import { syncLocalSubscriptionsWithLicensingServer } from './subscription.controller';
import { billingDb as prisma } from '../services/repositories/billing.db';

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

    // Non-blocking background sync (Graceful Degradation: tidak memblokir login/load saat server lisensi offline)
    syncLocalSubscriptionsWithLicensingServer(tenantId).catch((err: any) => {
      console.warn('[getSubscription] Background sync warning:', err.message);
    });

    const responseData = await subscriptionService.getMySubscriptionOverview(tenantId);
    const connectivity = getLicenseServerConnectivity();
    const isOffline = connectivity.isOnline === false;
    if (responseData) {
      (responseData as any).is_license_server_offline = isOffline;
    }

    return reply.send({
      success: true,
      message: 'Subscription data retrieved',
      data: responseData,
      is_license_server_offline: isOffline,
    });
  },

  async syncSubscription(req: any, reply: any) {
    const user = req.user || {};
    const roleName = user.roleName || user.role?.name;
    const tenantId = user.tenantId || user.tenant_id || null;

    if (!tenantId) {
      if (!isSystemSuperAdmin(roleName, tenantId)) {
        throw toHttpError(400, 'Tenant context missing');
      }
      return reply.send({
        success: true,
        message: 'Subscription sync completed',
        data: null,
      });
    }

    try {
      await syncLocalSubscriptionsWithLicensingServer(tenantId);
    } catch (err: any) {
      console.error('[syncSubscription] Sync error:', err.message);
    }

    const responseData = await subscriptionService.getMySubscriptionOverview(tenantId);

    return reply.send({
      success: true,
      message: 'Subscription synchronized successfully',
      data: responseData,
    });
  },

  async getInvoices(req: any, reply: any) {
    const tenantId = (req.user?.tenant_id || req.user?.tenantId);
    if (!tenantId) {
      throw toHttpError(400, 'Tenant context missing');
    }

    const invoices = await getInvoicesByTenantQuery(tenantId);

    return reply.send({
      success: true,
      message: 'Invoices retrieved',
      data: invoices,
      is_license_server_offline: (invoices as any).isLicenseServerOffline ?? false
    });
  },

  async cancelInvoice(req: any, reply: any) {
    const tenantId = (req.user?.tenant_id || req.user?.tenantId);
    if (!tenantId) {
      throw toHttpError(400, 'Tenant context missing');
    }

    const { invoiceNumber } = req.params;
    if (!invoiceNumber) {
      throw toHttpError(400, 'Nomor invoice wajib disertakan');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, name: true }
    });
    const slug = tenant?.subdomain?.toLowerCase();

    const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.absenta.id';
    const coreKey = process.env.LICENSE_KEY || '';

    try {
      const axios = require('axios');
      const cleanInvNum = encodeURIComponent(invoiceNumber.trim().replace(/^#/, ''));
      const response = await axios.post(
        `${LICENSE_SERVER_URL}/api/license/invoice/${cleanInvNum}/cancel`,
        {
          license_key: coreKey,
          tenant_slug: slug
        },
        { timeout: 10000 }
      );

      // Sinkronisasikan kembali status langganan lokal setelah pembatalan
      try {
        await syncLocalSubscriptionsWithLicensingServer(tenantId);
      } catch (syncErr: any) {
        console.warn('[cancelInvoice] Post-cancel sync warning:', syncErr.message);
      }

      return reply.send({
        success: true,
        message: response.data?.message || 'Invoice berhasil dibatalkan',
        data: response.data?.data
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Gagal membatalkan invoice di server lisensi';
      const statusCode = err.response?.status || 500;
      return reply.status(statusCode).send({
        success: false,
        message: errMsg
      });
    }
  },

  async getPayments(req: any, reply: any) {
    const tenantId = (req.user?.tenant_id || req.user?.tenantId);
    if (!tenantId) {
      throw toHttpError(400, 'Tenant context missing');
    }

    const payments = await getPaymentsByTenantQuery(tenantId);

    return reply.send({
      success: true,
      message: 'Payments retrieved',
      data: payments,
      is_license_server_offline: (payments as any).isLicenseServerOffline ?? false
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
  },

  async getComparisonMatrix(req: any, reply: any) {
    const user = req.user || {};
    const roleName = user.roleName || user.role?.name;
    const tenantId = user.tenantId || user.tenant_id || null;
    const serviceId = (req.query?.service_id || req.query?.serviceId || null) as string | null;

    if (!tenantId) {
      if (!isSystemSuperAdmin(roleName, tenantId)) {
        throw toHttpError(400, 'Tenant context missing');
      }
      return reply.send({
        success: true,
        message: 'No tenant context',
        data: null
      });
    }

    const { packageMatrixService } = await import('../services/package-matrix.service');
    const matrix = await packageMatrixService.getComparisonMatrix(tenantId, serviceId || undefined);

    return reply.send({
      success: true,
      message: 'Package comparison matrix generated',
      data: matrix
    });
  }
};
