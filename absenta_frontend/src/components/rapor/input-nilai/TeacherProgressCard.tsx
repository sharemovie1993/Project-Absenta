import React, { memo } from 'react';
import { Search } from 'lucide-react';
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
  taskSearchQuery,
  onSetTaskSearchQuery,
  filteredTasks,
  selectedKelas,
  selectedMapel,
  onSelectTask,
}) => {
  if (!progressInfo?.tasks || progressInfo.tasks.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
      {/* Header: judul + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Pilih Rombel Mengajar
          <span className="ml-1.5 text-slate-400 font-normal">({filteredTasks.length} dari {progressInfo.tasks.length})</span>
        </p>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            id="task-search-input"
            aria-label="Cari rombel atau mapel"
            placeholder="Cari Rombel atau Mapel..."
            value={taskSearchQuery}
            onChange={(e) => onSetTaskSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold pl-8 pr-8 py-1.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {/* Grid kartu tugas — hanya kelas, mapel, status */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
          Tidak ada tugas yang cocok.
        </div>
      ) : (
        <div className="max-h-52 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredTasks?.map((t: TeacherTaskItem, idx: number) => {
              const isCurrent = t.kelas_id === selectedKelas && t.mapel_id === selectedMapel;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectTask(t.kelas_id, t.mapel_id, t.nama_kelas, t.nama_mapel)}
                  title={`${t.nama_kelas} — ${t.nama_mapel}`}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 border-2 border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[10px] shrink-0">
                      {t.nama_kelas}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      t.status === 'completed' ? 'bg-emerald-500' :
                      t.status === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight truncate" title={t.nama_mapel}>
                    {getShortSubjectName(t.nama_mapel)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

TeacherProgressCard.displayName = 'TeacherProgressCard';
