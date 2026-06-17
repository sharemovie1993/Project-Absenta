// Using any types for Fastify request/reply to avoid generic type complexity
import { PaymentGateway, PaymentMethod } from '@prisma/client';
import { PaymentService } from '../services/payment.service';
import { PaymentBillingIntegrationService } from '../services/payment-billing.integration.service';

export class PaymentController {
  private paymentService: PaymentService;
  private billingIntegration: PaymentBillingIntegrationService;

  constructor() {
    this.paymentService = new PaymentService();
    this.billingIntegration = new PaymentBillingIntegrationService();
  }

  /**
   * Mark invoice as paid (Legacy migration from InvoiceController)
   * Creates a manual payment record and updates invoice status
   */
  async markInvoiceAsPaid(_request: any, reply: any) {
    try {
      return reply.status(403).send({
        success: false,
        message: 'Only POST /webhooks/payment/tripay may mark invoice as paid'
      });

    } catch (error: any) {
      console.error('Error in markInvoiceAsPaid:', error);
      
      if (error.message === 'Invoice not found') {
        return reply.status(404).send({
          success: false,
          message: 'Invoice not found'
        });
      }

      if (error.message === 'Only SENT invoices can be marked as paid') {
        return reply.status(400).send({
          success: false,
          message: 'Only SENT invoices can be marked as paid'
        });
      }

      if (error.message === 'Insufficient permissions') {
        return reply.status(403).send({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Create a new payment
   */
  async createPayment(request: any, reply: any) {
    try {
      const body = (request.body || {}) as any;
      const billingId = body.billingId ?? body.billing_id;
      const gateway = body.gateway;
      const paymentMethod = body.paymentMethod ?? body.method;
      const channelCode = body.channelCode ?? body.channel_code;
      const customerInfo = body.customerInfo ?? body.customer_info;

      // Validate required fields
      if (!billingId || !gateway || !paymentMethod) {
        return reply.status(400).send({
          success: false,
          message: 'Missing required fields: billingId, gateway, paymentMethod',
        });
      }

      // Validate gateway
      if (!Object.values(PaymentGateway).includes(gateway)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid payment gateway',
        });
      }

      // Validate payment method
      if (!Object.values(PaymentMethod).includes(paymentMethod)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid payment method',
        });
      }

      // Use billing integration service to create payment
      const payment = await this.billingIntegration.createPaymentForBilling(
        billingId,
        gateway,
        paymentMethod,
        channelCode,
        customerInfo,
        request.dataScope
      );

      return reply.status(201).send({
        success: true,
        message: 'Payment created successfully',
        data: payment,
      });
    } catch (error) {
      console.error('Create payment error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to create payment',
      });
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(request: any, reply: any) {
    try {
      const params = (request.params || {}) as any;
      const paymentId = params.paymentId ?? params.payment_id;

      // Get payment status - service will validate if payment exists and enforce scope
      const paymentStatus = await this.paymentService.getPaymentStatus(paymentId, request.dataScope);

      return reply.status(200).send({
        success: true,
        message: 'Payment status retrieved successfully',
        data: paymentStatus,
      });
    } catch (error) {
      console.error('Get payment status error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to get payment status',
      });
    }
  }

  /**
   * Submit proof of payment for manual transfer
   */
  async submitProofOfPayment(request: any, reply: any) {
    try {
      const { paymentId } = request.params as { paymentId: string };
      const { proof_url } = request.body as { proof_url: string };

      if (!paymentId || !proof_url) {
        return reply.status(400).send({
          success: false,
          message: 'Missing required fields: paymentId or proof_url',
        });
      }

      await this.paymentService.submitProofOfPayment(paymentId, proof_url, request.dataScope);

      return reply.status(200).send({
        success: true,
        message: 'Proof of payment submitted successfully',
      });
    } catch (error) {
      console.error('Submit proof error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to submit proof of payment',
      });
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(request: any, reply: any) {
    try {
      const params = (request.params || {}) as any;
      const paymentId = params.paymentId ?? params.payment_id;

      // Service enforces scope
      const cancelled = await this.paymentService.cancelPayment(paymentId, request.dataScope);

      return reply.status(200).send({
        success: true,
        message: cancelled ? 'Payment cancelled successfully' : 'Payment cancellation requested',
        data: { cancelled },
      });
    } catch (error) {
      console.error('Cancel payment error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to cancel payment',
      });
    }
  }

  /**
   * Confirm manual payment (SUPERADMIN only)
   */
  async confirmManualPayment(request: any, reply: any) {
    try {
      const { payment_id } = request.params as { payment_id: string };
      const confirmedBy = request.dataScope?.userId || 'SYSTEM_ADMIN';

      const success = await this.paymentService.confirmManualPayment(payment_id, confirmedBy, request.dataScope);

      return reply.status(200).send({
        success: true,
        message: success ? 'Payment confirmed successfully' : 'Failed to confirm payment',
      });
    } catch (error) {
      console.error('Confirm manual payment error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to confirm manual payment',
      });
    }
  }

