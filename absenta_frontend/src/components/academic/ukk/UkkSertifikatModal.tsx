import React from 'react';
import { Award, ExternalLink, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  UkkSertifikatView,
  type UniversalUkkSertifikatViewProps,
  type UkkStudentItem,
} from './UkkSertifikatView';

export { UkkSertifikatView, type UniversalUkkSertifikatViewProps, type UkkStudentItem };

export interface UkkSertifikatModalProps extends UniversalUkkSertifikatViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UkkSertifikatModal: React.FC<UkkSertifikatModalProps> = ({
  isOpen,
  onClose,
  siswaId,
  namaSiswa,
  nomorSertifikat,
  kelasId,
  kelasNama,
  jurusanId,
  jurusanNama,
  studentsList = [],
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="w-[96vw] max-w-[1380px] max-h-[94vh] flex flex-col overflow-hidden p-0"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Sertifikat Uji Kompetensi Keahlian (UKK)
                </h3>
                {kelasNama && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {kelasNama}
                  </span>
                )}
                {jurusanNama && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                    {jurusanNama}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penerbitan dokumen sertifikat kompetensi kejuruan resmi berstandar industri.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 overflow-hidden flex-1 flex flex-col">
        <UkkSertifikatView
          hideLayout
          isModal
          onClose={onClose}
          siswaId={siswaId}
          namaSiswa={namaSiswa}
          nomorSertifikat={nomorSertifikat}
          kelasId={kelasId}
          kelasNama={kelasNama}
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          studentsList={studentsList}
        />
      </div>
    </Modal>
  );
};
