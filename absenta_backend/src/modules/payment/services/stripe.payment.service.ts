import { PrismaClient, PaymentGateway, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { BasePaymentService } from './base.payment.service';
import { paymentConfig } from '../../../config/payment.config';
import {
  CreatePaymentRequest,
  PaymentResponse,
  WebhookPayload,
  WebhookVerificationResult,
} from '../../../types/payment.types';

export class StripePaymentService extends BasePaymentService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(prisma: PrismaClient) {
    super(prisma, PaymentGateway.STRIPE);
    this.stripe = new Stripe(paymentConfig.stripe.secretKey);
    this.webhookSecret = paymentConfig.stripe.webhookSecret;
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      // Get billing info
      const billing = await this.prisma.billing.findUnique({
        where: { id: request.billingId },
        include: { Tenant: true },
      });

      if (!billing) {
        throw new Error('Billing not found');
      }

      const amount = this.formatAmount(request.amount, PaymentGateway.STRIPE);
      const expiryDate = this.calculateExpiryDate(paymentConfig.general.expiryMinutes);

      // Resolve related invoice for display/metadata
      const invoice = await this.prisma.invoice.findFirst({
        where: { billing_id: request.billingId },
        select: { invoice_number: true }
      });
      const invoiceNumber = invoice?.invoice_number || request.billingId;

      // Create Stripe Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: this.getPaymentMethodTypes(request.paymentMethod),
        line_items: [
          {
            price_data: {
              currency: paymentConfig.general.currency.toLowerCase(),
              product_data: {
                name: `Invoice ${invoiceNumber}`,
                description: `Payment for ${billing.Tenant.name}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${paymentConfig.general.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${paymentConfig.general.returnUrl}?cancelled=true`,
        customer_email: request.customerInfo?.email,
        metadata: {
          billing_id: request.billingId,
          tenant_id: billing.tenant_id,
          order_id: this.generateOrderId(request.billingId),
          invoice_number: invoiceNumber,
        },
        expires_at: Math.floor(expiryDate.getTime() / 1000),
      });

      // Create payment record in database
      const payment = await this.createPaymentRecord(
        billing.tenant_id,
        request.billingId,
        request.amount,
        request.paymentMethod,
        session.id,
        session.url || undefined,
        undefined, // Stripe doesn't use QR codes
        session,
        expiryDate
      );

      return {
        id: payment.id,
        status: PaymentStatus.PENDING,
        gatewayTransactionId: session.id,
        paymentUrl: session.url || undefined,
        expiresAt: expiryDate,
        message: 'Stripe checkout session created',
      };
    } catch (error) {
      console.error('Stripe payment creation failed:', error);
      throw new Error(`Failed to create Stripe payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyWebhook(payload: WebhookPayload): Promise<WebhookVerificationResult> {
    try {
      const { signature, body, rawBody } = payload;
      
      // Verify webhook signature using raw body for proper verification
      let event: Stripe.Event;
      try {
        // Use rawBody if available, otherwise fallback to stringified body
        const bodyForVerification = rawBody || JSON.stringify(body);
        event = this.stripe.webhooks.constructEvent(
          bodyForVerification,
          signature,
          this.webhookSecret
        );
      } catch (err) {
        console.error('Stripe webhook signature verification failed:', err);
        return { isValid: false };
      }

      // Handle different event types
      let transactionId: string | undefined;
      let status: PaymentStatus | undefined;
      let paidAt: Date | undefined;
      let failureReason: string | undefined;

      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          transactionId = session.id;
          status = PaymentStatus.SUCCESS;
          paidAt = new Date();
          break;

        case 'checkout.session.expired':
          const expiredSession = event.data.object as Stripe.Checkout.Session;
          transactionId = expiredSession.id;
          status = PaymentStatus.EXPIRED;
          failureReason = 'Checkout session expired';
          break;

        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          transactionId = paymentIntent.id;
          status = PaymentStatus.SUCCESS;
          paidAt = new Date();
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
          transactionId = failedPaymentIntent.id;
          status = PaymentStatus.FAILED;
          failureReason = failedPaymentIntent.last_payment_error?.message || 'Payment failed';
          break;

        case 'payment_intent.canceled':
          const canceledPaymentIntent = event.data.object as Stripe.PaymentIntent;
          transactionId = canceledPaymentIntent.id;
          status = PaymentStatus.CANCELLED;
          failureReason = 'Payment was cancelled';
          break;

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
          return { isValid: true }; // Valid webhook but not relevant for payment status
      }

      return {
        isValid: true,
        transactionId,
        status,
        paidAt,
        failureReason,
      };
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      return { isValid: false };
    }
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<PaymentResponse> {
    try {
      // Check if it's a checkout session or payment intent
      let status: PaymentStatus;
      let message: string;

      if (gatewayTransactionId.startsWith('cs_')) {
        // Checkout session
        const session = await this.stripe.checkout.sessions.retrieve(gatewayTransactionId);
        status = this.mapStripeSessionStatus(session.status || 'incomplete');
        message = `Checkout session status: ${session.status}`;
      } else if (gatewayTransactionId.startsWith('pi_')) {
        // Payment intent
        const paymentIntent = await this.stripe.paymentIntents.retrieve(gatewayTransactionId);
        status = this.mapGatewayStatus(paymentIntent.status, PaymentGateway.STRIPE);
        message = `Payment intent status: ${paymentIntent.status}`;
      } else {
        throw new Error('Invalid Stripe transaction ID format');
      }

      return {
        id: gatewayTransactionId,
        status,
        gatewayTransactionId,
        message,
      };
    } catch (error) {
      console.error('Failed to get Stripe payment status:', error);
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelPayment(gatewayTransactionId: string): Promise<boolean> {
    try {
      if (gatewayTransactionId.startsWith('cs_')) {
        // Cannot cancel checkout session directly, but it will expire
        console.log('Checkout sessions cannot be cancelled directly, they will expire automatically');
        return true;
      } else if (gatewayTransactionId.startsWith('pi_')) {
        // Cancel payment intent
        await this.stripe.paymentIntents.cancel(gatewayTransactionId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to cancel Stripe payment:', error);
      return false;
    }
  }

  private getPaymentMethodTypes(paymentMethod: string): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
    switch (paymentMethod) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return ['card'];
      case 'BANK_TRANSFER':
        return ['customer_balance'];
      default:
        return ['card']; // Default to card
    }
  }

  private mapStripeSessionStatus(status: string): PaymentStatus {
    switch (status) {
      case 'complete':
        return PaymentStatus.SUCCESS;
      case 'expired':
        return PaymentStatus.EXPIRED;
      case 'open':
        return PaymentStatus.PENDING;
      default:
        return PaymentStatus.PENDING;
    }
  }
}
