import React, { Suspense, lazy } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';

const SiswaDetailView = lazy(() =>
  import('./SiswaDetailView').then((module) => ({ default: module.SiswaDetailView }))
);

export interface SiswaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId: string | null;
  canEdit?: boolean;
  onMutasiSuccess?: () => void;
}

export const SiswaDetailModal: React.FC<SiswaDetailModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  canEdit = true,
}) => {
  if (!isOpen || !siswaId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      disableClose={false}
      className="p-0 border-0 bg-transparent shadow-2xl"
      contentClassName="p-2 sm:p-5 overflow-y-auto max-h-[94vh] bg-slate-50 dark:bg-slate-950 rounded-2xl"
    >
      <Suspense
        fallback={
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader size="lg" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Memuat profil lengkap siswa...
            </span>
          </div>
        }
      >
        <SiswaDetailView
          siswaId={siswaId}
          onBack={onClose}
          canEdit={canEdit}
        />
      </Suspense>
    </Modal>
  );
};

export default SiswaDetailModal;
