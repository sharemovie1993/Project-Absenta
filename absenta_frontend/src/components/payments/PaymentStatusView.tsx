import { useState, useEffect, useCallback } from 'react';
import { getPaymentStatus } from '../../api/paymentGateway.api';
import type { 
  PaymentStatusViewProps, 
  PaymentStatus, 
  PaymentStatusData,
  CountdownTimer 
} from '../../types/paymentGateway.d';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  'PENDING': 'text-yellow-600 bg-yellow-100',
  'PROCESSING': 'text-blue-600 bg-blue-100',
  'SUCCESS': 'text-green-600 bg-green-100',
  'FAILED': 'text-red-600 bg-red-100',
  'CANCELLED': 'text-gray-600 bg-gray-100',
  'EXPIRED': 'text-orange-600 bg-orange-100',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  'PENDING': 'Menunggu Pembayaran',
  'PROCESSING': 'Sedang Diproses',
  'SUCCESS': 'Berhasil',
  'FAILED': 'Gagal',
  'CANCELLED': 'Dibatalkan',
  'EXPIRED': 'Kadaluarsa',
};

export default function PaymentStatusView({ 
  paymentId, 
  onStatusChange, 
  pollingInterval = 5000 
}: PaymentStatusViewProps) {
  const [paymentData, setPaymentData] = useState<PaymentStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<CountdownTimer | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const calculateCountdown = useCallback((expiresAt: string): CountdownTimer => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const difference = expiry - now;

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
      };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
    };
  }, []);

  const fetchPaymentStatus = useCallback(async () => {
    try {
      setError('');
      const response = await getPaymentStatus(paymentId);
      
      if (response.success) {
        const newData = response.data;
        setPaymentData(newData);
        setLastUpdated(new Date());
        
        // Trigger callback if status changed
        if (paymentData && paymentData.status !== newData.status) {
          onStatusChange?.(newData);
        }
        
        // Update countdown if expires_at is available
        if (newData.expiresAt) {
          setCountdown(calculateCountdown(newData.expiresAt));
        }
      } else {
        setError(response.message || 'Gagal mengambil status pembayaran');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengambil status pembayaran');
    } finally {
      setIsLoading(false);
    }
  }, [paymentId, paymentData, onStatusChange, calculateCountdown]);

  // Initial fetch
  useEffect(() => {
    fetchPaymentStatus();
  }, [fetchPaymentStatus]);

  // Polling effect
  useEffect(() => {
    if (!paymentData || ['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(paymentData.status)) {
      return; // Stop polling for final states
    }

    const interval = setInterval(fetchPaymentStatus, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchPaymentStatus, pollingInterval, paymentData]);

  // Countdown timer effect
  useEffect(() => {
    if (!paymentData?.expiresAt || paymentData.status !== 'PENDING') {
      return;
    }

    const interval = setInterval(() => {
      const newCountdown = calculateCountdown(paymentData.expiresAt!);
      setCountdown(newCountdown);
      
      if (newCountdown.isExpired) {
        // Refresh payment status when expired
        fetchPaymentStatus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentData, calculateCountdown, fetchPaymentStatus]);

  if (isLoading && !paymentData) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Memuat status pembayaran...</span>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchPaymentStatus}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">Data pembayaran tidak ditemukan</p>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[paymentData.status] || 'text-gray-600 bg-gray-100';
  const statusLabel = STATUS_LABELS[paymentData.status] || paymentData.status;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Status Pembayaran</h4>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Update: {lastUpdated.toLocaleTimeString('id-ID')}
          </span>
        )}
      </div>

      {/* Payment Status */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </span>
          {paymentData.status === 'PENDING' && (
            <div className="flex items-center">
              <div className="animate-pulse w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="ml-1 text-xs text-gray-500">Menunggu...</span>
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-600">
          ID: <span className="font-mono">{paymentData.id}</span>
        </p>
        
        {paymentData.gatewayTransactionId && (
          <p className="text-sm text-gray-600">
            Gateway ID: <span className="font-mono">{paymentData.gatewayTransactionId}</span>
          </p>
        )}
      </div>

      {/* Countdown Timer for PENDING payments */}
      {paymentData.status === 'PENDING' && countdown && !countdown.isExpired && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h5 className="font-medium text-yellow-800 mb-2">Waktu Tersisa</h5>
          <div className="flex gap-4 text-sm">
            {countdown.days > 0 && (
              <div className="text-center">
                <div className="font-bold text-yellow-700">{countdown.days}</div>
                <div className="text-yellow-600">Hari</div>
              </div>
            )}
            <div className="text-center">
              <div className="font-bold text-yellow-700">{countdown.hours.toString().padStart(2, '0')}</div>
              <div className="text-yellow-600">Jam</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-yellow-700">{countdown.minutes.toString().padStart(2, '0')}</div>
              <div className="text-yellow-600">Menit</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-yellow-700">{countdown.seconds.toString().padStart(2, '0')}</div>
              <div className="text-yellow-600">Detik</div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Display */}
      {paymentData.qrString && paymentData.status === 'PENDING' && (
        <div className="mb-4 text-center">
          <h5 className="font-medium text-gray-800 mb-2">Scan QR Code</h5>
          <div className="inline-block p-3 bg-white border-2 border-gray-200 rounded-lg">
            <img 
              src={paymentData.qrString} 
              alt="QR Code Pembayaran" 
              className="w-32 h-32 mx-auto"
            />
          </div>
        </div>
      )}

      {/* Payment URL */}
      {paymentData.paymentUrl && paymentData.status === 'PENDING' && !paymentData.qrString && (
        <div className="mb-4 text-center">
          <a 
            href={paymentData.paymentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Buka Halaman Pembayaran
          </a>
        </div>
      )}

      {/* Message */}
      {paymentData.message && (
        <div className="text-sm text-gray-600 italic">
          {paymentData.message}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Auto-refresh indicator for pending payments */}
      {paymentData.status === 'PENDING' && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          Status akan diperbarui otomatis setiap {pollingInterval / 1000} detik
        </div>
      )}
    </div>
  );
}
