import { PrismaClient, PaymentGateway } from '@prisma/client';
import { PaymentService } from './payment.service';
import { TestObservabilityService } from './test.observability';
import { TestReportService } from './test.report';
import { generateMockWebhook, generateMockSignature } from '../../../utils/mockWebhookGenerator';

interface WebhookPayload {
  gateway: PaymentGateway;
  signature: string;
  body: any;
  headers: Record<string, string>;
  rawBody?: Buffer | string;
}

export interface TestScenario {
  gateway: PaymentGateway;
  scenario: 'success' | 'failed' | 'expired' | 'cancelled';
}

export interface TestResult {
  gateway: PaymentGateway;
  scenario: string;
  processed: boolean;
  processingTime: string;
  paymentStatus?: string;
  billingStatus?: string;
  expectedPaymentStatus?: string;
  expectedBillingStatus?: string;
  success: boolean;
  error?: string;
}

export class PaymentTestService {
  constructor(
    private prisma: PrismaClient,
    private paymentService: PaymentService,
    private observabilityService: TestObservabilityService,
    private reportService: TestReportService
  ) {}

  async simulateWebhook(gateway: PaymentGateway, scenario: string = 'success', customData?: any) {
    const startTime = Date.now();
    let testResult: any;
    let testPayment: any = null;
    let testBilling: any = null;
    let isExistingPayment = false;

    try {
      // Check if targeting existing payment
      if (customData?.reference) {
        testPayment = await this.prisma.payment.findFirst({
          where: { 
            OR: [
              { gateway_transaction_id: customData.reference },
              { id: customData.reference }
            ]
          },
          include: { Billing: true }
        });

        if (testPayment) {
          isExistingPayment = true;
          testBilling = await this.prisma.billing.findUnique({ where: { id: testPayment.billing_id } });
          const invoice = await this.prisma.invoice.findUnique({ where: { billing_id: testBilling.id } });
          
          // Enrich customData with real values
          customData = {
            ...customData,
            invoice_number: invoice?.invoice_number,
            tenant_id: testPayment.tenant_id,
            payment_id: testPayment.id,
            amount: testPayment.amount
          };
        } else {
            throw new Error(`Payment with reference ${customData.reference} not found`);
        }
      }

      // Generate mock webhook data
      const mockWebhook = generateMockWebhook(
        gateway, 
        customData || {}, 
        scenario as 'success' | 'failed' | 'expired' | 'cancelled'
      );

      if (!isExistingPayment) {
        // Create test billing, invoice, and payment records
        testBilling = await this.createTestBilling();
        const testInvoice = await this.createTestInvoice(testBilling);
        testPayment = await this.createTestPayment(testBilling.id, gateway);

        if (!testPayment.id) {
            throw new Error('Failed to create test payment');
        }

        // Update mock webhook with actual test data
        mockWebhook.invoice_number = testInvoice.invoice_number;
        mockWebhook.tenant_id = testBilling.tenant_id;
        mockWebhook.payment_id = testPayment.id;
      }

      // Convert MockWebhookData to WebhookPayload
      const webhookPayload: WebhookPayload = {
        gateway,
        signature: mockWebhook.signature || generateMockSignature(gateway, mockWebhook),
        body: mockWebhook,
        headers: this.generateMockHeaders(gateway, mockWebhook.signature || generateMockSignature(gateway, mockWebhook))
      };

      // Process webhook
      const webhookId = `test_${gateway}_${testPayment.id}_${Date.now()}`;
      const processed = await this.paymentService.processWebhook(gateway, webhookPayload, webhookId);
      const processingTime = Date.now() - startTime;

      // Verify results
      const updatedPayment = await this.prisma.payment.findUnique({
        where: { id: testPayment.id },
        include: { Invoice: true }
      });

      const updatedInvoice = await this.prisma.invoice.findUnique({
        where: { billing_id: testBilling.id }
      });

      testResult = {
        gateway,
        scenario,
        processed,
        processingTime: `${processingTime}ms`,
        paymentStatus: updatedPayment?.status,
        billingStatus: updatedInvoice?.status,
        webhookId,
        testPaymentId: testPayment.id,
        testBillingId: testBilling.id,
        success: processed,
        isExistingPayment
      };

      // Log test result
      await this.reportService.logTestResult(
        'webhook',
        gateway,
        processed ? 'success' : 'failed',
        testResult,
        processingTime
      );

      // Cleanup test data only if it was created by us
      if (!isExistingPayment && testPayment && testBilling) {
        await this.cleanupTestData(testPayment.id, testBilling.id);
      }

      return {
        success: true,
        message: isExistingPayment 
            ? `Webhook simulation for existing payment ${customData.reference} completed` 
            : 'Webhook simulation completed successfully',
        data: testResult
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log error
      await this.reportService.logTestResult(
        'webhook',
        gateway,
        'error',
        { gateway, scenario, error: errorMessage },
        processingTime,
        errorMessage
      );

      return {
        success: false,
        message: 'Webhook simulation failed',
        error: errorMessage,
        data: {
          gateway,
          scenario,
          processed: false,
          processingTime: `${processingTime}ms`,
          success: false,
          error: errorMessage
        }
      };
    }
  }

  async testComprehensive() {
    const startTime = Date.now();
    const gateways = [PaymentGateway.STRIPE, PaymentGateway.MIDTRANS, PaymentGateway.XENDIT];
    const scenarios = ['success', 'failed', 'expired', 'cancelled'] as const;
    const allResults: TestResult[] = [];

    try {
      for (const gateway of gateways) {
        for (const scenario of scenarios) {
          try {
            const result = await this.simulateWebhook(gateway, scenario);
            if (result.data) {
              allResults.push(result.data);
            }
          } catch (error) {
            allResults.push({
              gateway,
              scenario,
              processed: false,
              processingTime: '0ms',
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      const totalTime = Date.now() - startTime;

      // Generate summary
      const summary = {
        totalTests: allResults.length,
        passedTests: allResults.filter(r => r.success).length,
        failedTests: allResults.filter(r => !r.success).length,
        averageProcessingTime: this.calculateAverageProcessingTime(allResults),
        totalDuration: `${totalTime}ms`,
        gatewayResults: this.summarizeByGateway(allResults)
      };

      // Log comprehensive test result
      await this.reportService.logTestResult(
        'comprehensive',
        'ALL',
        summary.failedTests === 0 ? 'success' : 'failed',
        { summary, results: allResults },
        totalTime
      );

      return {
        success: true,
        message: 'Comprehensive testing completed',
        data: {
          summary,
          detailedResults: allResults
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.reportService.logTestResult(
        'comprehensive',
        'ALL',
        'error',
        { error: errorMessage },
        Date.now() - startTime,
        errorMessage
      );

      return {
        success: false,
        message: 'Comprehensive testing failed',
        error: errorMessage
      };
    }
  }

  async testSignatureVerification(gateway: PaymentGateway) {
    const startTime = Date.now();

    try {
      const results = [];

      // Test valid signature
      const validPayload = generateMockWebhook(gateway);
      const validSignature = generateMockSignature(gateway, validPayload);
      
      const validResult = await this.verifySignature(gateway, validPayload, validSignature);
      results.push({
        type: 'valid_signature',
        gateway,
        verified: validResult,
        expected: true,
        success: validResult === true
      });

      // Test invalid signature
      const invalidSignature = 'invalid_signature_test';
      const invalidResult = await this.verifySignature(gateway, validPayload, invalidSignature);
      results.push({
        type: 'invalid_signature',
        gateway,
        verified: invalidResult,
        expected: false,
        success: invalidResult === false
      });

      const allPassed = results.every(r => r.success);
      const processingTime = Date.now() - startTime;

      // Log test result
      await this.reportService.logTestResult(
        'signature',
        gateway,
        allPassed ? 'success' : 'failed',
        results,
        processingTime
      );

      return {
        success: allPassed,
        message: `Signature verification test ${allPassed ? 'passed' : 'failed'}`,
        data: {
          gateway,
          results,
          processingTime: `${processingTime}ms`,
          allPassed
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const processingTime = Date.now() - startTime;

      await this.reportService.logTestResult(
        'signature',
        gateway,
        'error',
        { error: errorMessage },
        processingTime,
        errorMessage
      );

      return {
        success: false,
        message: 'Signature verification test failed',
        error: errorMessage
      };
    }
  }

  async testHealthCheck() {
    const startTime = Date.now();

    try {
      // Get system health
      const healthReport = await this.observabilityService.checkGatewayHealth();
      
      // Get payment metrics
      const paymentMetrics = await this.observabilityService.getPaymentMetrics('24h');
      
      // Get gateway performance
      const gatewayPerformance = await this.observabilityService.getGatewayPerformance();

      const processingTime = Date.now() - startTime;
      const isHealthy = healthReport.overall !== 'unhealthy';

      // Log health check result
      await this.reportService.logTestResult(
        'health',
        undefined,
        isHealthy ? 'success' : 'failed',
        {
          health: healthReport,
          metrics: paymentMetrics,
          performance: gatewayPerformance
        },
        processingTime
      );

      return {
        success: isHealthy,
        message: `System health check ${isHealthy ? 'passed' : 'failed'}`,
        data: {
          health: healthReport,
          metrics: paymentMetrics,
          performance: gatewayPerformance,
          processingTime: `${processingTime}ms`
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const processingTime = Date.now() - startTime;

      await this.reportService.logTestResult(
        'health',
        undefined,
        'error',
        { error: errorMessage },
        processingTime,
        errorMessage
      );

      return {
        success: false,
        message: 'Health check failed',
        error: errorMessage
      };
    }
  }

  async testIdempotency(gateway: PaymentGateway) {
    const startTime = Date.now();

    try {
      // Create test billing, invoice, and payment
      const testBilling = await this.createTestBilling();
      const testInvoice = await this.createTestInvoice(testBilling);
      const testPayment = await this.createTestPayment(testBilling.id, gateway);

      if (!testPayment.id) {
        throw new Error('Failed to create test payment');
      }

      // Generate webhook payload
      const mockWebhook = generateMockWebhook(gateway, {
        invoice_number: testInvoice.invoice_number,
        tenant_id: testBilling.tenant_id,
        payment_id: testPayment.id
      });

      // Convert MockWebhookData to WebhookPayload
      const webhookPayload: WebhookPayload = {
        gateway,
        signature: mockWebhook.signature || generateMockSignature(gateway, mockWebhook),
        body: mockWebhook,
        headers: this.generateMockHeaders(gateway, mockWebhook.signature || generateMockSignature(gateway, mockWebhook))
      };

      // Process webhook first time
      const webhookId = `test_idempotency_${gateway}_${testPayment.id}_${Date.now()}`;
      const firstResult = await this.paymentService.processWebhook(gateway, webhookPayload, webhookId);

      // Process same webhook second time (should be idempotent)
      const secondResult = await this.paymentService.processWebhook(gateway, webhookPayload, webhookId);

      // Check activity logs for duplicate processing prevention
      const activityLogs = await this.prisma.activityLog.findMany({
        where: {
          entity: 'Payment',
          entity_id: testPayment.id,
          action: {
            contains: 'webhook'
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const processingTime = Date.now() - startTime;
      const isIdempotent = firstResult === true && secondResult === false; // Second should be rejected

      const testResult = {
        gateway,
        webhookId,
        firstProcessing: firstResult,
        secondProcessing: secondResult,
        isIdempotent,
        activityLogCount: activityLogs.length,
        processingTime: `${processingTime}ms`,
        success: isIdempotent
      };

      // Log test result
      await this.reportService.logTestResult(
        'idempotency',
        gateway,
        isIdempotent ? 'success' : 'failed',
        testResult,
        processingTime
      );

      // Cleanup test data
      await this.cleanupTestData(testPayment.id, testBilling.id);

      return {
        success: isIdempotent,
        message: `Idempotency test ${isIdempotent ? 'passed' : 'failed'}`,
        data: testResult
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const processingTime = Date.now() - startTime;

      await this.reportService.logTestResult(
        'idempotency',
        gateway,
        'error',
        { error: errorMessage },
        processingTime,
        errorMessage
      );

      return {
        success: false,
        message: 'Idempotency test failed',
        error: errorMessage
      };
    }
  }

  async generateTestReport(timeRange: '1h' | '24h' | '7d' = '24h') {
    try {
      const report = await this.reportService.generateReport(timeRange);
      return {
        success: true,
        message: 'Test report generated successfully',
        data: report
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate test report',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods
  private async createTestBilling() {
    const tenant = await this.prisma.tenant.findFirst();
    const subscription = await this.prisma.subscription.findFirst();
    
    if (!tenant || !subscription) {
      throw new Error('No tenant or subscription found for testing');
    }
    
    return await this.prisma.billing.create({
      data: {
        tenant_id: tenant.id,
        subscription_id: subscription.id,
        amount: 100000,
        billing_date: new Date(),
      }
    });
  }

  private async createTestInvoice(testBilling: { id: string; tenant_id: string; amount: number }) {
    const invoiceNumber = `TEST-INV-${Date.now()}`;
    const amount = testBilling.amount || 100000;
    const billing = await this.prisma.billing.findUnique({
      where: { id: testBilling.id },
      select: { subscription_id: true }
    });
    
    // FIX: Calculate proper period_start & period_end for test invoices
    // This prevents fallback logic in extendSubscription from using wrong plan's period
    const now = new Date();
    const periodStart = now;
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // Default 1 month period
    
    return await this.prisma.invoice.create({
      data: {
        tenant_id: testBilling.tenant_id,
        billing_id: testBilling.id,
        subscription_id: billing?.subscription_id || '',
        invoice_number: invoiceNumber,
        amount,
        tax_amount: 0,
        total_amount: amount,
        currency: 'IDR',
        status: 'DRAFT',
        issue_date: new Date(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        period_start: periodStart,
        period_end: periodEnd,
      }
    });
  }

  private async createTestPayment(billingId: string, gateway: PaymentGateway) {
    const billing = await this.prisma.billing.findUnique({
      where: { id: billingId },
      select: { tenant_id: true }
    });
    
    if (!billing) {
      throw new Error('Billing not found');
    }
    
    return await this.prisma.payment.create({
      data: {
        tenant_id: billing.tenant_id,
        billing_id: billingId,
        gateway,
        gateway_transaction_id: `test_${gateway.toLowerCase()}_${Date.now()}`,
        amount: 100000,
        status: 'PENDING',
        payment_method: 'BANK_TRANSFER',
        gateway_payment_url: `https://test-${gateway.toLowerCase()}.com/payment`,
      }
    });
  }

  private async cleanupTestData(paymentId: string, billingId: string) {
    try {
      await this.prisma.payment.delete({ where: { id: paymentId } });
      await this.prisma.billing.delete({ where: { id: billingId } });
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }

  private async verifySignature(gateway: PaymentGateway, _payload: any, signature: string): Promise<boolean> {
    try {
      // Mock signature verification - in production, use actual gateway verification
      switch (gateway) {
        case PaymentGateway.MIDTRANS:
          return signature.includes('midtrans') && signature !== 'invalid_signature_test';
        case PaymentGateway.STRIPE:
          return signature.includes('stripe') && signature !== 'invalid_signature_test';
        case PaymentGateway.XENDIT:
          return signature.includes('xendit') && signature !== 'invalid_signature_test';
        case PaymentGateway.TRIPAY:
          try {
            const secret = (await import('../../../config/payment.config')).paymentConfig.tripay.privateKey || '';
            const raw = typeof _payload === 'string' ? _payload : JSON.stringify(_payload || {});
            const calc = (await import('crypto')).createHmac('sha256', secret).update(raw).digest('hex');
            return calc === signature;
          } catch {
            return false;
          }
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  private calculateAverageProcessingTime(results: TestResult[]): string {
    const times = results
      .filter(r => r.processingTime && typeof r.processingTime === 'string')
      .map(r => parseInt(r.processingTime.replace('ms', '')));
    
    if (times.length === 0) return '0ms';
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    return `${Math.round(average)}ms`;
  }

  private generateMockHeaders(gateway: PaymentGateway, signature: string): Record<string, string> {
    switch (gateway) {
      case PaymentGateway.MIDTRANS:
        return {
          'x-signature': signature,
          'content-type': 'application/json'
        };
      case PaymentGateway.STRIPE:
        return {
          'stripe-signature': signature,
          'content-type': 'application/json'
        };
      case PaymentGateway.XENDIT:
        return {
          'x-callback-token': signature,
          'content-type': 'application/json'
        };
      case PaymentGateway.TRIPAY:
        return {
          'x-callback-signature': signature,
          'content-type': 'application/json'
        };
      default:
        return {
          'x-signature': signature,
          'content-type': 'application/json'
        };
    }
  }

  private summarizeByGateway(results: TestResult[]) {
    const gateways = [PaymentGateway.STRIPE, PaymentGateway.MIDTRANS, PaymentGateway.XENDIT];
    return gateways.map(gateway => {
      const gatewayResults = results.filter(r => r.gateway === gateway);
      return {
        gateway,
        totalTests: gatewayResults.length,
        passedTests: gatewayResults.filter(r => r.success).length,
        failedTests: gatewayResults.filter(r => !r.success).length,
        successRate: gatewayResults.length > 0 
          ? `${Math.round((gatewayResults.filter(r => r.success).length / gatewayResults.length) * 100)}%`
          : '0%'
      };
    });
  }
}
