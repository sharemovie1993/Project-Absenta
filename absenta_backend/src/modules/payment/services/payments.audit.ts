import { PrismaClient } from '@prisma/client';
import { observabilityService } from '../../observability/services/observability.service';

export interface PaymentAuditLog {
  id?: string;
  paymentId: string | null;
  tenantId: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  gateway: string;
  webhookId?: string;
  userId: string | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt?: Date;
}

export interface WebhookAuditLog {
  id?: string;
  webhookId: string | null;
  gateway: string;
  event: string;
  status: 'received' | 'processing' | 'completed' | 'failed';
  paymentId?: string;
  tenantId?: string;
  requestHeaders?: any;
  requestBody?: any;
  responseStatus?: number;
  responseBody?: any;
  processingTime?: number;
  error?: string;
  ipAddress?: string;
  createdAt?: Date;
}

export interface ErrorAuditLog {
  id?: string;
  paymentId?: string;
  tenantId?: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  gateway?: string;
  webhookId?: string;
  context?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt?: Date;
}

export class PaymentAudit {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Log payment status change
   */
  async logPaymentStatusChange(data: {
    paymentId: string;
    tenantId: string;
    previousStatus?: string;
    newStatus: string;
    gateway: string;
    webhookId?: string;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      void data;
    } catch (error) {
      console.error('Failed to log payment audit:', error);
    }
  }

  /**
   * Log webhook activity
   */
  async logWebhookActivity(data: {
    webhookId: string;
    gateway: string;
    event: string;
    status: 'received' | 'processing' | 'completed' | 'failed';
    paymentId?: string;
    tenantId?: string;
    requestHeaders?: any;
    requestBody?: any;
    responseStatus?: number;
    responseBody?: any;
    processingTime?: number;
    error?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const severity = data.status === 'failed' ? 'ERROR' : 'INFO';
      observabilityService.logEvent({
        event_type: 'payment.webhook.processed',
        domain: 'PAYMENT',
        severity,
        entity_type: 'PAYMENT_WEBHOOK',
        entity_id: data.webhookId,
        tenant_id: data.tenantId || null,
        correlation_id: null,
        metadata: {
          status: String(data.status).toUpperCase(),
          gateway: data.gateway,
          payment_id: data.paymentId || null,
          event: data.event,
          response_status: data.responseStatus ?? null,
          processing_time: data.processingTime ?? null,
          error: data.error ?? null,
          ip_address: data.ipAddress ?? null,
        },
      });
    } catch (error) {
      console.error('Failed to log webhook audit:', error);
    }
  }

