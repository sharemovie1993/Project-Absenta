import React, { memo } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { TeacherProgressInfo, TeacherTaskItem } from '../../../types/inputNilai.types';

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
    <div className="bg-slate-900/60 p-4 rounded-3xl border border-slate-800 space-y-3.5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Progres Pengisian Rapor Saya</span>
          <h2 className="text-sm font-black text-white flex items-center gap-2 mt-0.5">
            Progress Pengisian Nilai Guru
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              ({progressInfo?.completed_tasks || 0}/{progressInfo?.total_tasks || 0} Mapel Kelas Tuntas)
            </span>
          </h2>
        </div>
        
        <div className="text-right">
          <span className="text-xl font-black text-emerald-400 font-mono">
            {progressInfo?.percentage || 0}%
          </span>
          <span className="text-[10px] text-slate-400 font-semibold block">Tingkat Penyelesaian</span>
        </div>
      </div>

      {/* Animated Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${Math.min(100, Math.max(0, progressInfo?.percentage || 0))}%` }}
          />
        </div>

        {/* Metric Chips & Accordion Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-bold flex-wrap">
            <button
              type="button"
              aria-label="Tampilkan semua tugas"
              onClick={() => onSetTaskStatusFilter('all')}
              className={`px-2.5 py-1 rounded-xl transition-all border ${
                taskStatusFilter === 'all' 
                  ? 'bg-slate-700 text-white border-slate-500 shadow' 
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Semua ({progressInfo?.total_tasks || 0})
            </button>
            <button
              type="button"
              aria-label="Filter tugas yang selesai"
              onClick={() => onSetTaskStatusFilter(taskStatusFilter === 'completed' ? 'all' : 'completed')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all border ${
                taskStatusFilter === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/40'
                  : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50 hover:bg-emerald-900/50'
              }`}
            >
              🟢 <strong>{progressInfo?.completed_tasks || 0}</strong> Selesai
            </button>
            <button
              type="button"
              aria-label="Filter tugas yang dalam proses"
              onClick={() => onSetTaskStatusFilter(taskStatusFilter === 'partial' ? 'all' : 'partial')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all border ${
                taskStatusFilter === 'partial'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md ring-2 ring-amber-500/40'
                  : 'text-amber-400 bg-amber-950/60 border-amber-800/50 hover:bg-amber-900/50'
              }`}
            >
              🟡 <strong>{progressInfo?.partial_tasks || 0}</strong> Dalam Proses
            </button>
            <button
              type="button"
              aria-label="Filter tugas yang belum diisi"
              onClick={() => onSetTaskStatusFilter(taskStatusFilter === 'empty' ? 'all' : 'empty')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all border ${
                taskStatusFilter === 'empty'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-500/40'
                  : 'text-rose-400 bg-rose-950/60 border-rose-800/50 hover:bg-rose-900/50'
              }`}
            >
              🔴 <strong>{progressInfo?.empty_tasks || 0}</strong> Belum Diisi
            </button>
          </div>

          {progressInfo?.tasks && progressInfo.tasks.length > 0 && (
            <button
              type="button"
              aria-label={showProgressDetail ? 'Sembunyikan rincian progress' : 'Lihat rincian progress mapel kelas'}
              onClick={onToggleProgressDetail}
              className="text-xs font-extrabold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 px-3 py-1 rounded-xl border border-indigo-800/60 flex items-center gap-1.5 transition-all"
            >
              {showProgressDetail ? 'Sembunyikan Rincian Progress' : '🔍 Lihat Rincian Progress Mapel Kelas'}
              {showProgressDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Progress Detail Breakdown Table */}
      {showProgressDetail && progressInfo?.tasks && (
        <div className="pt-3 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {taskSearchQuery && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  onClick={() => onSetTaskSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Container with Max Height for Teachers with Many Classes */}
          <div className="max-h-60 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-900/40 rounded-2xl border border-slate-800">
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
                          ? 'bg-indigo-900/60 border-indigo-500 shadow-lg ring-2 ring-indigo-500/50'
                          : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white flex items-center gap-1.5">
                          <span className="text-indigo-400">{t.nama_kelas}</span> — {t.nama_mapel}
                        </span>
                        <span className="text-[10px]">
                          {t.status === 'completed' && '🟢 Lengkap'}
                          {t.status === 'partial' && '🟡 Sebagian'}
                          {t.status === 'empty' && '🔴 Belum'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                        <span>Siswa Terisi:</span>
                        <span className="font-mono font-bold text-slate-200">
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
