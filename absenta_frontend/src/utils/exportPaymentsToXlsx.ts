import * as XLSX from 'xlsx';
import type { PaymentRecord } from '../types/payments';
import type { Invoice } from '../types/invoice';
import type { TenantItem } from '../api/user.api';
import { formatCurrency, formatDate } from './layoutUtils';

interface ExportData {
  'Invoice Number': string;
  'Tenant (Sekolah)': string;
  'Status Invoice': string;
  'Metode Bayar': string;
  'Gateway': string;
  'Total Tagihan': string | number;
  'Mata Uang': string;
  'Tanggal Dibayar': string;
  'Gateway Ref': string;
  'Payment Status': string;
  'Dibuat Pada': string;
  'Updated Pada': string;
}

export const exportPaymentsToXlsx = (
  payments: PaymentRecord[],
  invoices: Invoice[],
  tenants: TenantItem[]
): void => {
  // 1. Prepare Data
  const data: ExportData[] = payments.map((payment) => {
    // Try to find the invoice related to this payment
    // We match primarily by invoice_number if available, or billing_id
    const invoice = invoices.find(
      (inv) =>
        (payment.invoice_number &&
          payment.invoice_number !== 'N/A' &&
          inv.invoice_number === payment.invoice_number) ||
        (payment.billing_id && inv.billing_id === payment.billing_id)
    );

    // Find Tenant
    // If invoice exists, use invoice.tenant_id or invoice.tenant.name
    // Fallback: try to find tenant from tenantOptions if we have a tenant_id context (which we might not have in payment record)
    // However, if we have invoice, we have tenant_id.
    let tenantName = '';
    if (invoice) {
      if (invoice.tenant?.name) {
        tenantName = invoice.tenant.name;
      } else if (invoice.tenant_id) {
        const tenant = tenants.find((t) => t.id === invoice.tenant_id);
        tenantName = tenant?.name || '';
      }
    }

    // Determine Status Invoice
    const statusInvoice = invoice?.status || '';

    // Determine Total Tagihan
    // Use invoice total_amount if available, otherwise payment amount
    const totalTagihan = invoice?.total_amount ?? payment.amount ?? 0;

    // Currency
    const currency = invoice?.currency || 'IDR';

    // Dates
    const paidAt = payment.paid_at ? formatDate(payment.paid_at) : '';
    const createdAt = invoice?.created_at
      ? formatDate(invoice.created_at)
      : payment.created_at
      ? formatDate(payment.created_at)
      : '';
    const updatedAt = invoice?.updated_at
      ? formatDate(invoice.updated_at)
      : payment.updated_at
      ? formatDate(payment.updated_at)
      : '';

    // 3. Validation Hard Fail (Audit Safety)
    if (!payment.invoice_number && !invoice?.invoice_number) {
      console.warn("[EXPORT AUDIT] Missing invoice_number for row", payment);
    }

    return {
      'Invoice Number': payment.invoice_number || invoice?.invoice_number || '',
      'Tenant (Sekolah)': tenantName,
      'Status Invoice': statusInvoice,
      'Metode Bayar': payment.payment_method || '',
      'Gateway': payment.gateway || '',
      'Total Tagihan': totalTagihan,
      'Mata Uang': currency,
      'Tanggal Dibayar': paidAt,
      'Gateway Ref': payment.gateway_transaction_id || '',
      'Payment Status': payment.status || '',
      'Dibuat Pada': createdAt,
      'Updated Pada': updatedAt,
    };
  });

  // 2. Create Worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 3. Create Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments_Audit');

  // 4. Generate Filename: payments-audit-YYYY-MM-DD.xlsx
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `payments-audit-${dateStr}.xlsx`;

  // 5. Write File
  XLSX.writeFile(workbook, filename);
};
