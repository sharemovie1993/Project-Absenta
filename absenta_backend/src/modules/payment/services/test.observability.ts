import axios from 'axios';
import { PrismaClient } from '@prisma/client';

export interface GatewayHealthStatus {
  status: 'connected' | 'error' | 'timeout';
  latency?: number;
  error?: string;
  lastChecked: string;
}

export interface DatabaseHealthStatus {
  status: 'connected' | 'error';
  latency?: number;
  error?: string;
  lastChecked: string;
  connectionCount?: number;
}

export interface SystemHealthReport {
  gateways: Record<string, GatewayHealthStatus>;
  database: DatabaseHealthStatus;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}

export class TestObservabilityService {
  constructor(private prisma: PrismaClient) {}

  async checkGatewayHealth(): Promise<SystemHealthReport> {
    const timestamp = new Date().toISOString();
    const gateways: Record<string, GatewayHealthStatus> = {};

    // Check each gateway
    const gatewayChecks = [
      this.checkMidtransHealth(),
      this.checkStripeHealth(),
      this.checkXenditHealth()
    ];

    const [midtransHealth, stripeHealth, xenditHealth] = await Promise.allSettled(gatewayChecks);

    gateways.MIDTRANS = this.processHealthResult(midtransHealth);
    gateways.STRIPE = this.processHealthResult(stripeHealth);
    gateways.XENDIT = this.processHealthResult(xenditHealth);

    // Check database health
    const databaseHealth = await this.checkDatabaseHealth();

    // Determine overall health
    const overall = this.determineOverallHealth(gateways, databaseHealth);

    return {
      gateways,
      database: databaseHealth,
      overall,
      timestamp
    };
  }

  private async checkMidtransHealth(): Promise<GatewayHealthStatus> {
    const start = Date.now();
    try {
      // Mock Midtrans API check - in production, use actual Midtrans ping endpoint
      const response = await axios.get('https://api.midtrans.com/v2/ping', {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      return {
        status: response.status === 200 ? 'connected' : 'error',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: (error as any).code === 'ECONNABORTED' ? 'timeout' : 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkStripeHealth(): Promise<GatewayHealthStatus> {
    const start = Date.now();
    try {
      // Mock Stripe API check - in production, use actual Stripe API
      const response = await axios.get('https://status.stripe.com/api/v2/status.json', {
        timeout: 5000
      });

      return {
        status: response.data?.status?.indicator === 'none' ? 'connected' : 'error',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: (error as any).code === 'ECONNABORTED' ? 'timeout' : 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkXenditHealth(): Promise<GatewayHealthStatus> {
    const start = Date.now();
    try {
      // Mock Xendit API check - in production, use actual Xendit ping endpoint
      const response = await axios.get('https://api.xendit.co/ping', {
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });

      return {
        status: response.status === 200 ? 'connected' : 'error',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: (error as any).code === 'ECONNABORTED' ? 'timeout' : 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
    const start = Date.now();
    try {
      // Test database connection with a simple query
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Get connection info if available
      const connectionCount = await this.getConnectionCount();

      return {
        status: 'connected',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
        connectionCount
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Database connection failed',
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async getConnectionCount(): Promise<number> {
    try {
      // This is a PostgreSQL-specific query to get connection count
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
      `;
      return Number(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private processHealthResult(result: PromiseSettledResult<GatewayHealthStatus>): GatewayHealthStatus {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'error',
        error: result.reason?.message || 'Health check failed',
        lastChecked: new Date().toISOString()
      };
    }
  }

  private determineOverallHealth(
    gateways: Record<string, GatewayHealthStatus>,
    database: DatabaseHealthStatus
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Database must be healthy for system to be operational
    if (database.status === 'error') {
      return 'unhealthy';
    }

    const gatewayStatuses = Object.values(gateways);
    const connectedGateways = gatewayStatuses.filter(g => g.status === 'connected').length;
    const totalGateways = gatewayStatuses.length;

    // All gateways connected = healthy
    if (connectedGateways === totalGateways) {
      return 'healthy';
    }

    // At least one gateway connected = degraded
    if (connectedGateways > 0) {
      return 'degraded';
    }

    // No gateways connected = unhealthy
    return 'unhealthy';
  }

  async getPaymentMetrics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<any> {
    const now = new Date();
    const startTime = new Date();

    switch (timeRange) {
      case '1h':
        startTime.setHours(now.getHours() - 1);
        break;
      case '24h':
        startTime.setDate(now.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
    }

    try {
      // Get payment statistics
      const paymentStats = await this.prisma.payment.groupBy({
        by: ['gateway', 'status'],
        where: {
          created_at: {
            gte: startTime
          }
        },
        _count: {
          id: true
        }
      });

      // Get webhook activity
      const webhookStats = await this.prisma.activityLog.groupBy({
        by: ['action'],
        where: {
          entity: 'Payment',
          created_at: {
            gte: startTime
          },
          action: {
            contains: 'webhook'
          }
        },
        _count: {
          id: true
        }
      });

      return {
        timeRange,
        period: {
          start: startTime.toISOString(),
          end: now.toISOString()
        },
        payments: paymentStats,
        webhooks: webhookStats,
        summary: {
          totalPayments: paymentStats.reduce((sum, stat) => sum + (stat._count?.id || 0), 0),
          totalWebhooks: webhookStats.reduce((sum, stat) => sum + (stat._count?.id || 0), 0)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get payment metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGatewayPerformance(): Promise<any> {
    try {
      // Get average processing times from activity logs
      const performanceData = await this.prisma.activityLog.findMany({
        where: {
          entity: 'Payment',
          action: {
            contains: 'webhook_processed'
          },
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        select: {
          metadata: true,
          created_at: true
        }
      });

      const gatewayPerformance: Record<string, any> = {};

      performanceData.forEach(log => {
        try {
          const details = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          const gateway = details?.gateway;
          const processingTime = details?.processingTime;

          if (gateway && processingTime) {
            if (!gatewayPerformance[gateway]) {
              gatewayPerformance[gateway] = {
                totalRequests: 0,
                totalProcessingTime: 0,
                averageProcessingTime: 0,
                minProcessingTime: Infinity,
                maxProcessingTime: 0
              };
            }

            const time = parseInt(processingTime.replace('ms', ''));
            gatewayPerformance[gateway].totalRequests++;
            gatewayPerformance[gateway].totalProcessingTime += time;
            gatewayPerformance[gateway].minProcessingTime = Math.min(
              gatewayPerformance[gateway].minProcessingTime, 
              time
            );
            gatewayPerformance[gateway].maxProcessingTime = Math.max(
              gatewayPerformance[gateway].maxProcessingTime, 
              time
            );
          }
        } catch (e) {
          // Skip invalid log entries
        }
      });

      // Calculate averages
      Object.keys(gatewayPerformance).forEach(gateway => {
        const data = gatewayPerformance[gateway];
        data.averageProcessingTime = Math.round(data.totalProcessingTime / data.totalRequests);
        if (data.minProcessingTime === Infinity) data.minProcessingTime = 0;
      });

      return gatewayPerformance;
    } catch (error) {
      throw new Error(`Failed to get gateway performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}