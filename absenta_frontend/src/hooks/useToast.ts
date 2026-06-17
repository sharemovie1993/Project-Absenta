import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'notice';
  duration?: number;
  badgeLabel?: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string,
    type: Toast['type'] = 'info',
    durationOrOptions: number | { duration?: number; badgeLabel?: string } = 3000
  ) => {
    const id = Date.now().toString();
    const duration = typeof durationOrOptions === 'number' ? durationOrOptions : (durationOrOptions.duration ?? 3000);
    const badgeLabel = typeof durationOrOptions === 'number' ? undefined : durationOrOptions.badgeLabel;
    const newToast: Toast = { id, message, type, duration, badgeLabel };
    
    setToasts(prev => [newToast, ...prev]);

    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message: string, durationOrOptions?: number | { duration?: number; badgeLabel?: string }) => 
    showToast(message, 'success', durationOrOptions as any), [showToast]);
  
  const error = useCallback((message: string, durationOrOptions?: number | { duration?: number; badgeLabel?: string }) => 
    showToast(message, 'error', durationOrOptions as any), [showToast]);
  
  const warning = useCallback((message: string, durationOrOptions?: number | { duration?: number; badgeLabel?: string }) => 
    showToast(message, 'warning', durationOrOptions as any), [showToast]);
  
  const info = useCallback((message: string, durationOrOptions?: number | { duration?: number; badgeLabel?: string }) => 
    showToast(message, 'info', durationOrOptions as any), [showToast]);

  const notice = useCallback((message: string, durationOrOptions?: number | { duration?: number; badgeLabel?: string }) =>
    showToast(message, 'notice', durationOrOptions as any), [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    notice,
  };
}
