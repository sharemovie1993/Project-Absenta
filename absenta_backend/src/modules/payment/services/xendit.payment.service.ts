import { PrismaClient, PaymentGateway, PaymentStatus } from '@prisma/client';
import axios from 'axios';
import { BasePaymentService } from './base.payment.service';
import { paymentConfig } from '../../../config/payment.config';
import {
  CreatePaymentRequest,
  PaymentResponse,
  WebhookPayload,
  WebhookVerificationResult,
  XenditPaymentRequest,
} from '../../../types/payment.types';

export class XenditPaymentService extends BasePaymentService {
  private secretKey: string;
  private webhookToken: string;
  private baseUrl: string;

  constructor(prisma: PrismaClient) {
    super(prisma, PaymentGateway.XENDIT);
    this.secretKey = paymentConfig.xendit.secretKey;
    this.webhookToken = paymentConfig.xendit.webhookToken;
    this.baseUrl = 'https://api.xendit.co';
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

      const externalId = this.generateOrderId(request.billingId);
      const amount = this.formatAmount(request.amount, PaymentGateway.XENDIT);
      const expiryMinutes = paymentConfig.general.expiryMinutes;

      // Resolve related invoice number for description and items
      const invoice = await this.prisma.invoice.findFirst({
        where: { billing_id: request.billingId },
        select: { invoice_number: true }
      });
      const invoiceNumber = invoice?.invoice_number || request.billingId;

      // Prepare Xendit request
      const xenditRequest: XenditPaymentRequest = {
        external_id: externalId,
        amount,
        description: `Invoice ${invoiceNumber} - ${billing.Tenant.name}`,
        invoice_duration: expiryMinutes * 60, // Xendit expects seconds
        payer_email: request.customerInfo?.email,
        should_send_email: false,
        success_redirect_url: paymentConfig.general.returnUrl,
        failure_redirect_url: paymentConfig.general.returnUrl,
        currency: paymentConfig.general.currency,
        customer: request.customerInfo ? {
          given_names: request.customerInfo.firstName,
          surname: request.customerInfo.lastName || '',
          email: request.customerInfo.email,
          mobile_number: request.customerInfo.phone,
        } : undefined,
        items: request.itemDetails || [{
          id: billing.id,
          price: amount,
          quantity: 1,
          name: `Invoice ${invoiceNumber}`,
        }],
      };

      // Create invoice with Xendit
      const response = await this.callXenditAPI('/v2/invoices', xenditRequest);
      const expiryDate = new Date(response.expiry_date);

      // Create payment record in database
      const payment = await this.createPaymentRecord(
        billing.tenant_id,
        request.billingId,
        request.amount,
        request.paymentMethod,
        response.id,
        response.invoice_url,
        undefined, // Xendit QR codes are handled differently
        response,
        expiryDate
      );

      return {
        id: payment.id,
        status: this.mapGatewayStatus(response.status, PaymentGateway.XENDIT),
        gatewayTransactionId: response.id,
        paymentUrl: response.invoice_url,
        expiresAt: expiryDate,
        message: 'Xendit invoice created successfully',
      };
    } catch (error) {
      console.error('Xendit payment creation failed:', error);
      throw new Error(`Failed to create Xendit payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyWebhook(payload: WebhookPayload): Promise<WebhookVerificationResult> {
    try {
      const { body, headers } = payload;
      
      // Verify webhook token
      const webhookToken = headers['x-callback-token'];
      if (webhookToken !== this.webhookToken) {
        console.error('Invalid Xendit webhook token');
        return { isValid: false };
      }

      // Extract payment information
      const transactionId = body.id;
      const status = body.status;
      const paidAt = body.paid_at ? new Date(body.paid_at) : undefined;

      // Map Xendit status to our status
      const mappedStatus = this.mapGatewayStatus(status, PaymentGateway.XENDIT);
      
      let failureReason: string | undefined;
      if (mappedStatus === PaymentStatus.FAILED) {
        failureReason = body.failure_reason || 'Payment failed';
      } else if (mappedStatus === PaymentStatus.EXPIRED) {
        failureReason = 'Invoice expired';
      }

      return {
        isValid: true,
        transactionId,
        status: mappedStatus,
        paidAt,
        failureReason,
      };
    } catch (error) {
      console.error('Xendit webhook verification failed:', error);
      return { isValid: false };
    }
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<PaymentResponse> {
    try {
      const response = await this.callXenditAPI(`/v2/invoices/${gatewayTransactionId}`, null, 'GET');
      
      const status = this.mapGatewayStatus(response.status, PaymentGateway.XENDIT);
      
      return {
        id: gatewayTransactionId,
        status,
        gatewayTransactionId: response.id,
        paymentUrl: response.invoice_url,
        message: `Invoice status: ${response.status}`,
      };
    } catch (error) {
      console.error('Failed to get Xendit payment status:', error);
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelPayment(gatewayTransactionId: string): Promise<boolean> {
    try {
      await this.callXenditAPI(`/v2/invoices/${gatewayTransactionId}/expire`, {}, 'POST');
      return true;
    } catch (error) {
      console.error('Failed to cancel Xendit payment:', error);
      return false;
    }
  }

  /**
   * Create QR Code payment (specific to Xendit)
   */
  async createQRPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const billing = await this.prisma.billing.findUnique({
        where: { id: request.billingId },
        include: { Tenant: true },
      });

      if (!billing) {
        throw new Error('Billing not found');
      }

      const externalId = this.generateOrderId(request.billingId);
      const amount = this.formatAmount(request.amount, PaymentGateway.XENDIT);

      const qrRequest = {
        external_id: externalId,
        type: 'DYNAMIC',
        callback_url: paymentConfig.xendit.webhookUrl,
        amount,
        currency: paymentConfig.general.currency,
      };

      const response = await this.callXenditAPI('/qr_codes', qrRequest);
      const expiryDate = this.calculateExpiryDate(paymentConfig.general.expiryMinutes);

      // Create payment record in database
      const payment = await this.createPaymentRecord(
        billing.tenant_id,
        request.billingId,
        request.amount,
        request.paymentMethod,
        response.id,
        undefined,
        response.qr_string,
        response,
        expiryDate
      );

      return {
        id: payment.id,
        status: PaymentStatus.PENDING,
        gatewayTransactionId: response.id,
        qrString: response.qr_string,
        expiresAt: expiryDate,
        message: 'QR Code created successfully',
      };
    } catch (error) {
      console.error('Xendit QR payment creation failed:', error);
      throw new Error(`Failed to create Xendit QR payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Virtual Account payment (specific to Xendit)
   */
  async createVirtualAccount(request: CreatePaymentRequest, bankCode: string): Promise<PaymentResponse> {
    try {
      const billing = await this.prisma.billing.findUnique({
        where: { id: request.billingId },
        include: { Tenant: true },
      });

      if (!billing) {
        throw new Error('Billing not found');
      }

      const externalId = this.generateOrderId(request.billingId);
      const amount = this.formatAmount(request.amount, PaymentGateway.XENDIT);

      const vaRequest = {
        external_id: externalId,
        bank_code: bankCode,
        name: request.customerInfo?.firstName || billing.Tenant.name,
        expected_amount: amount,
        is_closed: true,
        expiration_date: this.calculateExpiryDate(paymentConfig.general.expiryMinutes).toISOString(),
      };

      const response = await this.callXenditAPI('/callback_virtual_accounts', vaRequest);
      const expiryDate = new Date(response.expiration_date);

      // Create payment record in database
      const payment = await this.createPaymentRecord(
        billing.tenant_id,
        request.billingId,
        request.amount,
        request.paymentMethod,
        response.id,
        undefined,
        undefined,
        response,
        expiryDate
      );

      return {
        id: payment.id,
        status: PaymentStatus.PENDING,
        gatewayTransactionId: response.id,
        expiresAt: expiryDate,
        message: `Virtual Account created: ${response.account_number}`,
      };
    } catch (error) {
      console.error('Xendit VA creation failed:', error);
      throw new Error(`Failed to create Xendit Virtual Account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async callXenditAPI(endpoint: string, data?: any, method: string = 'POST'): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');

    const config = {
      method,
      url,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      data: method === 'POST' ? data : undefined,
    };

    const response = await axios(config);
    return response.data;
  }
}
