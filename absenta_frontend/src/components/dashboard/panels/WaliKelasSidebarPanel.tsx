import React from 'react';
import { 
  Heart, 
  Phone, 
  ChevronRight, 
  TrendingUp,
  AlertTriangle,
  Users,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AbsentStudent {
  id?: string;
  nama: string;
  status?: string;
}

interface WaliKelasSidebarPanelProps {
  className?: string;
  /** Nama kelas binaan, mis. "XI RPL 2" */
  namaKelas?: string;
  /** Persentase kehadiran hari ini (0-100), null = belum ada data */
  attendanceRate: number | null;
  /** Daftar siswa tidak hadir */
  absentStudents: AbsentStudent[];
  /** Loading state */
  isLoading?: boolean;
  /** Apakah data sudah berhasil dimuat (untuk membedakan 'kosong' vs 'belum ada data') */
  hasData?: boolean;
  /** Aksi tombol "Lihat Rekap" */
  onViewRekap?: () => void;
  /** Aksi tombol hubungi per siswa */
  onFollowUp?: (student: AbsentStudent) => void;
}

export const WaliKelasSidebarPanel: React.FC<WaliKelasSidebarPanelProps> = ({
  className,
  namaKelas = '...',
  attendanceRate,
  absentStudents,
  isLoading = false,
  hasData = false,
  onViewRekap,
  onFollowUp,
}) => {
  const displayRate = attendanceRate ?? 0;
  const isHealthy = displayRate >= 85;
  const rateColor = displayRate >= 90
    ? 'text-emerald-600'
    : displayRate >= 75
    ? 'text-amber-500'
    : attendanceRate === null ? 'text-gray-400'
    : 'text-rose-600';

  const rateBg = displayRate >= 90
    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
    : displayRate >= 75
    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
    : attendanceRate === null
    ? 'bg-gray-50 dark:bg-slate-700/20 border-gray-100 dark:border-slate-600/30'
    : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30';

  return (
    <div className={cn('rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-rose-50/50 dark:bg-rose-900/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">
            <Users size={14} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none">Wali Kelas</p>
            <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">{namaKelas}</p>
          </div>
        </div>
        <span className={cn(
          'text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border',
          isHealthy
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-900/40'
            : 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-900/40'
        )}>
          {isHealthy ? 'Kondusif' : 'Perlu Perhatian'}
        </span>
      </div>

      {/* Attendance Rate Big Number */}
      <div className={cn('flex items-center gap-3 mx-4 mt-4 mb-3 p-3 rounded-xl border', rateBg)}>
        <div className="flex-1">
          <p className={cn('text-2xl font-black leading-none', rateColor)}>
            {isLoading ? '—' : attendanceRate === null ? '—' : `${Math.round(displayRate)}%`}
          </p>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            {attendanceRate === null && !isLoading ? 'Belum Ada Presensi' : 'Rate Kehadiran Hari Ini'}
          </p>
        </div>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', 
          displayRate >= 90 ? 'bg-emerald-100 dark:bg-emerald-900/20' 
          : displayRate >= 75 ? 'bg-amber-100 dark:bg-amber-900/20'
          : attendanceRate === null ? 'bg-gray-100 dark:bg-slate-700/30'
          : 'bg-rose-100 dark:bg-rose-900/20'
        )}>
          {isHealthy && attendanceRate !== null ? (
            <TrendingUp size={16} className={rateColor} />
          ) : (
            <AlertTriangle size={16} className={rateColor} />
          )}
        </div>
      </div>

      {/* Absent Students */}
      <div className="px-4 pb-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !hasData ? (
          /* State: Data belum dimuat atau belum ada presensi masuk */
          <div className="flex flex-col items-center justify-center py-4 gap-1.5">
            <div className="w-9 h-9 rounded-full bg-gray-50 dark:bg-slate-700/30 flex items-center justify-center">
              <Users size={18} className="text-gray-400" />
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
              Belum Ada Data Presensi
            </p>
            <p className="text-[8px] text-gray-400 text-center">Data presensi hari ini belum masuk.</p>
          </div>
        ) : absentStudents.length === 0 ? (
          /* State: Semua siswa benar-benar hadir */
          <div className="flex flex-col items-center justify-center py-4 gap-1.5">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center">
              Semua Siswa Hadir
            </p>
            <p className="text-[8px] text-gray-400 text-center">Kelas berjalan dengan baik hari ini!</p>
          </div>
        ) : (
          <>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <AlertTriangle size={9} className="text-rose-400" />
              Perlu Tindak Lanjut ({absentStudents.length})
            </p>
            <div className="space-y-1.5">
              {absentStudents.slice(0, 4).map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="flex items-center justify-between px-3 py-2 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-900/30 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-black text-rose-600">{s.nama?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-800 dark:text-gray-200 truncate uppercase">{s.nama}</p>
                      {s.status && (
                        <p className="text-[8px] text-rose-400 font-medium uppercase">{s.status}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onFollowUp?.(s)}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex-shrink-0 ml-2"
                    title="Hubungi Wali Murid"
                  >
                    <Phone size={10} />
                  </button>
                </div>
              ))}
              {absentStudents.length > 4 && (
                <button
                  onClick={onViewRekap}
                  className="w-full text-[9px] text-center text-rose-400 hover:text-rose-600 font-bold uppercase tracking-tight py-1"
                >
                  +{absentStudents.length - 4} siswa lainnya...
                </button>
              )}
            </div>
          </>
        )}

        {/* CTA */}
        <button
          onClick={onViewRekap}
          className="mt-2 w-full flex items-center justify-between group pt-3 border-t border-gray-100 dark:border-slate-700/50"
        >
          <span className="text-[9px] font-black text-gray-400 group-hover:text-rose-500 uppercase tracking-widest transition-colors">
            Lihat Rekap Bulanan
          </span>
          <ChevronRight size={12} className="text-gray-300 group-hover:text-rose-500 transition-colors" />
        </button>
      </div>
    </div>
  );
};
