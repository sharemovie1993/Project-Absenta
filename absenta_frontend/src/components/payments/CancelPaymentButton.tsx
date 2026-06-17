import { useState } from 'react';
import { cancelPayment } from '../../api/paymentGateway.api';
import type { CancelPaymentButtonProps, PaymentStatus } from '../../types/paymentGateway.d';
import { useAuth } from '../../hooks/useAuth';
import { isSystemSuperAdmin } from '../../utils/rbac';

// Define user roles that can cancel payments
const ALLOWED_ROLES = ['ADMIN', 'SUPERADMIN'];

// Define payment statuses that can be cancelled
const CANCELLABLE_STATUSES: PaymentStatus[] = ['PENDING', 'PROCESSING'];

export default function CancelPaymentButton({
  paymentId,
  currentStatus,
  userRole,
  onCancelSuccess,
  onCancelError,
  disabled = false,
  size = 'medium',
  variant = 'danger'
}: CancelPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { user, can, isLoading: isAuthLoading } = useAuth();

  // Check if user has permission to cancel payments
  const hasPermission = can('billing.invoices.cancel');
  
  // Check if payment can be cancelled based on status
  const canCancel = CANCELLABLE_STATUSES.includes(currentStatus);
  
  // Determine if button should be disabled
  const isDisabled = disabled || !hasPermission || !canCancel || isLoading;

  const handleCancelClick = () => {
    if (isDisabled) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmCancel = async () => {
    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      const response = await cancelPayment(paymentId);
      
      if (response.success) {
        onCancelSuccess?.(paymentId);
      } else {
        onCancelError?.(response.message || 'Gagal membatalkan pembayaran');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Gagal membatalkan pembayaran';
      onCancelError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDialog = () => {
    setShowConfirmDialog(false);
  };

  // Size classes
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm',
    large: 'px-4 py-3 text-base'
  };

  // Variant classes
  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    outline: 'bg-white hover:bg-red-50 text-red-600 border-red-600',
    ghost: 'bg-transparent hover:bg-red-50 text-red-600 border-transparent'
  };

  const buttonClasses = `
    inline-flex items-center justify-center
    border rounded-md font-medium
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
  `.trim();

  // Don't render if user doesn't have permission or auth is loading
  if (isAuthLoading || !hasPermission) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleCancelClick}
        disabled={isDisabled}
        className={buttonClasses}
        title={
          !canCancel 
            ? `Pembayaran dengan status ${currentStatus} tidak dapat dibatalkan`
            : 'Batalkan pembayaran'
        }
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Membatalkan...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Batalkan
          </>
        )}
      </button>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Konfirmasi Pembatalan
                </h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Apakah Anda yakin ingin membatalkan pembayaran ini?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ID Pembayaran: <span className="font-mono">{paymentId}</span>
              </p>
              <p className="text-xs text-red-600 mt-1">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDialog}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
