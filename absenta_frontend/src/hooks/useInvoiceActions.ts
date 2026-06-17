import { useState, useCallback } from 'react';
import type { Invoice, SendInvoiceRequest } from '../types/invoice';
import {
  sendInvoice as apiSendInvoice,
  canSendInvoice,
} from '../api/invoice.api';

interface UseInvoiceActionsOptions {
  onReload?: () => Promise<void> | void;
}

export function useInvoiceActions(options: UseInvoiceActionsOptions = {}) {
  const { onReload } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const sendInvoice = useCallback(async (invoice: Invoice, payload?: SendInvoiceRequest) => {
    if (!canSendInvoice(invoice)) {
      setError('Only draft invoices can be sent');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await apiSendInvoice(invoice.id, payload);
      if (response.success) {
        setSuccess('Invoice sent successfully');
        await onReload?.();
      } else {
        setError(response.message || 'Failed to send invoice');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send invoice');
    } finally {
      setLoading(false);
    }
  }, [onReload]);

  

  return {
    loading,
    error,
    success,
    clearMessages,
    sendInvoice,
  };
}

export default useInvoiceActions;
