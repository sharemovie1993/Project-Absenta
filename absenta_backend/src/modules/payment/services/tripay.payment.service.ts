import { PrismaClient, PaymentGateway, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';
import { BasePaymentService } from './base.payment.service';
import axios from 'axios';
import { getSmartApiBaseUrl } from '@/utils/url-helper';
import { paymentConfig } from '../../../config/payment.config';
import {
  CreatePaymentRequest,
  PaymentResponse,
  WebhookPayload,
  WebhookVerificationResult,
} from '../../../types/payment.types';

export class TripayPaymentService extends BasePaymentService {
  private privateKey: string;
  private merchantCode: string;

  constructor(prisma: PrismaClient) {
    super(prisma, PaymentGateway.TRIPAY);
    this.privateKey = paymentConfig.tripay.privateKey;
    this.merchantCode = paymentConfig.tripay.merchantCode;
  }

  private mapPaymentMethodToTripayCode(method: any): string {
    const m = String(method || '').toUpperCase();
    if (m === 'QRIS') return 'QRIS';
    if (m === 'BANK_TRANSFER') return 'BRIVA';
    if (m === 'E_WALLET') return 'OVO';
    return 'QRIS';
  }

  private resolveCallbackUrl(): string {
    const explicit = String(paymentConfig.tripay.webhookUrl || paymentConfig.general.callbackUrl || '').trim();
    if (explicit) return explicit;

    const candidates = [
      String(paymentConfig.general.appUrl || '').trim(),
      String(paymentConfig.general.frontendUrl || '').trim(),
    ].filter(Boolean);

    for (const base of candidates) {
      try {
        const u = new URL(base);
        const origin = u.origin.replace(/\/+$/, '');
        return `${origin}/webhooks/payment/tripay`;
      } catch {}
    }

    return `${getSmartApiBaseUrl()}/webhooks/payment/tripay`;
  }

  private resolveReturnUrl(reference: string): string {
    const explicit = String(paymentConfig.general.returnUrl || '').trim();
    if (explicit) return explicit;

    const candidates = [
      String(paymentConfig.general.frontendUrl || '').trim(),
      String(paymentConfig.general.appUrl || '').trim(),
    ].filter(Boolean);

    for (const base of candidates) {
      try {
        const u = new URL(base);
        const origin = u.origin.replace(/\/+$/, '');
        const path = u.pathname === '/api' ? '' : u.pathname;
        const baseOrigin = `${origin}${path}`.replace(/\/+$/, '');
        return `${baseOrigin}/payment/return?ref=${encodeURIComponent(reference)}&gateway=TRIPAY`;
      } catch {}
    }

    return `${getSmartApiBaseUrl()}/payment/return?ref=${encodeURIComponent(reference)}&gateway=TRIPAY`;
  }

  async getMerchantChannels(): Promise<any[]> {
    const baseUrl = paymentConfig.tripay.isProduction ? 'https://tripay.co.id/api' : 'https://tripay.co.id/api-sandbox';
    const resp = await axios.get(`${baseUrl}/merchant/payment-channel`, {
      headers: {
        Authorization: `Bearer ${paymentConfig.tripay.apiKey}`,
        'User-Agent': 'AbsentaBackend/1.0',
        Accept: 'application/json'
      }
    });
    const raw = resp?.data?.data || [];
    return Array.isArray(raw) ? raw : [];
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      const billing = await this.prisma.billing.findUnique({
        where: { id: request.billingId },
        include: { Tenant: true },
      });

      if (!billing) throw new Error('Billing not found');

      const amount = this.formatAmount(request.amount, PaymentGateway.TRIPAY);
      const expiryDate = this.calculateExpiryDate(paymentConfig.general.expiryMinutes);

      const invoice = await this.prisma.invoice.findFirst({
        where: { billing_id: request.billingId },
        select: { invoice_number: true }
      });
      const invoiceNumber = invoice?.invoice_number || request.billingId;

      const reference = this.generateOrderId(request.billingId);

      const signaturePayload = this.merchantCode + reference + amount;
      const signature = crypto.createHmac('sha256', this.privateKey).update(signaturePayload).digest('hex');

      let channelCode = String(request.channelCode || '').toUpperCase() || this.mapPaymentMethodToTripayCode(request.paymentMethod);
      try {
        const channels = await this.getMerchantChannels();
        const allowed = Array.isArray(channels) ? channels.map((c: any) => String(c.code || '').toUpperCase()).filter(Boolean) : [];
        const requestedMethod = String(request.paymentMethod || '').toUpperCase();
        if (request.channelCode) {
          if (!allowed.includes(channelCode)) {
            throw new Error(`Tripay channel ${channelCode} not enabled for merchant (allowed=[${allowed.join(', ')}])`);
          }
        } else if (!allowed.includes(channelCode.toUpperCase())) {
          const vaPriority = ['BRIVA','BCAVA','BNIVA','MANDIRIVA','CIMBVA','BSIVA','PERMATAVA'];
          const ewPriority = ['OVO','DANA','SHOPEEPAY'];
          if (requestedMethod === 'QRIS') {
            if (allowed.includes('QRIS')) {
              channelCode = 'QRIS';
            } else {
              throw new Error(`Tripay channel not enabled for merchant (requested=${channelCode}, allowed=[${allowed.join(', ')}])`);
            }
          } else if (requestedMethod === 'BANK_TRANSFER') {
            const foundVa = vaPriority.find(c => allowed.includes(c));
            if (foundVa) {
              channelCode = foundVa;
            } else if (allowed.includes('QRIS')) {
              channelCode = 'QRIS';
            } else {
              throw new Error(`Tripay channel not enabled for merchant (requested=${channelCode}, allowed=[${allowed.join(', ')}])`);
            }
          } else if (requestedMethod === 'E_WALLET') {
            const foundEw = ewPriority.find(c => allowed.includes(c));
            if (foundEw) {
              channelCode = foundEw;
            } else if (allowed.includes('QRIS')) {
              channelCode = 'QRIS';
            } else {
              throw new Error(`Tripay channel not enabled for merchant (requested=${channelCode}, allowed=[${allowed.join(', ')}])`);
            }
          }
        }
      } catch (e) {
      }

      const tenantAdmin = await this.prisma.user.findFirst({
        where: { tenant_id: billing.tenant_id, Role: { name: 'ADMIN' } },
        select: { email: true, full_name: true }
      });
      const customerEmail = request.customerInfo?.email || tenantAdmin?.email || '';
      const customerName = billing.Tenant?.name || tenantAdmin?.full_name || '';
      if (!customerEmail) {
        throw new Error('Customer email is required');
      }

      const payload: any = {
        method: channelCode,
        merchant_ref: reference,
        amount,
        customer_name: customerName,
        customer_email: customerEmail,
        order_items: [
          { sku: billing.id, name: `Invoice ${invoiceNumber}`, price: amount, quantity: 1 },
        ],
        signature,
        return_url: this.resolveReturnUrl(reference),
        callback_url: this.resolveCallbackUrl(),
      };

      const baseUrl = paymentConfig.tripay.isProduction ? 'https://tripay.co.id/api' : 'https://tripay.co.id/api-sandbox';
      const resp = await axios.post(`${baseUrl}/transaction/create`, payload, {
        headers: {
          Authorization: `Bearer ${paymentConfig.tripay.apiKey}`,
          'User-Agent': 'AbsentaBackend/1.0',
          Accept: 'application/json'
        }
      });
      const data = resp?.data?.data || {};
      const paymentUrl = data.payment_url || this.resolveReturnUrl(reference);
      const gatewayId = data.transaction_id || data.reference || reference;
      
      // SYNC AMOUNT: Use Tripay's calculated amount (which might include fees)
      // This ensures what we save in DB matches exactly what Tripay expects.
      const finalAmount = data.amount ? Number(data.amount) : request.amount;

      // Extract QR Data
      const qrString = data.qr_string || data.qr_code;
      // Note: We don't have a specific column for qr_url in createPaymentRecord args (it usually goes to gateway_response),
      // but passing qrString to gatewayQrString arg is correct.

      const payment = await this.createPaymentRecord(
        billing.tenant_id,
        request.billingId,
        finalAmount,
        request.paymentMethod,
        gatewayId,
        paymentUrl,
        qrString, // Pass QR String explicitly
        resp?.data, // Save full response for audit/debugging
        expiryDate
      );

      return {
        id: payment.id,
        status: PaymentStatus.PENDING,
        gatewayTransactionId: gatewayId,
        paymentUrl: paymentUrl,
        qrString: qrString, // Include QR string in response
        expiresAt: expiryDate,
        message: 'Tripay payment initialized',
      };
    } catch (error) {
      const status = (error as any)?.response?.status;
      const data = (error as any)?.response?.data;
      const msg = (data && (data.message || data.error || data.msg)) || (error as Error)?.message || 'Unknown error';
      const details = (() => {
        try { return JSON.stringify(data); } catch { return String(data); }
      })();
      const info = { status, message: msg, details };
      console.error('Tripay payment creation failed:', info);
      throw new Error(`Failed to create Tripay payment: ${status ? status + ' - ' : ''}${msg}`);
    }
  }

  async verifyWebhook(payload: WebhookPayload): Promise<WebhookVerificationResult> {
    try {
      const { signature, body, rawBody, headers } = payload;

      const headerSig = headers['x-callback-signature'] || signature;
      const tokenHeader = headers['x-callback-token'];
      const expectedToken = paymentConfig.tripay.webhookToken;

      const dataStr = typeof rawBody === 'string' ? rawBody : (rawBody ? rawBody.toString() : JSON.stringify(body));
      const calcSig = crypto.createHmac('sha256', this.privateKey).update(dataStr).digest('hex');

      const validSignature = !!headerSig && calcSig === headerSig;
      const validToken = !!expectedToken && !!tokenHeader && tokenHeader === expectedToken;
      if (!validSignature && !validToken) return { isValid: false };

      const reference = body?.reference || body?.merchant_ref || body?.ref || body?.order_ref;
      const statusStr = String(body?.status || body?.event || '').toLowerCase();

      let status: PaymentStatus = PaymentStatus.PENDING;
      let paidAt: Date | undefined;
      let failureReason: string | undefined;

      if (['paid', 'success', 'settlement'].includes(statusStr)) {
        status = PaymentStatus.SUCCESS;
        paidAt = new Date();
      } else if (['failed', 'deny', 'cancel'].includes(statusStr)) {
        status = PaymentStatus.FAILED;
        failureReason = statusStr;
      } else if (['expired'].includes(statusStr)) {
        status = PaymentStatus.EXPIRED;
        failureReason = 'expired';
      }

      return {
        isValid: true,
        transactionId: reference,
        status,
        paidAt,
        failureReason,
      };
    } catch (error) {
      console.error('Tripay webhook verification failed:', error);
      return { isValid: false };
    }
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<PaymentResponse> {
    try {
      // In a real implementation, call Tripay API to get status by reference
      const payment = await this.getPaymentByGatewayId(gatewayTransactionId);
      if (!payment) throw new Error('Payment not found');

      const status = payment.status;
      const gatewayResponse = payment.gateway_response as any;
      const qrUrl = gatewayResponse?.qr_url;

      return {
        id: payment.id,
        status,
        gatewayTransactionId,
        paymentUrl: payment.gateway_payment_url || undefined,
        qrString: payment.gateway_qr_string || undefined,
        qrUrl: qrUrl,
        expiresAt: payment.expired_at || undefined,
        message: 'Tripay status from local record',
      };
    } catch (error) {
      console.error('Failed to get Tripay payment status:', error);
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelPayment(_gatewayTransactionId: string): Promise<boolean> {
    try {
      // In a real implementation, call Tripay cancel endpoint
      console.log('Tripay cancel not implemented; treating as no-op');
      return true;
    } catch (error) {
      console.error('Failed to cancel Tripay payment:', error);
      return false;
    }
  }
}
