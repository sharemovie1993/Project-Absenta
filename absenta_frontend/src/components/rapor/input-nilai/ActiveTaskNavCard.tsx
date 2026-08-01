import React, { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TeacherTaskItem } from '../../../types/inputNilai.types';

interface ActiveTaskNavCardProps {
  selectedKelasName?: string;
  selectedMapelName?: string;
  currentTaskIndex: number;
  totalTasks: number;
  currentTaskStatus?: 'completed' | 'partial' | 'empty';
  siswaTerisi: number;
  totalSiswa: number;
  prevTask: TeacherTaskItem | null;
  nextTask: TeacherTaskItem | null;
  onNavigateTask: (direction: 'prev' | 'next') => void;
}

export const ActiveTaskNavCard: React.FC<ActiveTaskNavCardProps> = memo(({
  selectedKelasName = '—',
  selectedMapelName = 'Pilih Mapel',
  currentTaskIndex,
  totalTasks,
  currentTaskStatus,
  siswaTerisi,
  totalSiswa,
  prevTask,
  nextTask,
  onNavigateTask,
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-3xl shadow-xl border border-indigo-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
      
      {/* Left Side: Active Class, Subject Name, and Status */}
      <div className="flex items-center gap-3.5 text-center sm:text-left flex-wrap justify-center sm:justify-start">
        <div className="px-4 py-2 min-w-[5.5rem] rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md ring-2 ring-indigo-400/40 shrink-0">
          {selectedKelasName}
        </div>
        <div>
          <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
            <h3 className="text-sm font-black text-white tracking-wide">
              {selectedMapelName}
            </h3>
            {currentTaskStatus && (
              <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full border shadow-sm ${
                currentTaskStatus === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : currentTaskStatus === 'partial'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {currentTaskStatus === 'completed' && '🟢 LENGKAP'}
                {currentTaskStatus === 'partial' && '🟡 SEBAGIAN'}
                {currentTaskStatus === 'empty' && '🔴 BELUM DIISI'}
                {' '}({siswaTerisi}/{totalSiswa} Siswa)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            Lembar Kerja Rombel Aktif {currentTaskIndex >= 0 ? `${currentTaskIndex + 1} dari ${totalTasks}` : '—'}
          </p>
        </div>
      </div>

      {/* Right Side: Single Contiguous 1-Block Navigation Group */}
      <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/90 shadow-inner">
        {/* Mundur Button */}
        <button
          type="button"
          disabled={!prevTask}
          onClick={() => onNavigateTask('prev')}
          aria-label={prevTask ? `Mundur ke rombel ${prevTask.nama_kelas} ${prevTask.nama_mapel}` : 'Sudah di rombel pertama'}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-indigo-900/80 text-white font-extrabold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed group border border-slate-700/60"
          title={prevTask ? `Mundur ke: ${prevTask.nama_kelas} - ${prevTask.nama_mapel}` : 'Awal Rombel'}
        >
          <ChevronLeft size={16} className="text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
          <div className="text-left hidden sm:block">
            <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider">◀️ Mundur</span>
            <span className="block text-[10px] font-bold text-slate-200 truncate max-w-[110px]">
              {prevTask ? `${prevTask.nama_kelas} - ${prevTask.nama_mapel}` : 'Awal Rombel'}
            </span>
          </div>
          <span className="sm:hidden">Mundur</span>
        </button>

        {/* Center Sequence Counter */}
        <div className="px-3 text-center font-mono font-black text-xs text-indigo-400 min-w-[55px]">
          {currentTaskIndex >= 0 ? `${currentTaskIndex + 1} / ${totalTasks}` : '—'}
        </div>

        {/* Maju Button */}
        <button
          type="button"
          disabled={!nextTask}
          onClick={() => onNavigateTask('next')}
          aria-label={nextTask ? `Maju ke rombel ${nextTask.nama_kelas} ${nextTask.nama_mapel}` : 'Sudah di rombel terakhir'}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-md border border-indigo-400/40"
          title={nextTask ? `Maju ke: ${nextTask.nama_kelas} - ${nextTask.nama_mapel}` : 'Akhir Rombel'}
        >
          <span className="sm:hidden">Maju</span>
          <div className="text-right hidden sm:block">
            <span className="block text-[8px] text-indigo-200 uppercase font-black tracking-wider">Maju ▶️</span>
            <span className="block text-[10px] font-bold text-white truncate max-w-[110px]">
              {nextTask ? `${nextTask.nama_kelas} - ${nextTask.nama_mapel}` : 'Akhir Rombel'}
            </span>
          </div>
          <ChevronRight size={16} className="text-white group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

    </div>
  );
});

ActiveTaskNavCard.displayName = 'ActiveTaskNavCard';
