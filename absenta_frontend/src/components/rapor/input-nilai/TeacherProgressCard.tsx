import React, { memo } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { TeacherProgressInfo, TeacherTaskItem } from '../../../types/inputNilai.types';
import { getShortSubjectName } from '../../../utils/mapelAbbreviator';

interface TeacherProgressCardProps {
  progressInfo?: TeacherProgressInfo;
  showProgressDetail: boolean;
  onToggleProgressDetail: () => void;
  taskStatusFilter: 'all' | 'empty' | 'partial' | 'completed';
  onSetTaskStatusFilter: (filter: 'all' | 'empty' | 'partial' | 'completed') => void;
  taskSearchQuery: string;
  onSetTaskSearchQuery: (query: string) => void;
  filteredTasks: TeacherTaskItem[];
  selectedKelas: string;
  selectedMapel: string;
  onSelectTask: (kelasId: string, mapelId: string, namaKelas: string, namaMapel: string) => void;
}

export const TeacherProgressCard: React.FC<TeacherProgressCardProps> = memo(({
  progressInfo,
  showProgressDetail,
  onToggleProgressDetail,
  taskStatusFilter,
  onSetTaskStatusFilter,
  taskSearchQuery,
  onSetTaskSearchQuery,
  filteredTasks,
  selectedKelas,
  selectedMapel,
  onSelectTask,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
            {progressInfo?.percentage || 0}%
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Progres Pengisian Rapor Guru
              </h2>
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                ({progressInfo?.completed_tasks || 0}/{progressInfo?.total_tasks || 0} Tuntas)
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Total Tugas Mengajar Rombel Semester Ini</p>
          </div>
        </div>
        
        {progressInfo?.tasks && progressInfo.tasks.length > 0 && (
          <button
            type="button"
            aria-label={showProgressDetail ? 'Sembunyikan rincian progress' : 'Pilih Rombel Mengajar'}
            onClick={onToggleProgressDetail}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/40 flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            {showProgressDetail ? 'Sembunyikan Rincian' : '🔍 Pilih Rombel Mengajar'}
            {showProgressDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Thin Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progressInfo?.percentage || 0))}%` }}
        />
      </div>

        {/* Metric Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-bold flex-wrap">
            <button
              type="button"
              aria-label="Tampilkan semua tugas"
              onClick={() => onSetTaskStatusFilter('all')}
              className={`px-3 py-1 rounded-xl transition-all border text-xs font-bold ${
                taskStatusFilter === 'all' 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua ({progressInfo?.total_tasks || 0})
            </button>
            <button
              type="button"
              aria-label="Filter tugas yang selesai"
              onClick={() => onSetTaskStatusFilter(taskStatusFilter === 'completed' ? 'all' : 'completed')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all border text-xs font-bold ${
                taskStatusFilter === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <strong>{progressInfo?.completed_tasks || 0}</strong> Selesai
            </button>
            <button
              type="button"
              aria-label="Filter tugas yang dalam proses"
              onClick={() => onSetTaskStatusFilter(taskStatusFilter === 'partial' ? 'all' : 'partial')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all border text-xs font-bold ${
                taskStatusFilter === 'partial'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <strong>{progressInfo?.partial_tasks || 0}</strong> Dalam Proses
            </button>
            <button
              type="button"
              aria-label="Filter tugas yang belum diisi"
              onClick={() => onSetTaskStatusFilter(taskStatusFilter === 'empty' ? 'all' : 'empty')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all border text-xs font-bold ${
                taskStatusFilter === 'empty'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                  : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <strong>{progressInfo?.empty_tasks || 0}</strong> Belum Diisi
            </button>
          </div>
        </div>

      {/* Expandable Progress Detail Breakdown Table */}
      {showProgressDetail && progressInfo?.tasks && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Pilih Langsung Tugas Mengajar Rombel Saya ({filteredTasks.length} dari {progressInfo.tasks.length}):
            </span>

            {/* Search Box & Quick Filter */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                id="task-search-input"
                aria-label="Cari rombel atau mapel"
                placeholder="Cari Rombel atau Mapel..."
                value={taskSearchQuery}
                onChange={(e) => onSetTaskSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold pl-8 pr-3 py-1.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {taskSearchQuery && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  onClick={() => onSetTaskSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Container with Max Height for Teachers with Many Classes */}
          <div className="max-h-60 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                Tidak ditemukan tugas mengajar yang cocok dengan pencarian / filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredTasks?.map((t: TeacherTaskItem, idx: number) => {
                  const isCurrent = t.kelas_id === selectedKelas && t.mapel_id === selectedMapel;
                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectTask(t.kelas_id, t.mapel_id, t.nama_kelas, t.nama_mapel)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-2 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-[11px] shrink-0">
                            {t.nama_kelas}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 truncate" title={t.nama_mapel}>
                            {getShortSubjectName(t.nama_mapel)}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                          t.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : t.status === 'partial'
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}>
                          {t.status === 'completed' && '🟢 Lengkap'}
                          {t.status === 'partial' && '🟡 Sebagian'}
                          {t.status === 'empty' && '🔴 Belum'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
                        <span>Siswa Terisi:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          {t.siswa_terisi} / {t.total_siswa} Siswa
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

TeacherProgressCard.displayName = 'TeacherProgressCard';
