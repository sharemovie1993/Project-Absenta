import React, { useState, Suspense, lazy } from 'react';
import { UserCheck, ShieldCheck, Sparkles, GraduationCap } from 'lucide-react';
import { Button, Loader } from '@/components/ui';
import { GuruProduktifItem } from '../types';

// Code-splitting heavy universal view & modal to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const NilaiPklView = lazy(() =>
  import('@/components/hubin/nilai-pkl/NilaiPklView').then((m) => ({ default: m.NilaiPklView }))
);

const KaprogPlotingSidangModal = lazy(() =>
  import('../modals/KaprogPlotingSidangModal').then((m) => ({ default: m.KaprogPlotingSidangModal }))
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
  guruProduktifList = [],
}) => {
  const [isPlotingModalOpen, setIsPlotingModalOpen] = useState(false);

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
              <span>Sidang &amp; Asesmen PKL Jurusan {jurusanNama}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Form penilaian sidang dapat diisi langsung oleh Kaprog maupun oleh Guru Penguji yang ditugaskan.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setIsPlotingModalOpen(true)}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer h-9 px-3.5"
        >
          <UserCheck size={14} className="mr-1.5" />
          Ploting Penguji Sidang
        </Button>
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
          hideCetakRapor={false}
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
          initialTab="sidang"
          layoutMode="hubin"
          className="w-full"
        />
      </Suspense>

      {/* Ploting Penguji Sidang Modal */}
      {isPlotingModalOpen && (
        <Suspense fallback={null}>
          <KaprogPlotingSidangModal
            isOpen={isPlotingModalOpen}
            onClose={() => setIsPlotingModalOpen(false)}
            jurusanId={jurusanId}
            jurusanNama={jurusanNama}
            tahunPelajaranId={tahunPelajaranId}
            semesterId={semesterId}
            guruProduktifList={guruProduktifList}
          />
        </Suspense>
      )}
    </div>
  );
});

KaprogNilaiSidangTab.displayName = 'KaprogNilaiSidangTab';
export default KaprogNilaiSidangTab;
