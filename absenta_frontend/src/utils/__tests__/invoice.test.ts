import { isOverdue, getDaysOverdue, buildInvoicePdfData, defaultCompanyInfo } from '../../utils/invoice';
import type { Invoice } from '../../types/invoice';

jest.mock('../../api/invoice.api', () => ({
  isInvoiceOverdue: jest.fn(() => true),
  getDaysOverdue: jest.fn(() => 5),
}));

jest.mock('../../api/tenants.api', () => ({
  getTenantById: jest.fn(() => Promise.resolve({
    data: { id: 't1', name: 'Tenant One', email: 'tenant@example.com' },
  } as any)),
}));

import { isInvoiceOverdue, getDaysOverdue as apiGetDaysOverdue } from '../../api/invoice.api';
import { getTenantById } from '../../api/tenants.api';

describe('utils/invoice', () => {
  const baseInvoice: Invoice = {
    id: 'inv1',
    invoice_number: 'INV-001',
    tenant_id: 't1',
    tenant: { id: 't1', name: 'Tenant One', email: 'tenant@example.com' },
    amount: 100000,
    currency: 'IDR',
    tax_amount: 0,
    status: 'SENT',
    created_at: new Date().toISOString(),
    due_date: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  test('isOverdue delegates to api isInvoiceOverdue', () => {
    const result = isOverdue(baseInvoice);
    expect(isInvoiceOverdue).toHaveBeenCalledWith(baseInvoice);
    expect(result).toBe(true);
  });

  test('getDaysOverdue delegates to api getDaysOverdue', () => {
    const days = getDaysOverdue(baseInvoice);
    expect(apiGetDaysOverdue).toHaveBeenCalledWith(baseInvoice);
    expect(days).toBe(5);
  });

  test('buildInvoicePdfData returns tenant and default companyInfo', async () => {
    const { tenant, companyInfo } = await buildInvoicePdfData(baseInvoice);
    expect(getTenantById).toHaveBeenCalledWith(baseInvoice.tenant_id, { skipTenantHeader: undefined });
    expect(tenant).toBeDefined();
    expect(companyInfo).toEqual(defaultCompanyInfo);
  });
});
