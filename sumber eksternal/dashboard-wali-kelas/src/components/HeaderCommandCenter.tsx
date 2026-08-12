import React from 'react';
import { ClassInfo } from '../types';
import { School, Users, Calendar, Award, Search, Download, RefreshCw, UserCheck, CheckCircle2 } from 'lucide-react';

interface HeaderCommandCenterProps {
  classInfo: ClassInfo;
  onClassChange: (className: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenExportModal: () => void;
  studentCount: { male: number; female: number; total: number };
}

export const HeaderCommandCenter: React.FC<HeaderCommandCenterProps> = ({
  classInfo,
  onClassChange,
  searchTerm,
  onSearchChange,
  onOpenExportModal,
  studentCount
}) => {
  return (
    <header className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
      {/* Left Side: School Branding & Homeroom Header */}
      <div className="flex items-start sm:items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-sm shrink-0">
          S
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 uppercase">
              COMMAND CENTER WALI KELAS
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              KBM Berlangsung
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
            Sistem Informasi Akademik Terpadu • SMKN 1 Tech Center
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Rombel:</span>
              <select
                value={classInfo.className}
                onChange={(e) => onClassChange(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
              >
                <option value="XI RPL 1">XI RPL 1 (Binaan Utama)</option>
                <option value="XI RPL 2">XI RPL 2</option>
                <option value="XI TKJ 1">XI TKJ 1</option>
              </select>
            </div>

            <span className="text-slate-300">|</span>

            <div>
              <span className="text-slate-400">Wali Kelas: </span>
              <strong className="text-slate-800 font-semibold">{classInfo.homeroomTeacher}</strong>
            </div>

            <span className="text-slate-300">|</span>

            <div>
              <span className="text-slate-400">Total: </span>
              <strong className="text-slate-800 font-semibold">{studentCount.total} Siswa</strong> ({studentCount.male} L / {studentCount.female} P)
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Quick Global Search & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Global Search Bar */}
        <div className="relative min-w-[220px] sm:min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa, NIS, atau ortu..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.value ? e.value : (e.target as HTMLInputElement).value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/80 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Export / Rekap Rapor Button */}
        <button
          onClick={onOpenExportModal}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>Export Laporan</span>
        </button>
      </div>
    </header>
  );
};
