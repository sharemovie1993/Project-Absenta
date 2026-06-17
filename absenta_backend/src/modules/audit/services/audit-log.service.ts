import { prisma } from '../../../utils/prisma';
import { AUDIT_LOG_ALLOWED_EVENTS } from '../../../constants/logOwnership';

type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type AuditLogEventParams = {
  event_type: string;
  severity: AuditSeverity;
  entity_type: string;
  entity_id: string;
  tenant_id: string | null;
  user_id?: string | null;
  correlation_id?: string | null;
  metadata?: Record<string, any>;
};

export class AuditLogService {
  logEvent(params: AuditLogEventParams): void {
    if (!AUDIT_LOG_ALLOWED_EVENTS.includes(params.event_type as any)) {
      throw new Error('Log Ownership Violation: Event not allowed in this log layer');
    }

    queueMicrotask(() => {
      void prisma.systemEventLog.create({
        data: {
          event_type: params.event_type,
          domain: 'AUDIT',
          severity: params.severity,
          entity_type: params.entity_type,
          entity_id: params.entity_id,
          tenant_id: params.tenant_id,
          correlation_id: params.correlation_id ?? null,
          metadata: {
            ...(params.metadata || {}),
            user_id: params.user_id ?? null,
          },
        },
      });
    });
  }
}

export const auditLogService = new AuditLogService();
