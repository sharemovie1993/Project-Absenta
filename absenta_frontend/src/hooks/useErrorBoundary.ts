import { useState, useCallback } from 'react';
import { LogService } from '../utils/LogService';

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface UseErrorBoundaryOptions {
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

export const useErrorBoundary = (options: UseErrorBoundaryOptions = {}) => {
  const { onError, maxRetries = 3 } = options;
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<ErrorBoundaryState>({
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: ''
  });

  const handleError = useCallback((error: Error, errorInfo: ErrorInfo) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log error details
    LogService.error('🚨 Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId
    });

    setState({
      hasError: true,
      error,
      errorInfo,
      errorId
    });

    // Call onError callback if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Report to error tracking service (if available)
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      LogService.info('📊 Error reported to tracking service:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId
      });
    }
  }, [onError]);

  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    } else {
      // Max retries reached, reload the page
      window.location.reload();
    }
  }, [retryCount, maxRetries]);

  const handleGoHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  const getErrorMessage = useCallback((error: Error): string => {
    // Provide user-friendly error messages
    if (error.message.includes('ChunkLoadError')) {
      return 'Aplikasi telah diperbarui. Silakan muat ulang halaman.';
    }
    
    if (error.message.includes('Network')) {
      return 'Terjadi masalah koneksi. Silakan periksa koneksi internet Anda.';
    }
    
    if (error.message.includes('fetch')) {
      return 'Gagal memuat data. Silakan coba lagi.';
    }
    
    return 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
  }, []);

  return {
    ...state,
    retryCount,
    maxRetries,
    handleError,
    handleRetry,
    handleGoHome,
    getErrorMessage
  };
};