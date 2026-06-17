import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useInvoiceActions } from '../../hooks/useInvoiceActions';
import type { Invoice } from '../../types/invoice';

jest.mock('../../api/invoice.api', () => ({
  sendInvoice: jest.fn(() => Promise.resolve({ success: true } as any)),
  markInvoiceAsPaid: jest.fn(() => Promise.resolve({ success: true } as any)),
  cancelInvoice: jest.fn(() => Promise.resolve({ success: true } as any)),
  deleteInvoice: jest.fn(() => Promise.resolve({ success: true } as any)),
  canSendInvoice: jest.fn(() => false),
  canMarkAsPaid: jest.fn(() => true),
  canCancelInvoice: jest.fn(() => true),
  canDeleteInvoice: jest.fn(() => true),
}));
import { canSendInvoice } from '../../api/invoice.api';

const TestComponent: React.FC = () => {
  const { sendInvoice, error, clearMessages } = useInvoiceActions();
  const invoice = {
    id: 'inv1',
    invoice_number: 'INV-001',
    tenant_id: 't1',
    status: 'DRAFT',
  } as Invoice;

  return (
    <div>
      {error && <div data-testid="error">{error}</div>}
      <button onClick={() => sendInvoice(invoice)}>Send</button>
      <button onClick={() => clearMessages()}>Clear</button>
    </div>
  );
};

describe('useInvoiceActions smoke', () => {
  test('sets error when canSendInvoice returns false', async () => {
    // Ensure guard denies sending
    (canSendInvoice as jest.Mock).mockReturnValue(false);

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toContain('Only draft invoices can be sent');
    });
  });

  test('clearMessages removes error', async () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Send'));
    await screen.findByTestId('error');

    fireEvent.click(screen.getByText('Clear'));
    await waitFor(() => {
      expect(screen.queryByTestId('error')).toBeNull();
    });
  });
});
