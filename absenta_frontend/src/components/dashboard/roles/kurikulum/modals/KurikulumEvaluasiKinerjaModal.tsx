import React, { Suspense } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui';
import { Award } from 'lucide-react';
import { EvaluasiKinerjaGuruView } from '@/components/kurikulum/evaluasi-kinerja/EvaluasiKinerjaGuruView';

export interface KurikulumEvaluasiKinerjaModalProps {
  isOpen: boolean;
  onClose: () => void;
  guruId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  jurusanId?: string;
  jurusanNama?: string;
}

export const KurikulumEvaluasiKinerjaModal: React.FC<KurikulumEvaluasiKinerjaModalProps> = React.memo(({
  isOpen,
  onClose,
  guruId,
  tahunPelajaranId,
  semesterId,
  jurusanId,
  jurusanNama,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="w-[98vw] max-w-[98vw] 2xl:max-w-[1720px]"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-none">
              Evaluasi Kinerja Guru {jurusanNama ? `• ${jurusanNama}` : ''}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Akumulasi performa berbasis 5 pilar kurikulum sekolah
            </p>
          </div>
        </div>
      }
    >
      <div className="p-2 sm:p-4 max-h-[85vh] overflow-y-auto">
        <Suspense
          fallback={
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader size="md" />
              <span className="text-xs text-slate-500 font-medium">Memuat Evaluasi Kinerja Guru...</span>
            </div>
          }
        >
          <EvaluasiKinerjaGuruView
            isModal={true}
            hideLayout={true}
            onClose={onClose}
            guruId={guruId}
            tahunPelajaranId={tahunPelajaranId}
            semesterId={semesterId}
            jurusanId={jurusanId}
            jurusanNama={jurusanNama}
          />
        </Suspense>
      </div>
    </Modal>
  );
});

KurikulumEvaluasiKinerjaModal.displayName = 'KurikulumEvaluasiKinerjaModal';

export default KurikulumEvaluasiKinerjaModal;
