/**
 * Invoice Types
 * Tipe data untuk sistem Invoice
 */

export interface CreateInvoiceRequest {
  billing_id: string;
  title?: string;
  description?: string;
  tax_amount?: number;
  notes?: string;
  terms_conditions?: string;
  invoice_items?: InvoiceItem[];
}

export interface UpdateInvoiceRequest {
  title?: string;
  description?: string;
  tax_amount?: number;
  notes?: string;
  terms_conditions?: string;
  invoice_items?: InvoiceItem[];
  status?: InvoiceStatus;
}

export interface SendInvoiceRequest {
  email?: boolean;
  whatsapp?: boolean;
  recipient_email?: string;
  recipient_phone?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceResponse {
  id: string;
  tenant_id: string;
  billing_id: string;
  invoice_number: string;
  title?: string;
  description?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  issue_date: Date;
  due_date: Date;
  sent_at?: Date;
  viewed_at?: Date;
  paid_at?: Date;
  invoice_items?: InvoiceItem[];
  notes?: string;
  terms_conditions?: string;
  pdf_path?: string;
  email_sent: boolean;
  whatsapp_sent: boolean;
  created_at: Date;
  updated_at: Date;
  Tenant?: {
    id: string;
    name: string;
    domain?: string;
  };
  Billing?: {
    id: string;
    amount: number;
    billing_date: Date;
    due_date: Date;
    status: string;
  };
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  tenant_id?: string;
  billing_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface InvoiceListResponse {
  invoices: InvoiceResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}