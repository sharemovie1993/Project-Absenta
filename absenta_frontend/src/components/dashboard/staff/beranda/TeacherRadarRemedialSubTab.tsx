import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Radio, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight, 
  Users, 
  Calendar, 
  Sparkles,
  Award,
  X,
  Check
} from 'lucide-react';
import { raporApi } from '@/api/rapor.api';
import { HubCard } from '@/components/ui/hub';
import { RemedialQuickModal, RadarRemedialItem } from './RemedialQuickModal';
import { useAcademicFilter } from '@/components/common/academic-filter';

interface TeacherRadarRemedialSubTabProps {
  guruId?: string;
  className?: string;
}

export const TeacherRadarRemedialSubTab: React.FC<TeacherRadarRemedialSubTabProps> = React.memo(({
  guruId,
  className,
}) => {
  const [search, setSearch] = useState('');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_remedial' | 'unassessed' | 'completed'>('all');
  const [activeModalItem, setActiveModalItem] = useState<RadarRemedialItem | null>(null);

  const { activeYear, activeSemester } = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const { data: radarRes, isLoading, refetch } = useQuery({
    queryKey: ['rapor-radar-remedial', guruId, activeYear?.id, activeSemester?.id],
    queryFn: () => raporApi.getRadarRemedial({
      tahun_pelajaran_id: activeYear?.id,
      semester_id: activeSemester?.id,
      kkm: 70,
    }).catch(() => ({ success: true, data: null })),
    staleTime: 30 * 1000,
  });

  const radarData = radarRes?.data || radarRes || {};
  const stats = radarData?.stats || {
    total_siswa_diampu: 0,
    total_perlu_remedial: 0,
    total_belum_dinilai: 0,
    total_tuntas: 0,
    kkm_threshold: 70,
  };

  const tasks: any[] = radarData?.tasks || [];
  const rawItems: RadarRemedialItem[] = radarData?.items || [];

  // Opsi Kelas untuk Filter Rombel
  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => {
      if (t.kelas_id && t.nama_kelas) {
        map.set(t.kelas_id, t.nama_kelas);
      }
    });
    return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }));
  }, [tasks]);

  // Filter Items
  const filteredItems = useMemo(() => {
    let result = rawItems;

    // Filter Kelas
    if (selectedKelasFilter !== 'all') {
      result = result.filter((item) => item.kelas_id === selectedKelasFilter);
    }

    // Filter Status
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Filter Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        item.nama_siswa?.toLowerCase().includes(q) ||
        item.nis?.toLowerCase().includes(q) ||
        item.nama_kelas?.toLowerCase().includes(q) ||
        item.nama_mapel?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rawItems, selectedKelasFilter, statusFilter, search]);

  const kkm = stats.kkm_threshold || 70;

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* ─── Header Banner Radar Remedial ─── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-purple-500/10 border border-rose-200/80 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                Radar Remedial &amp; Penuntasan Nilai
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 uppercase tracking-wide">
                Deteksi Dini
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pantau dan tuntaskan siswa yang butuh perbaikan nilai pada semester berjalan agar tidak menjadi beban kelulusan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {activeSemester?.nama || 'Semester Ganjil'} {activeYear?.nama || ''}
          </span>
        </div>
      </div>

      {/* ─── Stat KPI Cards (Interaktif 1-Click Quick Filter) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Terdeteksi */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none ${
            statusFilter === 'all'
              ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/30 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Terdeteksi</p>
            {statusFilter === 'all' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                <Check size={9} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{rawItems.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Siswa Masuk Radar</p>
        </button>

        {/* Butuh Remedial (< KKM) */}
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'needs_remedial' ? 'all' : 'needs_remedial'))}
          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none ${
            statusFilter === 'needs_remedial'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/40 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-950/60 hover:border-rose-300 dark:hover:border-rose-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Perlu Remedial</p>
            {statusFilter === 'needs_remedial' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                <Check size={9} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.total_perlu_remedial}</p>
          <p className="text-[10px] text-rose-600/70 dark:text-rose-400/70 mt-0.5">Nilai &lt; KKM ({kkm})</p>
        </button>

        {/* Belum Ada Nilai */}
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'unassessed' ? 'all' : 'unassessed'))}
          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none ${
            statusFilter === 'unassessed'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/40 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-950/60 hover:border-amber-300 dark:hover:border-amber-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Asesmen Kosong</p>
            {statusFilter === 'unassessed' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <Check size={9} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.total_belum_dinilai}</p>
          <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Belum Terisi Nilai</p>
        </button>

        {/* Tuntas Remedial */}
        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none ${
            statusFilter === 'completed'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/40 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/60 hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Tuntas Remedial</p>
            {statusFilter === 'completed' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <Check size={9} /> Aktif
              </span>
            )}
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.total_tuntas}</p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Telah Dituntaskan</p>
        </button>
      </div>

      {/* ─── Kontainer Utama: Daftar Siswa Radar Remedial ─── */}
      <HubCard
        title="Daftar Siswa Butuh Penuntasan &amp; Remedial"
        badge={`${filteredItems.length} Siswa`}
        badgeVariant={statusFilter === 'needs_remedial' ? 'rose' : statusFilter === 'unassessed' ? 'amber' : 'purple'}
        action={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Filter Rombel Dropdown */}
            {classOptions.length > 1 && (
              <select
                value={selectedKelasFilter}
                onChange={(e) => setSelectedKelasFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="all">Semua Kelas ({classOptions.length})</option>
                {classOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            )}

            {/* Input Pencarian Siswa */}
            <div className="relative w-44 sm:w-56">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa / NIS..."
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
            Memindai status kelulusan &amp; remedial siswa...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Award size={24} />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              Luar Biasa! Tidak Ada Siswa Bermasalah
            </h4>
            <p className="text-slate-400 max-w-md mx-auto text-[11px]">
              Seluruh siswa pada kelas yang diampu telah tuntas dan tidak ada nilai di bawah batas KKM ({kkm}).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-12 text-center">No</th>
                  <th className="py-3 px-3.5">Nama Siswa</th>
                  <th className="py-3 px-3.5">Kelas</th>
                  <th className="py-3 px-3.5">Mata Pelajaran</th>
                  <th className="py-3 px-3.5 text-center">Nilai Saat Ini</th>
                  <th className="py-3 px-3 text-center">KKM</th>
                  <th className="py-3 px-3.5">Status Radar</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredItems.map((item, idx) => {
                  const isRemedial = item.status === 'needs_remedial';
                  const isUnassessed = item.status === 'unassessed';
                  const isCompleted = item.status === 'completed';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.nama_siswa}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          NIS: {item.nis || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-[11px] border border-purple-200/60 dark:border-purple-800/60">
                          {item.nama_kelas}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-700 dark:text-slate-300">
                        {item.nama_mapel}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                            isRemedial
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : isUnassessed
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 italic font-semibold text-[11px]'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {item.nilai_saat_ini !== null ? item.nilai_saat_ini : 'Kosong'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                        {kkm}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isRemedial
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                              : isUnassessed
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRemedial
                                ? 'bg-rose-500 animate-pulse'
                                : isUnassessed
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span>
                            {isRemedial
                              ? 'Butuh Remedial'
                              : isUnassessed
                              ? 'Belum Ada Nilai'
                              : 'Tuntas Remedial'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveModalItem(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                            isRemedial
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : isUnassessed
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <span>{isCompleted ? 'Perbarui Nilai' : 'Input Remedial'}</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </HubCard>

      {/* ─── Modal Remedial Cepat Per Siswa ─── */}
      {activeModalItem && (
        <RemedialQuickModal
          isOpen={!!activeModalItem}
          onClose={() => setActiveModalItem(null)}
          item={activeModalItem}
          tahunPelajaranId={activeYear?.id || ''}
          semesterId={activeSemester?.id || ''}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
});

TeacherRadarRemedialSubTab.displayName = 'TeacherRadarRemedialSubTab';
