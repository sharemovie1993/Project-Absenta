import React, { useState, lazy, Suspense } from 'react';
import { JamKBMView } from '@/components/kurikulum/jam-kbm/JamKBMView';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { Loader } from '@/components/ui';
import { Clock, CalendarDays } from 'lucide-react';

const TenantAttendanceForm = lazy(() => import('@/components/attendance/settings/TenantAttendanceForm'));

export const KurikulumJamKbmTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'jp' | 'aturan'>('jp');

  const subTabOptions = [
    { id: 'jp', label: 'Struktur Jam Belajar (JP)', icon: Clock },
    { id: 'aturan', label: 'Aturan Masuk, Pulang & Hari Sekolah', icon: CalendarDays },
  ];

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
        <TabSwitcher
          options={subTabOptions}
          activeTab={activeSubTab}
          onChange={(id) => setActiveSubTab(id as 'jp' | 'aturan')}
        />
        <span className="text-[11px] text-slate-500 font-medium">
          {activeSubTab === 'jp'
            ? 'Konfigurasi alokasi menit per JP & shift kelas'
            : 'Kebijakan jam gerbang & hari efektif hasil pleno sekolah'}
        </span>
      </div>

      {activeSubTab === 'jp' ? (
        <JamKBMView hideLayout={true} />
      ) : (
        <Suspense
          fallback={
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader size="md" />
              <span className="text-xs text-slate-500 font-medium">Memuat Kebijakan Aturan Presensi...</span>
            </div>
          }
        >
          <TenantAttendanceForm hideLayout={true} />
        </Suspense>
      )}
    </div>
  );
};

export default KurikulumJamKbmTab;
