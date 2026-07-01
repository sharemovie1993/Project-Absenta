export async function persistPublicInvoiceToken(_invoiceId: string, _tenantId: string | null, _token: string, _ttlSeconds?: number) {
  // Database persistence is disabled; handled in-memory or bypassed
}

export async function getMappingByToken(_token: string): Promise<{ invoice_id: string, tenant_id?: string, expiry?: number } | null> {
  return null;
}

export async function getOrCreateTokenByInvoice(_invoiceId: string): Promise<string | null> {
  return null;
}

export async function revokeTokenByInvoice(_invoiceId: string): Promise<void> {
  // Do nothing
}

