import React, { useState, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader, Layers, TableIcon } from 'lucide-react';
import { TabSwitcher, type TabOption } from '@/components/ui';

const CbtPanitiaOrchestratorView = lazy(() =>
  import('@/components/cbt/jadwal/CbtPanitiaOrchestratorView').then((m) => ({
    default: m.CbtPanitiaOrchestratorView,
  }))
);

const CbtEventSettingsTable = lazy(() =>
  import('@/components/cbt/jadwal/CbtEventSettingsTable').then((m) => ({
    default: m.CbtEventSettingsTable,
  }))
);

export const KurikulumCbtTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cbtViewParam = searchParams.get('cbt_view');

  const [activeView, setActiveView] = useState<'orchestrator' | 'settings'>(() => {
    return cbtViewParam === 'settings' ? 'settings' : 'orchestrator';
  });

  const handleTabChange = (view: string) => {
    const nextView = view as 'orchestrator' | 'settings';
    setActiveView(nextView);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextView === 'settings') {
        next.set('cbt_view', 'settings');
      } else {
        next.delete('cbt_view');
      }
      return next;
    }, { replace: true });
  };

  const cbtTabs: TabOption[] = [
    {
      id: 'orchestrator',
      label: 'Meja Kerja Panitia',
      icon: <Layers size={14} className="shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Pengaturan Event Ujian (Tabel)',
      icon: <TableIcon size={14} className="shrink-0" />,
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* ── Topbar Tab Switcher ── */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
        <TabSwitcher
          tabs={cbtTabs}
          activeTab={activeView}
          onChange={handleTabChange}
          variant="pills"
          size="sm"
        />
      </div>

      <Suspense
        fallback={
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
            <Loader className="animate-spin text-indigo-600" size={32} />
            <p className="text-xs text-slate-500 font-semibold">Memuat Asesmen CBT...</p>
          </div>
        }
      >
        {activeView === 'orchestrator' ? (
          <CbtPanitiaOrchestratorView onOpenSettings={() => handleTabChange('settings')} />
        ) : (
          <CbtEventSettingsTable
            onSelectEventForOrchestrator={() => handleTabChange('orchestrator')}
          />
        )}
      </Suspense>
    </div>
  );
};

export default KurikulumCbtTab;
