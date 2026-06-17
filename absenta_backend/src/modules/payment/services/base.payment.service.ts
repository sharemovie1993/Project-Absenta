import { PrismaClient, PaymentGateway, PaymentStatus, PaymentMethod } from '@prisma/client';
import { 
  CreatePaymentRequest, 
  PaymentResponse, 
  WebhookPayload, 
  WebhookVerificationResult,
  PaymentService 
} from '../../../types/payment.types';

export abstract class BasePaymentService implements PaymentService {
  protected prisma: PrismaClient;
  protected gateway: PaymentGateway;

  constructor(prisma: PrismaClient, gateway: PaymentGateway) {
    this.prisma = prisma;
    this.gateway = gateway;
  }

  abstract createPayment(request: CreatePaymentRequest): Promise<PaymentResponse>;
  abstract verifyWebhook(payload: WebhookPayload): Promise<WebhookVerificationResult>;
  abstract getPaymentStatus(gatewayTransactionId: string): Promise<PaymentResponse>;
  abstract cancelPayment(gatewayTransactionId: string): Promise<boolean>;

  /**
   * Create payment record in database
   */
  protected async createPaymentRecord(
    tenantId: string,
    billingId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    gatewayTransactionId?: string,
    gatewayPaymentUrl?: string,
    gatewayQrString?: string,
    gatewayResponse?: any,
    expiresAt?: Date
  ) {
    // Try to resolve invoice_id from billing_id to link Payment↔Invoice explicitly
    const invoice = await this.prisma.invoice.findFirst({
      where: { billing_id: billingId },
      select: { id: true },
    });

    return await this.prisma.payment.create({
      data: {
        tenant_id: tenantId,
        billing_id: billingId,
        invoice_id: invoice?.id,
        gateway: this.gateway,
        payment_method: paymentMethod,
        amount,
        currency: 'IDR',
        status: PaymentStatus.PENDING,
        gateway_transaction_id: gatewayTransactionId,
        gateway_payment_url: gatewayPaymentUrl,
        gateway_qr_string: gatewayQrString,
        gateway_response: gatewayResponse,
        expired_at: expiresAt,
      },
    });
  }

  /**
   * Update payment status
   */
  protected async updatePaymentStatus(
    gatewayTransactionId: string,
    status: PaymentStatus,
    paidAt?: Date,
    failureReason?: string,
    webhookData?: any
  ) {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (paidAt) {
      updateData.paid_at = paidAt;
    }

    if (failureReason) {
      updateData.failure_reason = failureReason;
    }

    if (webhookData) {
      updateData.webhook_received_at = new Date();
      updateData.webhook_verified = true;
      updateData.gateway_response = webhookData;
    }

    return await this.prisma.payment.update({
      where: { gateway_transaction_id: gatewayTransactionId },
      data: updateData,
    });
  }

  /**
   * Get payment by gateway transaction ID
   */
  protected async getPaymentByGatewayId(gatewayTransactionId: string) {
    return await this.prisma.payment.findUnique({
      where: { gateway_transaction_id: gatewayTransactionId },
      include: {
        Billing: {
          include: {
            Tenant: true,
            Subscription: true,
          },
        },
      },
    });
  }

  /**
   * Update invoice status when payment is successful
   */
  protected async updateBillingStatus(billingId: string, paidAt: Date) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { billing_id: billingId },
      select: { id: true }
    });

    if (!invoice) {
      return null;
    }

    return await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paid_at: paidAt,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Generate unique order ID
   */
  protected generateOrderId(billingId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.gateway.toLowerCase()}-${billingId.substring(0, 8)}-${timestamp}-${random}`;
  }

  /**
   * Calculate expiry date
   */
  protected calculateExpiryDate(minutes: number = 1440): Date {
    const now = new Date();
    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  /**
   * Format amount for gateway (some gateways require cents, others require full amount)
   */
  protected formatAmount(amount: number, gateway: PaymentGateway): number {
    switch (gateway) {
      case PaymentGateway.STRIPE:
        // Stripe requires amount in cents
        return amount * 100;
      case PaymentGateway.MIDTRANS:
      case PaymentGateway.XENDIT:
      default:
        // Midtrans and Xendit use full amount
        return amount;
    }
  }

  /**
   * Map gateway status to our PaymentStatus enum
   */
  protected mapGatewayStatus(gatewayStatus: string, gateway: PaymentGateway): PaymentStatus {
    switch (gateway) {
      case PaymentGateway.MIDTRANS:
        return this.mapMidtransStatus(gatewayStatus);
      case PaymentGateway.STRIPE:
        return this.mapStripeStatus(gatewayStatus);
      case PaymentGateway.XENDIT:
        return this.mapXenditStatus(gatewayStatus);
      case PaymentGateway.TRIPAY:
        return this.mapTripayStatus(gatewayStatus);
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapMidtransStatus(status: string): PaymentStatus {
    switch (status.toLowerCase()) {
      case 'capture':
      case 'settlement':
        return PaymentStatus.SUCCESS;
      case 'pending':
        return PaymentStatus.PENDING;
      case 'deny':
      case 'cancel':
      case 'failure':
        return PaymentStatus.FAILED;
      case 'expire':
        return PaymentStatus.EXPIRED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapStripeStatus(status: string): PaymentStatus {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return PaymentStatus.SUCCESS;
      case 'pending':
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.PENDING;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      case 'failed':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapXenditStatus(status: string): PaymentStatus {
    switch (status.toLowerCase()) {
      case 'paid':
        return PaymentStatus.SUCCESS;
      case 'pending':
        return PaymentStatus.PENDING;
      case 'expired':
        return PaymentStatus.EXPIRED;
      case 'failed':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapTripayStatus(status: string): PaymentStatus {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'success':
      case 'settlement':
        return PaymentStatus.SUCCESS;
      case 'pending':
        return PaymentStatus.PENDING;
      case 'expired':
        return PaymentStatus.EXPIRED;
      case 'failed':
      case 'cancel':
      case 'deny':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }
}
