import React from 'react';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import { Button } from '../../components/ui';
import { Switch } from '../../components/ui/Switch';

interface SubscriptionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editStatus: string;
  editAutoRenew: boolean;
  onAutoRenewChange: (val: boolean) => void;
  onSave: () => Promise<void>;
  loading?: boolean;
}

export const SubscriptionEditModal: React.FC<SubscriptionEditModalProps> = ({
  isOpen,
  onClose,
  editStatus,
  editAutoRenew,
  onAutoRenewChange,
  onSave,
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Subscription"
      size="md"
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200">
              {editStatus || 'UNKNOWN'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Status langganan mengikuti alur pembayaran invoice dan proses sistem, tidak dapat diubah manual dari halaman ini.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="edit-auto-renew"
            checked={editAutoRenew}
            onCheckedChange={onAutoRenewChange}
            aria-label="Toggle Auto Renew Subscription"
          />
          <label htmlFor="edit-auto-renew" className="text-sm cursor-pointer">
            Auto Renew
          </label>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>Batal</Button>
        <Button onClick={onSave} disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
