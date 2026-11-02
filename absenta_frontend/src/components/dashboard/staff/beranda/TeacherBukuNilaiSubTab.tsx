import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Search,
  ExternalLink
} from 'lucide-react';
import { raporApi } from '@/api/rapor.api';
import { HubCard } from '@/components/ui/hub';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';

interface TeacherBukuNilaiSubTabProps {
  guruId?: string;
  guruNama?: string;
  className?: string;
}

export const TeacherBukuNilaiSubTab: React.FC<TeacherBukuNilaiSubTabProps> = React.memo(({
  guruId,
  guruNama,
  className,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');

  const { data: progressRes, isLoading } = useQuery({
    queryKey: ['rapor-teacher-progress-subtab', guruId],
    queryFn: () => raporApi.getTeacherProgress().catch(() => ({ success: true, data: null })),
    staleTime: 60 * 1000,
  });

  const progressData = progressRes?.data || progressRes || {};
  const tasks: any[] = safeArr(progressData?.tasks);

  const filteredTasks = React.useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) =>
      t.nama_kelas?.toLowerCase().includes(q) ||
      t.nama_mapel?.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const partialTasks = tasks.filter((t) => t.status === 'partial').length;
  const emptyTasks = tasks.filter((t) => !t.status || t.status === 'empty').length;

  return (
    <div className="space-y-4">
      {/* Header Stat Ringkasan Penilaian */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Rombel Diampu</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalTasks}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-950/60 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Nilai Tuntas</p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{completedTasks}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-950/60 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Sebagian Terisi</p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{partialTasks}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-100 dark:border-rose-950/60 shadow-xs">
          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Belum Diisi</p>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{emptyTasks}</p>
        </div>
      </div>

      {/* Kontainer Daftar Kelas & Input Nilai */}
      <HubCard
        title="Daftar Rombel & Mata Pelajaran"
        badge={`${tasks.length} Kelas`}
        badgeVariant="purple"
        action={
          <div className="relative w-48 sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kelas / mapel..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        }
      >
        {isLoading ? (
          <div className="py-12 flex justify-center items-center text-slate-400 text-xs">
            Memuat data rombel mengajar...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ada rombel mata pelajaran yang ditemukan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTasks.map((t, idx) => {
              const isCompleted = t.status === 'completed';
              const isPartial = t.status === 'partial';

              return (
                <div
                  key={`${t.kelas_id}_${t.mapel_id}_${idx}`}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 font-bold text-xs">
                        {t.nama_kelas}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : isPartial
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {isCompleted ? 'Nilai Tuntas' : isPartial ? 'Sebagian' : 'Belum Diisi'}
                      </span>
                    </div>

                    <h5 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1">
                      {t.nama_mapel}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <Users size={12} />
                      <span>{t.total_siswa || 0} Siswa Terdaftar</span>
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Kurikulum Merdeka
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/rapor/input-nilai?kelasId=${t.kelas_id}&mapelId=${t.mapel_id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>Input Nilai</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </HubCard>
    </div>
  );
});

TeacherBukuNilaiSubTab.displayName = 'TeacherBukuNilaiSubTab';
