import React, { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Laptop,
  BookOpen,
  Calendar,
  Activity,
  ExternalLink,
  Loader,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CbtBankSoalView = lazy(() =>
  import('@/components/cbt/bank-soal/CbtBankSoalView').then((m) => ({ default: m.CbtBankSoalView }))
);
const CbtJadwalView = lazy(() =>
  import('@/components/cbt/jadwal/CbtJadwalView').then((m) => ({ default: m.CbtJadwalView }))
);
const CbtProctorMonitoringView = lazy(() =>
  import('@/components/cbt/sesi/CbtProctorMonitoringView').then((m) => ({ default: m.CbtProctorMonitoringView }))
);

export type KurikulumCbtSubView = 'bank' | 'jadwal' | 'monitor';

export const KurikulumCbtTab: React.FC = () => {
  const navigate = useNavigate();
  const [activeSubView, setActiveSubView] = useState<KurikulumCbtSubView>('bank');
  const [activeMonitorJadwalId, setActiveMonitorJadwalId] = useState<string | undefined>(undefined);

  const handleNavigateMonitor = (jadwalId: string) => {
    setActiveMonitorJadwalId(jadwalId);
    setActiveSubView('monitor');
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── Sub Navigation Header ── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubView('bank')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeSubView === 'bank'
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <BookOpen size={15} />
            <span>Bank Soal &amp; Butir PG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('jadwal')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeSubView === 'jadwal'
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Calendar size={15} />
            <span>Jadwal &amp; Sesi Ujian</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('monitor')}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeSubView === 'monitor'
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Activity size={15} />
            <span>Live Proctoring</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/cbt/dashboard')}
          className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1.5 shrink-0 cursor-pointer self-end sm:self-auto"
        >
          <Laptop size={14} />
          <span>Buka Command Center CBT</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* ── Sub View Content ── */}
      <Suspense
        fallback={
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
            <Loader className="animate-spin text-violet-600" size={32} />
            <p className="text-xs text-slate-500 font-semibold">Memuat Modul CBT Kurikulum...</p>
          </div>
        }
      >
        {activeSubView === 'bank' && <CbtBankSoalView hideLayout={true} />}
        {activeSubView === 'jadwal' && (
          <CbtJadwalView hideLayout={true} onNavigateMonitor={handleNavigateMonitor} />
        )}
        {activeSubView === 'monitor' && (
          <CbtProctorMonitoringView
            initialJadwalId={activeMonitorJadwalId}
            onBack={() => setActiveSubView('jadwal')}
          />
        )}
      </Suspense>
    </div>
  );
};
