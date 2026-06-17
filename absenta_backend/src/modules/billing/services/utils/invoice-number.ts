import { billingDb } from '../repositories/billing.db';

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}-${month}`;
  const lastInvoice = await billingDb.invoice.findFirst({
    where: { invoice_number: { startsWith: prefix } },
    orderBy: { invoice_number: 'desc' },
  });
  let sequence = 1;
  if (lastInvoice) {
    const parts = String((lastInvoice as any).invoice_number || '').split('-');
    const lastSequence = parseInt(parts[3], 10);
    sequence = isNaN(lastSequence) ? 1 : lastSequence + 1;
  }
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

