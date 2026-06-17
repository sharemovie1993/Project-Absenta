import React, { useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useErrorBoundary } from '../../hooks/useErrorBoundary';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

/**
 * Error Boundary component untuk menangani error di level komponen React
 */
export const ErrorBoundary: React.FC<Props> = ({ children, fallback, onError, showDetails }) => {
  const {
    hasError,
    error,
    errorInfo,
    errorId,
    retryCount,
    maxRetries,
    handleError,
    handleRetry,
    handleGoHome,
    getErrorMessage
  } = useErrorBoundary({ onError });

  useEffect(() => {
    const handleErrorEvent = (event: ErrorEvent) => {
      handleError(event.error, { componentStack: event.error?.stack || '' });
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { componentStack: event.reason?.stack || '' }
      );
    };

    window.addEventListener('error', handleErrorEvent);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('error', handleErrorEvent);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, [handleError]);

  if (hasError) {
    // Custom fallback UI
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default error UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Oops! Terjadi Kesalahan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-center">
              {error ? getErrorMessage(error) : 'Terjadi kesalahan yang tidak diketahui.'}
            </p>

            {showDetails && error && (
              <details className="bg-gray-50 p-3 rounded-md">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Detail Teknis
                </summary>
                <div className="text-xs text-gray-600 space-y-2">
                  <div>
                    <strong>Error ID:</strong> {errorId}
                  </div>
                  <div>
                    <strong>Pesan:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center gap-2"
                disabled={retryCount >= maxRetries}
              >
                <RefreshCw className="w-4 h-4" />
                {retryCount >= maxRetries ? 'Muat Ulang Halaman' : 'Coba Lagi'}
              </Button>
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Ke Beranda
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Percobaan: {retryCount}/{maxRetries}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
