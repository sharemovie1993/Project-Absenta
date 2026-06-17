import { PaymentGateway, PaymentStatus } from '@prisma/client';
import type { WebhookPayload } from '@/types/payment.types';

export async function processWebhookCommand(ctx: {
  prisma: any;
  paymentWorkflow: any;
  paymentFactory: any;
  paymentAudit: any;
  extractInvoiceNumber: (gateway: PaymentGateway, body: any) => string;
  extractTransactionId: (gateway: PaymentGateway, body: any) => string;
  mapPaymentStatus: (status: any) => PaymentStatus;
  appendFileLog: (entry: any) => void;
  logActivity: (tenantId: string, action: string, message: string, metadata?: any) => Promise<void>;
}, gateway: PaymentGateway, payload: WebhookPayload, webhookId?: string): Promise<boolean> {
  try {
    let tenantId = 'unknown';
    let invoice: { billing_id: string } | null = null;
    const invoiceNumber = ctx.extractInvoiceNumber(gateway, (payload as any).body);
    ctx.appendFileLog({ type: 'webhook_processing_started', gateway, invoiceNumber, ts: Date.now(), body: (payload as any).body });

    if (invoiceNumber !== 'unknown') {
      invoice = await ctx.prisma.invoice.findFirst({
        where: { invoice_number: invoiceNumber },
        select: { billing_id: true },
      });

      const payment = await ctx.prisma.payment.findFirst({
        where: {
          OR: [
            { gateway_transaction_id: ctx.extractTransactionId(gateway, (payload as any).body) },
            invoice?.billing_id ? { billing_id: invoice.billing_id } : (undefined as any),
          ].filter(Boolean) as any,
        },
        include: { Billing: { include: { Tenant: true } } },
      });

      if (payment) {
        tenantId = payment.tenant_id;
      }
    }

    if (webhookId) {
      const idempotencyCheck = await ctx.paymentWorkflow.processWebhookWithIdempotency(
        webhookId,
        gateway,
        (payload as any).body,
        tenantId,
      );

      if (!idempotencyCheck.success) {
        console.error('Webhook idempotency check failed:', idempotencyCheck.error);
        return false;
      }

      if (idempotencyCheck.alreadyProcessed) {
        console.log('Webhook already processed, skipping');
        return true;
      }
    }

    const paymentService = ctx.paymentFactory.getPaymentService(gateway);
    const verification = await paymentService.verifyWebhook(payload);

    if (!verification.isValid || !verification.transactionId) {
      if (!verification.transactionId && gateway === PaymentGateway.TRIPAY) {
        const amtReceived = typeof (payload as any).body?.amount_received === 'number' ? Math.round((payload as any).body.amount_received) : undefined;
        const amt = typeof (payload as any).body?.amount === 'number' ? Math.round((payload as any).body.amount) : amtReceived;
        if (amt) {
          const candidate = await ctx.prisma.payment.findFirst({
            where: {
              gateway: PaymentGateway.TRIPAY,
              status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
              amount: amt,
            },
            orderBy: { created_at: 'desc' },
          });
          if (candidate?.gateway_transaction_id) {
            verification.transactionId = candidate.gateway_transaction_id;
            ctx.appendFileLog({ type: 'tripay_fallback_linked', gateway, amount: amt, transactionId: verification.transactionId, ts: Date.now() });
          }
        }
      }
      if (!verification.transactionId) {
        console.error('Invalid webhook received');
        ctx.appendFileLog({ type: 'tripay_verification_invalid', gateway, invoiceNumber, reason: 'invalid_signature_or_missing_transaction_id', ts: Date.now(), body: (payload as any).body });
      }

      if (webhookId) {
        await ctx.paymentAudit.logWebhookActivity({
          webhookId,
          gateway,
          event: (payload as any).body?.event_type || (payload as any).body?.type || 'unknown',
          status: 'failed',
          error: 'Invalid webhook signature or missing transaction ID',
          requestBody: (payload as any).body,
        });
      }

      return false;
    }

    const payment = await ctx.prisma.payment.findFirst({
      where: {
        OR: [
          { gateway_transaction_id: verification.transactionId },
          (payload as any).body?.reference ? { gateway_transaction_id: (payload as any).body.reference } : (undefined as any),
          (payload as any).body?.merchant_ref ? { gateway_transaction_id: (payload as any).body.merchant_ref } : (undefined as any),
          invoice?.billing_id ? { billing_id: invoice.billing_id } : (undefined as any),
        ].filter(Boolean) as any,
      },
      include: {
        Billing: {
          include: { Tenant: true },
        },
      },
    });

    if (!payment) {
      const amtReceived = typeof (payload as any).body?.amount_received === 'number' ? Math.round((payload as any).body.amount_received) : undefined;
      const amt = typeof (payload as any).body?.amount === 'number' ? Math.round((payload as any).body.amount) : amtReceived;
      let fallbackPayment: any = null;
      if (amt) {
        fallbackPayment = await ctx.prisma.payment.findFirst({
          where: {
            gateway,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
            amount: amt,
          },
          include: {
            Billing: { include: { Tenant: true } },
          },
          orderBy: { created_at: 'desc' },
        });
      }

      if (!fallbackPayment) {
        ctx.appendFileLog({ type: 'tripay_payment_not_found', gateway, invoiceNumber, transactionId: verification.transactionId, ts: Date.now(), body: (payload as any).body });
        if (webhookId) {
          await ctx.paymentAudit.logWebhookActivity({
            webhookId,
            gateway,
            event: (payload as any).body?.event_type || (payload as any).body?.type || 'unknown',
            status: 'failed',
            error: `Payment not found for transaction ID: ${verification.transactionId}`,
            requestBody: (payload as any).body,
          });
        }
        return false;
      }

      verification.transactionId = fallbackPayment.gateway_transaction_id;
      const paymentRefetched = await ctx.prisma.payment.findUnique({
        where: { gateway_transaction_id: verification.transactionId },
        include: {
          Billing: { include: { Tenant: true } },
        },
      });
      if (!paymentRefetched) {
        ctx.appendFileLog({ type: 'tripay_payment_not_found_after_fallback', gateway, invoiceNumber, transactionId: verification.transactionId, ts: Date.now(), body: (payload as any).body });
        if (webhookId) {
          await ctx.paymentAudit.logWebhookActivity({
            webhookId,
            gateway,
            event: (payload as any).body?.event_type || (payload as any).body?.type || 'unknown',
            status: 'failed',
            error: `Payment not found after fallback`,
            requestBody: (payload as any).body,
          });
        }
        return false;
      }
      const workflowResult = await ctx.paymentWorkflow.processPaymentStatusUpdate(
        {
          paymentId: paymentRefetched.id,
          tenantId: paymentRefetched.tenant_id,
          gateway,
          webhookId,
          confirmedBy: gateway === PaymentGateway.TRIPAY ? 'TRIPAY_WEBHOOK' : 'SYSTEM',
          correlationId: (payload as any).headers?.['x-correlation-id']
            ? String((payload as any).headers['x-correlation-id'])
            : undefined,
          metadata: {
            originalTransactionId: verification.transactionId,
            webhookPayload: (payload as any).body,
            ipAddress: (payload as any).ipAddress,
          },
        },
        {
          status: ctx.mapPaymentStatus(verification.status!),
          gatewayTransactionId: verification.transactionId,
          gatewayResponse: (payload as any).body,
          failureReason: verification.failureReason,
          processedAt: verification.paidAt || new Date(),
        },
      );

      if (!workflowResult.success) {
        console.error('Payment workflow failed:', workflowResult.error);
        ctx.appendFileLog({ type: 'payment_workflow_failed', gateway, invoiceNumber, transactionId: verification.transactionId, error: workflowResult.error, ts: Date.now() });
        return false;
      }

      if (webhookId) {
        await ctx.paymentAudit.logWebhookActivity({
          webhookId,
          gateway,
          event: (payload as any).body?.event_type || (payload as any).body?.type || 'unknown',
          status: 'completed',
          paymentId: paymentRefetched.id,
          tenantId: paymentRefetched.tenant_id,
          requestBody: (payload as any).body,
          responseStatus: 200,
        });
      }
      ctx.appendFileLog({ type: 'tripay_webhook_completed', gateway, invoiceNumber, transactionId: verification.transactionId, ts: Date.now() });

      return true;
    }

    const workflowResult = await ctx.paymentWorkflow.processPaymentStatusUpdate(
      {
        paymentId: payment.id,
        tenantId: payment.tenant_id,
        gateway,
        webhookId,
        confirmedBy: gateway === PaymentGateway.TRIPAY ? 'TRIPAY_WEBHOOK' : 'SYSTEM',
        correlationId: (payload as any).headers?.['x-correlation-id']
          ? String((payload as any).headers['x-correlation-id'])
          : undefined,
        metadata: {
          originalTransactionId: verification.transactionId,
          webhookPayload: (payload as any).body,
          ipAddress: (payload as any).ipAddress,
        },
      },
      {
        status: ctx.mapPaymentStatus(verification.status!),
        gatewayTransactionId: verification.transactionId,
        gatewayResponse: (payload as any).body,
        failureReason: verification.failureReason,
        processedAt: verification.paidAt || new Date(),
      },
    );

    if (!workflowResult.success) {
      console.error('Payment workflow failed:', workflowResult.error);
      ctx.appendFileLog({ type: 'payment_workflow_failed', gateway, invoiceNumber, transactionId: verification.transactionId, error: workflowResult.error, ts: Date.now() });
      return false;
    }

    if (workflowResult.alreadyProcessed) {
      console.log('Payment already processed by workflow, skipping billing integration');
      return true;
    }

    if (webhookId) {
      await ctx.paymentAudit.logWebhookActivity({
        webhookId,
        gateway,
        event: (payload as any).body?.event_type || (payload as any).body?.type || 'unknown',
        status: 'completed',
        paymentId: payment.id,
        tenantId: payment.tenant_id,
        requestBody: (payload as any).body,
        responseStatus: 200,
      });
    }
    ctx.appendFileLog({ type: 'tripay_webhook_completed', gateway, invoiceNumber, transactionId: verification.transactionId, ts: Date.now() });

    return true;
  } catch (error) {
    console.error('Webhook processing failed:', error);
    ctx.appendFileLog({ type: 'webhook_processing_error', gateway, invoiceNumber: ctx.extractInvoiceNumber(gateway, (payload as any).body), error: (error as any)?.message, ts: Date.now(), body: (payload as any).body });

    await ctx.paymentAudit.logPaymentError({
      error: error as Error,
      gateway,
      webhookId,
      metadata: { payload: (payload as any).body },
      severity: 'high',
    });

    return false;
  }
}

