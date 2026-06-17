import { useState, useCallback } from 'react';
import { useToast } from './useToast';

interface BulkActionOptions {
  onSuccess?: (succeededIds: string[]) => void;
  onError?: (failedIds: string[], errors: any[]) => void;
  onSettled?: () => void;
  successMessage?: string;
}

/**
 * A generic hook to handle bulk API operations (e.g., bulk delete, bulk activate).
 * It runs Promise.allSettled and reports the success/failure summary.
 */
export function useBulkAction<T = any>() {
  const [isExecuting, setIsExecuting] = useState(false);
  const { showToast } = useToast();

  const executeBulk = useCallback(
    async (
      ids: string[],
      actionFn: (id: string) => Promise<{ success: boolean; message?: string; data?: T }>,
      options?: BulkActionOptions
    ) => {
      if (!ids || ids.length === 0) return;

      setIsExecuting(true);
      try {
        const results = await Promise.allSettled(
          ids.map(async (id) => {
            const res = await actionFn(id);
            if (!res.success) {
              throw new Error(res.message || 'Operasi gagal');
            }
            return id;
          })
        );

        const succeeded: string[] = [];
        const failed: string[] = [];
        const errors: any[] = [];

        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            succeeded.push(ids[idx]);
          } else {
            failed.push(ids[idx]);
            errors.push(r.reason);
          }
        });

        if (failed.length > 0) {
          showToast(`Berhasil: ${succeeded.length}, Gagal: ${failed.length}`, 'warning');
          options?.onError?.(failed, errors);
        } else {
          showToast(options?.successMessage || `Berhasil mengeksekusi ${succeeded.length} item`, 'success');
        }

        if (succeeded.length > 0) {
          options?.onSuccess?.(succeeded);
        }
      } catch (error: any) {
        console.error('Bulk action error:', error);
        showToast('Terjadi kesalahan tidak terduga saat mengeksekusi data', 'error');
      } finally {
        setIsExecuting(false);
        options?.onSettled?.();
      }
    },
    [showToast]
  );

  return { executeBulk, isExecuting };
}
