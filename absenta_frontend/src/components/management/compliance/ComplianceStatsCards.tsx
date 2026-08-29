import React from 'react';
import { Card } from '@/components/ui';

export interface ComplianceStats {
  totalGuru: number;
  totalSiswa: number;
  teacherRfidPct: number;
  teacherWaPct: number;
  teacherLoginPct?: number;
  studentRfidPct: number;
  studentWaPct: number;
  studentLoginPct?: number;
  guruActiveCount: number;
  guruPassiveCount: number;
  guruDormantCount: number;
  siswaActiveCount?: number;
  siswaPassiveCount?: number;
  siswaDormantCount?: number;
}

interface ComplianceStatsCardsProps {
  stats: ComplianceStats;
}

export const ComplianceStatsCards: React.FC<ComplianceStatsCardsProps> = React.memo(({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 w-full min-w-0 max-w-full">
      <Card className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1 truncate">RFID Guru</span>
          <p className="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.teacherRfidPct}%</p>
        </div>
        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 truncate">Dari {stats.totalGuru} Guru</p>
      </Card>

      <Card className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1 truncate">WA Guru</span>
          <p className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.teacherWaPct}%</p>
        </div>
        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 truncate">Nomor Valid</p>
      </Card>

      <Card className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1 truncate">RFID Siswa</span>
          <p className="text-base sm:text-xl font-black text-blue-600 dark:text-blue-400">{stats.studentRfidPct}%</p>
        </div>
        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 truncate">Dari {stats.totalSiswa} Siswa</p>
      </Card>

      <Card className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1 truncate">WA Wali Siswa</span>
          <p className="text-base sm:text-xl font-black text-teal-600 dark:text-teal-400">{stats.studentWaPct}%</p>
        </div>
        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 truncate">Terhubung Notif</p>
      </Card>
    </div>
  );
});

ComplianceStatsCards.displayName = 'ComplianceStatsCards';
