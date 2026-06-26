import { useState, useCallback, useRef } from 'react';
import { LogService } from '../utils/LogService';
import toast from 'react-hot-toast';
import { formatErrorMessage } from '../api/apiUtils';

interface ErrorInfo {
  id: string;
  message: string;
  code?: string;
  timestamp: number;
  context?: Record<string, unknown>;
  stack?: string;
  retryCount: number;
  maxRetries: number;
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  retryCondition?: (error: Error) => boolean;
}

/**
 * Hook untuk error handling dengan retry logic dan logging
 */
export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const errorCountRef = useRef(0);

  // Generate unique error ID
  const generateErrorId = useCallback(() => {
    return `error_${Date.now()}_${++errorCountRef.current}`;
  }, []);

  // Add error to state
  const addError = useCallback((error: Error, context?: Record<string, unknown>) => {
    const errorInfo: ErrorInfo = {
      id: generateErrorId(),
      message: error.message,
      code: typeof (error as { code?: unknown }).code === 'string' ? (error as { code?: string }).code : undefined,
      timestamp: Date.now(),
      context,
      stack: error.stack,
      retryCount: 0,
      maxRetries: 3
    };

    setErrors(prev => [...prev, errorInfo]);
    return errorInfo;
  }, [generateErrorId]);

  // Remove error from state
  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Handle error with toast notification
  const handleError = useCallback((
    error: Error,
    options: {
      showToast?: boolean;
      toastTitle?: string;
      context?: Record<string, unknown>;
      silent?: boolean;
    } = {}
  ) => {
    const {
      showToast = true,
      toastTitle = 'Terjadi Kesalahan',
      context,
      silent = false
    } = options;

    const errorInfo = addError(error, context);

    // Log error to console in development
    if (import.meta.env.DEV) {
      LogService.error('Error handled:', {
        id: errorInfo.id,
        message: error.message,
        context,
        stack: error.stack
      });
    }

    // Show toast notification
    if (showToast && !silent) {
      toast.error(`${toastTitle}: ${formatErrorMessage(error)}`);
    }

    return errorInfo;
  }, [addError]);

  // Retry function with exponential backoff
  const withRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
      retryCondition = () => true
    } = options;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry if condition is not met
        if (!retryCondition(lastError)) {
          throw lastError;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
    
    throw lastError!;
  }, []);

  // Async error boundary
  const withErrorBoundary = useCallback(<T>(
    fn: () => Promise<T>,
    options: {
      fallback?: T;
      onError?: (error: Error) => void;
      showToast?: boolean;
      context?: Record<string, unknown>;
    } = {}
  ) => {
    return async (): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        handleError(err, {
          showToast: options.showToast,
          context: options.context
        });
        
        if (options.onError) {
          options.onError(err);
        }
        
        return options.fallback;
      }
    };
  }, [handleError]);

  // Get error statistics
  const getErrorStats = useCallback(() => {
    const now = Date.now();
    const last24h = errors.filter(error => now - error.timestamp < 24 * 60 * 60 * 1000);
    const lastHour = errors.filter(error => now - error.timestamp < 60 * 60 * 1000);
    
    return {
      total: errors.length,
      last24h: last24h.length,
      lastHour: lastHour.length,
      byCode: errors.reduce((acc, error) => {
        const code = error.code || 'unknown';
        acc[code] = (acc[code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [errors]);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    handleError,
    withRetry,
    withErrorBoundary,
    errorStats: getErrorStats()
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: Error): string {
  // Network errors
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return 'Koneksi bermasalah. Silakan periksa koneksi internet Anda.';
  }
  
  // Timeout errors
  if (error.message.includes('timeout')) {
    return 'Permintaan memakan waktu terlalu lama. Silakan coba lagi.';
  }
  
  // Authentication errors
  if (error.message.includes('401') || error.message.includes('unauthorized')) {
    return 'Sesi Anda telah berakhir. Silakan login kembali.';
  }
  
  // Permission errors
  if (error.message.includes('403') || error.message.includes('forbidden')) {
    return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
  }
  
  // Not found errors
  if (error.message.includes('404') || error.message.includes('not found')) {
    return 'Data yang diminta tidak ditemukan.';
  }
  
  // Server errors
  if (error.message.includes('500') || error.message.includes('server')) {
    return 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
  }
  
  // Validation errors
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return 'Data yang dimasukkan tidak valid. Silakan periksa kembali.';
  }
  
  // Default message
  return error.message || 'Terjadi kesalahan yang tidak diketahui.';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors are usually retryable
  if (message.includes('fetch') || message.includes('network')) {
    return true;
  }
  
  // Timeout errors are retryable
  if (message.includes('timeout')) {
    return true;
  }
  
  // Server errors (5xx) are retryable
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return true;
  }
  
  // Client errors (4xx) are usually not retryable
  if (message.includes('400') || message.includes('401') || message.includes('403') || message.includes('404')) {
    return false;
  }
  
  return true;
}

/**
 * Hook untuk error boundary di React components
 */
export function useErrorBoundary() {
  const { handleError } = useErrorHandler();
  
  return {
    captureError: (error: Error, errorInfo?: { componentStack: string }) => {
      handleError(error, {
        context: errorInfo,
        toastTitle: 'Kesalahan Komponen'
      });
    }
  };
}
