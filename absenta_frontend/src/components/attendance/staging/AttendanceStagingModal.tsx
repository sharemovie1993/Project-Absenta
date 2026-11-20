import React, { Suspense, lazy } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';

const AttendanceStagingView = lazy(() =>
  import('./AttendanceStagingView').then((m) => ({
    default: m.AttendanceStagingView,
  }))
);

export interface AttendanceStagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranId?: string;
  semesterId?: string;
  kelasId?: string;
  onSyncSuccess?: () => void;
}

export const AttendanceStagingModal: React.FC<AttendanceStagingModalProps> = React.memo(({
  isOpen,
  onClose,
  tahunPelajaranId,
  semesterId,
  kelasId,
  onSyncSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="w-[98vw] max-w-[98vw] 2xl:max-w-[1680px]"
    >
      <Suspense
        fallback={
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader size="md" />
            <span className="text-xs font-bold text-slate-500">Memuat Wadah Penampung Presensi...</span>
          </div>
        }
      >
        <AttendanceStagingView
          isModal={true}
          onClose={onClose}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          kelasId={kelasId}
          onSyncSuccess={onSyncSuccess}
        />
      </Suspense>
    </Modal>
  );
});

AttendanceStagingModal.displayName = 'AttendanceStagingModal';
export default AttendanceStagingModal;
