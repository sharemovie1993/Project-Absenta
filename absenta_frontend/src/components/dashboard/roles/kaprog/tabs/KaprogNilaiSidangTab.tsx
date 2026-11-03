import React, { Suspense, lazy } from 'react';
import { GraduationCap } from 'lucide-react';
import { GuruProduktifItem } from '../types';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const NilaiPklView = lazy(() =>
  import('@/components/hubin/nilai-pkl/NilaiPklView').then((m) => ({ default: m.NilaiPklView }))
);

export interface KaprogNilaiSidangTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  guruProduktifList?: GuruProduktifItem[];
}

export const KaprogNilaiSidangTab: React.FC<KaprogNilaiSidangTabProps> = React.memo(({
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
            <GraduationCap size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Sidang &amp; Ujian PKL Jurusan {jurusanNama}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Form penilaian sidang dapat diisi langsung oleh Kaprog maupun oleh Guru Penguji yang ditugaskan.
            </p>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="animate-spin w-8 h-8 mx-auto text-indigo-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
            Memuat lembar penilaian sidang PKL...
          </div>
        }
      >
        <NilaiPklView
          hideScopeBanner={true}
          hideHeaderStats={false}
          hideCetakRapor={true}
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          activeTabOnly="sidang"
          initialTab="sidang"
          layoutMode="hubin"
          className="w-full"
        />
      </Suspense>
    </div>
  );
});

KaprogNilaiSidangTab.displayName = 'KaprogNilaiSidangTab';
export default KaprogNilaiSidangTab;
