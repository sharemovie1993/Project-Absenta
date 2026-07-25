import { useConfirmContext } from '@/providers/ConfirmProvider';

import type { ReactNode } from 'react';

export interface UseConfirmOptions {
  title?: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  style?: 'danger' | 'warning' | 'info' | 'success' | 'primary';
  /** Set true to keep dialog open with progress bar after user clicks Confirm */
  withProgress?: boolean;
  progressLabel?: string;
}

export function useConfirm() {
  const { confirm, setConfirmLoading } = useConfirmContext();

  const showConfirm = (options: UseConfirmOptions) => confirm(options);

  return Object.assign(showConfirm, { setLoading: setConfirmLoading });
}

export default useConfirm;

