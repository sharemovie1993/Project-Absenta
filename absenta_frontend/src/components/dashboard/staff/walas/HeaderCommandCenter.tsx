import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClassInfo } from './types';
import { Search, Download, Users, School, Flag } from 'lucide-react';

interface HeaderCommandCenterProps {
  classInfo: ClassInfo;
  onClassChange: (className: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onOpenExportModal: () => void;
  studentCount: { male: number; female: number; total: number };
  isApiConnected?: boolean;
}

export const HeaderCommandCenter: React.FC<HeaderCommandCenterProps> = ({
  classInfo,
  onClassChange,
  searchTerm,
  onSearchChange,
  onOpenExportModal,
  studentCount,
  isApiConnected = false
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
      {/* Left: Compact Class & Student Info Pill */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
          <School size={15} />
          <span className="text-xs font-black tracking-tight uppercase">
            Rombel: {classInfo.className}
          </span>
        </div>

        {!isApiConnected && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Belum Terhubung ke API</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
          <Users size={14} className="text-blue-500" />
          <span>
            Total <strong className="text-slate-900 dark:text-white font-black">{studentCount.total} Siswa</strong>
            {(studentCount.male > 0 || studentCount.female > 0) && (
              <span className="text-slate-500 dark:text-slate-400 font-semibold ml-1.5">
                ({studentCount.male} L / {studentCount.female} P)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Right: Search, Activity Sessions & Export Button */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <div className="relative min-w-[180px] sm:min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa, NIS, atau ortu..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/80 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* 🚩 Sesi Kegiatan Sekolah Button for Wali Kelas */}
        <button
          type="button"
          onClick={() => navigate('/attendance/ops?tab=sesi&subtab=kegiatan')}
          className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          title="Buka atau Kelola Presensi Sesi Kegiatan Sekolah (Apel/Upacara/Ketarunaan)"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Sesi Kegiatan</span>
        </button>

        <button
          onClick={onOpenExportModal}
          className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};
