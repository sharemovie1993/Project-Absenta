export type PaymentMethod = 
  | 'MANUAL_TRANSFER'
  | 'CASH'
  | 'VOUCHER'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'QRIS'
  | 'E_WALLET';

export interface PaymentRecord {
  id: string;
  billing_id: string;
  invoice_number: string;
  amount: number;
  payment_method: PaymentMethod;
  paid_at: string;
  paid_by_id: string;
  paid_by_name: string;
  note?: string;
  created_at: string;
  updated_at: string;
  // Optional fields commonly present in history responses
  gateway?: string;
  status?: string;
  currency?: string;
  gateway_transaction_id?: string;
  proof_url?: string;
}

export interface PaymentStats {
  total_payments: number;
  total_amount: number;
  payments_today: number;
  payments_this_month: number;
  payment_methods: Record<PaymentMethod, number>;
}

export interface PaymentFilter {
  payment_method?: PaymentMethod | 'ALL';
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PaymentResponse {
  payments: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface MarkBillingAsPaidRequest {
  payment_method: string;
  note?: string;
}

export interface ManualPaymentRequest {
  billing_id: string;
  invoice_id: string;
  payment_method: string;
  amount: number;
  paid_by_user_id: string;
  note?: string;
}

export interface ManualPaymentResponse {
  success: boolean;
  message: string;
  payment: PaymentRecord;
}

export interface PaymentHistoryResponse {
  success: boolean;
  data: PaymentRecord[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
