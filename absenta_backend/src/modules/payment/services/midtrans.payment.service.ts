import { PrismaClient, PaymentGateway, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';
import axios from 'axios';
import { BasePaymentService } from './base.payment.service';
import { paymentConfig } from '../../../config/payment.config';
import {
  CreatePaymentRequest,
  PaymentResponse,
  WebhookPayload,
  WebhookVerificationResult,
  MidtransPaymentRequest,

} from '../../../types/payment.types';

export class MidtransPaymentService extends BasePaymentService {
  private serverKey: string;

  private isProduction: boolean;
  private baseUrl: string;

  constructor(prisma: PrismaClient) {
    super(prisma, PaymentGateway.MIDTRANS);
    this.serverKey = paymentConfig.midtrans.serverKey;

    this.isProduction = paymentConfig.midtrans.isProduction;
    this.baseUrl = this.isProduction 
      ? 'https://api.midtrans.com/v2' 
      : 'https://api.sandbox.midtrans.com/v2';
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

      const orderId = this.generateOrderId(request.billingId);
      const amount = this.formatAmount(request.amount, PaymentGateway.MIDTRANS);
      const expiryDate = this.calculateExpiryDate(paymentConfig.general.expiryMinutes);

      // Resolve related invoice number for item naming
      const invoice = await this.prisma.invoice.findFirst({
        where: { billing_id: request.billingId },
        select: { invoice_number: true }
      });
      const invoiceNumber = invoice?.invoice_number || request.billingId;

      // Prepare Midtrans request
      const midtransRequest: MidtransPaymentRequest = {
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        customer_details: request.customerInfo ? {
          first_name: request.customerInfo.firstName,
          last_name: request.customerInfo.lastName || '',
          email: request.customerInfo.email,
          phone: request.customerInfo.phone,
        } : undefined,
        item_details: request.itemDetails || [{
          id: billing.id,
          price: amount,
          quantity: 1,
          name: `Invoice ${invoiceNumber}`,
        }],
        callbacks: {
          finish: paymentConfig.general.returnUrl,
        },
        expiry: {
          start_time: new Date().toISOString(),
          unit: 'minutes',
          duration: paymentConfig.general.expiryMinutes,
        },
      };

      // Create payment with Midtrans
      const response = await this.callMidtransAPI('/charge', midtransRequest);

      // Create payment record in database
      const payment = await this.createPaymentRecord(
        billing.tenant_id,
        request.billingId,
        request.amount,
        request.paymentMethod,
        response.transaction_id,
        response.redirect_url,
        response.qr_string,
        response,
        expiryDate
      );

      return {
        id: payment.id,
        status: this.mapGatewayStatus(response.transaction_status, PaymentGateway.MIDTRANS),
        gatewayTransactionId: response.transaction_id,
        paymentUrl: response.redirect_url,
        qrString: response.qr_string,
        expiresAt: expiryDate,
        message: response.status_message,
      };
    } catch (error) {
      console.error('Midtrans payment creation failed:', error);
      throw new Error(`Failed to create Midtrans payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async verifyWebhook(payload: WebhookPayload): Promise<WebhookVerificationResult> {
    try {
      const { signature, body } = payload;
      
      // Verify signature
      const isValid = this.verifySignature(body, signature);
      if (!isValid) {
        return { isValid: false };
      }

      const transactionStatus = body.transaction_status;
      const transactionId = body.transaction_id;
      const fraudStatus = body.fraud_status;

      // Additional verification by calling Midtrans API
      const statusResponse = await this.getPaymentStatus(transactionId);
      
      if (statusResponse.status !== this.mapGatewayStatus(transactionStatus, PaymentGateway.MIDTRANS)) {
        return { isValid: false };
      }

      // Determine final status
      let finalStatus = this.mapGatewayStatus(transactionStatus, PaymentGateway.MIDTRANS);
      let paidAt: Date | undefined;
      let failureReason: string | undefined;

      if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
        if (fraudStatus === 'accept') {
          finalStatus = PaymentStatus.SUCCESS;
          paidAt = new Date();
        } else if (fraudStatus === 'challenge') {
          finalStatus = PaymentStatus.PROCESSING;
        } else {
          finalStatus = PaymentStatus.FAILED;
          failureReason = `Fraud status: ${fraudStatus}`;
        }
      } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'failure') {
        finalStatus = PaymentStatus.FAILED;
        failureReason = `Transaction ${transactionStatus}`;
      } else if (transactionStatus === 'expire') {
        finalStatus = PaymentStatus.EXPIRED;
        failureReason = 'Payment expired';
      }

      return {
        isValid: true,
        transactionId,
        status: finalStatus,
        paidAt,
        failureReason,
      };
    } catch (error) {
      console.error('Midtrans webhook verification failed:', error);
      return { isValid: false };
    }
  }

  async getPaymentStatus(gatewayTransactionId: string): Promise<PaymentResponse> {
    try {
      const response = await this.callMidtransAPI(`/${gatewayTransactionId}/status`);
      
      const status = this.mapGatewayStatus(response.transaction_status, PaymentGateway.MIDTRANS);
      
      return {
        id: gatewayTransactionId,
        status,
        gatewayTransactionId: response.transaction_id,
        message: response.status_message,
      };
    } catch (error) {
      console.error('Failed to get Midtrans payment status:', error);
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelPayment(gatewayTransactionId: string): Promise<boolean> {
    try {
      await this.callMidtransAPI(`/${gatewayTransactionId}/cancel`, {}, 'POST');
      return true;
    } catch (error) {
      console.error('Failed to cancel Midtrans payment:', error);
      return false;
    }
  }

  private async callMidtransAPI(endpoint: string, data?: any, method: string = 'POST'): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.serverKey}:`).toString('base64');

    const config = {
      method,
      url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      data: method === 'POST' ? data : undefined,
    };

    const response = await axios(config);
    return response.data;
  }

  private verifySignature(body: any, signature: string): boolean {
    const orderId = body.order_id;
    const statusCode = body.status_code;
    const grossAmount = body.gross_amount;
    
    const signatureKey = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    const calculatedSignature = crypto
      .createHash('sha512')
      .update(signatureKey)
      .digest('hex');

    return calculatedSignature === signature;
  }
}
