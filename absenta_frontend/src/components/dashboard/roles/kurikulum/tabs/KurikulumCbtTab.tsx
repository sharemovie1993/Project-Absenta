import React, { Suspense, lazy } from 'react';
import { Loader } from 'lucide-react';

const CbtPanitiaOrchestratorView = lazy(() =>
  import('@/components/cbt/jadwal/CbtPanitiaOrchestratorView').then((m) => ({
    default: m.CbtPanitiaOrchestratorView,
  }))
);

export const KurikulumCbtTab: React.FC = () => {
  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
            <Loader className="animate-spin text-indigo-600" size={32} />
            <p className="text-xs text-slate-500 font-semibold">Memuat Meja Kerja Panitia CBT...</p>
          </div>
        }
      >
        <CbtPanitiaOrchestratorView />
      </Suspense>
    </div>
  );
};

export default KurikulumCbtTab;
