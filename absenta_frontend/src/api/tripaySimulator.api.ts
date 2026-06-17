import { requestWithFallback } from './apiUtils';

export interface SimulateWebhookPayload {
  scenario: 'success' | 'failed' | 'expired' | 'cancelled';
  customData?: {
    reference?: string;
  };
}

export interface SimulateWebhookResponse {
  success: boolean;
  message: string;
  data?: {
    id?: string;
    status?: string;
    transactionId?: string;
  };
}

export interface PaymentListItem {
  id: string;
  gateway_transaction_id?: string;
  status: string;
  amount: number;
  gateway: string;
  created_at: string;
  Billing?: {
    invoice?: {
      invoice_number: string;
    };
  };
}

export interface PaymentListResponse {
  success: boolean;
  message: string;
  data: {
    payments: PaymentListItem[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export const tripaySimulatorApi = {
  /**
   * Get list of pending/recent payments for selection
   * @returns List of payments that can be used for testing
   */
  getPaymentsList: async (gateway?: string, limit: number = 50): Promise<PaymentListResponse> => {
    const params = new URLSearchParams();
    if (gateway) params.append('gateway', gateway);
    params.append('limit', String(limit));
    params.append('status', 'PENDING'); // Only pending for testing
    
    return requestWithFallback<PaymentListResponse>(
      'get',
      `/payments/list?${params.toString()}`,
      {}
    );
  },

  /**
   * Simulate TripPay webhook for testing payment scenarios
   * Correct endpoint: /api/platform/payments/test/simulate/:gateway
   * @param scenario - Payment outcome scenario
   * @param reference - Optional payment ID or gateway transaction ID
   * @returns Webhook simulation response
   */
  simulateWebhook: async (
    scenario: 'success' | 'failed' | 'expired' | 'cancelled',
    reference?: string
  ): Promise<SimulateWebhookResponse> => {
    const payload = {
      scenario,
      customData: reference ? { reference } : undefined
    };

    return requestWithFallback<SimulateWebhookResponse>(
      'post',
      `/platform/payments/test/simulate/${'tripay'}`,
      { data: payload }
    );
  },

  /**
   * Get TripPay health/status
   * @returns Health status of TripPay integration
   */
  getTripayHealth: async () => {
    return requestWithFallback(
      'get',
      '/platform/payments/test/tripay/health'
    );
  },

  /**
   * Get available test scenarios
   * @returns List of available test scenarios
   */
  getAvailableScenarios: async () => {
    return requestWithFallback(
      'get',
      '/platform/payments/test/scenarios'
    );
  }
};
