import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

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
          toast(`Berhasil: ${succeeded.length}, Gagal: ${failed.length}`, { icon: '⚠️' });
          options?.onError?.(failed, errors);
        } else {
          toast.success(options?.successMessage || `Berhasil mengeksekusi ${succeeded.length} item`);
        }

        if (succeeded.length > 0) {
          options?.onSuccess?.(succeeded);
        }
      } catch (error: any) {
        console.error('Bulk action error:', error);
        toast.error('Terjadi kesalahan tidak terduga saat mengeksekusi data');
      } finally {
        setIsExecuting(false);
        options?.onSettled?.();
      }
    },
    []
  );

  return { executeBulk, isExecuting };
}
