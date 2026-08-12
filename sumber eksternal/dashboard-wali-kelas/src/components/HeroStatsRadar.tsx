import React from 'react';
import { UserCheck, FileCheck2, AlertTriangle, Trophy, ArrowRight, HeartPulse } from 'lucide-react';
import { ClassHealthMetric, LeaveRequest, AtRiskStudent, Student } from '../types';

interface HeroStatsRadarProps {
  metrics: ClassHealthMetric;
  pendingCount: number;
  atRiskCount: number;
  starStudents: Student[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const HeroStatsRadar: React.FC<HeroStatsRadarProps> = ({
  metrics,
  pendingCount,
  atRiskCount,
  starStudents,
  activeTab,
  onTabChange
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Kehadiran Hari Ini Card */}
      <div 
        onClick={() => onTabChange('health')}
        className={`bg-white p-4 rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md relative overflow-hidden group ${
          activeTab === 'health' ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'
        }`}
      >
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kehadiran Hari Ini</p>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-blue-600">{metrics.attendancePercentage}%</span>
          <span className="text-xs text-green-500 font-medium mb-1">+2.1%</span>
        </div>

        {/* Attendance Breakdown Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex mb-2">
          <div className="bg-blue-600 h-full" style={{ width: '94.4%' }} title="Hadir (34)" />
          <div className="bg-orange-400 h-full" style={{ width: '2.8%' }} title="Sakit (1)" />
          <div className="bg-yellow-400 h-full" style={{ width: '2.8%' }} title="Izin (1)" />
          <div className="bg-red-500 h-full" style={{ width: '0%' }} title="Alpha (0)" />
        </div>

        <div className="grid grid-cols-4 gap-1 text-center text-[11px] pt-1.5 border-t border-slate-100">
          <div><span className="font-bold text-blue-600">34</span> <span className="text-slate-400">Hadir</span></div>
          <div><span className="font-bold text-orange-500">1</span> <span className="text-slate-400">Sakit</span></div>
          <div><span className="font-bold text-amber-500">1</span> <span className="text-slate-400">Izin</span></div>
          <div><span className="font-bold text-slate-400">0</span> <span className="text-slate-400">Alpha</span></div>
        </div>
      </div>

      {/* 2. Izin Perlu Validasi Card */}
      <div 
        onClick={() => onTabChange('approval')}
        className={`bg-white p-4 rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md relative overflow-hidden group ${
          activeTab === 'approval' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200 hover:border-orange-300'
        }`}
      >
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Izin Perlu Validasi</p>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-orange-500">{String(pendingCount).padStart(2, '0')}</span>
          <span className="text-xs text-slate-400 font-medium mb-1">Permohonan</span>
        </div>

        <p className="text-xs text-slate-500 line-clamp-1">
          {pendingCount > 0 
            ? 'Memerlukan persetujuan resmi Wali Kelas.'
            : 'Semua permohonan telah diproses.'}
        </p>

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Pending Hari Ini</span>
          <span className="text-orange-600 font-bold group-hover:underline">Validasi Sekarang →</span>
        </div>
      </div>

      {/* 3. Siswa Rawan (EWS) Card */}
      <div 
        onClick={() => onTabChange('health')}
        className={`bg-white p-4 rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md relative overflow-hidden group bg-red-50/30 ${
          activeTab === 'health' ? 'border-red-400 ring-2 ring-red-500/20' : 'border-red-100 hover:border-red-300'
        }`}
      >
        <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">Siswa Rawan (EWS)</p>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-red-600">{String(atRiskCount).padStart(2, '0')}</span>
          <span className="text-xs text-red-400 font-medium mb-1">Tindakan Segera</span>
        </div>

        <p className="text-xs text-red-600 font-medium line-clamp-1">
          Bayu Prasetyo & Dimas A. (Alpha ≥3)
        </p>

        <div className="mt-3 pt-2 border-t border-red-100 flex items-center justify-between text-[11px] text-red-500">
          <span>Class Health Index</span>
          <span className="font-bold text-red-600 group-hover:underline">{metrics.overallScore}/100 →</span>
        </div>
      </div>

      {/* 4. Top Siswa / Star Students Card */}
      <div 
        onClick={() => onTabChange('halloffame')}
        className={`bg-white p-4 rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md relative overflow-hidden group ${
          activeTab === 'halloffame' ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-slate-200 hover:border-yellow-300'
        }`}
      >
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Top Siswa</p>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-yellow-500">03</span>
          <span className="text-xs text-slate-400 font-medium mb-1">Star Students</span>
        </div>

        <p className="text-xs text-slate-600 font-medium truncate">
          🥇 {starStudents[0]?.name || 'Achmad Fauzi'} (100% Hadir)
        </p>

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Kehadiran Perfect</span>
          <span className="text-yellow-600 font-bold group-hover:underline">Hall of Fame →</span>
        </div>
      </div>
    </div>
  );
};
