import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { getShortSubjectName } from '../../../utils/mapelAbbreviator';
import { useIsMobile } from '../../../hooks/useIsMobile';


export interface TeacherTaskDetail {
  kelas_id: string;
  nama_kelas: string;
  mapel_id: string;
  nama_mapel: string;
  kode_mapel: string | null;
  total_siswa: number;
  siswa_terisi: number;
  status: 'completed' | 'partial' | 'empty';
}

export interface TeacherProgressSummary {
  guru_id: string;
  nama_guru: string;
  nip: string;
  no_telepon: string | null;
  foto: string | null;
  total_tugas: number;
  tuntas_tugas: number;
  partial_tugas: number;
  empty_tugas: number;
  percentage: number;
  status: 'completed' | 'partial' | 'empty' | 'no_task';
  tasks: TeacherTaskDetail[];
}

interface TeacherMonitoringTableProps {
  teachers: TeacherProgressSummary[];
  isLoading?: boolean;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const TeacherMonitoringTable: React.FC<TeacherMonitoringTableProps> = ({
  teachers = [],
  isLoading = false,
  tahunPelajaranId,
  semesterId,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const buildNilaiUrl = (kelasId: string, mapelId: string) => {
    const params = new URLSearchParams({
      kelas_id: kelasId,
      mapel_id: mapelId,
      tab: 'supervisi',
    });
    if (tahunPelajaranId) params.set('tahun_pelajaran_id', tahunPelajaranId);
    if (semesterId) params.set('semester_id', semesterId);
    return `/rapor/nilai?${params.toString()}`;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'partial' | 'empty'>('all');
  const [expandedGuruIds, setExpandedGuruIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(isMobile ? 10 : 15);

  useEffect(() => {
    setPageSize(isMobile ? 10 : 15);
  }, [isMobile]);

  const toggleExpand = (guruId: string) => {
    setExpandedGuruIds((prev) => {
      const next = new Set(prev);
      if (next.has(guruId)) next.delete(guruId);
      else next.add(guruId);
      return next;
    });
  };

  const [sortBy, setSortBy] = useState<string>('nama_guru');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'percentage' || field === 'rombel' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: string) => {
    const isSorted = sortBy === field;
    if (isSorted) {
      return sortOrder === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-in fade-in zoom-in duration-200" strokeWidth={3} />
      ) : (
        <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-in fade-in zoom-in duration-200" strokeWidth={3} />
      );
    }
    return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />;
  };

  // Reset pagination saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const filteredTeachers = useMemo(() => {
    const result = (teachers || []).filter((g) => {
      // Filter status
      if (statusFilter !== 'all' && g.status !== statusFilter) {
        return false;
      }
      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = g.nama_guru.toLowerCase().includes(q);
        const matchNip = g.nip.toLowerCase().includes(q);
        const matchMapel = g.tasks.some((t) => t.nama_mapel.toLowerCase().includes(q));
        const matchKelas = g.tasks.some((t) => t.nama_kelas.toLowerCase().includes(q));
        return matchName || matchNip || matchMapel || matchKelas;
      }
      return true;
    });

    result.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === 'nama_guru') {
        valA = a.nama_guru.toLowerCase();
        valB = b.nama_guru.toLowerCase();
      } else if (sortBy === 'mapel') {
        valA = a.tasks.map((t) => t.nama_mapel).join(', ').toLowerCase();
        valB = b.tasks.map((t) => t.nama_mapel).join(', ').toLowerCase();
      } else if (sortBy === 'percentage') {
        valA = a.percentage;
        valB = b.percentage;
      } else if (sortBy === 'rombel') {
        valA = a.tuntas_tugas;
        valB = b.tuntas_tugas;
      } else if (sortBy === 'status') {
        const statusWeight: Record<string, number> = { completed: 3, partial: 2, empty: 1, no_task: 0 };
        valA = statusWeight[a.status] || 0;
        valB = statusWeight[b.status] || 0;
      } else {
        valA = (a as any)[sortBy];
        valB = (b as any)[sortBy];
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [teachers, statusFilter, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredTeachers.length / pageSize) || 1;
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, currentPage, pageSize]);

  if (isLoading) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 border-none shadow-xs">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-400">Memuat matriks progres penginputan nilai guru...</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-white dark:bg-slate-900 border-none shadow-xs space-y-4">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Matriks Progres Penginputan Nilai Guru
          </h3>
          <p className="text-xs text-slate-400">
            Monitoring penyelesaian input nilai rapor per personil guru pengampu ({filteredTeachers.length} dari {teachers.length} Guru)
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Guru, NIP, atau Mapel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium pl-8 pr-3 py-2 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 flex-nowrap sm:flex-wrap">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Semua Guru ({teachers.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Tuntas 100% ({teachers.filter((g) => g.status === 'completed').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('partial')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'partial'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          Dalam Proses ({teachers.filter((g) => g.status === 'partial').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('empty')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'empty'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          Belum Menginput ({teachers.filter((g) => g.status === 'empty').length})
        </button>
      </div>

      {/* Table List */}
      {filteredTeachers.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          Tidak ada data guru yang cocok dengan filter atau pencarian saat ini.
        </div>
      ) : isMobile ? (
        /* Mobile Card-Stack View (Responsive Smartphone & Tablet) */
        <div className="space-y-3">
          {/* Mobile Sort Controls */}
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50/70 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="font-bold text-slate-600 dark:text-slate-300 text-[11px]">Urutkan:</span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Urutkan data guru"
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="nama_guru">Nama Guru</option>
                <option value="percentage">Progres (%)</option>
                <option value="mapel">Mata Pelajaran</option>
                <option value="rombel">Rombel Tuntas</option>
                <option value="status">Status</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title={sortOrder === 'asc' ? 'Urutan Naik (A-Z / Rendah-Tinggi)' : 'Urutan Turun (Z-A / Tinggi-Rendah)'}
              >
                {sortOrder === 'asc' ? <ArrowUp size={13} strokeWidth={3} /> : <ArrowDown size={13} strokeWidth={3} />}
              </button>
            </div>
          </div>

          {paginatedTeachers.map((guru) => {
            const isExpanded = expandedGuruIds.has(guru.guru_id);
            const uniqueMapels = Array.from(new Set(guru.tasks.map((t) => t.nama_mapel)));

            return (
              <div
                key={guru.guru_id}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3"
              >
                {/* Header guru + status badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                      {guru.nama_guru.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                        {guru.nama_guru}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        NIP: {guru.nip}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                      guru.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : guru.status === 'partial'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {guru.status === 'completed' ? 'Tuntas' : guru.status === 'partial' ? 'Proses' : 'Belum'}
                  </span>
                </div>

                {/* Mapel chips */}
                <div className="flex flex-wrap gap-1">
                  {uniqueMapels.map((m, idx) => {
                    const taskForMapel = guru.tasks.find((t) => t.nama_mapel === m);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (taskForMapel?.kelas_id && taskForMapel?.mapel_id) {
                            navigate(buildNilaiUrl(taskForMapel.kelas_id, taskForMapel.mapel_id));
                          }
                        }}
                        title={`Buka input nilai: ${m}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 active:bg-indigo-50 text-slate-700 dark:text-slate-200 text-[10px] font-semibold border border-slate-200 dark:border-slate-600 active:border-indigo-300 transition-all cursor-pointer"
                      >
                        <span>{getShortSubjectName(m)}</span>
                        <ExternalLink size={8} className="text-slate-400" />
                      </button>
                    );
                  })}
                </div>

                {/* Progress bar + counts */}
                <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>{guru.tuntas_tugas} / {guru.total_tugas} Rombel Tuntas</span>
                    <span>{guru.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        guru.percentage === 100
                          ? 'bg-emerald-500'
                          : guru.percentage > 0
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${guru.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Toggle breakdown button */}
                <button
                  type="button"
                  onClick={() => toggleExpand(guru.guru_id)}
                  className="w-full py-1.5 text-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-700/50 hover:bg-slate-100 rounded-xl border border-indigo-100 dark:border-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <span>{isExpanded ? 'Tutup Rincian' : `Lihat ${guru.tasks.length} Rombel`}</span>
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {/* Expanded Rombel list */}
                {isExpanded && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1 animate-in fade-in duration-200">
                    {guru.tasks.map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (t.kelas_id && t.mapel_id) {
                            navigate(buildNilaiUrl(t.kelas_id, t.mapel_id));
                          }
                        }}
                        title={`Klik untuk input nilai ${t.nama_kelas} - ${t.nama_mapel}`}
                        className={`p-2 rounded-xl border text-[10px] cursor-pointer hover:shadow-md active:scale-95 transition-all group ${
                          t.status === 'completed'
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                            : t.status === 'partial'
                            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
                            : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {t.nama_kelas}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-mono text-[9px]">{t.siswa_terisi}/{t.total_siswa}</span>
                            <ExternalLink size={8} className="text-slate-400 group-hover:text-indigo-600" />
                          </div>
                        </div>
                        <p className="truncate text-slate-500 dark:text-slate-400 text-[9px] mt-0.5">
                          {getShortSubjectName(t.nama_mapel)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 select-none">
                <th
                  onClick={() => handleSort('nama_guru')}
                  className="p-3.5 pl-4 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group"
                  title="Klik untuk mengurutkan berdasarkan nama guru"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Guru Pengampu</span>
                    {renderSortIcon('nama_guru')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('mapel')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group"
                  title="Klik untuk mengurutkan berdasarkan mata pelajaran"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Mata Pelajaran</span>
                    {renderSortIcon('mapel')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('rombel')}
                  className="p-3.5 text-center w-32 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group"
                  title="Klik untuk mengurutkan berdasarkan rombel tuntas"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Rombel Tuntas</span>
                    {renderSortIcon('rombel')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('percentage')}
                  className="p-3.5 w-48 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group"
                  title="Klik untuk mengurutkan berdasarkan progres pengisian nilai"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Progres (%)</span>
                    {renderSortIcon('percentage')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="p-3.5 text-center w-28 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors group"
                  title="Klik untuk mengurutkan berdasarkan status"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
                <th className="p-3.5 text-center w-20 pr-4">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {paginatedTeachers.map((guru) => {
                const isExpanded = expandedGuruIds.has(guru.guru_id);
                const uniqueMapels = Array.from(new Set(guru.tasks.map((t) => t.nama_mapel)));

                return (
                  <React.Fragment key={guru.guru_id}>
                    <tr
                      onClick={() => toggleExpand(guru.guru_id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      {/* Nama & NIP */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                            {guru.nama_guru.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                              {guru.nama_guru}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              NIP: {guru.nip}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Mapel Diampu */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {uniqueMapels.map((m, idx) => {
                            const taskForMapel = guru.tasks.find((t) => t.nama_mapel === m);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (taskForMapel?.kelas_id && taskForMapel?.mapel_id) {
                                    navigate(buildNilaiUrl(taskForMapel.kelas_id, taskForMapel.mapel_id));
                                  }
                                }}
                                title={`Buka lembar input nilai: ${m} (${taskForMapel?.nama_kelas || 'Pilih rombel'})`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[10px] font-semibold border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group/btn"
                              >
                                <span>{getShortSubjectName(m)}</span>
                                <ExternalLink size={9} className="opacity-0 group-hover/btn:opacity-100 text-indigo-500 transition-opacity" />
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Rombel Tuntas */}
                      <td className="p-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {guru.tuntas_tugas} / {guru.total_tugas}
                      </td>

                      {/* Progress bar */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold whitespace-nowrap gap-2">
                            <span>{guru.percentage}%</span>
                            <span className="shrink-0">{guru.total_tugas - guru.tuntas_tugas} Belum</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                guru.percentage === 100
                                  ? 'bg-emerald-500'
                                  : guru.percentage > 0
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${guru.percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Badge status */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            guru.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : guru.status === 'partial'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {guru.status === 'completed'
                            ? 'Tuntas'
                            : guru.status === 'partial'
                            ? 'Proses'
                            : 'Belum'}
                        </span>
                      </td>

                      {/* Toggle button */}
                      <td className="p-3.5 text-center pr-4">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable row: Rombel Breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <td colSpan={6} className="p-3 pl-14 pr-4 border-y border-slate-100 dark:border-slate-800">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Rincian Status Rombel Mengajar ({guru.tasks.length} Kelas) — Klik kartu untuk buka lembar input nilai:
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {guru.tasks.map((t, idx) => (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (t.kelas_id && t.mapel_id) {
                                      navigate(buildNilaiUrl(t.kelas_id, t.mapel_id));
                                    }
                                  }}
                                  title={`Buka Lembar Input Nilai: ${t.nama_kelas} - ${t.nama_mapel}`}
                                  className={`p-2.5 rounded-xl border text-[11px] cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group ${
                                    t.status === 'completed'
                                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400'
                                      : t.status === 'partial'
                                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
                                      : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 hover:border-rose-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      {t.nama_kelas}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                        {t.siswa_terisi}/{t.total_siswa}
                                      </span>
                                      <ExternalLink size={10} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-all shrink-0" />
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={t.nama_mapel}>
                                    {getShortSubjectName(t.nama_mapel)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Standardized, Centralized Premium Pagination Footer (Identik dengan Data Siswa) */}
      {filteredTeachers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 sm:px-4 py-2 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/20 dark:bg-slate-950/20 rounded-b-2xl">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * pageSize, filteredTeachers.length)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{filteredTeachers.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="teacher-limit-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Limit:</label>
              <select 
                id="teacher-limit-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                {[10, 15, 25, 50, 100].map(limit => (
                  <option key={limit} value={limit}>{limit}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 border border-gray-200/60 dark:border-gray-800/80 rounded-lg p-0.5 bg-white dark:bg-slate-900 shadow-sm w-full sm:w-auto justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Halaman Sebelumnya"
              className="h-6 px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-md disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <div className="px-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 py-0.5 rounded-md border border-indigo-100/30 select-none" aria-current="page">
              {currentPage} / {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Halaman Selanjutnya"
              className="h-6 px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-md disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </Card>
  );
};
