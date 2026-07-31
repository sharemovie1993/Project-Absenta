import React, { createContext, useCallback, useContext, useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ConfirmOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  style?: 'danger' | 'warning' | 'info' | 'success' | 'primary';
  /** If true, after user clicks Confirm the dialog stays open with a progress bar until you call setLoading(false) */
  withProgress?: boolean;
  progressLabel?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Call this from your delete/async handler to show/hide the progress bar in the active confirm dialog */
  setConfirmLoading: (loading: boolean, progress?: number) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    setLoading(false);
    setProgress(undefined);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const setConfirmLoading = useCallback((isLoading: boolean, prog?: number) => {
    setLoading(isLoading);
    setProgress(prog);
    if (!isLoading) {
      // Auto-close dialog after loading finishes
      setOpen(false);
      setResolver(null);
    }
  }, []);

  const handleConfirm = () => {
    if (options.withProgress) {
      // Stay open with loading state — caller controls when to close via setConfirmLoading(false)
      setLoading(true);
      resolver?.(true);
    } else {
      setOpen(false);
      resolver?.(true);
      setResolver(null);
    }
  };

  const handleCancel = () => {
    if (loading) return; // Can't cancel while processing
    setOpen(false);
    resolver?.(false);
    setResolver(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, setConfirmLoading }}>
      {children}
      <ConfirmDialog
        isOpen={open}
        title={options.title}
        description={options.description}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        style={options.style}
        loading={loading}
        progress={progress}
        progressLabel={options.progressLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirmContext() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    console.warn('[ConfirmProvider] Component called useConfirm outside ConfirmProvider. Falling back to browser confirm.');
    return {
      confirm: async (options: any) => {
        const msg = typeof options === 'string' 
          ? options 
          : (options?.title ? `${options.title}\n\n${options.description || ''}` : (options?.description || 'Apakah Anda yakin?'));
        return window.confirm(String(msg));
      },
      setConfirmLoading: () => {}
    };
  }
  return ctx;
}

export const useConfirm = useConfirmContext;
