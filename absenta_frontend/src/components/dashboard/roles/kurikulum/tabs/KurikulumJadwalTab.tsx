import React, { useState, lazy, Suspense } from 'react';
import { Calendar, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JadwalPelajaranView } from '@/components/kurikulum/jadwal/JadwalPelajaranView';
import { Loader } from '@/components/ui/Loader';

const PeriodeOperasionalKbmView = lazy(
  () => import('@/components/kurikulum/periode-kbm/PeriodeOperasionalKbmView')
);

export interface KurikulumJadwalTabProps {
  semesterId?: string;
  tahunPelajaranId?: string;
}

export const KurikulumJadwalTab: React.FC<KurikulumJadwalTabProps> = ({
  semesterId,
  tahunPelajaranId,
}) => {
  const [subMode, setSubMode] = useState<'JADWAL' | 'PERIODE_BLOK'>('JADWAL');
  const [visitedPeriode, setVisitedPeriode] = useState(false);

  const handleSelectMode = (mode: 'JADWAL' | 'PERIODE_BLOK') => {
    setSubMode(mode);
    if (mode === 'PERIODE_BLOK') setVisitedPeriode(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 w-fit">
        <button
          type="button"
          onClick={() => handleSelectMode('JADWAL')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
            subMode === 'JADWAL'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <Calendar size={14} />
          <span>Jadwal Pelajaran</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectMode('PERIODE_BLOK')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
            subMode === 'PERIODE_BLOK'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          <Layers size={14} />
          <span>Periode PKL &amp; KBM Blok</span>
        </button>
      </div>

      <div className={subMode === 'JADWAL' ? 'block' : 'hidden'}>
        <JadwalPelajaranView
          hideLayout={true}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
        />
      </div>

      {visitedPeriode && (
        <div className={subMode === 'PERIODE_BLOK' ? 'block' : 'hidden'}>
          <Suspense
            fallback={
              <div className="py-12 flex justify-center">
                <Loader size="sm" />
              </div>
            }
          >
            <PeriodeOperasionalKbmView
              hideLayout={true}
              scope="ALL"
              tahunPelajaranId={tahunPelajaranId}
              semesterId={semesterId}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
};
