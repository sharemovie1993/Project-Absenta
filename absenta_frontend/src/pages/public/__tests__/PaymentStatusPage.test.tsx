import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import PaymentStatusPage from '../PaymentStatusPage';
import axiosInstance from '../../../lib/axiosInstance';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Remove mock for react-router-dom
jest.unmock('react-router-dom');

// Mock layout components to simplify rendering
jest.mock('../../../components/invoice/UnifiedInvoiceLayout', () => ({ children }: any) => <div data-testid="unified-layout">{children}</div>);
jest.mock('../../../components/invoice/StandardInvoiceLayout', () => ({ children }: any) => <div data-testid="standard-layout">{children}</div>);

describe('PaymentStatusPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axiosInstance.defaults as any).baseURL = 'http://localhost:3000/api';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/payment/status/test-ref']}>
        <Routes>
          <Route path="/payment/status/:ref" element={<PaymentStatusPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', async () => {
    jest.spyOn(axiosInstance, 'get').mockReturnValue(new Promise(() => {}));
    
    renderComponent();
    
    // Check for loading text
    expect(screen.getByText(/Memuat status pembayaran/i)).toBeInTheDocument();
  });

  it('renders error state if API fails', async () => {
    jest.spyOn(axiosInstance, 'get').mockRejectedValue(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Gagal memuat status pembayaran')).toBeInTheDocument();
    });
  });

  it('renders payment details on success', async () => {
    jest.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: {
        success: true,
        message: 'Success',
        data: {
          status: 'PAID',
          gateway: 'BCA',
          created_at: '2023-01-01T00:00:00Z',
          invoice_token: 'inv-123'
        }
      }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/PAID/i)).toBeInTheDocument();
      expect(screen.getByText(/BCA/i)).toBeInTheDocument();
    });
  });

  it('shows "Detail / Invoice" button if invoice_token is present', async () => {
    jest.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          status: 'PAID',
          invoice_token: 'inv-123'
        }
      }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Detail / Invoice')).toBeInTheDocument();
      expect(screen.getByText('Detail / Invoice').closest('a')).toHaveAttribute('href', '/payment/public/inv-123/instruction?ref=test-ref');
    });
  });

  it('does not show "Detail / Invoice" button if invoice_token is missing', async () => {
    jest.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          status: 'PAID',
          // invoice_token missing
        }
      }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('Detail / Invoice')).not.toBeInTheDocument();
    });
  });

  it('polls status periodically', async () => {
    jest.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { status: 'PENDING' }
      }
    });

    renderComponent();

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledTimes(1);
    });

    // Advance time by 5 seconds (assuming 5000ms interval)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});
