import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Users, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RekapKolektifView, type UniversalRekapKolektifViewProps } from '@/components/attendance/rekap/RekapKolektifView';
import type { KelasKehadiranItem } from '../types';

export { RekapKolektifView, type UniversalRekapKolektifViewProps };

export interface KaprogRekapKolektifModalProps {
  isOpen: boolean;
  onClose: () => void;
  jurusanId?: string;
  jurusanNama?: string;
  kelasKehadiranList?: KelasKehadiranItem[];
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogRekapKolektifModal: React.FC<KaprogRekapKolektifModalProps> = React.memo(({
  isOpen,
  onClose,
  jurusanId,
  jurusanNama = 'Kejuruan',
  kelasKehadiranList = [],
  tahunPelajaranId,
  semesterId,
}) => {
  const navigate = useNavigate();

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
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Hasil Rekapitulasi Kolektif
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                {jurusanNama}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Laporan kehadiran kolektif bulanan seluruh rombel pada jurusan ini.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-5 space-y-4">
        <RekapKolektifView
          isModal
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          kelasKehadiranList={kelasKehadiranList}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          onClose={onClose}
        />

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/attendance/rekap/kelas-bulanan?jurusanId=${jurusanId || ''}`);
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 gap-1.5 cursor-pointer"
          >
            <span>Buka Halaman Rekapitulasi Penuh</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold rounded-xl cursor-pointer"
          >
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
});

export default KaprogRekapKolektifModal;
