import axiosInstance from '@/lib/axiosInstance';

export interface HealthStatus {
  success: boolean;
  message: string;
  data: {
    overall: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      score: number;
      message: string;
    };
    gateways: {
      [key: string]: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        responseTime: number;
        lastCheck: string;
        errors: string[];
      };
    };
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      connections: number;
    };
    webhook: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      queueSize: number;
      processingRate: number;
    };
  };
}

export interface DiagnosticsResult {
  success: boolean;
  message: string;
  data: {
    gateway: string;
    scenario: string;
    status: string;
    processingTime: number;
    webhookReceived: boolean;
    paymentStatus: string;
    errors: string[];
  };
}

export const getMonitoringHealthStatus = async (): Promise<HealthStatus> => {
  const res = await axiosInstance.get('/api/billing/health');
  return res.data;
};

export const runComprehensiveDiagnostics = async (gateway: string): Promise<DiagnosticsResult[]> => {
  const res = await axiosInstance.post('/api/billing/diagnostics/comprehensive', { gateway });
  return res.data?.data || [];
};

export const runSignatureVerification = async (gateway: string): Promise<unknown> => {
  const res = await axiosInstance.post('/api/billing/diagnostics/signature', { gateway });
  return res.data;
};

export const runIdempotencyVerification = async (gateway: string): Promise<unknown> => {
  const res = await axiosInstance.post('/api/billing/diagnostics/idempotency', { gateway });
  return res.data;
};
