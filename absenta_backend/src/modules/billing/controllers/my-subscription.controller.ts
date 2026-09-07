import { toHttpError } from '../../../utils/error';
import { isSystemSuperAdmin } from '../../../utils/rbac';
import { subscriptionService } from '../services/subscription.service';
import { getInvoicesByTenantQuery, getPaymentsByTenantQuery } from '../services/queries/subscription-overview.query';
import { syncLocalSubscriptionsWithLicensingServer } from './subscription.controller';

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

    if (req.query?.refresh === 'true') {
      try {
        await syncLocalSubscriptionsWithLicensingServer(tenantId);
      } catch (err: any) {
        console.warn('[getSubscription] Background sync warning:', err.message);
      }
    }

    const responseData = await subscriptionService.getMySubscriptionOverview(tenantId);

    return reply.send({
      success: true,
      message: 'Subscription data retrieved',
      data: responseData,
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
      data: invoices
    });
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
