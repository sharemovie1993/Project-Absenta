import React from 'react';
import { AlertTriangle, Trash2, XCircle, CheckCircle, Info } from 'lucide-react';
import Modal, { ModalFooter } from './Modal';
import Button from './Button';
import { cn } from '@/lib/utils';

type ConfirmStyle = 'danger' | 'warning' | 'info' | 'success' | 'primary';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  style?: ConfirmStyle;
  loading?: boolean;
}

const iconByStyle: Record<ConfirmStyle, React.ReactNode> = {
  danger: <Trash2 className="w-6 h-6 text-red-600" />,
  warning: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
  info: <Info className="w-6 h-6 text-blue-600" />,
  success: <CheckCircle className="w-6 h-6 text-green-600" />,
  primary: <Info className="w-6 h-6 text-blue-600" />,
};

const headerClassByStyle: Record<ConfirmStyle, string> = {
  danger: 'bg-red-50 dark:bg-red-900/20',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20',
  info: 'bg-blue-50 dark:bg-blue-900/20',
  success: 'bg-green-50 dark:bg-green-900/20',
  primary: 'bg-blue-50 dark:bg-blue-900/20',
};

export default function ConfirmDialog({
  isOpen,
  title = 'Konfirmasi Aksi',
  description = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  style = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="md">
      <div className={cn('rounded-lg p-4 mb-4 flex items-start gap-3', headerClassByStyle[style])}>
        <div className="shrink-0">{iconByStyle[style]}</div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{description}</p>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={style === 'danger' ? 'danger' : style === 'warning' ? 'secondary' : 'primary'} onClick={onConfirm} disabled={loading}>
          {loading ? 'Memproses...' : confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
