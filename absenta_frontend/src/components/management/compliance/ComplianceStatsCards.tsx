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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0 max-w-full">
      <Card className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kartu RFID Guru</span>
        <p className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.teacherRfidPct}%</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Dari {stats.totalGuru} Guru Terdata</p>
      </Card>

      <Card className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kontak WA Guru</span>
        <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.teacherWaPct}%</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Nomor Ponsel Valid</p>
      </Card>

      <Card className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kartu RFID Siswa</span>
        <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">{stats.studentRfidPct}%</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Dari {stats.totalSiswa} Siswa</p>
      </Card>

      <Card className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">WA Wali Siswa</span>
        <p className="text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400">{stats.studentWaPct}%</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Terhubung Notifikasi</p>
      </Card>
    </div>
  );
});

ComplianceStatsCards.displayName = 'ComplianceStatsCards';
