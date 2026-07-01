

export class PdfInvoiceService {
  async resolveExistingPdfStorageKey(_input: { invoiceId: string }): Promise<string> {
    return '';
  }

  async verifyStoredInvoicePdf(_input: { invoiceId: string }): Promise<{
    verified: boolean;
    provider: string | null;
    key: string | null;
    expected_sha256: string | null;
    actual_sha256: string | null;
    generated_at: Date | null;
    size_bytes: number | null;
    invoice_number: string | null;
    reason: string | null;
  }> {
    return {
      verified: false,
      provider: null,
      key: null,
      expected_sha256: null,
      actual_sha256: null,
      generated_at: null,
      size_bytes: null,
      invoice_number: null,
      reason: 'Invoice model is removed',
    };
  }

  async generateAndStoreInvoicePdf(_input: {
    invoiceId: string;
    tenantId: string;
    publicBaseUrl: string;
  }): Promise<{ storageKey: string }> {
    return { storageKey: '' };
  }
}
