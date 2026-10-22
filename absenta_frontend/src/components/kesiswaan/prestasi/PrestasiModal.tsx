import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { PrestasiView, type UniversalPrestasiViewProps } from './PrestasiView';

export interface PrestasiModalProps extends UniversalPrestasiViewProps {
  isOpen: boolean;
}

export const PrestasiModal: React.FC<PrestasiModalProps> = React.memo(({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="Portofolio Prestasi & Penghargaan Siswa"
      size="full"
    >
      <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
        <PrestasiView {...props} isModal={true} onClose={onClose} />
      </div>
    </Modal>
  );
});

PrestasiModal.displayName = 'PrestasiModal';