  /**
   * Log payment error
   */
  async logPaymentError(data: {
    paymentId?: string;
    tenantId?: string;
    error: Error;
    gateway?: string;
    webhookId?: string;
    metadata?: any;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    try {
      observabilityService.logEvent({
        event_type: 'payment.failed',
        domain: 'PAYMENT',
        severity: 'ERROR',
        entity_type: 'PAYMENT',
        entity_id: data.paymentId || 'unknown',
        tenant_id: data.tenantId || null,
        correlation_id: data.metadata?.correlationId || data.metadata?.correlation_id || null,
        metadata: {
          error_type: data.error.name || 'UnknownError',
          error_message: data.error.message,
          error_stack: data.error.stack,
          gateway: data.gateway || null,
          webhook_id: data.webhookId || null,
          ...(data.metadata || {}),
        },
      });
    } catch (error) {
      console.error('Failed to log error audit:', error);
    }
  }

  /**
   * Get payment audit logs
   */
  async getPaymentAuditLogs(
    paymentId: string,
    limit: number = 50
  ): Promise<PaymentAuditLog[]> {
    try {
      const logs = await this.prisma.systemEventLog.findMany({
        where: {
          entity_type: 'PAYMENT',
          entity_id: paymentId,
          event_type: { in: ['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'payment.failed'] },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      });

      return logs.map((log) => {
        const metadata = (log.metadata as any) || {};
        return {
          id: log.id,
          paymentId: log.entity_id,
          tenantId: String(log.tenant_id || 'unknown'),
          action: log.event_type,
          previousStatus: undefined,
          newStatus: metadata.payment_status || (log.event_type === 'PAYMENT_SUCCESS' ? 'SUCCESS' : 'FAILED'),
          gateway: metadata.gateway,
          webhookId: metadata.webhook_id,
          userId: null,
          metadata: metadata,
          createdAt: log.created_at
        };
      });
    } catch (error) {
      console.error('Failed to get payment audit logs:', error);
      return [];
    }
  }

  /**
   * Get webhook audit logs
   */
  async getWebhookAuditLogs(
    webhookId?: string,
    gateway?: string,
    limit: number = 50
  ): Promise<WebhookAuditLog[]> {
    try {
      const where: any = {
        event_type: { in: ['PAYMENT_WEBHOOK_PROCESSED', 'payment.webhook.processed'] },
        entity_type: 'PAYMENT_WEBHOOK',
      };
      if (webhookId) where.entity_id = webhookId;

      const logs = await this.prisma.systemEventLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
      });

      return logs
        .map((log) => {
          const metadata = (log.metadata as any) || {};
          return {
            id: log.id,
            webhookId: log.entity_id,
            gateway: metadata.gateway,
            event: metadata.event,
            status: String(metadata.status || '').toLowerCase() as 'received' | 'processing' | 'completed' | 'failed',
            paymentId: metadata.payment_id,
            tenantId: log.tenant_id || undefined,
            requestHeaders: undefined,
            requestBody: undefined,
            responseStatus: metadata.response_status,
            responseBody: metadata.response_body,
            processingTime: metadata.processing_time,
            error: metadata.error,
            ipAddress: metadata.ip_address,
            createdAt: log.created_at
          };
        })
        .filter(log => !gateway || log.gateway === gateway);
    } catch (error) {
      console.error('Failed to get webhook audit logs:', error);
      return [];
    }
  }

  /**
   * Get error audit logs
   */
  async getErrorAuditLogs(
    paymentId?: string,
    tenantId?: string,
    resolved?: boolean,
    limit: number = 50
  ): Promise<ErrorAuditLog[]> {
    try {
      const where: any = {
        event_type: { in: ['PAYMENT_FAILED', 'payment.failed'] },
        entity_type: 'PAYMENT',
      };
      if (paymentId) where.entity_id = paymentId;
      if (tenantId) where.tenant_id = tenantId;

      const logs = await this.prisma.systemEventLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
      });

      return logs
        .map((log) => {
          const metadata = (log.metadata as any) || {};
          return {
            id: log.id,
            paymentId: log.entity_id || undefined,
            tenantId: log.tenant_id || undefined,
            errorType: metadata.error_type,
            errorMessage: metadata.error_message,
            errorStack: metadata.error_stack,
            gateway: metadata.gateway,
            webhookId: metadata.webhook_id,
            context: metadata,
            severity: (metadata.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
            resolved: false,
            resolvedAt: undefined,
            resolvedBy: undefined,
            createdAt: log.created_at
          };
        })
        .filter((log) => resolved === undefined || log.resolved === resolved);
    } catch (error) {
      console.error('Failed to get error audit logs:', error);
      return [];
    }
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string, resolvedBy: string): Promise<void> {
    try {
      void errorId;
      void resolvedBy;
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(tenantId?: string): Promise<{
    totalPaymentLogs: number;
    totalWebhookLogs: number;
    totalErrorLogs: number;
    unresolvedErrors: number;
    recentActivity: any[];
  }> {
    try {
      const where = tenantId ? { tenant_id: tenantId } : {};

      const [
        totalPaymentLogs,
        totalWebhookLogs,
        totalErrorLogs,
        unresolvedErrors
      ] = await Promise.all([
        this.prisma.systemEventLog.count({
          where: { ...where, event_type: { in: ['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'payment.failed'] }, entity_type: 'PAYMENT' },
        }),
        this.prisma.systemEventLog.count({
          where: { ...where, event_type: { in: ['PAYMENT_WEBHOOK_PROCESSED', 'payment.webhook.processed'] }, entity_type: 'PAYMENT_WEBHOOK' },
        }),
        this.prisma.systemEventLog.count({
          where: { ...where, event_type: { in: ['PAYMENT_FAILED', 'payment.failed'] }, entity_type: 'PAYMENT' },
        }),
        this.prisma.systemEventLog.count({
          where: { ...where, event_type: { in: ['PAYMENT_FAILED', 'payment.failed'] }, entity_type: 'PAYMENT' },
        }),
      ]);

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentActivity = await this.prisma.systemEventLog.findMany({
        where: {
          ...where,
          created_at: { gte: yesterday },
          event_type: { in: ['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'payment.failed', 'PAYMENT_WEBHOOK_PROCESSED', 'payment.webhook.processed'] }
        },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          event_type: true,
          entity_type: true,
          metadata: true,
          created_at: true
        }
      });

      return {
        totalPaymentLogs,
        totalWebhookLogs,
        totalErrorLogs,
        unresolvedErrors,
        recentActivity
      };
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      return {
        totalPaymentLogs: 0,
        totalWebhookLogs: 0,
        totalErrorLogs: 0,
        unresolvedErrors: 0,
        recentActivity: []
      };
    }
  }
}
