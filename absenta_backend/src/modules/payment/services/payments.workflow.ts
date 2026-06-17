import { PrismaClient, PaymentStatus, PaymentGateway, PaymentMethod, ObservabilityMetricType } from '@prisma/client';
import { paymentEvents, PaymentEventData, WebhookEventData } from './payments.events';
import { PaymentAudit } from './payments.audit';
import { emitDomainEvent } from '../../../infra/event-bus';
import { observabilityService } from '../../observability/services/observability.service';
import { observabilityAggregationService } from '../../observability/services/observabilityAggregation.service';
import { auditLogService } from '../../audit/services/audit-log.service';

export interface WorkflowContext {
  paymentId: string;
  tenantId: string;
  gateway: string;
  webhookId?: string;
  userId?: string;
  confirmedBy?: 'TRIPAY_WEBHOOK' | 'MANUAL' | 'SYSTEM';
  correlationId?: string;
  metadata?: any;
}

export interface PaymentStatusUpdate {
  status: PaymentStatus;
  gatewayTransactionId?: string;
  gatewayResponse?: any;
  failureReason?: string;
  processedAt?: Date;
}

export class PaymentWorkflow {
  private prisma: PrismaClient;
  private audit: PaymentAudit;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.audit = new PaymentAudit(prisma);
  }

  /**
   * Process payment status update with atomic transaction
   */
  async processPaymentStatusUpdate(
    context: WorkflowContext,
    statusUpdate: PaymentStatusUpdate
  ): Promise<{ success: boolean; payment?: any; error?: string; alreadyProcessed?: boolean }> {
    try {
      // Start atomic transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Check for idempotency (prevent duplicate processing) - ATOMIC GUARD 1
        if (context.webhookId) {
          const existingWebhookLog = await tx.systemEventLog.findFirst({
            where: {
              event_type: 'payment.webhook.processed',
              entity_type: 'PAYMENT_WEBHOOK',
              entity_id: context.webhookId,
              metadata: { path: ['status'], equals: 'PROCESSED' },
            },
          });

          if (existingWebhookLog) {
            await tx.systemEventLog.create({
              data: {
                event_type: 'payment.webhook.processed',
                domain: 'PAYMENT',
                severity: 'WARNING',
                entity_type: 'PAYMENT_WEBHOOK',
                entity_id: context.webhookId,
                tenant_id: context.tenantId,
                correlation_id: context.correlationId ?? null,
                metadata: {
                  status: 'DUPLICATE_IGNORED',
                  payment_id: context.paymentId,
                  gateway: context.gateway,
                  reason: 'Webhook already processed',
                },
              },
            });
            return { alreadyProcessed: true }; 
          }
        }

        // 2. Check if payment exists and get current status
        const currentPayment = await tx.payment.findUnique({
          where: { id: context.paymentId },
          include: {
            Billing: true,
            Tenant: true,
            Invoice: true
          }
        });

        if (!currentPayment) {
          throw new Error(`Payment not found: ${context.paymentId}`);
        }

        // 3. ATOMIC GUARD 2: Check if already SUCCESS or Invoice PAID
        if (statusUpdate.status === PaymentStatus.SUCCESS) {
          if (currentPayment.status === PaymentStatus.SUCCESS) {
            if (context.webhookId) {
              await tx.systemEventLog.create({
                data: {
                  event_type: 'payment.webhook.processed',
                  domain: 'PAYMENT',
                  severity: 'WARNING',
                  entity_type: 'PAYMENT_WEBHOOK',
                  entity_id: context.webhookId,
                  tenant_id: context.tenantId,
                  correlation_id: context.correlationId ?? null,
                  metadata: {
                    status: 'DUPLICATE_IGNORED',
                    payment_id: context.paymentId,
                    gateway: context.gateway,
                    reason: 'Payment already SUCCESS',
                  },
                },
              });
            }
            return { alreadyProcessed: true, payment: currentPayment };
          }
          // Note: We don't check Invoice PAID here strictly because manual intervention might have paid it
          // but we still want to record the payment success if it wasn't recorded.
        }

        // 4. Validate status transition
        const isValidTransition = this.validateStatusTransition(
          currentPayment.status,
          statusUpdate.status
        );

        if (!isValidTransition) {
          throw new Error(
            `Invalid status transition from ${currentPayment.status} to ${statusUpdate.status}`
          );
        }

        // Enforce gateway-source guard: Tripay webhook must map to TRIPAY gateway
        if (context.confirmedBy === 'TRIPAY_WEBHOOK' && currentPayment.gateway !== PaymentGateway.TRIPAY) {
          throw new Error('Gateway mismatch for TRIPAY webhook');
        }

        // 5. ATOMIC UPDATE (Optimistic Locking)
        // Calculate is_first_success
        let isFirstSuccess = false;
        if (statusUpdate.status === PaymentStatus.SUCCESS) {
            // It is first success if it wasn't success before (which we checked above)
            // and confirmed_by is 'TRIPAY_WEBHOOK' (or MANUAL)
            // But strict idempotency logic: "Set is_first_success = true HANYA saat webhook valid, status = SUCCESS, signature valid, belum pernah success sebelumnya"
            if (context.confirmedBy === 'TRIPAY_WEBHOOK' || context.confirmedBy === 'MANUAL') {
                isFirstSuccess = true;
            }
        }

        const updateData: any = {
          status: statusUpdate.status as any,
          gateway_transaction_id: statusUpdate.gatewayTransactionId || currentPayment.gateway_transaction_id,
          gateway_response: statusUpdate.gatewayResponse || currentPayment.gateway_response,
          failure_reason: statusUpdate.failureReason,
          updated_at: new Date(),
          confirmed_by: context.confirmedBy
        };
        
        // Enrichment for Tripay webhook SUCCESS
        if (statusUpdate.status === PaymentStatus.SUCCESS && context.confirmedBy === 'TRIPAY_WEBHOOK') {
          updateData.gateway = PaymentGateway.TRIPAY;
          
          // MAP TRIPAY CODE TO ENUM (Fix for "BNI Virtual Account" string rejection)
          const methodRaw = statusUpdate.gatewayResponse?.payment_method || 
                            statusUpdate.gatewayResponse?.payment_method_code || 
                            statusUpdate.gatewayResponse?.channel || 
                            'unknown';
                            
          if (methodRaw) {
             updateData.payment_method = this.mapTripayPaymentMethod(String(methodRaw));
          }
          // Canonical reference already set via statusUpdate.gatewayTransactionId
        }

        if (statusUpdate.status === PaymentStatus.SUCCESS) {
          updateData.paid_at = statusUpdate.processedAt || new Date();
          if (isFirstSuccess) {
              updateData.is_first_success = true;
          }
        }

        // Use updateMany with status check to prevent race condition
        const updateResult = await tx.payment.updateMany({
          where: { 
            id: context.paymentId,
            status: currentPayment.status // Ensure we only update if status hasn't changed
          },
          data: updateData
        });

        if (updateResult.count === 0) {
          // Race condition detected! Status changed by another transaction
          const refreshed = await tx.payment.findUnique({ 
             where: { id: context.paymentId },
             include: { Billing: true, Invoice: true, Tenant: true }
          });
          if (refreshed?.status === statusUpdate.status) {
             return { alreadyProcessed: true, payment: refreshed };
          }
          throw new Error('Concurrent payment status update detected');
        }

        // Fetch the updated payment for downstream logic
        const updatedPayment = await tx.payment.findUnique({
          where: { id: context.paymentId },
          include: {
            Billing: true,
            Invoice: true,
            Tenant: true
          }
        });

        if (!updatedPayment) throw new Error('Failed to retrieve updated payment');

        // 6. Update invoice status & Subscription Logic (GUARDED)
        // Only if confirmed_by is 'TRIPAY_WEBHOOK' (or MANUAL)
        const isAuthorizedSource = context.confirmedBy === 'TRIPAY_WEBHOOK' || context.confirmedBy === 'MANUAL';
        
        if (statusUpdate.status === PaymentStatus.SUCCESS && isAuthorizedSource) {
          
          const invoiceId = updatedPayment.invoice_id || (updatedPayment.billing_id
            ? (await tx.invoice.findFirst({ where: { billing_id: updatedPayment.billing_id }, select: { id: true } }))?.id
            : undefined);
            
          // SUBSCRIPTION EXTENSION LOGIC (GUARDED BY is_first_success)
          // "Logika WAJIB: if (payment.is_first_success !== true) return;"
          if (updatedPayment.is_first_success) {
              await tx.payment.update({
                where: { id: context.paymentId },
                data: { is_first_success: false }
              });
          }

          (updatedPayment as any).__domain_emit_payment_succeeded =
            (updatedPayment as any)?.Invoice?.status !== 'PAID';
          (updatedPayment as any).__domain_emit_invoice_id = invoiceId || (updatedPayment as any)?.invoice_id || null;
        } else if (statusUpdate.status === PaymentStatus.SUCCESS && !isAuthorizedSource) {
            console.warn(`Payment SUCCESS but unauthorized source: ${context.confirmedBy}. Skipping Invoice/Subscription updates.`);
        }

        if (statusUpdate.status === PaymentStatus.FAILED || statusUpdate.status === PaymentStatus.EXPIRED || statusUpdate.status === PaymentStatus.CANCELLED) {
          (updatedPayment as any).__domain_emit_payment_failed = true;
        }

        // 7. Log webhook processing if applicable
        if (context.webhookId) {
          await tx.systemEventLog.create({
            data: {
              event_type: 'payment.webhook.processed',
              domain: 'PAYMENT',
              severity: statusUpdate.status === PaymentStatus.FAILED ? 'ERROR' : 'INFO',
              entity_type: 'PAYMENT_WEBHOOK',
              entity_id: context.webhookId,
              tenant_id: updatedPayment.tenant_id,
              correlation_id: context.correlationId ?? null,
              metadata: {
                status: 'PROCESSED',
                payment_id: context.paymentId,
                payment_status: statusUpdate.status,
                gateway: context.gateway,
                webhook_id: context.webhookId,
                gateway_transaction_id: statusUpdate.gatewayTransactionId || null,
                processed_at: new Date().toISOString(),
              },
            },
          });
        }

        return updatedPayment;
      });

      // Handle "Already Processed" result from transaction
      if ((result as any).alreadyProcessed) {
        const payment = (result as any).payment;
        const correlationId =
          context.correlationId ||
          context.metadata?.correlation_id ||
          context.metadata?.correlationId ||
          null;
        const tenantId = String(payment?.tenant_id || context.tenantId);
        const amountForEvent =
          typeof payment?.amount === 'number' ? payment.amount : Number(payment?.amount || 0);
        const tsForEvent = (statusUpdate.processedAt instanceof Date ? statusUpdate.processedAt : new Date()).toISOString();
        const invoiceIdForEvent = payment?.invoice_id || payment?.Invoice?.id || null;
        const billingIdForEvent = payment?.billing_id || payment?.Billing?.id || null;

        if (statusUpdate.status === PaymentStatus.SUCCESS && String(payment?.Invoice?.status || '') !== 'PAID') {
          await emitDomainEvent({
            event_type: 'payment.succeeded',
            tenant_id: tenantId,
            source_service: 'payment',
            payload: {
              tenant_id: tenantId,
              payment_id: String(payment?.id || context.paymentId),
              invoice_id: invoiceIdForEvent ? String(invoiceIdForEvent) : null,
              billing_id: billingIdForEvent ? String(billingIdForEvent) : null,
              amount: amountForEvent,
              timestamp: tsForEvent,
              gateway: String(payment?.gateway || context.gateway || ''),
              payment_method: String(payment?.payment_method || ''),
              transaction_id: String(statusUpdate.gatewayTransactionId || payment?.gateway_transaction_id || payment?.id || context.paymentId),
              confirmed_by: context.confirmedBy || payment?.confirmed_by || null,
              correlation_id: correlationId,
            },
          });
        }

        return { success: true, alreadyProcessed: true, payment };
      }

      const correlationId =
        context.correlationId ||
        context.metadata?.correlation_id ||
        context.metadata?.correlationId ||
        null;

      const tenantId = String((result as any)?.tenant_id || context.tenantId);

      const shouldEmitSucceeded = Boolean((result as any).__domain_emit_payment_succeeded);
      const shouldEmitFailed = Boolean((result as any).__domain_emit_payment_failed);
      const invoiceIdForEvent =
        (result as any).__domain_emit_invoice_id ||
        (result as any)?.invoice_id ||
        (result as any)?.Invoice?.id ||
        null;
      const billingIdForEvent =
        (result as any)?.billing_id ||
        (result as any)?.Billing?.id ||
        null;
      const amountForEvent =
        typeof (result as any)?.amount === 'number'
          ? (result as any).amount
          : Number((result as any)?.amount || 0);
      const tsForEvent = (statusUpdate.processedAt instanceof Date ? statusUpdate.processedAt : new Date()).toISOString();

      if (statusUpdate.status === PaymentStatus.SUCCESS) {
        observabilityService.logEvent({
          event_type: 'PAYMENT_SUCCESS',
          domain: 'PAYMENT',
          severity: 'INFO',
          entity_type: 'PAYMENT',
          entity_id: String((result as any)?.id || context.paymentId),
          tenant_id: tenantId,
          correlation_id: correlationId,
          metadata: {
            gateway: String((result as any)?.gateway || context.gateway),
            webhook_id: context.webhookId || null,
            gateway_transaction_id: statusUpdate.gatewayTransactionId || null,
            source: context.metadata?.source || null,
          },
        });
        void observabilityAggregationService.incrementMetric(ObservabilityMetricType.PAYMENT_SUCCESS, tenantId);

        const isFirstSuccess = Boolean((result as any)?.is_first_success);
        const subscriptionId =
          (result as any)?.Billing?.subscription_id ||
          (result as any)?.Invoice?.subscription_id ||
          null;
        const invoiceId =
          (result as any)?.invoice_id ||
          (result as any)?.Invoice?.id ||
          null;

        const billing = (result as any)?.Billing;
        if (
          isFirstSuccess &&
          billing &&
          String(billing.charge_type || '') === 'UPGRADE' &&
          billing.plan_change_request_id
        ) {
          auditLogService.logEvent({
            event_type: 'billing.subscription.plan_changed',
            severity: 'INFO',
            entity_type: 'PLAN_CHANGE_REQUEST',
            entity_id: String(billing.plan_change_request_id),
            tenant_id: String((result as any)?.tenant_id || context.tenantId),
            user_id: context.userId ?? null,
            correlation_id: correlationId,
            metadata: {
              subscription_id: subscriptionId ? String(subscriptionId) : null,
              billing_id: String(billing.id || ''),
              invoice_id: invoiceId ? String(invoiceId) : null,
              payment_id: String((result as any)?.id || context.paymentId),
            },
          });
        }

        if (shouldEmitSucceeded) {
          await emitDomainEvent({
            event_type: 'payment.succeeded',
            tenant_id: tenantId,
            source_service: 'payment',
            payload: {
              tenant_id: tenantId,
              payment_id: String((result as any)?.id || context.paymentId),
              invoice_id: invoiceIdForEvent ? String(invoiceIdForEvent) : null,
              billing_id: billingIdForEvent ? String(billingIdForEvent) : null,
              amount: amountForEvent,
              timestamp: tsForEvent,
              gateway: String((result as any)?.gateway || context.gateway || ''),
              payment_method: String((result as any)?.payment_method || ''),
              transaction_id: String(statusUpdate.gatewayTransactionId || (result as any)?.gateway_transaction_id || (result as any)?.id || context.paymentId),
              confirmed_by: context.confirmedBy || null,
              correlation_id: correlationId,
            },
          });
        }
      } else if (statusUpdate.status === PaymentStatus.FAILED) {
        observabilityService.logEvent({
          event_type: 'payment.failed',
          domain: 'PAYMENT',
          severity: 'ERROR',
          entity_type: 'PAYMENT',
          entity_id: String((result as any)?.id || context.paymentId),
          tenant_id: tenantId,
          correlation_id: correlationId,
          metadata: {
            gateway: String((result as any)?.gateway || context.gateway),
            webhook_id: context.webhookId || null,
            gateway_transaction_id: statusUpdate.gatewayTransactionId || null,
            source: context.metadata?.source || null,
            failure_reason: statusUpdate.failureReason || null,
          },
        });
        void observabilityAggregationService.incrementMetric(ObservabilityMetricType.PAYMENT_FAILED, tenantId);
      }

      if (shouldEmitFailed) {
        await emitDomainEvent({
          event_type: 'payment.failed',
          tenant_id: tenantId,
          source_service: 'payment',
          payload: {
            tenant_id: tenantId,
            payment_id: String((result as any)?.id || context.paymentId),
            invoice_id: invoiceIdForEvent ? String(invoiceIdForEvent) : null,
            billing_id: billingIdForEvent ? String(billingIdForEvent) : null,
            amount: amountForEvent,
            timestamp: tsForEvent,
            gateway: String((result as any)?.gateway || context.gateway || ''),
            payment_method: String((result as any)?.payment_method || ''),
            transaction_id: String(statusUpdate.gatewayTransactionId || (result as any)?.gateway_transaction_id || (result as any)?.id || context.paymentId),
            failure_reason: statusUpdate.failureReason || null,
            status: String(statusUpdate.status),
            confirmed_by: context.confirmedBy || null,
            correlation_id: correlationId,
          },
        });
      }

      // 9. Emit real-time events
      this.emitPaymentUpdateEvent(result, context);

      return { success: true, payment: result };

    } catch (error) {
      console.error('Payment workflow error:', error);
      
      // Log failed attempt
      await this.audit.logPaymentError({
        paymentId: context.paymentId,
        tenantId: context.tenantId,
        error: error as Error,
        gateway: context.gateway,
        webhookId: context.webhookId,
        metadata: context.metadata
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Validate payment status transition
   */
  private validateStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): boolean {
    const validTransitions: { [key in PaymentStatus]?: PaymentStatus[] } = {
      [PaymentStatus.PENDING]: [PaymentStatus.PENDING, PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.EXPIRED],
      [PaymentStatus.SUCCESS]: [], 
      [PaymentStatus.FAILED]: [PaymentStatus.PENDING, PaymentStatus.SUCCESS],
      [PaymentStatus.CANCELLED]: [PaymentStatus.PENDING, PaymentStatus.SUCCESS],
      [PaymentStatus.EXPIRED]: [PaymentStatus.SUCCESS]
    };

    return (validTransitions[currentStatus] || []).includes(newStatus);
  }

  /**
   * Emit payment update event
   */
  private emitPaymentUpdateEvent(payment: any, context: WorkflowContext): void {
    const eventData: PaymentEventData = {
      paymentId: payment.id,
      tenantId: payment.tenant_id,
      status: payment.status,
      gateway: payment.gateway,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      orderId: payment.order_id,
      invoiceNumber: payment.Invoice?.invoice_number,
      timestamp: new Date(),
      metadata: {
        gatewayTransactionId: payment.gateway_transaction_id,
        webhookId: context.webhookId,
        ...context.metadata
      }
    };

    paymentEvents.emitPaymentUpdate(eventData);
  }

  /**
   * Process webhook with idempotency check
   */
  async processWebhookWithIdempotency(
    webhookId: string,
    gateway: string,
    payload: any,
    tenantId?: string
  ): Promise<{ success: boolean; alreadyProcessed: boolean; error?: string }> {
    try {
      // Check if webhook was already processed
      const existingLog = await this.prisma.systemEventLog.findFirst({
        where: {
          event_type: 'payment.webhook.processed',
          entity_type: 'PAYMENT_WEBHOOK',
          entity_id: webhookId,
          metadata: { path: ['status'], equals: 'PROCESSED' },
        }
      });

      if (existingLog) {
        console.log(`Webhook already processed: ${webhookId}`);
        return { success: true, alreadyProcessed: true };
      }

      // Emit webhook event
      const webhookEventData: WebhookEventData = {
        webhookId,
        gateway,
        event: payload.event_type || payload.type || 'unknown',
        status: 'processing',
        tenantId,
        timestamp: new Date()
      };

      paymentEvents.emitWebhookEvent(webhookEventData);

      return { success: true, alreadyProcessed: false };

    } catch (error) {
      console.error('Webhook idempotency check error:', error);
      return { 
        success: false, 
        alreadyProcessed: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Map Tripay payment method code/name to PaymentMethod Enum
   */
  private mapTripayPaymentMethod(codeOrName: string): PaymentMethod {
    const s = codeOrName.toUpperCase();
    
    if (s.includes('QRIS') || s.includes('QR')) return PaymentMethod.QRIS;
    if (s.includes('VIRTUAL') || s.includes('VA') || s.includes('BANK') || s.includes('TRANSFER')) return PaymentMethod.BANK_TRANSFER;
    if (s.includes('ALFA') || s.includes('INDO') || s.includes('RETAIL')) return PaymentMethod.CASH;
    if (s.includes('WALLET') || s.includes('OVO') || s.includes('DANA') || s.includes('GOPAY') || s.includes('SHOPEE')) return PaymentMethod.E_WALLET;
    if (s.includes('CREDIT') || s.includes('CARD') || s.includes('VISA') || s.includes('MASTER')) return PaymentMethod.CREDIT_CARD;

    // Specific Tripay Codes (from Docs)
    if (['MYBVA', 'PERMATAVA', 'BNIVA', 'BRIVA', 'MANDIRIVA', 'BCAVA', 'CIMBVA', 'BSIVA', 'DANAMONVA', 'OCBCVA'].includes(s)) return PaymentMethod.BANK_TRANSFER;
    if (['ALFAMART', 'ALFAMIDI', 'INDOMARET'].includes(s)) return PaymentMethod.CASH;
    if (['OVO', 'DANA', 'GOPAY', 'SHOPEEPAY', 'LINKAJA'].includes(s)) return PaymentMethod.E_WALLET;

    return PaymentMethod.BANK_TRANSFER; // Default fallback
  }

  /**
   * Get payment workflow status
   */
  async getPaymentWorkflowStatus(paymentId: string): Promise<{
    payment?: any;
    webhookLogs: any[];
    auditLogs: any[];
    currentStatus: string;
  }> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          Billing: true,
          Tenant: true
        }
      });

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      const webhookLogs = await this.prisma.systemEventLog.findMany({
        where: {
          event_type: 'payment.webhook.processed',
          domain: 'PAYMENT',
          metadata: { path: ['payment_id'], equals: paymentId },
        },
        orderBy: { created_at: 'desc' },
      });

      const auditLogs = await this.audit.getPaymentAuditLogs(paymentId);

      return {
        payment,
        webhookLogs,
        auditLogs,
        currentStatus: payment.status
      };

    } catch (error) {
      console.error('Get payment workflow status error:', error);
      throw error;
    }
  }
}
