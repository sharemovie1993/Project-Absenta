import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ExternalLink, GraduationCap, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TrackingSiswaView, type UniversalTrackingSiswaViewProps } from './TrackingSiswaView';

export { TrackingSiswaView, type UniversalTrackingSiswaViewProps };

export interface TrackingSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaId?: string;
  siswaNama?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const TrackingSiswaModal: React.FC<TrackingSiswaModalProps> = React.memo(({
  isOpen,
  onClose,
  siswaId,
  siswaNama,
  kelasId,
  kelasNama,
  jurusanId,
  jurusanNama = 'Kejuruan',
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
      className="w-[96vw] max-w-[1440px] max-h-[92vh] overflow-hidden flex flex-col"
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full pr-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Tracking Presensi Siswa
                </h3>
                {siswaNama && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    {siswaNama}
                  </span>
                )}
                {jurusanNama && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {jurusanNama}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualisasi kalender presensi harian dan linimasa logbook aktivitas tap gerbang & sesi kelas.
              </p>
            </div>
          </div>

          {siswaId && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/attendance/tracking-siswa?siswa_id=${siswaId}`);
                }}
                className="text-xs font-semibold rounded-xl cursor-pointer"
                title="Buka pada halaman penuh"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                Halaman Penuh
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-100px)]">
        <TrackingSiswaView
          hideLayout
          isModal
          siswaId={siswaId}
          initialSiswaNama={siswaNama}
          kelasId={kelasId}
          kelasNama={kelasNama}
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          onClose={onClose}
        />
      </div>
    </Modal>
  );
});

TrackingSiswaModal.displayName = 'TrackingSiswaModal';
