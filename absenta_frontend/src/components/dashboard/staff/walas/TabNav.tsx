import React from 'react';
import { MailCheck, HeartPulse, Scale, Trophy, ScrollText, Users } from 'lucide-react';

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
      label: 'Validasi Izin',
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
      label: 'Health & Presensi',
      icon: HeartPulse,
      badge: atRiskCount > 0 ? `${atRiskCount} EWS` : null,
      badgeColor: 'bg-red-500 text-white'
    },
    {
      id: 'discipline',
      label: 'Pelanggaran & BK',
      icon: Scale,
      badge: null
    },
    {
      id: 'halloffame',
      label: 'Hall of Fame',
      icon: Trophy,
      badge: null
    },
    {
      id: 'rekap',
      label: 'Jurnal Walas',
      icon: ScrollText,
      badge: null
    }
  ];

  return (
    <nav className="flex items-center border-b border-slate-100 dark:border-slate-800 gap-4 sm:gap-7 overflow-x-auto no-scrollbar touch-pan-x flex-nowrap min-w-0 w-full pb-0.5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-3.5 border-b-2 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer select-none ${
              isActive
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>{tab.label}</span>

            {tab.badge !== null && tab.badge !== undefined && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab.badgeColor || (isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')
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
