export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}-${month}`;
  const sequence = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${sequence}`;
}

