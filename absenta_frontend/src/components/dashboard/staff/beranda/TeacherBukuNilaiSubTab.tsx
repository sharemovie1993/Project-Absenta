import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  GraduationCap, 
  Users, 
  ArrowRight, 
  Search,
  Calendar,
  X,
  Sparkles,
  Check
} from 'lucide-react';
import { raporApi } from '@/api/rapor.api';
import { HubCard } from '@/components/ui/hub';
import { Modal } from '@/components/ui/Modal';
import { InputNilaiView } from '@/components/rapor/input-nilai/InputNilaiView';
import { useAcademicFilter } from '@/components/common/academic-filter';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';

interface TeacherBukuNilaiSubTabProps {
  guruId?: string;
  guruNama?: string;
  className?: string;
}

export const TeacherBukuNilaiSubTab: React.FC<TeacherBukuNilaiSubTabProps> = React.memo(({
  guruId,
  className,
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'partial' | 'empty'>('all');
  const [selectedRombel, setSelectedRombel] = useState<{
    kelasId: string;
    mapelId: string;
    namaKelas: string;
    namaMapel: string;
  } | null>(null);

  // Ambil konteks Tahun Pelajaran & Semester aktif untuk penanda periode
  const { activeYear, activeSemester } = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const { data: progressRes, isLoading } = useQuery({
    queryKey: ['rapor-teacher-progress-subtab', guruId],
    queryFn: () => raporApi.getTeacherProgress().catch(() => ({ success: true, data: null })),
    staleTime: 60 * 1000,
  });

  const progressData = progressRes?.data || progressRes || {};
  const tasks: any[] = safeArr(progressData?.tasks);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const partialTasks = tasks.filter((t) => t.status === 'partial').length;
  const emptyTasks = tasks.filter((t) => !t.status || t.status === 'empty').length;

  // Filter gabungan berdasarkan Status KPI dan Pencarian Teks
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== 'all') {
      result = result.filter((t) => {
        if (statusFilter === 'completed') return t.status === 'completed';
        if (statusFilter === 'partial') return t.status === 'partial';
        if (statusFilter === 'empty') return !t.status || t.status === 'empty';
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.nama_kelas?.toLowerCase().includes(q) ||
        t.nama_mapel?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, statusFilter, search]);

  const handleOpenInputNilaiModal = (t: any) => {
    setSelectedRombel({
      kelasId: t.kelas_id,
      mapelId: t.mapel_id,
      namaKelas: t.nama_kelas,
      namaMapel: t.nama_mapel,
    });
  };

  const handleCloseModal = () => {
    setSelectedRombel(null);
    queryClient.invalidateQueries({ queryKey: ['rapor-teacher-progress-subtab'] });
  };

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* ─── Header Stat Ringkasan Penilaian (Interaktif 1-Click Filter) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Rombel Diampu */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none relative overflow-hidden group ${
            statusFilter === 'all'
              ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/30 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Rombel</p>
            {statusFilter === 'all' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-200/80 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                <Check size={10} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalTasks}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Semua Rombel</p>
        </button>

        {/* Nilai Tuntas */}
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none relative overflow-hidden group ${
            statusFilter === 'completed'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/40 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Nilai Tuntas</p>
            {statusFilter === 'completed' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                <Check size={10} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{completedTasks}</p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">100% Siswa Terisi</p>
        </button>

        {/* Sebagian Terisi */}
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'partial' ? 'all' : 'partial'))}
          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none relative overflow-hidden group ${
            statusFilter === 'partial'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/40 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-950/60 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Sebagian Terisi</p>
            {statusFilter === 'partial' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                <Check size={10} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{partialTasks}</p>
          <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Sedang Berjalan</p>
        </button>

        {/* Belum Diisi */}
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'empty' ? 'all' : 'empty'))}
          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none relative overflow-hidden group ${
            statusFilter === 'empty'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/40 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-950/60 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Belum Diisi</p>
            {statusFilter === 'empty' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                <Check size={10} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{emptyTasks}</p>
          <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70 mt-0.5">Perlu Pengisian Segera</p>
        </button>
      </div>

      {/* ─── Kontainer Daftar Kelas & Input Nilai ─── */}
      <HubCard
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span>Daftar Rombel &amp; Mata Pelajaran</span>
            {(activeSemester?.nama || activeYear?.nama) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 text-[10px] font-bold">
                <Calendar size={11} />
                <span>{activeSemester?.nama || 'Semester'} {activeYear?.nama || ''}</span>
              </span>
            )}
          </div>
        }
        badge={
          statusFilter !== 'all'
            ? `${filteredTasks.length} dari ${tasks.length} Rombel`
            : `${tasks.length} Rombel`
        }
        badgeVariant={statusFilter !== 'all' ? 'purple' : 'default'}
        action={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Reset Button saat filter status aktif */}
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Tampilkan Seluruh Rombel"
              >
                <span>Reset Filter</span>
                <X size={13} />
              </button>
            )}

            {/* Input Pencarian */}
            <div className="relative w-44 sm:w-60">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kelas / mapel..."
                className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div className="py-12 flex justify-center items-center text-slate-400 text-xs">
            Memuat data rombel mengajar...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              Tidak ada rombel yang sesuai kriteria pencarian / filter.
            </p>
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline inline-block mt-1"
              >
                Tampilkan semua {tasks.length} rombel diampu
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTasks.map((t, idx) => {
              const isCompleted = t.status === 'completed';
              const isPartial = t.status === 'partial';

              const totalSiswa = Number(t.total_siswa) || 0;
              const siswaTerisi = t.siswa_terisi !== undefined 
                ? Number(t.siswa_terisi) 
                : (isCompleted ? totalSiswa : 0);
              const percentage = totalSiswa > 0 
                ? Math.min(100, Math.round((siswaTerisi / totalSiswa) * 100)) 
                : (isCompleted ? 100 : 0);

              return (
                <div
                  key={`${t.kelas_id}_${t.mapel_id}_${idx}`}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header Kartu: Tag Kelas & Badge Status Crisp */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 font-bold text-xs">
                        {t.nama_kelas}
                      </span>
                      <div
                        className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                            : isPartial
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-500'
                              : isPartial
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span>{isCompleted ? 'Nilai Tuntas' : isPartial ? 'Sebagian' : 'Belum Diisi'}</span>
                      </div>
                    </div>

                    {/* Judul Mata Pelajaran & Jumlah Siswa */}
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1">
                      {t.nama_mapel}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <Users size={12} />
                      <span>{totalSiswa} Siswa Terdaftar</span>
                    </p>

                    {/* ─── Micro Progress Bar Pengisian Nilai ─── */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">Progres Nilai</span>
                        <span
                          className={
                            isCompleted
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : isPartial
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-slate-400'
                          }
                        >
                          {isCompleted ? `${totalSiswa}/${totalSiswa} Siswa` : `${siswaTerisi}/${totalSiswa} Siswa`} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-emerald-500'
                              : isPartial
                              ? 'bg-amber-500'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Kartu: Kurikulum & Tombol Modal Input Nilai */}
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Kurikulum Merdeka
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenInputNilaiModal(t)}
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

      {/* ─── Modal Fullscreen Lembar Input Nilai e-Rapor ─── */}
      {selectedRombel && (
        <Modal
          isOpen={!!selectedRombel}
          onClose={handleCloseModal}
          size="full"
          className="max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] my-auto"
          contentClassName="p-2 sm:p-5 overflow-y-auto"
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                <GraduationCap size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Lembar Input Nilai e-Rapor
                </h3>
                <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  {selectedRombel.namaKelas} &bull; {selectedRombel.namaMapel}
                </p>
              </div>
            </div>
          }
        >
          <InputNilaiView
            initialKelasId={selectedRombel.kelasId}
            initialMapelId={selectedRombel.mapelId}
            isModal={true}
            hideLayout={true}
            onClose={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
});

TeacherBukuNilaiSubTab.displayName = 'TeacherBukuNilaiSubTab';
