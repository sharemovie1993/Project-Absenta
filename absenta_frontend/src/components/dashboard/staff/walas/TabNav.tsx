import React from 'react';
import { MailCheck, HeartPulse, Scale, Trophy, ScrollText, Users, Printer, UserCheck } from 'lucide-react';

interface TabNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  pendingApprovalCount: number;
  atRiskCount: number;
}

export const TabNav: React.FC<TabNavProps> = ({
  activeTab,
  onTabChange,
  pendingApprovalCount,
  atRiskCount
}) => {
  const tabs = [
    {
      id: 'approval',
      label: 'Izin Siswa',
      icon: MailCheck,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : null,
      badgeColor: 'bg-orange-500 text-white'
    },
    {
      id: 'students',
      label: 'Data Siswa',
      icon: Users,
      badge: null
    },
    {
      id: 'health',
      label: 'Presensi Kelas',
      icon: HeartPulse,
      badge: atRiskCount > 0 ? `${atRiskCount} EWS` : null,
      badgeColor: 'bg-red-500 text-white'
    },
    {
      id: 'rekap-cetak',
      label: 'Cetak Rekap Bulanan',
      icon: Printer,
      badge: null
    },
    {
      id: 'pembinaan',
      label: 'Catatan Pembinaan',
      icon: UserCheck,
      badge: null
    },
    {
      id: 'discipline',
      label: 'Pelanggaran Siswa',
      icon: Scale,
      badge: null
    },
    {
      id: 'halloffame',
      label: 'Prestasi Siswa',
      icon: Trophy,
      badge: null
    },
    {
      id: 'rekap',
      label: 'Jurnal Kelas',
      icon: ScrollText,
      badge: null
    }
  ];

  return (
    <nav className="flex items-center border-b border-slate-100 dark:border-slate-800 gap-2 sm:gap-4 md:gap-7 overflow-x-auto no-scrollbar touch-pan-x flex-nowrap min-w-0 w-full pb-0.5 scroll-smooth">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`py-2.5 sm:py-3.5 px-1 sm:px-0 border-b-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all cursor-pointer select-none shrink-0 ${
              isActive
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
            <span>{tab.label}</span>

            {tab.badge !== null && tab.badge !== undefined && (
              <span
                className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab.badgeColor || (isActive ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
