import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import PaymentReturnPage from '../PaymentReturnPage';
import axiosInstance from '../../../lib/axiosInstance';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.unmock('react-router-dom');

describe('PaymentReturnPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axiosInstance.defaults as any).baseURL = 'http://localhost:3000/api';
  });

  it('redirects to /home if ref is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/payment/return']}>
        <Routes>
          <Route path="/payment/return" element={<PaymentReturnPage />} />
          <Route path="/home" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });

  it('renders waiting message and ref when ref exists', () => {
    jest.spyOn(axiosInstance, 'get').mockReturnValue(new Promise(() => {}) as any);

    render(
      <MemoryRouter initialEntries={['/payment/return?ref=test-ref']}>
        <Routes>
          <Route path="/payment/return" element={<PaymentReturnPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Menunggu konfirmasi pembayaran')).toBeInTheDocument();
    expect(screen.getByText(/Ref:\s*test-ref/i)).toBeInTheDocument();
  });

  it('calls public status API when ref exists', async () => {
    const getSpy = jest.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: { success: true, message: 'OK', data: { status: 'PENDING', invoice_token: 'inv-token' } }
    } as any);

    render(
      <MemoryRouter initialEntries={['/payment/return?ref=test-ref']}>
        <Routes>
          <Route path="/payment/return" element={<PaymentReturnPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalled();
    });
  });

  it('redirects to instruction page when status is SUCCESS and invoice_token exists', async () => {
    jest.spyOn(axiosInstance, 'get').mockResolvedValue({
      data: { success: true, message: 'OK', data: { status: 'SUCCESS', invoice_token: 'inv-token' } }
    } as any);

    render(
      <MemoryRouter initialEntries={['/payment/return?ref=test-ref']}>
        <Routes>
          <Route path="/payment/return" element={<PaymentReturnPage />} />
          <Route path="/payment/public/:token/instruction" element={<div>Instruction Page</div>} />
          <Route path="/payment/status/:ref" element={<div>Status Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Instruction Page')).toBeInTheDocument();
    });
  });
});
