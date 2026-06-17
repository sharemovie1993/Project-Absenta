import type { InvoiceStatus } from '@prisma/client';
// Type update

export interface CreateInvoiceInput {
  billing_id: string;
  invoice_number?: string;
  due_date: Date;
  notes?: string;
}

export interface UpdateInvoiceInput {
  due_date?: Date;
  notes?: string;
}

export interface InvoiceResponse {
  id: string;
  billing_id: string;
  invoice_number: string;
  amount: number;
  transaction_history?: { gateway: string; reference: string }[];
  subtotal_amount?: number;
  tax_rate?: number | null;
  tax_amount?: number | null;
  total_amount: number;
  tax_type?: string;
  tax_included?: boolean;
  tax_label?: string | null;
  due_date: Date;
  period_start: Date | null;
  period_end: Date | null;
  status: InvoiceStatus;
  notes: string | null;
  sent_at: Date | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
  tenant?: {
    id: string;
    name: string;
    domain: string | null;
    logo_url?: string | null;
    email?: string | null;
    address?: string | null;
  };
  Billing?: {
    id: string;
    amount: number;
    billing_date: Date;
    status: string;
    Subscription: {
      id: string;
      tenant_id: string;
      Tenant: {
        id: string;
        name: string;
        domain: string | null;
        logo_url?: string | null;
        email?: string | null;
        address?: string | null;
      };
      Plan: {
        id: string;
        name: string;
        price_monthly: number;
        currency: string;
      };
    };
  };
}

export interface GetInvoicesParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  tenant_id?: string;
  billing_id?: string;
}

export interface InvalidInvoicePeriodItem {
  id: string;
  tenant_id: string;
  billing_id: string;
  subscription_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  due_date: Date;
  period_start: Date | null;
  period_end: Date | null;
  invoice_tenant_name: string | null;
  invoice_tenant_identifier: string | null;
  created_at: Date;
  updated_at: Date;
  issue: 'MISSING_PERIOD_START' | 'MISSING_PERIOD_END' | 'INVALID_PERIOD_ORDER';
}

export interface PaginatedInvoicesResponse {
  data: InvoiceResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InvoiceStats {
  total_invoices: number;
  draft_invoices: number;
  sent_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  overdue_amount: number;
}

export interface PublicInvoiceResponse {
  invoice_number: string;
  status: InvoiceStatus;
  due_date: Date;
  paid_at: Date | null;
  currency: string;
  transaction_history?: { gateway: string; reference: string }[];
  branding?: {
    logo_url: string | null;
    primary_color: string | null;
    footer_text: string | null;
  };
  issuer: {
    name: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    logo_url: string | null;
    signature_name: string | null;
    signature_title: string | null;
  };
  tenant: {
    name: string;
    identifier: string;
    address: string | null;
  };
  subtotal_amount: number;
  tax_rate: number | null;
  tax_amount: number;
  tax_label: string | null;
  tax_type: string;
  total_amount: number;
  items: {
    description: string;
    quantity?: number;
    unit_price?: number;
    total: number;
  }[];
  notes: string | null;
  generated_at: Date;
  public_token?: string;
  issue_date?: Date;
  created_at?: Date;
  pdf_generated_at?: Date | null;
  pdf_sha256?: string | null;
  public_url?: string;
  active_transaction?: {
    reference: string;
    method: string | null;
  } | null;
  payments?: {
    id: string;
    status: string;
    gateway: string;
    payment_method: string;
    amount: number;
    created_at: Date;
    paid_at?: Date | null;
  }[];
  subscription_id?: string;
}

