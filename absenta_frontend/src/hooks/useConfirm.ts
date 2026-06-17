import { useConfirmContext } from '@/providers/ConfirmProvider';

import type { ReactNode } from 'react';

export interface UseConfirmOptions {
  title?: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  style?: 'danger' | 'warning' | 'info' | 'success' | 'primary';
}

export default function useConfirm() {
  const { confirm } = useConfirmContext();
  return (options: UseConfirmOptions) => confirm(options);
}

