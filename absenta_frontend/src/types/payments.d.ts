export interface PaymentRecord {
  id: string;
  invoice_id: string;
  invoice_number: string;
  amount: number;
  paid_by_user_id: string;
  paid_by_name?: string;
  payment_method: string;
  note?: string;
  paid_at: string;
  tenant_id: string;
}

export interface ManualPaymentRequest {
  invoice_id: string;
  amount: number;
  paid_by_user_id: string;
  payment_method: string;
  note?: string;
}

export interface ManualPaymentResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    billing_id: string;
    amount: number;
    payment_method: string;
    payment_reference?: string;
    paid_at: string;
    status: string;
  };
}

export interface PaymentHistoryResponse {
  success: boolean;
  message: string;
  data?: {
    payments: PaymentRecord[];
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
}

export type PaymentMethod = 
  | 'MANUAL_TRANSFER'
  | 'CASH'
  | 'VOUCHER'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD';