import { SubscriptionStatus } from '@prisma/client';
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
      }
    });

    if (!subscription) {
      return { success: false, message: 'Subscription not found' };
    }

    // Cancel related PlanChangeRequest
    await prisma.planChangeRequest.updateMany({
      where: {
        subscription_id: subscriptionId,
        status: 'SCHEDULED' as any,
        change_type: 'UPGRADE' as any
      },
      data: { status: 'CANCELLED' as any }
    });

    // Revert subscription status
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        updated_at: new Date()
      }
    });

    // Audit Log
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
        new_status: SubscriptionStatus.ACTIVE,
      }
    });

    // Invalidate caches
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
