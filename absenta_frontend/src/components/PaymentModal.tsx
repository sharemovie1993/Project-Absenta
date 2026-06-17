import React, { useState } from 'react';
import { Button, SearchableSelect } from './ui';
import { markBillingAsPaid, formatPaymentAmount } from '../api/payments.api';
import type { PaymentMethod } from '../types/payments';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  billing: {
    id: string;
    invoice_number: string;
    amount: number;
    customer_name: string;
  };
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'MANUAL_TRANSFER', label: 'Transfer Manual' },
  { value: 'CASH', label: 'Tunai' },
  { value: 'VOUCHER', label: 'Voucher' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
  { value: 'CREDIT_CARD', label: 'Kartu Kredit' },
  { value: 'DEBIT_CARD', label: 'Kartu Debit' },
];

export default function PaymentModal({ isOpen, onClose, onSuccess, billing }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MANUAL_TRANSFER');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await markBillingAsPaid(billing.id, {
        payment_method: paymentMethod,
        note: note.trim() || undefined,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memproses pembayaran');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('MANUAL_TRANSFER');
    setNote('');
    setError('');
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Konfirmasi Pembayaran Manual
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Billing Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Invoice</div>
            <div className="font-medium text-gray-900">{billing.invoice_number}</div>
            
            <div className="text-sm text-gray-600 mb-1 mt-2">Customer</div>
            <div className="font-medium text-gray-900">{billing.customer_name}</div>
            
            <div className="text-sm text-gray-600 mb-1 mt-2">Jumlah</div>
            <div className="font-bold text-lg text-green-600">
              {formatPaymentAmount(billing.amount)}
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
              Metode Pembayaran *
            </label>
            <SearchableSelect
              value={paymentMethod}
              onValueChange={(val: string) => setPaymentMethod(val as PaymentMethod)}
              options={PAYMENT_METHODS}
              placeholder="Pilih metode pembayaran"
              searchPlaceholder="Cari metode..."
              disabled={isLoading}
              triggerClassName="w-full"
            />
          </div>

          {/* Note */}
          <div className="mb-6">
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambahkan catatan pembayaran..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Memproses...' : 'Konfirmasi Pembayaran'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
