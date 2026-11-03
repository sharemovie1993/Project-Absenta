import React, { Suspense, lazy } from 'react';
import { UserCheck } from 'lucide-react';

// Code-splitting universal placement view (Pilar 21B & TBT Optimization)
const PenempatanPklView = lazy(() =>
  import('@/components/hubin/penempatan/PenempatanPklView').then((m) => ({ default: m.PenempatanPklView }))
);

export interface KaprogPlotingPklTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogPlotingPklTab: React.FC<KaprogPlotingPklTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="space-y-4">
      {/* ── Action Header ala Kaprog ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Ploting Penempatan Siswa PKL Jurusan {jurusanNama}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Penetapan siswa ke mitra industri DUDI, pengaturan periode PKL, dan penugasan guru pembimbing lapangan.
            </p>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="animate-spin w-8 h-8 mx-auto text-indigo-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
            Memuat modul penempatan siswa PKL...
          </div>
        }
      >
        <PenempatanPklView
          isModal={false}
          hideLayout={true}
          hideScopeBanner={true}
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          className="w-full"
        />
      </Suspense>
    </div>
  );
});

KaprogPlotingPklTab.displayName = 'KaprogPlotingPklTab';
export default KaprogPlotingPklTab;
