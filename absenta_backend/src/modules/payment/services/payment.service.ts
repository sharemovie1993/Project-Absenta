import { paymentDb as prisma } from './repositories/payment.db';
import { PrismaClient, PaymentGateway, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { PaymentFactoryService } from './payment.factory.service';
import { PaymentWorkflow } from './payments.workflow';
import { PaymentAudit } from './payments.audit';
import {
  CreatePaymentRequest,
  PaymentResponse,
  WebhookPayload,
} from '../../../types/payment.types';
import { DataScope } from '../../../types/fastify';
import fs from 'fs';
import path from 'path';
import { processWebhookCommand } from './commands/process-webhook.command';

export class PaymentService {
  private prisma: PrismaClient;
  private paymentFactory: PaymentFactoryService;
  private paymentWorkflow: PaymentWorkflow;
  private paymentAudit: PaymentAudit;

  constructor() {
    this.prisma = prisma;
    this.paymentFactory = new PaymentFactoryService(prisma);
    this.paymentWorkflow = new PaymentWorkflow(prisma);
    this.paymentAudit = new PaymentAudit(prisma);
  }

  private getLogPath() {
    const p = process.env.LOG_FILE_PATH || path.join(process.cwd(), 'logs', 'backend.log');
    try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch {}
    return p;
  }
  private appendFileLog(entry: any) {
    try { fs.appendFileSync(this.getLogPath(), JSON.stringify(entry) + '\n'); } catch {}
  }

  /**
   * Create a new payment
   */
  async createPayment(request: CreatePaymentRequest, scope?: DataScope): Promise<PaymentResponse> {
    try {
      // Validate billing exists and invoice is not already paid
      const billing = await this.prisma.billing.findUnique({
        where: { id: request.billingId },
        include: { Tenant: true },
      });

      if (!billing) {
        throw new Error('Billing not found');
      }

      // Enforce DataScope
      if (scope?.tenantId && billing.tenant_id !== scope.tenantId) {
        throw new Error('Forbidden: Billing does not belong to your tenant');
      }

      // Check invoice status if exists
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: { billing_id: request.billingId },
        select: { id: true, status: true }
      });
      if (existingInvoice && existingInvoice.status === InvoiceStatus.PAID) {
        throw new Error('Invoice is already paid');
      }
      if (existingInvoice && existingInvoice.status === InvoiceStatus.CANCELLED) {
        throw new Error('Invoice is cancelled');
      }

      // [IDEMPOTENCY] Automatically cancel existing pending payments to allow 'Change Method' flow
      const existingPayments = await this.prisma.payment.findMany({
        where: {
          billing_id: request.billingId,
          status: {
            in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
          },
        },
      });

      if (existingPayments.length > 0) {
        await this.prisma.payment.updateMany({
          where: { id: { in: existingPayments.map(p => p.id) } },
          data: { 
            status: PaymentStatus.CANCELLED,
            failure_reason: 'SUPERSEDED_BY_NEW_PAYMENT',
            updated_at: new Date()
          }
        });
        
        // Log the cancellation of previous attempts
        for (const p of existingPayments) {
           await this.logActivity(
            billing.tenant_id,
            'PAYMENT_SUPERSEDED',
            `Previous payment attempt (${p.gateway_transaction_id || p.id}) was cancelled to allow new method selection.`,
            { billingId: request.billingId, oldPaymentId: p.id }
          );
        }
      }

      if (existingInvoice && existingInvoice.status === InvoiceStatus.DRAFT) {
        try {
          await this.prisma.invoice.update({
            where: { id: existingInvoice.id },
            data: { status: InvoiceStatus.SENT, sent_at: new Date(), updated_at: new Date() },
          });
        } catch {}
      }

      // Get payment service for the specified gateway
      const paymentService = this.paymentFactory.getPaymentService(request.gateway);

      // Create payment
      const paymentResponse = await paymentService.createPayment(request);
      
      // Set superseded flag in response
      if (existingPayments.length > 0) {
        (paymentResponse as any).superseded = true;
      }

      // Log activity
      const invoice = await this.prisma.invoice.findFirst({
        where: { billing_id: request.billingId },
        select: { invoice_number: true }
      });
      const invoiceNumber = invoice?.invoice_number || request.billingId;
      await this.logActivity(
        billing.tenant_id,
        'PAYMENT_CREATED',
        `Payment created for invoice ${invoiceNumber} using ${request.gateway}${existingPayments.length > 0 ? ' (Superseded previous attempt)' : ''}`,
        { billingId: request.billingId, paymentId: paymentResponse.id, superseded: existingPayments.length > 0 }
      );

      return paymentResponse;
    } catch (error) {
      console.error('Payment creation failed:', error);
      throw error;
    }
  }

  /**
   * Submit proof of payment for manual transfer
   */
  async submitProofOfPayment(paymentId: string, proofUrl: string, scope?: DataScope): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Enforce DataScope
      if (scope?.tenantId && payment.tenant_id !== scope.tenantId) {
        throw new Error('Forbidden: Payment does not belong to your tenant');
      }

      if (payment.gateway !== PaymentGateway.MANUAL) {
        throw new Error('Only manual payments require proof submission');
      }

      // Update payment record with proof URL in gateway_response
      const currentResponse = (payment.gateway_response as any) || {};
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          gateway_response: {
            ...currentResponse,
            submitted_at: new Date().toISOString()
          },
          proof_url: proofUrl,
          updated_at: new Date()
        }
      });

      // Log activity
      await this.logActivity(
        payment.tenant_id,
        'PAYMENT_PROOF_SUBMITTED',
        `Proof of payment submitted for transaction ${payment.gateway_transaction_id || payment.id}`,
        { paymentId, proofUrl }
      );

      return true;
    } catch (error) {
      console.error('Failed to submit proof of payment:', error);
      throw error;
    }
  }

  /**
   * Confirm manual payment
   */
  async confirmManualPayment(paymentId: string, confirmedBy: string, scope?: DataScope): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Enforce DataScope
      if (scope?.tenantId && payment.tenant_id !== scope.tenantId) {
        throw new Error('Forbidden: Payment does not belong to your tenant');
      }

      if (payment.gateway !== PaymentGateway.MANUAL) {
        throw new Error('Only manual payments can be confirmed manually');
      }

      // Get ManualPaymentService
      const manualService = this.paymentFactory.getPaymentService(PaymentGateway.MANUAL) as any;
      if (!manualService || typeof manualService.confirmManualPayment !== 'function') {
        throw new Error('Manual payment service does not support confirmation');
      }

      // Manual service expects gatewayTransactionId, but we might have paymentId
      const transactionId = payment.gateway_transaction_id || payment.id;
      return await manualService.confirmManualPayment(transactionId, confirmedBy);
    } catch (error) {
      console.error('Failed to confirm manual payment:', error);
      throw error;
    }
  }

  /**
   * Process webhook from payment gateway
   */
  async processWebhook(gateway: PaymentGateway, payload: WebhookPayload, webhookId?: string): Promise<boolean> {
    return await processWebhookCommand(
      {
        prisma: this.prisma,
        paymentWorkflow: this.paymentWorkflow,
        paymentFactory: this.paymentFactory,
        paymentAudit: this.paymentAudit,
        extractInvoiceNumber: (g, b) => this.extractInvoiceNumber(g, b),
        extractTransactionId: (g, b) => this.extractTransactionId(g, b),
        mapPaymentStatus: (s) => this.mapPaymentStatus(s),
        appendFileLog: (e) => this.appendFileLog(e),
        logActivity: (t, a, m, meta) => this.logActivity(t, a, m, meta),
      },
      gateway,
      payload,
      webhookId,
    );
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string, scope?: DataScope): Promise<PaymentResponse> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          Billing: {
            include: { Tenant: true },
          },
          Invoice: true,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Enforce DataScope
      if (scope?.tenantId && payment.tenant_id !== scope.tenantId) {
        throw new Error('Forbidden: Payment does not belong to your tenant');
      }

      let response: PaymentResponse;

      // Delegate to gateway service for non-Tripay pending payments (live check)
      // Tripay uses local DB record (gateway_response) to avoid extra API calls
      if (
        payment.status === PaymentStatus.PENDING && 
        payment.gateway_transaction_id && 
        payment.gateway !== PaymentGateway.TRIPAY
      ) {
        const paymentService = this.paymentFactory.getPaymentService(payment.gateway);
        response = await paymentService.getPaymentStatus(payment.gateway_transaction_id);
      } else {
        // Default response from local DB
        response = {
          id: payment.id,
          status: payment.status,
          gatewayTransactionId: payment.gateway_transaction_id || undefined,
          paymentUrl: payment.gateway_payment_url || undefined,
          qrString: payment.gateway_qr_string || undefined,
          expiresAt: payment.expired_at || undefined,
          message: `Payment status: ${payment.status}`,
        };
      }

      // ENRICHMENT: Map Payment Instructions from gateway_response (Tripay)
      if (payment.gateway_response) {
        const raw = payment.gateway_response as any;
        const gateway = raw?.data || raw || {};

        if (gateway.pay_code || gateway.payment_code) {
          response.payCode = gateway.pay_code || gateway.payment_code;
        }

        if (Array.isArray(gateway.instructions)) {
          response.instructions = gateway.instructions;
        }

        if (gateway.qr_url) {
          response.qrUrl = gateway.qr_url;
        }

        // Ensure expiredAt is available as ISO string
        if (gateway.expired_time) {
          try {
            response.expiredAt = new Date(gateway.expired_time * 1000).toISOString();
          } catch (e) {
            // Ignore date parse error
          }
        }

        // AUDIT FIELD MAPPING
        if (gateway.amount) response.amount = gateway.amount;
        if (gateway.total_fee) response.totalFee = gateway.total_fee;
        if (gateway.amount_received) response.amountReceived = gateway.amount_received;
        if (Array.isArray(gateway.order_items)) response.orderItems = gateway.order_items;
      }

      return response;
    } catch (error) {
      console.error('Failed to get payment status:', error);
      throw error;
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string, scope?: DataScope): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          Billing: {
            include: { Tenant: true },
          },
          Invoice: {
            select: { invoice_number: true },
          },
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Enforce DataScope
      if (scope?.tenantId && payment.tenant_id !== scope.tenantId) {
        throw new Error('Forbidden: Payment does not belong to your tenant');
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new Error('Only pending payments can be cancelled');
      }

      // Cancel payment at gateway
      let cancelled = false;
      if (payment.gateway_transaction_id) {
        const paymentService = this.paymentFactory.getPaymentService(payment.gateway);
        cancelled = await paymentService.cancelPayment(payment.gateway_transaction_id);
      }

      // Update payment status
      await this.updatePaymentStatus(
        payment.gateway_transaction_id!,
        PaymentStatus.CANCELLED,
        undefined,
        'Payment cancelled by user'
      );

      // Log cancellation
      await this.logActivity(
        payment.tenant_id,
        'PAYMENT_CANCELLED',
        `Payment cancelled for invoice ${payment.Invoice?.invoice_number || payment.billing_id}`,
        { billingId: payment.billing_id, paymentId: payment.id }
      );

      return cancelled;
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      throw error;
    }
  }

  /**
   * Delete a payment (SUPERADMIN only via route guard).
   * Disallows deletion for PROCESSING or SUCCESS statuses and cleans billing reference.
   */
  async deletePayment(paymentId: string, scope?: DataScope): Promise<boolean> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { Billing: true },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Enforce DataScope
      if (scope?.tenantId && payment.tenant_id !== scope.tenantId) {
        throw new Error('Forbidden: Payment does not belong to your tenant');
      }

      if (payment.status === PaymentStatus.PROCESSING || payment.status === PaymentStatus.SUCCESS) {
        throw new Error('Cannot delete payments with status PROCESSING or SUCCESS');
      }

      await this.prisma.$transaction(async (tx) => {
        // Clear billing payment_reference if it points to this payment
        if (payment.billing_id) {
          const billing = await tx.billing.findUnique({ where: { id: payment.billing_id } });
          if (billing && billing.payment_reference === paymentId) {
            await tx.billing.update({
              where: { id: billing.id },
              data: { payment_reference: null },
            });
          }
        }

        // Delete payment record
        await tx.payment.delete({ where: { id: paymentId } });
      });

      // Log deletion activity
      await this.logActivity(
        payment.tenant_id,
        'PAYMENT_DELETED',
        'payment',
        { paymentId, billingId: payment.billing_id }
      );

      return true;
    } catch (error) {
      console.error('Failed to delete payment:', error);
      throw error;
    }
  }

  /**
   * Get payments for a billing
   */
  async getPaymentsByBilling(billingId: string, scope?: DataScope): Promise<any[]> {
    const where: any = { billing_id: billingId };
    if (scope?.tenantId) {
      where.tenant_id = scope.tenantId;
    }
    return await this.prisma.payment.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get payments with optional filtering
   */
  async getPayments(scope: DataScope, limit: number = 50, offset: number = 0, filters?: { tenantId?: string, billingId?: string, status?: string, gateway?: string }): Promise<any> {
    const where: any = {};

    // Apply DataScope
    if (scope.tenantId) {
      where.tenant_id = scope.tenantId;
    } else if (filters?.tenantId) {
      where.tenant_id = filters.tenantId;
    }

    // Apply other filters
    if (filters?.billingId) {
      where.billing_id = filters.billingId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.gateway) {
      where.gateway = filters.gateway;
    }

    // Get total count for pagination
    const total = await this.prisma.payment.count({ where });
    
    // Get payments with pagination
    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        Invoice: {
          select: {
            invoice_number: true,
            amount: true,
            issue_date: true,
            tenant_id: true,
            Tenant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      payments,
      total,
      page: currentPage,
      limit,
      total_pages: totalPages,
    };
  }

  /**
   * Get supported payment gateways
   */
  getSupportedGateways(): PaymentGateway[] {
    return this.paymentFactory.getAllSupportedGateways();
  }

  /**
   * Get Tripay merchant channels
   */
  async getTripayMerchantChannels(): Promise<any[]> {
    const service = this.paymentFactory.getPaymentService(PaymentGateway.TRIPAY) as any;
    if (service && typeof service.getMerchantChannels === 'function') {
      const channels = await service.getMerchantChannels();
      return Array.isArray(channels) ? channels : [];
    }
    throw new Error('Tripay service does not support merchant channels');
  }

  private async updatePaymentStatus(
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

  // Removed: updateBillingStatus is no longer used (domain changes via webhook workflow)

  private async logActivity(
    tenantId: string,
    action: string,
    entity: string,
    metadata?: any
  ) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenant_id: tenantId,
          user_id: 'system', // System generated activity
          action,
          entity,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(scope: DataScope, tenantIdFilter?: string) {
    try {
      const where: any = {};
      
      if (scope.tenantId) {
        where.tenant_id = scope.tenantId;
      } else if (tenantIdFilter) {
        where.tenant_id = tenantIdFilter;
      }

      // Get all payments across all tenants or specific tenant
      const payments = await this.prisma.payment.findMany({
        where,
        include: {
          Billing: {
            include: {
              Tenant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Calculate basic stats
      const totalPayments = payments.length;
      const successfulPayments = payments.filter(p => p.status === PaymentStatus.SUCCESS).length;
      const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING).length;
      const failedPayments = payments.filter(p => p.status === PaymentStatus.FAILED).length;
      const cancelledPayments = payments.filter(p => p.status === PaymentStatus.CANCELLED).length;

      // Calculate total amounts
      const totalAmount = payments.reduce((sum, p) => sum + (p.Billing?.amount || 0), 0);
      const successfulAmount = payments
        .filter(p => p.status === PaymentStatus.SUCCESS)
        .reduce((sum, p) => sum + (p.Billing?.amount || 0), 0);

      // Calculate success rate
      const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

      // Gateway statistics
      const gatewayStats = payments.reduce((acc, payment) => {
        const gateway = payment.gateway;
        if (!acc[gateway]) {
          acc[gateway] = { total: 0, success: 0, failed: 0 };
        }
        acc[gateway].total++;
        if (payment.status === PaymentStatus.SUCCESS) {
          acc[gateway].success++;
        } else if (payment.status === PaymentStatus.FAILED) {
          acc[gateway].failed++;
        }
        return acc;
      }, {} as Record<string, { total: number; success: number; failed: number }>);

      // Payment method statistics
      const methodStats = payments.reduce((acc, payment) => {
        const method = payment.payment_method;
        if (!acc[method]) {
          acc[method] = { total: 0, success: 0, failed: 0 };
        }
        acc[method].total++;
        if (payment.status === PaymentStatus.SUCCESS) {
          acc[method].success++;
        } else if (payment.status === PaymentStatus.FAILED) {
          acc[method].failed++;
        }
        return acc;
      }, {} as Record<string, { total: number; success: number; failed: number }>);

      // Tenant statistics
      const tenantStats = payments.reduce((acc, payment) => {
        const tenantId = payment.Billing?.tenant_id;
        const tenantName = payment.Billing?.Tenant?.name || 'Unknown';
        if (tenantId && !acc[tenantId]) {
          acc[tenantId] = { 
            name: tenantName,
            total: 0, 
            success: 0, 
            failed: 0,
            totalAmount: 0,
            successfulAmount: 0
          };
        }
        if (tenantId) {
          acc[tenantId].total++;
          acc[tenantId].totalAmount += payment.Billing?.amount || 0;
          if (payment.status === PaymentStatus.SUCCESS) {
            acc[tenantId].success++;
            acc[tenantId].successfulAmount += payment.Billing?.amount || 0;
          } else if (payment.status === PaymentStatus.FAILED) {
            acc[tenantId].failed++;
          }
        }
        return acc;
      }, {} as Record<string, { 
        name: string;
        total: number; 
        success: number; 
        failed: number;
        totalAmount: number;
        successfulAmount: number;
      }>);

      // Recent payments (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentPayments = payments.filter(p => 
        p.created_at && new Date(p.created_at) >= thirtyDaysAgo
      );

      return {
        overview: {
          totalPayments,
          successfulPayments,
          pendingPayments,
          failedPayments,
          cancelledPayments,
          totalAmount,
          successfulAmount,
          successRate: Math.round(successRate * 100) / 100
        },
        gateways: gatewayStats,
        methods: methodStats,
        tenants: tenantStats,
        recent: {
          totalPayments: recentPayments.length,
          successfulPayments: recentPayments.filter(p => p.status === PaymentStatus.SUCCESS).length,
          totalAmount: recentPayments.reduce((sum, p) => sum + (p.Billing?.amount || 0), 0)
        }
      };
    } catch (error) {
      console.error('Failed to get payment stats:', error);
      throw new Error(`Failed to get payment statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map gateway payment status to internal payment status
   */
  private mapPaymentStatus(gatewayStatus: PaymentStatus): PaymentStatus {
    switch (gatewayStatus) {
      case PaymentStatus.SUCCESS:
        return PaymentStatus.SUCCESS;
      case PaymentStatus.PENDING:
        return PaymentStatus.PENDING;
      case PaymentStatus.FAILED:
        return PaymentStatus.FAILED;
      case PaymentStatus.CANCELLED:
        return PaymentStatus.CANCELLED;
      case PaymentStatus.EXPIRED:
        return PaymentStatus.EXPIRED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Get payment workflow status
   */
  async getPaymentWorkflowStatus(paymentId: string) {
    return await this.paymentWorkflow.getPaymentWorkflowStatus(paymentId);
  }

  /**
   * Get payment audit logs
   */
  async getPaymentAuditLogs(paymentId: string, limit?: number) {
    return await this.paymentAudit.getPaymentAuditLogs(paymentId, limit);
  }

  /**
   * Get webhook audit logs
   */
  async getWebhookAuditLogs(webhookId?: string, gateway?: string, limit?: number) {
    return await this.paymentAudit.getWebhookAuditLogs(webhookId, gateway, limit);
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(tenantId?: string) {
    return await this.paymentAudit.getAuditStatistics(tenantId);
  }

  /**
   * Extract invoice number from webhook payload based on gateway
   */
  private extractInvoiceNumber(gateway: PaymentGateway, body: any): string {
    switch (gateway) {
      case PaymentGateway.MIDTRANS:
        return body.order_id || 'unknown';
      case PaymentGateway.STRIPE:
        return body.data?.object?.metadata?.invoice_number || 
               body.data?.object?.metadata?.order_id || 'unknown';
      case PaymentGateway.XENDIT:
        return body.external_id || 'unknown';
      case PaymentGateway.TRIPAY:
        return body.merchant_ref || body.reference || 'unknown';
      default:
        return body.order_id || body.external_id || body.id || 'unknown';
    }
  }

  /**
   * Extract transaction ID from webhook payload based on gateway
   */
  private extractTransactionId(gateway: PaymentGateway, body: any): string {
    switch (gateway) {
      case PaymentGateway.MIDTRANS:
        return body.transaction_id || 'unknown';
      case PaymentGateway.STRIPE:
        return body.data?.object?.id || body.id || 'unknown';
      case PaymentGateway.XENDIT:
        return body.id || 'unknown';
      case PaymentGateway.TRIPAY:
        return body.merchant_ref || body.reference || 'unknown';
      default:
        return body.transaction_id || body.id || 'unknown';
    }
  }

  async processSandboxSuccess(
    payload: any,
    context?: { confirmedBy?: string; source?: string; correlationId?: string }
  ): Promise<boolean> {
    try {
      if (process.env.TRIPAY_IS_PRODUCTION === 'true') {
        return false;
      }
      const reference: string | undefined = payload?.merchant_ref || payload?.reference;
      if (!reference || !String(payload?.status).toUpperCase().includes('PAID')) {
        return false;
      }
      const payment = await this.prisma.payment.findFirst({
        where: { gateway_transaction_id: reference },
        include: { Billing: { include: { Tenant: true } } }
      });
      if (!payment) {
        return false;
      }
      if (payment.status === PaymentStatus.SUCCESS) {
        await this.prisma.activityLog.create({
          data: {
            tenant_id: payment.tenant_id,
            action: 'PAYMENT_WEBHOOK_SANDBOX_SIMULATED',
            entity: 'PAYMENT',
            entity_id: payment.id,
            metadata: JSON.stringify({
              reference,
              source: 'TRIPAY_SANDBOX'
            })
          }
        });
        this.appendFileLog({ type: 'tripay_webhook_sandbox_simulated', reference, ts: Date.now() });
        return true;
      }
      if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROCESSING) {
        return false;
      }
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          confirmed_by: 'TRIPAY_WEBHOOK',
          gateway: PaymentGateway.TRIPAY,
          paid_at: new Date(),
          updated_at: new Date()
        }
      });
      const workflowResult = await this.paymentWorkflow.processPaymentStatusUpdate(
        {
          paymentId: payment.id,
          tenantId: payment.tenant_id,
          gateway: PaymentGateway.TRIPAY,
          confirmedBy: 'TRIPAY_WEBHOOK',
          correlationId: context?.correlationId,
          metadata: {
            originalTransactionId: reference,
            webhookPayload: payload,
            source: context?.source || 'SANDBOX_SIMULATION'
          }
        },
        {
          status: PaymentStatus.SUCCESS,
          gatewayTransactionId: reference,
          gatewayResponse: payload,
          processedAt: new Date()
        }
      );
      if (!workflowResult.success) {
        this.appendFileLog({ type: 'sandbox_workflow_failed', gateway: PaymentGateway.TRIPAY, reference, error: workflowResult.error, ts: Date.now() });
        return false;
      }
      await this.prisma.activityLog.create({
        data: {
          tenant_id: payment.tenant_id,
          action: 'PAYMENT_WEBHOOK_SANDBOX_SIMULATED',
          entity: 'PAYMENT',
          entity_id: payment.id,
          metadata: JSON.stringify({
            reference,
            source: 'TRIPAY_SANDBOX'
          })
        }
      });
      this.appendFileLog({ type: 'tripay_webhook_sandbox_simulated', reference, ts: Date.now() });
      return true;
    } catch (error) {
      this.appendFileLog({ type: 'sandbox_processing_error', error: (error as any)?.message, ts: Date.now(), body: payload });
      return false;
    }
  }
}
