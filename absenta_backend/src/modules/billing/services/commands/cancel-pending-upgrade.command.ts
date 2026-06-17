import { InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { subscriptionDb as prisma } from '../repositories/subscription.db';
import { auditLogService } from '@/modules/audit/services/audit-log.service';
import { cacheService } from '@/utils/cache.service';
import { sidebarRenderingService } from '@/modules/menu/services/sidebar-rendering.service';

export interface CancelPendingUpgradeResult {
  success: boolean;
  message: string;
}

export async function cancelPendingUpgradeCommand(
  subscriptionId: string,
  cancelledByUserId: string | null,
  correlationId?: string
): Promise<CancelPendingUpgradeResult> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        Plan: true,
        Tenant: true,
        Billing: {
          where: {
            Invoice: {
              status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.VIEWED] }
            },
            charge_type: 'UPGRADE' as any
          },
          include: { Invoice: true }
        }
      }
    });

    if (!subscription) {
      return { success: false, message: 'Subscription not found' };
    }

    // 1. Get the pending upgrade invoice
    const pendingBilling = subscription.Billing?.[0];
    const invoice = pendingBilling?.Invoice;

    // Check if there are any pending/processing payments
    if (invoice) {
      const pendingPayments = await prisma.payment.count({
        where: {
          invoice_id: invoice.id,
          status: { in: ['PENDING', 'PROCESSING'] as any }
        }
      });

      if (pendingPayments > 0) {
        return { 
          success: false, 
          message: 'Cannot cancel: There is a payment in progress. Please wait or cancel the payment first.' 
        };
      }
    }

    // 2. Perform atomic cancellation
    await prisma.$transaction(async (tx) => {
      // Void invoice and billing
      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.CANCELLED, updated_at: new Date() }
        });
      }

      // Cancel related PlanChangeRequest
      await tx.planChangeRequest.updateMany({
        where: {
          subscription_id: subscriptionId,
          status: 'SCHEDULED' as any,
          change_type: 'UPGRADE' as any
        },
        data: { status: 'CANCELLED' as any }
      });

      // 3. Revert subscription status
      const paidInvoicesCount = await tx.invoice.count({
        where: {
          subscription_id: subscriptionId,
          status: InvoiceStatus.PAID
        }
      });

      let newStatus: SubscriptionStatus = SubscriptionStatus.ACTIVE;
      const now = new Date();
      const endDate = subscription.end_date ? new Date(subscription.end_date) : null;

      if (endDate && endDate < now) {
        newStatus = SubscriptionStatus.EXPIRED;
      } else if (subscription.cancel_date) {
        newStatus = SubscriptionStatus.CANCELLED;
      } else if (paidInvoicesCount === 0 && subscription.status === SubscriptionStatus.TRIAL) {
        newStatus = SubscriptionStatus.TRIAL;
      }

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: newStatus as any,
          updated_at: new Date()
        }
      });

      // 4. Audit Log
      await auditLogService.logEvent({
        event_type: 'billing.subscription.upgrade_cancelled',
        severity: 'INFO',
        entity_type: 'SUBSCRIPTION',
        entity_id: subscriptionId,
        tenant_id: subscription.tenant_id,
        user_id: cancelledByUserId,
        correlation_id: correlationId || null,
        metadata: {
          previous_status: subscription.status,
          new_status: newStatus,
          invoice_id: invoice?.id || null,
          billing_id: pendingBilling?.id || null
        }
      });
    });

    // 5. Invalidate caches
    await cacheService.delete(`tenant:features:${String(subscription.tenant_id)}`);
    await sidebarRenderingService.invalidateAll();

    return { success: true, message: 'Pending upgrade cancelled successfully' };
  } catch (error) {
    console.error('Error in cancelPendingUpgradeCommand:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
}
