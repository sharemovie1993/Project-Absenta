import { prisma } from '../../../utils/prisma';
import { ACTIVITY_LOG_ALLOWED_EVENTS } from '../../../constants/logOwnership';

export type ActivityLogEventParams = {
  event_type: string;
  tenant_id: string;
  user_id: string | null;
  entity: string;
  entity_id?: string | null;
  metadata?: Record<string, any> | null;
};

export class ActivityLogService {
  logEvent(params: ActivityLogEventParams): void {
    if (!ACTIVITY_LOG_ALLOWED_EVENTS.includes(params.event_type as any)) {
      throw new Error('Log Ownership Violation: Event not allowed in this log layer');
    }

    queueMicrotask(() => {
      prisma.activityLog.create({
        data: {
          tenant_id: params.tenant_id,
          user_id: params.user_id,
          action: params.event_type,
          entity: params.entity,
          entity_id: params.entity_id ?? null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      }).catch(err => {
        console.error('[ActivityLogService] failed to save log:', err);
      });
    });
  }
}

export const activityLogService = new ActivityLogService();
