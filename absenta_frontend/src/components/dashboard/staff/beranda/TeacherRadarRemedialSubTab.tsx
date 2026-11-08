import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
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
  Check,
  Copy,
  Share2,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { raporApi } from '@/api/rapor.api';
import { HubCard, HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';
import { RemedialQuickModal, RadarRemedialItem } from './RemedialQuickModal';
import { useAcademicFilter } from '@/components/common/academic-filter';

export interface RadarKbmTask {
  kelas_id: string;
  nama_kelas: string;
  mapel_id?: string;
  nama_mapel?: string;
  guru_id?: string;
  nama_guru?: string;
}

export interface UniversalRadarRemedialProps {
  guruId?: string;
  kelasId?: string;
  kelasNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  roleMode?: 'guru' | 'walas';
  className?: string;
}

export const TeacherRadarRemedialSubTab: React.FC<UniversalRadarRemedialProps> = React.memo(({
  guruId,
  kelasId,
  kelasNama,
  tahunPelajaranId: propTpId,
  semesterId: propSemId,
  roleMode = 'guru',
  className,
}) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_remedial' | 'unassessed' | 'completed'>('needs_remedial');
  const [activeModalItem, setActiveModalItem] = useState<RadarRemedialItem | null>(null);

  // Pagination State (High Density & 60 FPS Multi-Device Performance)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selalu pastikan default filter terkunci di "Perlu Remedial" setiap kali konteks rombel/role berubah
  useEffect(() => {
    setStatusFilter('needs_remedial');
  }, [kelasId, roleMode]);

  // Reset page ke 1 setiap kali kriteria filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKelasFilter, statusFilter, deferredSearch]);

  const { activeYear, activeSemester } = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const effectiveTpId = propTpId || activeYear?.id;
  const effectiveSemId = propSemId || activeSemester?.id;

  const { data: radarRes, isLoading, refetch } = useQuery({
    queryKey: ['rapor-radar-remedial', guruId, kelasId, roleMode, effectiveTpId, effectiveSemId],
    queryFn: () => raporApi.getRadarRemedial({
      guru_id: roleMode === 'walas' ? undefined : guruId,
      kelas_id: kelasId || undefined,
      role_mode: roleMode,
      tahun_pelajaran_id: effectiveTpId,
      semester_id: effectiveSemId,
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

  const tasks: RadarKbmTask[] = radarData?.tasks || [];
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

  // Filter Items (Menggunakan deferredSearch untuk isolasi komputasi dari main-thread)
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
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      result = result.filter((item) =>
        item.nama_siswa?.toLowerCase().includes(q) ||
        item.nis?.toLowerCase().includes(q) ||
        item.nama_kelas?.toLowerCase().includes(q) ||
        item.nama_mapel?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rawItems, selectedKelasFilter, statusFilter, deferredSearch]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const kkm = stats.kkm_threshold || 70;
  const isWalas = roleMode === 'walas';
  const headerTitle = isWalas ? 'Radar Ketuntasan Nilai Rombel' : 'Radar Remedial & Penuntasan Nilai';
  const headerBadge = isWalas ? 'Pantauan Walas' : 'Deteksi Dini';
  const headerDesc = isWalas
    ? `Pantau ketuntasan seluruh mata pelajaran siswa ${kelasNama || 'Kelas Binaan'} untuk kesiapan kenaikan kelas & kelulusan rapor.`
    : 'Pantau dan tuntaskan siswa yang butuh perbaikan nilai pada semester berjalan agar tidak menjadi beban kelulusan.';

  const handleCopyRekap = () => {
    const remedialList = rawItems.filter((i) => i.status === 'needs_remedial');
    if (remedialList.length === 0) {
      toast.info('Tidak ada siswa yang berstatus perlu remedial.');
      return;
    }
    const semesterLabel = `${activeSemester?.nama || 'Semester Ganjil'} ${activeYear?.nama || ''}`;
    let text = `*📋 RADAR KETUNTASAN & REMEDIAL SISWA*\n`;
    text += `*Periode:* ${semesterLabel}\n`;
    if (kelasNama) text += `*Kelas:* ${kelasNama}\n`;
    text += `--------------------------------------\n`;
    remedialList.forEach((r, idx) => {
      text += `${idx + 1}. *${r.nama_siswa}* (NIS: ${r.nis || '-'})\n`;
      text += `   • Mapel: ${r.nama_mapel}\n`;
      if (r.nama_guru) text += `   • Pengajar: ${r.nama_guru}\n`;
      text += `   • Nilai: *${r.nilai_saat_ini}* (Standar KKM: ${r.kkm})\n`;
    });
    text += `--------------------------------------\n`;
    text += `_Mohon siswa yang bersangkutan segera menghubungi guru pengajar untuk jadwal remedial._`;

    navigator.clipboard.writeText(text);
    toast.success(`${remedialList.length} data remedial berhasil disalin ke clipboard!`);
  };

  // ─── Bento Grid 4 Sel Garis Rambut (Standar Shopee-Grade UI) ───
  const bentoCells: HubBentoCell[] = useMemo(() => [
    {
      id: 'all',
      title: 'Total Terdeteksi',
      value: `${rawItems.length} Siswa`,
      icon: Users,
      iconColorClass: statusFilter === 'all'
        ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-500/40'
        : 'text-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40',
      badge: statusFilter === 'all' ? (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
          <Check size={9} /> Aktif
        </span>
      ) : undefined,
      isActive: statusFilter === 'all',
      onClick: () => setStatusFilter('all'),
    },
    {
      id: 'needs_remedial',
      title: 'Perlu Remedial',
      value: `${stats.total_perlu_remedial} Siswa`,
      icon: AlertCircle,
      iconColorClass: statusFilter === 'needs_remedial'
        ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 ring-1 ring-rose-500/40'
        : 'text-rose-600 bg-rose-50/70 dark:bg-rose-950/40',
      badge: statusFilter === 'needs_remedial' ? (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
          <Check size={9} /> Aktif
        </span>
      ) : undefined,
      isActive: statusFilter === 'needs_remedial',
      onClick: () => setStatusFilter((prev) => (prev === 'needs_remedial' ? 'all' : 'needs_remedial')),
    },
    {
      id: 'unassessed',
      title: 'Asesmen Kosong',
      value: `${stats.total_belum_dinilai} Belum Nilai`,
      icon: Clock,
      iconColorClass: statusFilter === 'unassessed'
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 ring-1 ring-amber-500/40'
        : 'text-amber-600 bg-amber-50/70 dark:bg-amber-950/40',
      badge: statusFilter === 'unassessed' ? (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
          <Check size={9} /> Aktif
        </span>
      ) : undefined,
      isActive: statusFilter === 'unassessed',
      onClick: () => setStatusFilter((prev) => (prev === 'unassessed' ? 'all' : 'unassessed')),
    },
    {
      id: 'completed',
      title: 'Tuntas Remedial',
      value: `${stats.total_tuntas} Tuntas`,
      icon: CheckCircle2,
      iconColorClass: statusFilter === 'completed'
        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-emerald-500/40'
        : 'text-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40',
      badge: statusFilter === 'completed' ? (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
          <Check size={9} /> Aktif
        </span>
      ) : undefined,
      isActive: statusFilter === 'completed',
      onClick: () => setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed')),
    },
  ], [rawItems.length, stats.total_perlu_remedial, stats.total_belum_dinilai, stats.total_tuntas, statusFilter]);

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* ─── Header Banner Radar Remedial (Desktop only, di mobile hemat ruang) ─── */}
      <div className="hidden sm:flex p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-purple-500/10 border border-rose-200/80 dark:border-rose-900/50 flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                {headerTitle}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 uppercase tracking-wide">
                {headerBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {headerDesc}
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

      {/* ─── Bento Grid 4 Sel Garis Rambut (Standar Shopee UI) ─── */}
      <HubCard noPadding>
        <HubBentoGrid cells={bentoCells} columns={4} />
      </HubCard>

      {/* ─── Kontainer Utama: Daftar Siswa Radar Remedial ─── */}
      <HubCard
        title="Daftar Siswa Butuh Penuntasan &amp; Remedial"
        badge={`${filteredItems.length} Siswa`}
        badgeVariant={statusFilter === 'needs_remedial' ? 'rose' : statusFilter === 'unassessed' ? 'amber' : 'purple'}
        action={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Tombol Salin Rekap WhatsApp */}
            <button
              type="button"
              onClick={handleCopyRekap}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 font-semibold transition-all cursor-pointer shadow-2xs"
              title="Salin rekap siswa remedial untuk WhatsApp"
            >
              <Copy size={13} />
              <span>Salin Rekap</span>
            </button>

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
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              statusFilter === 'needs_remedial' 
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              <Award size={24} />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {statusFilter === 'needs_remedial'
                ? 'Luar Biasa! Tidak Ada Siswa Bermasalah'
                : statusFilter === 'completed'
                ? 'Belum Ada Data Siswa Tuntas'
                : statusFilter === 'unassessed'
                ? 'Semua Siswa Telah Memiliki Nilai'
                : 'Tidak Ada Data Siswa'}
            </h4>
            <p className="text-slate-400 max-w-md mx-auto text-[11px]">
              {statusFilter === 'needs_remedial'
                ? `Seluruh siswa pada kelas yang diampu telah tuntas dan tidak ada nilai di bawah batas KKM (${kkm}).`
                : statusFilter === 'completed'
                ? `Belum ada siswa yang nilainya telah mencapai batas ketuntasan KKM (${kkm}).`
                : statusFilter === 'unassessed'
                ? 'Seluruh siswa telah memiliki asesmen dan tidak ada nilai yang kosong.'
                : 'Silakan ubah kata kunci pencarian atau filter rombel.'}
            </p>
          </div>
        ) : (
          <div>
            {/* ─── Mode Mobile: Shopee-Grade Flat List Cards (< sm) ─── */}
            <div className="block sm:hidden space-y-2.5">
              {paginatedItems.map((item, idx) => {
                const isRemedial = item.status === 'needs_remedial';
                const isUnassessed = item.status === 'unassessed';
                const isCompleted = item.status === 'completed';
                const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                return (
                  <div
                    key={`mobile-${item.id}-${idx}`}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
                  >
                    {/* Header: Kelas, Mapel & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-[10px] border border-purple-200/60 dark:border-purple-800/60 shrink-0">
                          {item.nama_kelas}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.nama_mapel}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
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
                            ? 'Remedial'
                            : isUnassessed
                            ? 'Kosong'
                            : 'Tuntas'}
                        </span>
                      </span>
                    </div>

                    {/* Siswa & Guru Pengajar */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                          {rowNumber}. {item.nama_siswa}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          NIS: {item.nis || '-'}
                          {item.nama_guru ? ` • Pengajar: ${item.nama_guru}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">Nilai vs KKM</span>
                        <div className="flex items-center gap-1 justify-end">
                          <span
                            className={`px-1.5 py-0.2 rounded font-black text-xs ${
                              isRemedial
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : isUnassessed
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px]'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {item.nilai_saat_ini !== null ? item.nilai_saat_ini : '-'}
                          </span>
                          <span className="text-[10px] text-slate-400">/{kkm}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi Mobile Touch-Friendly */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveModalItem(item)}
                        className={isWalas 
                          ? "w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5"
                          : `w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 ${
                            isRemedial
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : isUnassessed
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`
                        }
                      >
                        {isWalas ? (
                          <>
                            <Eye size={13} />
                            <span>Lihat Rincian</span>
                          </>
                        ) : (
                          <>
                            <span>{isCompleted ? 'Perbarui Nilai' : 'Input Remedial'}</span>
                            <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Mode Desktop: Tabular Data Table (>= sm) ─── */}
            <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
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
                  {paginatedItems.map((item, idx) => {
                    const isRemedial = item.status === 'needs_remedial';
                    const isUnassessed = item.status === 'unassessed';
                    const isCompleted = item.status === 'completed';
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <td className="py-3 px-3.5 text-center text-slate-400 font-semibold">
                          {rowNumber}
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
                          <div className="font-bold text-slate-900 dark:text-white">{item.nama_mapel}</div>
                          {item.nama_guru && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                              Pengajar: {item.nama_guru}
                            </div>
                          )}
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
                            className={isWalas 
                              ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                              : `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                isRemedial
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : isUnassessed
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`
                            }
                          >
                            {isWalas ? (
                              <>
                                <Eye size={13} />
                                <span>Lihat Rincian</span>
                              </>
                            ) : (
                              <>
                                <span>{isCompleted ? 'Perbarui Nilai' : 'Input Remedial'}</span>
                                <ArrowRight size={13} />
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── Paginasi High-Density (Phase 4 Performance Optimization) ─── */}
            {filteredItems.length > pageSize && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>
                    Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredItems.length)}</span> dari <span className="font-bold text-slate-800 dark:text-slate-200">{filteredItems.length}</span> data
                  </span>
                  <span className="hidden sm:inline">&bull;</span>
                  <div className="hidden sm:flex items-center gap-1">
                    <span>Per hal:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-2xs"
                    title="Halaman Sebelumnya"
                    aria-label="Halaman Sebelumnya"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                      {currentPage} / {totalPages}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-2xs"
                    title="Halaman Selanjutnya"
                    aria-label="Halaman Selanjutnya"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
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
          readOnly={isWalas}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
});

TeacherRadarRemedialSubTab.displayName = 'TeacherRadarRemedialSubTab';
