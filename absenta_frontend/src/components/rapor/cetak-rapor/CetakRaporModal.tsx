import React from 'react';
import { Modal } from '../../ui/Modal';
import { CetakRaporView, type UniversalCetakRaporViewProps } from './CetakRaporView';

export interface CetakRaporModalProps extends Omit<UniversalCetakRaporViewProps, 'isModal'> {
  isOpen: boolean;
  onClose: () => void;
}

export const CetakRaporModal: React.FC<CetakRaporModalProps> = React.memo(({
  isOpen,
  onClose,
  ...viewProps
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="w-[98vw] max-w-[98vw] 2xl:max-w-[1720px] p-0 overflow-hidden"
    >
      <CetakRaporView
        {...viewProps}
        isModal={true}
        onClose={onClose}
      />
    </Modal>
  );
});

CetakRaporModal.displayName = 'CetakRaporModal';
