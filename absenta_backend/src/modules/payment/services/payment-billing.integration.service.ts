import { PrismaClient, InvoiceStatus, PaymentStatus, PaymentGateway, PaymentMethod } from '@prisma/client';
import { PaymentResponse, CustomerInfo } from '../../../types/payment.types';
import { DataScope } from '../../../types/fastify';
import { emitDomainEvent } from '../../../infra/event-bus';
import { systemConfigService } from '../../system-config/services/system-config.service';
import { paymentConfig } from '../../../config/payment.config';


export class PaymentBillingIntegrationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create payment for a billing record
   */
  async createPaymentForBilling(
    billingId: string,
    gateway: PaymentGateway,
    method: PaymentMethod,
    channelCode?: string,
    customerInfo?: CustomerInfo,
    scope: DataScope = {}
  ): Promise<PaymentResponse> {
    const billing = await this.prisma.billing.findFirst({
      where: {
        id: billingId,
        ...(scope.tenantId ? { tenant_id: scope.tenantId } : {}),
      } as any,
      include: {
        Invoice: true,
        Subscription: {
          include: {
            Tenant: true,
            Plan: true,
          },
        },
      } as any,
    });
    if (!billing) {
      throw new Error('Billing record not found');
    }

    const billingInvoice = Array.isArray((billing as any).Invoice)
      ? (billing as any).Invoice[0]
      : (billing as any).Invoice;

    if (billingInvoice && billingInvoice.status === InvoiceStatus.PAID) {
      throw new Error('Invoice is already paid');
    }

    // Check if there's already a pending payment for this billing
    const existingPendingPayment = await this.prisma.payment.findFirst({
      where: {
        billing_id: billingId,
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING]
        }
      }
    });

    if (existingPendingPayment) {
      throw new Error('There is already a pending payment for this billing');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { billing_id: billingId },
      select: { id: true, status: true },
    });
    if (invoice && invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Invoice is cancelled');
    }
    if (invoice && invoice.status === InvoiceStatus.DRAFT) {
      try {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.SENT, sent_at: new Date(), updated_at: new Date() },
        });
      } catch {}
    }

    const isManual = gateway === PaymentGateway.MANUAL;
    if (isManual) {
      const now = new Date();
      // Generate a manual order ID
      const orderId = `manual_${billingId.substring(0, 8)}_${Date.now()}`;
      
      // Get system config for bank details
      const tenantConfig = await systemConfigService.getActive((billing as any).tenant_id);
      const bankName = (tenantConfig as any)?.company_bank_name || paymentConfig.manual?.bankName || 'BANK MANDIRI';
      const accountNumber = (tenantConfig as any)?.company_bank_account || paymentConfig.manual?.accountNumber || '1234567890';
      const accountHolder = (tenantConfig as any)?.company_bank_holder || paymentConfig.manual?.accountHolder || 'PT BARAYA TEKNOLOGI INDONESIA';

      const payment = await this.prisma.payment.create({
        data: {
          tenant_id: (billing as any).tenant_id,
          billing_id: billingId,
          invoice_id: invoice?.id,
          gateway: gateway,
          payment_method: method,
          amount: billing.amount,
          status: PaymentStatus.PENDING,
          gateway_transaction_id: orderId,
          gateway_response: {
            type: 'MANUAL_TRANSFER',
            bank: bankName,
            account: accountNumber,
            holder: accountHolder,
            instructions: 'Menunggu unggahan bukti transfer'
          },
          created_at: now,
          updated_at: now
        }
      });

      await this.prisma.billing.update({
        where: { id: billingId },
        data: {
          payment_method: method as any,
          payment_reference: payment.id,
          updated_at: new Date(),
        } as any,
      });

      return {
        id: payment.id,
        status: payment.status,
        gatewayTransactionId: orderId,
        message: 'Pesanan manual berhasil dibuat. Silakan unggah bukti transfer.'
      } as any;
    }


    const { PaymentService } = await import('./payment.service');
    const paymentService = new PaymentService();
    const response = await paymentService.createPayment({
      billingId,
      gateway,
      paymentMethod: method,
      amount: Number(billing.amount),
      currency: 'IDR',
      channelCode,
      customerInfo
    });

    const created = await this.prisma.payment.findUnique({
      where: { id: response.id }
    });

    if (created) {
      await this.prisma.billing.update({
        where: { id: billingId },
        data: {
          payment_method: method as any,
          payment_reference: created.id,
          updated_at: new Date(),
        } as any,
      });
    }

    return response;
  }

  /**
   * Handle successful payment and update billing
   */
  async handleSuccessfulPayment(paymentId: string, correlationId?: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        Billing: {
          include: {
            Tenant: true,
            Invoice: true,
            Subscription: true
          }
        }
      }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new Error('Payment is not successful');
    }

    const billing = payment.Billing;
    if (!billing) {
      throw new Error('Associated billing not found');
    }

    const ts = (payment.paid_at instanceof Date ? payment.paid_at : new Date()).toISOString();
    await emitDomainEvent({
      event_type: 'payment.succeeded',
      tenant_id: String(payment.tenant_id || billing.tenant_id || ''),
      source_service: 'payment',
      payload: {
        tenant_id: String(payment.tenant_id || billing.tenant_id || ''),
        payment_id: String(payment.id),
        invoice_id: payment.invoice_id ? String(payment.invoice_id) : (billing as any)?.Invoice?.id ? String((billing as any).Invoice.id) : null,
        billing_id: billing?.id ? String(billing.id) : null,
        amount: Number(payment.amount || 0),
        timestamp: ts,
        gateway: String(payment.gateway || ''),
        payment_method: String(payment.payment_method || ''),
        transaction_id: String(payment.gateway_transaction_id || payment.id),
        confirmed_by: String((payment as any).confirmed_by || 'TRIPAY_WEBHOOK'),
        correlation_id: correlationId || null,
      },
    });
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(paymentId: string, reason?: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        Billing: {
          include: {
          Tenant: true
        }
        }
      }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const billing = payment.Billing;
    if (!billing) {
      throw new Error('Associated billing not found');
    }

    await emitDomainEvent({
      event_type: 'payment.failed',
      tenant_id: String(payment.tenant_id || billing.tenant_id || ''),
      source_service: 'payment',
      payload: {
        tenant_id: String(payment.tenant_id || billing.tenant_id || ''),
        payment_id: String(payment.id),
        invoice_id: payment.invoice_id ? String(payment.invoice_id) : null,
        billing_id: billing?.id ? String(billing.id) : null,
        amount: Number(payment.amount || 0),
        timestamp: new Date().toISOString(),
        gateway: String(payment.gateway || ''),
        payment_method: String(payment.payment_method || ''),
        transaction_id: String(payment.gateway_transaction_id || payment.id),
        failure_reason: reason || null,
        status: String(payment.status || ''),
      },
    });
  }

  /**
   * Handle cancelled payment
   */
  async handleCancelledPayment(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { Billing: true }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const billing = payment.Billing;
    if (!billing) {
      throw new Error('Associated billing not found');
    }

    await emitDomainEvent({
      event_type: 'payment.failed',
      tenant_id: String(payment.tenant_id || billing.tenant_id || ''),
      source_service: 'payment',
      payload: {
        tenant_id: String(payment.tenant_id || billing.tenant_id || ''),
        payment_id: String(payment.id),
        invoice_id: payment.invoice_id ? String(payment.invoice_id) : null,
        billing_id: billing?.id ? String(billing.id) : null,
        amount: Number(payment.amount || 0),
        timestamp: new Date().toISOString(),
        gateway: String(payment.gateway || ''),
        payment_method: String(payment.payment_method || ''),
        transaction_id: String(payment.gateway_transaction_id || payment.id),
        failure_reason: 'cancelled',
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Get payment history for a billing
   */
  async getPaymentHistoryForBilling(billingId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { billing_id: billingId },
      orderBy: { created_at: 'desc' },
      include: {
        Billing: {
          include: {
            Invoice: true
          }
        }
      }
    });

    return payments;
  }

  /**
   * Get billing summary with payment information
   */
  async getBillingWithPaymentSummary(billingId: string, scope?: DataScope) {
    const tenantId = scope?.tenantId ? String(scope.tenantId) : null;
    const billing = await this.prisma.billing.findFirst({
      where: {
        id: billingId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      } as any,
      include: {
        Invoice: true,
        Subscription: {
          include: {
            Tenant: true,
            Plan: true,
          },
        },
      } as any,
    });
    if (!billing) {
      throw new Error('Billing not found');
    }
    
    const payments = await this.getPaymentHistoryForBilling(billingId);

    const paymentSummary = {
      total_payment_attempts: payments.length,
      successful_payments: payments.filter(p => p.status === PaymentStatus.SUCCESS).length,
      failed_payments: payments.filter(p => p.status === PaymentStatus.FAILED).length,
      pending_payments: payments.filter(p => p.status === PaymentStatus.PENDING).length,
      cancelled_payments: payments.filter(p => p.status === PaymentStatus.CANCELLED).length,
      last_payment_attempt: payments[0] || null,
      preferred_gateway: this.getPreferredGateway(payments),
      preferred_method: this.getPreferredMethod(payments)
    };

    return {
      billing,
      payments,
      payment_summary: paymentSummary
    };
  }

  /**
   * Get preferred payment gateway based on success rate
   */
  private getPreferredGateway(payments: any[]): PaymentGateway | null {
    if (payments.length === 0) return null;

    const gatewayStats = payments.reduce((acc, payment) => {
      const gateway = payment.gateway;
      if (!acc[gateway]) {
        acc[gateway] = { total: 0, success: 0 };
      }
      acc[gateway].total++;
      if (payment.status === PaymentStatus.SUCCESS) {
        acc[gateway].success++;
      }
      return acc;
    }, {} as Record<string, { total: number; success: number }>);

    let bestGateway = null;
    let bestSuccessRate = -1;

    for (const [gateway, stats] of Object.entries(gatewayStats)) {
      const successRate = (stats as { total: number; success: number }).success / (stats as { total: number; success: number }).total;
      if (successRate > bestSuccessRate) {
        bestSuccessRate = successRate;
        bestGateway = gateway as PaymentGateway;
      }
    }

    return bestGateway;
  }

  /**
   * Get preferred payment method based on success rate
   */
  private getPreferredMethod(payments: any[]): PaymentMethod | null {
    if (payments.length === 0) return null;

    const methodStats = payments.reduce((acc, payment) => {
      const method = payment.method;
      if (!acc[method]) {
        acc[method] = { total: 0, success: 0 };
      }
      acc[method].total++;
      if (payment.status === PaymentStatus.SUCCESS) {
        acc[method].success++;
      }
      return acc;
    }, {} as Record<string, { total: number; success: number }>);

    let bestMethod = null;
    let bestSuccessRate = -1;

    for (const [method, stats] of Object.entries(methodStats)) {
      const successRate = (stats as { total: number; success: number }).success / (stats as { total: number; success: number }).total;
      if (successRate > bestSuccessRate) {
        bestSuccessRate = successRate;
        bestMethod = method as PaymentMethod;
      }
    }

    return bestMethod;
  }

  /**
   * Auto-retry failed payments with different gateway/method
   */
  async autoRetryFailedPayment(paymentId: string, _userId: string): Promise<PaymentResponse | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { Billing: true }
    });

    if (!payment || !payment.Billing) {
      throw new Error('Payment or billing not found');
    }

    if (payment.status !== PaymentStatus.FAILED) {
      throw new Error('Payment is not in failed status');
    }

    // Get payment history to determine best alternative
    const paymentHistory = await this.getPaymentHistoryForBilling(payment.billing_id);
    const preferredGateway = this.getPreferredGateway(paymentHistory);
    const preferredMethod = this.getPreferredMethod(paymentHistory);

    // Use different gateway/method than the failed one
    let retryGateway = preferredGateway || PaymentGateway.MIDTRANS;
    let retryMethod = preferredMethod || PaymentMethod.QRIS;

    if (retryGateway === payment.gateway) {
      // Try different gateway
      const gateways = Object.values(PaymentGateway).filter(g => g !== payment.gateway);
      retryGateway = gateways[0] || PaymentGateway.MIDTRANS;
    }

    if (retryMethod === payment.payment_method) {
      // Try different method
      const methods = Object.values(PaymentMethod).filter(m => m !== payment.payment_method);
      retryMethod = methods[0] || PaymentMethod.BANK_TRANSFER;
    }

    try {
      return await this.createPaymentForBilling(
        payment.billing_id,
        retryGateway,
        retryMethod
      );
    } catch (error) {
      console.error('Auto-retry failed:', error);
      return null;
    }
  }
}
