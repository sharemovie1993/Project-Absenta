// Invoice Types based on INVOICE_MODULE_API.md

import React from 'react';

// Invoice Status Constants - Sesuai dengan backend
export const InvoiceStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  VIEWED: "VIEWED", 
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED"
} as const;

export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus];

// Invoice Item Structure
export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Invoice Data Structure
export interface Invoice {
  id: string;
  billing_id: string;
  invoice_number: string;
  tenant_id: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  transaction_history?: { gateway: string; reference: string }[];
  currency: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  pdf_path?: string;
  pdf_sha256?: string;
  sent_at?: string;
  paid_at?: string;
  period_start?: string | null;
  period_end?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Snapshot Data (Optional - diisi saat invoice dibuat/finalized)
  invoice_tenant_name?: string;
  invoice_tenant_identifier?: string;
  invoice_tenant_address?: string;

  // Snapshot Issuer Identity
  invoice_company_legal_name?: string;
  invoice_company_trade_name?: string;
  invoice_company_npwp?: string;
  invoice_company_address?: string;
  invoice_company_email_billing?: string;
  invoice_company_phone_billing?: string;
  invoice_company_logo_url?: string;
  invoice_company_signature_name?: string;
  invoice_company_signature_title?: string;

  // Public Access
  public_token?: string;

  // Properti tambahan yang digunakan di form dan detail
  description?: string;
  items?: InvoiceItem[];
  subtotal_amount?: number;
  discount_amount?: number;
  cancelled_at?: string;
  tax_rate?: number;
  ppn_rate?: number;
  tax_type?: 'NONE' | 'PPN';
  tax_label?: string | null;
  billing?: {
    id: string;
    subscription_id: string;
    amount: number;
    billing_date: string;
    due_date: string;
    status: string;
    invoice_number: string;
    description?: string;
    Subscription?: {
      id: string;
      tenant_id: string;
      plan_id: string;
      Tenant: {
        id: string;
        name: string;
        domain: string | null;
        email?: string;
        address?: string;
        tax_id?: string;
      };
      Plan: {
        id: string;
        name: string;
        plan_name?: string;
      };
    };
  };
  tenant?: {
    id: string;
    name: string;
    email?: string;
    address?: string;
    domain?: string | null;
    tax_id?: string;
  };
}

export interface PublicInvoiceResponse {
  invoice_number: string;
  status: InvoiceStatus;
  due_date: string;
  paid_at: string | null;
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
    amount: number;
  }[];
  notes: string | null;
  generated_at: string;
  public_token?: string;
}

export interface InvoiceResponse {
  success: boolean;
  message: string;
  data: Invoice;
}

export interface InvoicesResponse {
  success: boolean;
  message: string;
  data: {
    invoices: Invoice[];
    pagination: {
      total_pages: number;
      total_count: number;
      current_page: number;
      per_page: number;
    };
  };
}

export interface InvoiceStatsResponse {
  success: boolean;
  message: string;
  data: {
    total_invoices: number;
    draft_invoices: number;
    sent_invoices: number;
    paid_invoices: number;
    overdue_invoices: number;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
    overdue_amount: number;
  };
}

export interface CreateInvoiceRequest {
  billing_id: string;
  due_date: string;
  notes?: string;
}

export interface UpdateInvoiceRequest {
  due_date?: string;
  notes?: string;
}

export interface SendInvoiceRequest {
  email?: boolean;
  whatsapp?: boolean;
  recipient_email?: string;
  recipient_phone?: string;
  subject?: string;
  message?: string;
}

export interface MarkPaidRequest {
  payment_method?: string;
  notes?: string;
  paid_at?: string;
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  tenant_id?: string;
  billing_id?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  offset?: number;
}

export interface BillingsForInvoiceResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    description: string;
    amount: number;
    billing_date: string;
    due_date: string;
    status: string;
    tenant: {
      id: string;
      name: string;
    };
  }[];
}

export interface SendInvoiceFormData {
  email: string;
  subject: string;
  message: string;
  send_copy: boolean;
  schedule_date: string;
}

export interface BulkInvoiceOperation {
  invoice_ids: string[];
  operation?: string;
  data?: any;
}

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus | 'ALL';
  tenant_id?: string;
  date_range?: {
    start_date?: string;
    end_date?: string;
  };
  min_amount?: number;
  max_amount?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  // Legacy fields if needed
  dateFrom?: string;
  dateTo?: string;
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

export interface PaginationInfo {
  total_pages: number;
  total_count: number;
  current_page: number;
  per_page: number;
}

export interface InvoiceTabItem {
  key: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface InvoiceFormData {
  tenant_id: string;
  billing_id: string;
  invoice_number: string;
  description: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  notes: string;
  items: InvoiceItem[];
}
