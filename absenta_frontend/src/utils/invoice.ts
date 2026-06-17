import type { Invoice, PublicInvoiceResponse } from '../types/invoice';
import {
  isInvoiceOverdue as apiIsInvoiceOverdue,
  getDaysOverdue as apiGetDaysOverdue,
  canSendInvoice,
  canMarkAsPaid,
  canCancelInvoice,
  canDeleteInvoice
} from '../api/invoice.api';
import { getTenantById } from '../api/tenants.api';
import type { TenantResponse, Tenant } from '../api/tenants.api';
export type ResolvedTenant = Tenant | {
  id: string;
  name: string;
  email?: string;
  domain?: string | null;
  address?: string;
  phone?: string;
  tax_id?: string;
};

export type CompanyInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoDataUrl?: string;
};

export const defaultCompanyInfo: CompanyInfo = {
  name: 'Absensi Multitenant',
  address: 'Jl. Teknologi No. 123, Jakarta 12345',
  phone: '+62 21 1234 5678',
  email: 'info@absensimultitenant.com',
  website: 'www.absensimultitenant.com'
};

// Overdue helpers (konsolidasi)
export function isOverdue(invoice: Invoice): boolean {
  return apiIsInvoiceOverdue(invoice);
}

export function getDaysOverdue(invoice: Invoice): number {
  return apiGetDaysOverdue(invoice);
}

// Re-export guards untuk konsistensi pemakaian
export { canSendInvoice, canMarkAsPaid, canCancelInvoice, canDeleteInvoice };

// PDF data builder untuk menyatukan pengambilan data tenant dan companyInfo
export async function buildInvoicePdfData(
  invoice: Invoice,
  opts: {
    tenant?: ResolvedTenant;
    companyInfo?: CompanyInfo;
    tenantsList?: Tenant[];
    skipTenantHeader?: boolean;
  } = {}
) {
  const { tenant: providedTenant, companyInfo: providedCompanyInfo, tenantsList, skipTenantHeader } = opts;

  // Prefer tenant provided via options, then invoice.tenant, then local list, then API fetch
  let resolvedTenant: ResolvedTenant | undefined = providedTenant || invoice.tenant;

  // Try resolve from provided tenants list if still missing
  if (!resolvedTenant && Array.isArray(tenantsList)) {
    resolvedTenant = tenantsList.find(t => t.id === invoice.tenant_id);
  }

  // Fetch from API when tenant_id is available to ensure latest data (tolerate 404/not found)
  if (invoice.tenant_id) {
    try {
      const resp: TenantResponse = await getTenantById(invoice.tenant_id, { skipTenantHeader });
      resolvedTenant = resp?.data || resolvedTenant;
    } catch (e) {
      console.warn('Gagal mengambil data tenant untuk PDF:', e);
    }
  }

  const companyInfo = providedCompanyInfo || defaultCompanyInfo;

  return {
    invoice,
    tenant: resolvedTenant,
    companyInfo,
  };
}

export function mapPublicInvoiceToRenderer(publicData: PublicInvoiceResponse): Invoice {
  // Convert PublicInvoiceResponse to Invoice (Unified Format)
  // Maps flat snapshot data to Invoice structure expected by Renderer
  
  return {
    id: '', // Not needed for renderer usually, or use placeholder
    billing_id: '',
    invoice_number: publicData.invoice_number,
    tenant_id: '', // Will be inside tenant object
    amount: publicData.subtotal_amount,
    subtotal_amount: publicData.subtotal_amount,
    tax_amount: publicData.tax_amount,
    total_amount: publicData.total_amount,
    transaction_history: publicData.transaction_history,
    currency: publicData.currency,
    issue_date: publicData.generated_at, 
    created_at: publicData.generated_at,
    updated_at: publicData.generated_at,
    due_date: publicData.due_date,
    status: publicData.status,
    paid_at: publicData.paid_at || undefined,
    notes: publicData.notes || undefined,
    
    // Tax Info
    tax_rate: publicData.tax_rate || 0,
    tax_type: publicData.tax_type as any,
    tax_label: publicData.tax_label,
    
    // Items
    items: publicData.items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: typeof item.unit_price === 'number' ? item.unit_price : Number(item.amount || 0),
      total: typeof item.total === 'number' ? item.total : Number(item.amount || 0)
    })),

    // Snapshot Tenant
    invoice_tenant_name: publicData.tenant.name,
    invoice_tenant_identifier: publicData.tenant.identifier,
    invoice_tenant_address: publicData.tenant.address || undefined,
    
    // Snapshot Issuer
    invoice_company_legal_name: publicData.issuer.name || undefined,
    invoice_company_address: publicData.issuer.address || undefined,
    invoice_company_email_billing: publicData.issuer.email || undefined,
    invoice_company_phone_billing: publicData.issuer.phone || undefined,
    invoice_company_logo_url: publicData.issuer.logo_url || undefined,
    invoice_company_signature_name: publicData.issuer.signature_name || undefined,
    invoice_company_signature_title: publicData.issuer.signature_title || undefined,
    
    // Public Access
    public_token: publicData.public_token,

    // Nested Objects for compatibility if Renderer checks them
    tenant: {
      id: '',
      name: publicData.tenant.name,
      address: publicData.tenant.address || undefined,
      domain: publicData.tenant.identifier
    }
  } as Invoice;
}
