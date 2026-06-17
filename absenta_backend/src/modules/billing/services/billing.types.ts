import type { InvoiceStatus } from '@prisma/client';

export interface CreateBillingInput {
  subscription_id: string;
  amount: number;
  billing_date: Date;
  due_date?: Date;
  charge_type?: string;
  payment_method?: string;
  payment_reference?: string;
  upgrade_plan_id_snapshot?: string;
  upgrade_price_snapshot?: number;
  plan_change_request_id?: string;
  correlation_id?: string;
}

export interface UpdateBillingInput {
  amount?: number;
  billing_date?: Date;
  charge_type?: string;
  payment_method?: string;
  payment_reference?: string;
}

export interface BillingResponse {
  id: string;
  subscription_id: string;
  amount: number;
  billing_date: Date;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: Date;
  updated_at: Date;
  charge_type?: string;
  Subscription?: {
    id: string;
    tenant_id: string;
    plan_id: string;
    start_date: Date;
    end_date: Date;
    status: string;
    Tenant: {
      id: string;
      name: string;
      domain: string | null;
    };
    Plan: {
      id: string;
      name: string;
      price_monthly: number;
      currency: string;
    };
  };
  Invoice?: {
    id: string;
    invoice_number: string;
    status: InvoiceStatus;
    due_date: Date;
    paid_at: Date | null;
  } | null;
}

export interface BillingStats {
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  overdue_amount: number;
  total_count: number;
  paid_count: number;
  unpaid_count: number;
  overdue_count: number;
}

