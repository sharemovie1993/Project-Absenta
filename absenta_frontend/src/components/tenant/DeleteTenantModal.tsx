import React, { useState } from 'react';
import { Modal, ModalFooter, Button, Input, Label } from '../ui';
import { AlertTriangle } from 'lucide-react';

interface DeleteTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmationName: string) => Promise<void>;
  tenantName: string;
  isLoading?: boolean;
}

export const DeleteTenantModal: React.FC<DeleteTenantModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tenantName,
  isLoading = false,
}) => {
  const [confirmationName, setConfirmationName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationName !== tenantName) return;
    await onConfirm(confirmationName);
    setConfirmationName(''); // Reset after success
  };

  const handleClose = () => {
    setConfirmationName('');
    onClose();
  };

  const isMatch = confirmationName === tenantName;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Hapus Tenant Secara Paksa">
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 bg-red-50 text-red-800 rounded-md border border-red-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Peringatan: Tindakan ini tidak dapat dibatalkan!</p>
            <p className="mt-1">
              Anda akan menghapus tenant <strong>{tenantName}</strong> secara permanen. 
              Semua data pengguna, absensi, dan tagihan akan hilang.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmationName">
              Ketik <strong>{tenantName}</strong> untuk konfirmasi:
            </Label>
            <Input
              id="confirmationName"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              placeholder={tenantName}
              className="font-mono"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
              Batal
            </Button>
            <Button 
              type="submit" 
              variant="danger" 
              disabled={!isMatch || isLoading}
            >
              {isLoading ? 'Menghapus...' : 'Hapus Permanen'}
            </Button>
          </ModalFooter>
        </form>
      </div>
    </Modal>
  );
};