  /**
   * Delete a payment (SUPERADMIN only)
   */
  async deletePayment(request: any, reply: any) {
    try {
      const { payment_id } = request.params as { payment_id: string };

      // Service enforces scope
      const deleted = await this.paymentService.deletePayment(payment_id, request.dataScope);

      return reply.status(200).send({
        success: true,
        message: 'Payment deleted successfully',
        data: { deleted, payment_id },
      });
    } catch (error) {
      console.error('Delete payment error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to delete payment',
      });
    }
  }

  /**
   * Get payments for a billing
   */
  async getPaymentsByBilling(request: any, reply: any) {
    try {
      const { billingId } = request.params as { billingId: string };

      // Service enforces scope
      const payments = await this.paymentService.getPaymentsByBilling(billingId, request.dataScope);

      return reply.status(200).send({
        success: true,
        message: 'Payments retrieved successfully',
        data: payments,
      });
    } catch (error) {
      console.error('Get payments by billing error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to get payments',
      });
    }
  }

  /**
   * Get payments for current tenant
   */
  async getPayments(request: any, reply: any) {
    try {
      const { limit = 50, offset, page, tenant_id, billing_id, status, gateway } = request.query as any;
      const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : (limit || 50);
      
      // Prefer explicit offset; otherwise compute from page
      let offsetNum: number;
      if (offset !== undefined) {
        offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : (offset as number);
      } else {
        const pageNum = typeof page === 'string' ? parseInt(page, 10) : (page || 1);
        offsetNum = Math.max(0, (pageNum - 1) * (limitNum as number));
      }

      // Restriction: if user is scoped (e.g. SISWA), billing_id is required
      // This preserves original logic: SISWA must provide billing_id to see payments
      if (request.dataScope?.userId && !billing_id) {
        return reply.status(403).send({
          success: false,
          message: 'SISWA hanya dapat melihat pembayaran untuk tagihan tertentu (billing_id wajib)',
        });
      }

      const filters = {
        tenantId: tenant_id,
        billingId: billing_id,
        status,
        gateway
      };

      const paymentsData = await this.paymentService.getPayments(request.dataScope, limitNum, offsetNum, filters);

      return reply.status(200).send({
        success: true,
        message: 'Payments retrieved successfully',
        data: {
          payments: paymentsData.payments,
          pagination: {
            page: paymentsData.page,
            limit: paymentsData.limit,
            total: paymentsData.total,
            totalPages: paymentsData.total_pages,
          },
        },
      });
    } catch (error) {
      console.error('Get payments error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to get payments',
      });
    }
  }

  /**
   * Get supported payment gateways
   */
  async getSupportedGateways(_request: any, reply: any) {
    try {
      const gateways = this.paymentService.getSupportedGateways();

      return reply.status(200).send({
        success: true,
        message: 'Supported gateways retrieved successfully',
        data: {
          gateways,
          methods: Object.values(PaymentMethod),
        },
      });
    } catch (error) {
      console.error('Get supported gateways error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get supported gateways',
      });
    }
  }

  /**
   * Get Tripay merchant channels
   */
  async getTripayMerchantChannels(_request: any, reply: any) {
    try {
      const channels = await this.paymentService.getTripayMerchantChannels();
      return reply.status(200).send({
        success: true,
        message: 'Tripay merchant channels retrieved successfully',
        data: channels,
      });
    } catch (error) {
      console.error('Get Tripay merchant channels error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to get Tripay merchant channels',
      });
    }
  }

  /**
   * Get billing with payment summary
   */
  async getBillingWithPaymentSummary(request: any, reply: any) {
    try {
      const { billingId } = request.params as { billingId: string };

      const billingWithPayments = await this.billingIntegration.getBillingWithPaymentSummary(billingId, request.dataScope);

      return reply.status(200).send({
        success: true,
        message: 'Billing with payment summary retrieved successfully',
        data: billingWithPayments,
      });
    } catch (error) {
      console.error('Get billing with payment summary error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to get billing with payment summary',
      });
    }
  }

  /**
   * Retry failed payment
   */
  async retryFailedPayment(request: any, reply: any) {
    try {
      const { paymentId } = request.params as { paymentId: string };
      
      const retryPayment = await this.billingIntegration.autoRetryFailedPayment(
        paymentId,
        request.dataScope
      );

      if (!retryPayment) {
        return reply.status(400).send({
          success: false,
          message: 'Failed to retry payment',
        });
      }

      return reply.status(201).send({
        success: true,
        message: 'Payment retry created successfully',
        data: retryPayment,
      });
    } catch (error) {
      console.error('Retry payment error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to retry payment',
      });
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(request: any, reply: any) {
    try {
      const { tenant_id } = request.query as { tenant_id?: string };
      
      const stats = await this.paymentService.getPaymentStats(request.dataScope, tenant_id);

      return reply.send({
        success: true,
        message: 'Payment statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('Get payment stats error:', error);
      return reply.status(500).send({
        success: false,
        message: (error as Error).message || 'Failed to get payment statistics',
      });
    }
  }
}
