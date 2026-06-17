import { PrismaClient, PaymentGateway, PaymentStatus, PaymentMethod } from '@prisma/client';
import { BasePaymentService } from './base.payment.service';
import { 
  CreatePaymentRequest, 
  PaymentResponse, 
  WebhookPayload, 
  WebhookVerificationResult 
} from '../../../types/payment.types';
import { paymentConfig } from '../../../config/payment.config';
import { systemConfigService } from '../../system-config/services/system-config.service';


export class ManualPaymentService extends BasePaymentService {
  constructor(prisma: PrismaClient) {
    super(prisma, PaymentGateway.MANUAL);
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    const { billingId, amount } = request;

    // Get billing details to find tenant_id
    const billing = await this.prisma.billing.findUnique({
      where: { id: billingId },
    });

    if (!billing) {
      throw new Error(`Billing with ID ${billingId} not found`);
    }

    // Generate a unique transaction ID for manual tracking
    const orderId = this.generateOrderId(billingId);
    
    // Get system config for bank details
    const tenantConfig = await systemConfigService.getActive(billing.tenant_id);
    const bankName = (tenantConfig as any)?.company_bank_name || paymentConfig.manual?.bankName || 'BANK MANDIRI';
    const accountNumber = (tenantConfig as any)?.company_bank_account || paymentConfig.manual?.accountNumber || '1234567890';
    const accountHolder = (tenantConfig as any)?.company_bank_holder || paymentConfig.manual?.accountHolder || 'PT BARAYA TEKNOLOGI INDONESIA';

    // Create payment record in database
    const payment = await this.createPaymentRecord(
      billing.tenant_id,
      billingId,
      amount,
      PaymentMethod.BANK_TRANSFER, // Force bank transfer for manual
      orderId,
      undefined, // No gateway URL
      undefined, // No QR string
      { 
        type: 'MANUAL_TRANSFER',
        bank: bankName,
        account: accountNumber,
        holder: accountHolder
      },
      this.calculateExpiryDate(2880) // 48 hours for manual transfer
    );

    return {
      id: payment.id,
      status: PaymentStatus.PENDING,
      gatewayTransactionId: orderId,
      message: 'Silakan lakukan transfer manual ke rekening berikut.',
      instructions: [
        {
          title: 'Detail Rekening',
          steps: [
            `Bank: ${bankName}`,
            `Nomor Rekening: ${accountNumber}`,
            `Atas Nama: ${accountHolder}`,
            `Total Transfer: IDR ${amount.toLocaleString('id-ID')}`
          ]
        },
        {
          title: 'Langkah Pembayaran',
          steps: paymentConfig.manual?.instructions || []
        }
      ]
    };

  }

  async verifyWebhook(_payload: WebhookPayload): Promise<WebhookVerificationResult> {
    // Manual payments don't have automated webhooks
    return { isValid: false };
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<PaymentResponse> {
    const payment = await this.getPaymentByGatewayId(gatewayTransactionId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      id: payment.id,
      status: payment.status,
      gatewayTransactionId: payment.gateway_transaction_id || undefined,
      amount: payment.amount
    };
  }

  async cancelPayment(gatewayTransactionId: string): Promise<boolean> {
    await this.updatePaymentStatus(gatewayTransactionId, PaymentStatus.CANCELLED);
    return true;
  }

  /**
   * Special method for ManualPaymentService to confirm payment after human verification
   */
  async confirmManualPayment(gatewayTransactionId: string, confirmedBy: string): Promise<boolean> {
    const payment = await this.getPaymentByGatewayId(gatewayTransactionId);
    if (!payment) return false;

    await this.prisma.$transaction(async (tx) => {
      // 1. Update payment record
      await tx.payment.update({
        where: { gateway_transaction_id: gatewayTransactionId },
        data: {
          status: PaymentStatus.SUCCESS,
          paid_at: new Date(),
          confirmed_by: confirmedBy,
          updated_at: new Date()
        }
      });

      // 2. Update invoice status
      const invoice = await tx.invoice.findFirst({
        where: { billing_id: payment.billing_id }
      });

      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paid_at: new Date(),
            updated_at: new Date()
          }
        });
      }
    });

    // 3. Trigger downstream effects (Billing & Subscription)
    try {
      const { PaymentBillingIntegrationService } = await import('./payment-billing.integration.service');
      const integrationService = new PaymentBillingIntegrationService();
      await integrationService.handleSuccessfulPayment(payment.id, `manual-confirm-${Date.now()}`);
    } catch (error) {
      console.error('Failed to trigger billing integration after manual confirmation:', error);
      // We don't throw here as the payment is already confirmed in DB, 
      // but the event bus might need manual retry if it fails.
    }

    return true;
  }
}
