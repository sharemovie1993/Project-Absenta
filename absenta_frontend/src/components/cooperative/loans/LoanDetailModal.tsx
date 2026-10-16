import React, { Suspense, lazy } from 'react';
import { Modal } from '../../ui/Modal';

// Reuse the existing full-featured LoanDetail page component
const LoanDetail = lazy(() => import('../../../pages/cooperative/LoanDetail'));

export interface LoanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string | null;
}

export const LoanDetailModal: React.FC<LoanDetailModalProps> = React.memo(({
  isOpen,
  onClose,
  loanId,
}) => {
  if (!isOpen || !loanId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title="Rincian Cicilan & Angsuran Pinjaman"
    >
      <div className="p-3 sm:p-5 overflow-y-auto max-h-[82vh] w-full max-w-full min-w-0">
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64 w-full">
              <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          }
        >
          <LoanDetail loanId={loanId} isModal onClose={onClose} />
        </Suspense>
      </div>
    </Modal>
  );
});

LoanDetailModal.displayName = 'LoanDetailModal';
export default LoanDetailModal;
