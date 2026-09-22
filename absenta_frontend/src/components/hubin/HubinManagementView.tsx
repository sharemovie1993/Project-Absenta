import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Plus, 
  BookOpen,
  Search,
  Users,
  AlertTriangle,
  Clock,
  UserCheck,
  ArrowRight,
  ChevronRight,
  Filter,
  ChevronDown,
  X,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  SectionCard, 
  Table, 
  Button, 
  Input, 
  Badge, 
  AnalyticsCard,
  SimpleFormField 
} from '../ui';
import { SearchableSelect } from '../ui/SearchableSelect';
import { format, parseISO, isValid } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { renderDailyTimeline } from '../../utils/hubinUtils';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';
import { PklStatusBadge } from './PklStatusBadge';
import type { AbsensiPkl } from '../../api/hubin.api';

import { HubinAbsensiStatus } from '../../constants/HubinConstants';
import { SiswaIdentityCell } from '../common/SiswaIdentityCell';

interface HubinManagementViewProps {
  rawPenempatan: any[];
  isLoading: boolean;
  onVerify: (id: string) => void;
  onQuickAddForId: (absensi: AbsensiPkl, text: string) => void;
  onEditLogbook: (absensi: AbsensiPkl) => void;
  quickAddTexts: Record<string, string>;
  setQuickAddTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  renderActivityText: (str: string | undefined) => React.ReactNode;
  getDriveThumbnailUrl: (url: string | undefined) => string | null;
  isGlobalHubin?: boolean;
  isKaprog?: boolean;
  kaprogJurusan?: { id: string; nama: string; singkatan?: string | null } | null;
  isWaliKelas?: boolean;
  walikelasKelas?: { id: string; nama_kelas: string; tingkat?: number | null } | null;
  activeGuruId?: string | null;
  selectedTp?: string;
  onTpChange?: (tpId: string) => void;
  tpOptions?: Array<{ value: string; label: string }>;
}

export const HubinManagementView: React.FC<HubinManagementViewProps> = React.memo(({
  rawPenempatan,
  isLoading,
  onVerify,
  onQuickAddForId,
  onEditLogbook,
  quickAddTexts,
  setQuickAddTexts,
  renderActivityText,
  getDriveThumbnailUrl,
  isGlobalHubin = false,
  isKaprog = false,
  kaprogJurusan,
  isWaliKelas = false,
  walikelasKelas,
  activeGuruId,
  selectedTp,
  onTpChange,
  tpOptions
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MY_GUIDANCE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEEDS_VERIFICATION' | 'ATTENDED_TODAY' | 'NOT_ATTENDED_TODAY'>('ALL');
  const [mitraFilter, setMitraFilter] = useState('ALL');
  const [pembimbingFilter, setPembimbingFilter] = useState('ALL');
  const [kelasFilter, setKelasFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Count bimbingan saya
  const myGuidanceCount = useMemo(() => {
    if (!activeGuruId) return 0;
    return (rawPenempatan || []).filter((p: any) => {
      const pId = p.pembimbing_id || p.Pembimbing?.id;
      return pId === activeGuruId;
    }).length;
  }, [rawPenempatan, activeGuruId]);

  // Count siswa kelas binaan (untuk Wali Kelas mode ALL)
  const homeroomCount = useMemo(() => {
    if (!isWaliKelas || isGlobalHubin || isKaprog || !walikelasKelas?.id) return rawPenempatan.length;
    return (rawPenempatan || []).filter((p: any) => {
      const kId = p.Siswa?.Kelas?.id || p.Siswa?.kelas_id;
      return kId === walikelasKelas.id;
    }).length;
  }, [rawPenempatan, isWaliKelas, isGlobalHubin, isKaprog, walikelasKelas]);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Filter Options Extracted Dynamically from Placements
  const availableMitra = useMemo(() => {
    const map = new Map<string, string>();
    (rawPenempatan || []).forEach((p: any) => {
      const id = p.mitra_id || p.Mitra?.id;
      const name = p.Mitra?.nama;
      if (id && name) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPenempatan]);

  const availablePembimbing = useMemo(() => {
    const map = new Map<string, string>();
    (rawPenempatan || []).forEach((p: any) => {
      const id = p.pembimbing_id || p.Pembimbing?.id;
      const name = p.Pembimbing?.nama_guru;
      if (id && name) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPenempatan]);

  const availableKelas = useMemo(() => {
    const map = new Map<string, string>();
    (rawPenempatan || []).forEach((p: any) => {
      const k = p.Siswa?.Kelas;
      const id = k?.id || p.Siswa?.kelas_id;
      const name = k?.nama_kelas || k?.nama;
      if (id && name) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPenempatan]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (mitraFilter !== 'ALL') count++;
    if (pembimbingFilter !== 'ALL') count++;
    if (kelasFilter !== 'ALL') count++;
    if (searchTerm.trim()) count++;
    return count;
  }, [statusFilter, mitraFilter, pembimbingFilter, kelasFilter, searchTerm]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setMitraFilter('ALL');
    setPembimbingFilter('ALL');
    setKelasFilter('ALL');
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, mitraFilter, pembimbingFilter, kelasFilter, selectedTp]);

  // Filtered Students List
  const filteredPenempatan = useMemo(() => {
    return (rawPenempatan || []).filter((p: any) => {
      // 0. Scope Filter (Semua Siswa Jurusan vs Bimbingan Saya)
      if (scopeFilter === 'MY_GUIDANCE' && activeGuruId) {
        const pId = p.pembimbing_id || p.Pembimbing?.id;
        if (pId !== activeGuruId) return false;
      }

      // 0b. Wali Kelas: saat tab "Semua Siswa [Kelas]", hanya tampilkan siswa dari kelas binaan saja
      // Siswa bimbingan lintas kelas hanya muncul di tab "Bimbingan Saya"
      if (scopeFilter === 'ALL' && isWaliKelas && !isGlobalHubin && !isKaprog && walikelasKelas?.id) {
        const kId = p.Siswa?.Kelas?.id || p.Siswa?.kelas_id;
        if (kId !== walikelasKelas.id) return false;
      }

      // 1. Search Query
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const name = (p.Siswa?.nama_siswa || p.Siswa?.full_name || '').toLowerCase();
        const nis = (p.Siswa?.nis || '').toLowerCase();
        const mitra = (p.Mitra?.nama || '').toLowerCase();
        const pembimbing = (p.Pembimbing?.nama_guru || '').toLowerCase();
        const kelas = (p.Siswa?.Kelas?.nama_kelas || p.Siswa?.Kelas?.nama || '').toLowerCase();
        if (!name.includes(term) && !nis.includes(term) && !mitra.includes(term) && !pembimbing.includes(term) && !kelas.includes(term)) {
          return false;
        }
      }

      // 2. Status Presensi Filter
      const lastAbs = p.AbsensiPkl?.[0];
      const today = new Date().toISOString().split('T')[0];
      const isAttendedToday = !!lastAbs && lastAbs.tanggal?.startsWith(today);
      const isNeedsVerification = !!lastAbs && !lastAbs.is_verified;

      if (statusFilter === 'NEEDS_VERIFICATION' && !isNeedsVerification) return false;
      if (statusFilter === 'ATTENDED_TODAY' && !isAttendedToday) return false;
      if (statusFilter === 'NOT_ATTENDED_TODAY' && isAttendedToday) return false;

      // 3. Mitra Filter
      if (mitraFilter !== 'ALL') {
        const mId = p.mitra_id || p.Mitra?.id;
        if (mId !== mitraFilter && p.Mitra?.nama !== mitraFilter) return false;
      }

      // 4. Pembimbing Filter
      if (pembimbingFilter !== 'ALL') {
        const pId = p.pembimbing_id || p.Pembimbing?.id;
        if (pId !== pembimbingFilter && p.Pembimbing?.nama_guru !== pembimbingFilter) return false;
      }

      // 5. Kelas Filter
      if (kelasFilter !== 'ALL' && scopeFilter !== 'MY_GUIDANCE') {
        const kId = p.Siswa?.Kelas?.id || p.Siswa?.kelas_id;
        const kName = p.Siswa?.Kelas?.nama_kelas || p.Siswa?.Kelas?.nama;
        if (kId !== kelasFilter && kName !== kelasFilter) return false;
      }

      return true;
    });
  }, [rawPenempatan, scopeFilter, activeGuruId, isWaliKelas, isGlobalHubin, isKaprog, walikelasKelas, searchTerm, statusFilter, mitraFilter, pembimbingFilter, kelasFilter]);

  const totalItems = filteredPenempatan.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginatedPenempatan = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPenempatan.slice(start, start + itemsPerPage);
  }, [filteredPenempatan, currentPage, itemsPerPage]);

  const needsVerificationCount = useMemo(() => {
    return filteredPenempatan.reduce((acc: number, curr: any) => acc + (curr.AbsensiPkl?.[0]?.is_verified === false ? 1 : 0), 0);
  }, [filteredPenempatan]);

  const attendedTodayCount = useMemo(() => {
    return filteredPenempatan.filter((p: any) => {
      const lastAbs = p.AbsensiPkl?.[0];
      if (!lastAbs) return false;
      const today = new Date().toISOString().split('T')[0];
      return lastAbs.tanggal.startsWith(today);
    }).length;
  }, [filteredPenempatan]);

  return (
    <div className="space-y-6">
      {/* Banner Khusus Kaprog: Unit Terkunci */}
      {isKaprog && (
        <div className="flex items-center gap-2.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
          <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <span className="font-bold">Mode Ketua Program Keahlian (Kaprog):</span>{' '}
            <span>
              Monitoring presensi PKL difokuskan otomatis untuk Jurusan{' '}
              <strong>{kaprogJurusan?.nama || 'Binaan Anda'}</strong>
              {kaprogJurusan?.singkatan ? ` (${kaprogJurusan.singkatan})` : ''}.
            </span>
          </div>
        </div>
      )}

      {/* Banner Khusus Wali Kelas: Kelas Terkunci */}
      {isWaliKelas && !isKaprog && !isGlobalHubin && (
        <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200">
          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold">Mode Wali Kelas (Monitoring Kelas Binaan):</span>{' '}
            <span>
              Monitoring presensi PKL difokuskan otomatis untuk kelas{' '}
              <strong>{walikelasKelas?.nama_kelas || 'Binaan Anda'}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Analytics Cards - Compact Premium Mobile & Desktop Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <AnalyticsCard 
          title={<><span className="hidden sm:inline">Total </span>Siswa</>}
          value={filteredPenempatan.length}
          icon={<Users size={16} />}
          gradient="from-indigo-600 to-violet-700"
          variant="compact-premium"
          compact
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            statusFilter === 'ALL'
              ? "ring-2 ring-indigo-500 shadow-md ring-offset-2 dark:ring-offset-slate-900"
              : "opacity-85 hover:opacity-100"
          )}
        />

        <AnalyticsCard 
          title="Verifikasi"
          value={needsVerificationCount}
          icon={<AlertTriangle size={16} />}
          gradient="from-amber-500 to-amber-600"
          variant="compact-premium"
          compact
          onClick={() => setStatusFilter(statusFilter === 'NEEDS_VERIFICATION' ? 'ALL' : 'NEEDS_VERIFICATION')}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            statusFilter === 'NEEDS_VERIFICATION'
              ? "ring-2 ring-amber-500 shadow-md ring-offset-2 dark:ring-offset-slate-900"
              : "opacity-85 hover:opacity-100"
          )}
        />

        <AnalyticsCard 
          title={<><span className="hidden sm:inline">Sudah </span>Hadir</>}
          value={attendedTodayCount}
          icon={<ShieldCheck size={16} />}
          gradient="from-emerald-500 to-teal-600"
          variant="compact-premium"
          compact
          onClick={() => setStatusFilter(statusFilter === 'ATTENDED_TODAY' ? 'ALL' : 'ATTENDED_TODAY')}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            statusFilter === 'ATTENDED_TODAY'
              ? "ring-2 ring-emerald-500 shadow-md ring-offset-2 dark:ring-offset-slate-900"
              : "opacity-85 hover:opacity-100"
          )}
        />
      </div>

      <SectionCard 
        fullWidth
        noPadding
      >
        {/* Toggle Scope: Semua Siswa Jurusan vs Bimbingan Saya (Khusus jika user adalah guru pembimbing/pejabat) */}
        {activeGuruId && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 bg-slate-50/40 dark:bg-slate-900/20">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setScopeFilter('ALL');
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all text-xs font-bold",
                  scopeFilter === 'ALL'
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                {isKaprog ? '🏢 Semua Siswa Jurusan' : (isWaliKelas ? `🏫 Semua Siswa ${walikelasKelas?.nama_kelas || 'Kelas'}` : '📋 Semua Penempatan')} ({homeroomCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setScopeFilter('MY_GUIDANCE');
                  setKelasFilter('ALL');
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all text-xs font-bold flex items-center gap-1",
                  scopeFilter === 'MY_GUIDANCE'
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                👨‍🏫 Bimbingan Saya ({myGuidanceCount})
              </button>
            </div>
            {scopeFilter === 'MY_GUIDANCE' && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                🎯 Menampilkan {myGuidanceCount} siswa yang Anda bimbing langsung
              </span>
            )}
          </div>
        )}

        {/* Toolbar Baris Pertama - Filter & Search */}
        <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/10 items-center">
          {/* 1. Input Pencarian di Sisi Kiri */}
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <Input
              placeholder="Cari siswa (NIP/NIS, Nama, Mitra, Pembimbing)..."
              aria-label="Cari Siswa PKL"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 2. Filter Tahun Pelajaran (SearchableSelect) */}
          {tpOptions && tpOptions.length > 0 && (
            <div className="w-full lg:w-48 shrink-0">
              <SearchableSelect
                value={selectedTp || ''}
                onValueChange={(val) => onTpChange && onTpChange(val)}
                options={tpOptions}
                placeholder="Tahun Pelajaran"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              />
            </div>
          )}

          {/* 3. Filter Status Presensi */}
          <div className="w-full lg:w-44 shrink-0">
            <SearchableSelect
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as any)}
              options={[
                { label: 'Semua Status', value: 'ALL' },
                { label: '⚠️ Perlu Verifikasi', value: 'NEEDS_VERIFICATION' },
                { label: '✅ Sudah Hadir', value: 'ATTENDED_TODAY' },
                { label: '⭕ Belum Absen', value: 'NOT_ATTENDED_TODAY' }
              ]}
              placeholder="Semua Status"
              triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
            />
          </div>

          {/* 4. Filter Mitra DUDI */}
          {availableMitra.length > 0 && (
            <div className="w-full lg:w-48 shrink-0">
              <SearchableSelect
                value={mitraFilter}
                onValueChange={setMitraFilter}
                options={[
                  { label: 'Semua Mitra DUDI', value: 'ALL' },
                  ...availableMitra.map(m => ({ label: m.name, value: m.id }))
                ]}
                placeholder="Semua Mitra DUDI"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              />
            </div>
          )}

          {/* 5. Filter Guru Pembimbing (Khusus Global Hubin) */}
          {isGlobalHubin && availablePembimbing.length > 0 && (
            <div className="w-full lg:w-48 shrink-0">
              <SearchableSelect
                value={pembimbingFilter}
                onValueChange={setPembimbingFilter}
                options={[
                  { label: 'Semua Pembimbing', value: 'ALL' },
                  ...availablePembimbing.map(p => ({ label: p.name, value: p.id }))
                ]}
                placeholder="Semua Pembimbing"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              />
            </div>
          )}

          {/* 6. Filter Kelas */}
          {availableKelas.length > 0 && (
            <div className="w-full lg:w-40 shrink-0">
              <SearchableSelect
                value={kelasFilter}
                onValueChange={setKelasFilter}
                options={[
                  { label: 'Semua Kelas', value: 'ALL' },
                  ...availableKelas.map(k => ({ label: k.name, value: k.id }))
                ]}
                placeholder="Semua Kelas"
                triggerClassName="h-10 text-[13px] w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
              />
            </div>
          )}

          {/* Tombol Reset (Jika ada filter aktif) */}
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-10 px-3 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 shrink-0 border-rose-200 dark:border-rose-900/40"
              title="Reset Semua Filter"
            >
              <RotateCcw size={13} /> Reset ({activeFiltersCount})
            </Button>
          )}
        </div>

        <div className="w-full p-4 md:p-8 space-y-6">

          {rawPenempatan.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center w-full">
              <div className="w-20 h-20 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                <Users size={32} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Belum Ada Siswa Bimbingan</h3>
              <p className="text-[11px] text-slate-450 font-medium mt-1 max-w-[240px]">Data siswa akan muncul secara otomatis jika Anda telah diploting sebagai Pembimbing.</p>
            </div>
          ) : filteredPenempatan.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center w-full">
              <div className="w-16 h-16 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-3 border border-slate-100 dark:border-slate-800">
                <Filter size={24} className="text-slate-300" />
              </div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Tidak Ada Siswa yang Cocok</h3>
              <p className="text-[11px] text-slate-450 font-medium mt-1 max-w-[260px]">Tidak ditemukan siswa bimbingan yang sesuai dengan filter atau pencarian Anda.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 h-8 rounded-lg text-[10px] font-black uppercase tracking-wider gap-1.5"
              >
                <RotateCcw size={12} /> Reset Filter
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-4">
              {paginatedPenempatan?.map((p: any, idx: number) => {
                const lastAbsensi = p.AbsensiPkl?.[0];
                const isExpanded = expandedRows[p.id];
                const needsVerification = lastAbsensi && !lastAbsensi.is_verified;

                return (
                  <div key={p.id || idx} className={`group relative bg-white dark:bg-slate-900/40 rounded-xl border transition-all duration-500 overflow-hidden w-full ${
                    isExpanded 
                      ? 'border-indigo-200 dark:border-indigo-900/50 shadow-lg shadow-indigo-500/5' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'
                  }`}>
                    {/* Compact Header (Always Visible) */}
                    <div className="flex flex-col lg:flex-row lg:items-center p-3 lg:p-3.5 gap-4 lg:gap-10 w-full">
                      {/* Student Info Group */}
                      <SiswaIdentityCell
                        foto={p.Siswa?.foto}
                        nama={p.Siswa?.nama_siswa || p.Siswa?.full_name}
                        nis={p.Siswa?.nis}
                        kelas={p.Siswa?.Kelas?.nama_kelas || 'Umum'}
                        size="sm"
                        className="lg:w-[280px] shrink-0"
                        nameClassName="uppercase text-[12px] tracking-tight"
                        showMeta={true}
                      />

                      {/* Info Grid (Partner & Status) */}
                      <div className="flex-1 flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-12 min-w-0">
                        {/* Partner Info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 w-full">
                          <div className="p-2 bg-indigo-50/50 dark:bg-slate-800/50 rounded-lg text-indigo-500 dark:text-indigo-400 shrink-0">
                            <Building2 size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">Penempatan</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-tight truncate">
                                {p.Mitra?.nama || <span className="text-slate-300 italic font-normal text-[9px]">Belum Ditempatkan</span>}
                              </p>
                              {p.status === 'SELESAI' && (
                                <span className="text-[7px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40 uppercase">
                                  Selesai
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Summary */}
                        <div className="flex items-center gap-2.5 min-w-0 shrink-0 lg:w-[220px]">
                          <div className="p-2 bg-emerald-50/50 dark:bg-slate-800/50 rounded-lg text-emerald-500 dark:text-emerald-400 shrink-0">
                            <UserCheck size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">Presensi</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {lastAbsensi ? (
                                <>
                                  <PklStatusBadge status={lastAbsensi.status || 'HADIR'} className="h-4 text-[7px] px-1.5" />
                                  {lastAbsensi.is_outside_radius && (
                                    <Badge variant="outline" className="text-[7px] py-0 px-1.5 h-4 rounded-full uppercase font-black text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/30">Dinas Luar</Badge>
                                  )}
                                </>
                              ) : (
                                <Badge variant="outline" className="text-[7px] py-0 px-1.5 h-4 rounded-full uppercase font-black text-slate-400 border-slate-200 bg-slate-50/50">BELUM ABSEN</Badge>
                              )}
                              {lastAbsensi?.is_verified && (
                                <div className="flex items-center gap-1 text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50/50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full border border-emerald-100/50">
                                  <ShieldCheck size={9} /> Verified
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Group */}
                      <div className="flex items-center justify-end gap-2 shrink-0 lg:ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRow(p.id)}
                          className={`h-8 px-3.5 rounded-lg gap-2 text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                            isExpanded 
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isExpanded ? 'Tutup' : 'Aktivitas'}
                          <div className={`p-0.5 rounded transition-all duration-500 ${isExpanded ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            <ChevronDown size={10} />
                          </div>
                        </Button>

                        {needsVerification && (
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onVerify(lastAbsensi.id); }}
                            className="h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-[0.12em] bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-none transition-all active:scale-95 gap-1.5 group/btn"
                          >
                            <ShieldCheck size={12} className="group-hover/btn:scale-110 transition-transform" /> 
                            Verifikasi
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-950/5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col lg:flex-row p-4 lg:p-5 gap-6">
                          {/* Timeline Section */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-4">
                              <div className="space-y-0.5">
                                <h5 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                  <Clock size={12} className="text-indigo-500" /> Jurnal & Riwayat
                                </h5>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Monitoring harian real-time</p>
                              </div>
                              {lastAbsensi && (
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                    {format(parseISO(lastAbsensi.tanggal), 'EEEE, dd MMMM yyyy', { locale: localeID })}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="bg-white dark:bg-slate-900/80 p-4 lg:p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner relative overflow-hidden group/timeline">
                              {lastAbsensi ? (
                                renderDailyTimeline(lastAbsensi)
                              ) : (
                                <div className="py-10 flex flex-col items-center justify-center text-slate-300">
                                  <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                                    <Clock size={24} className="opacity-20" />
                                  </div>
                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-center">Data belum tersedia</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Interaction Section */}
                          <div className="lg:w-[300px] space-y-4">
                            <div className="space-y-0.5">
                              <h5 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                <Edit size={12} className="text-indigo-500" /> Instruksi
                              </h5>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Feedback jurnal</p>
                            </div>
                            
                            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Feedback</p>
                                  <Badge variant="outline" className="text-[7px] font-black text-indigo-500 border-indigo-100 bg-indigo-50/30 px-1 h-4">Quick Note</Badge>
                                </div>
                                <div className="relative group/input">
                                  <textarea 
                                    id={`feedback-jurnal-${lastAbsensi?.id}`}
                                    aria-label="Feedback jurnal"
                                    placeholder="Feedback jurnal..."
                                    value={quickAddTexts[lastAbsensi?.id || ''] || ''}
                                    onChange={(e) => setQuickAddTexts(prev => ({ ...prev, [lastAbsensi?.id || '']: e.target.value }))}
                                    className="w-full p-3 h-24 rounded-lg border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all resize-none outline-none shadow-inner"
                                  />
                                </div>
                                <Button 
                                  size="sm"
                                  disabled={!lastAbsensi || !quickAddTexts[lastAbsensi?.id || '']?.trim()}
                                  onClick={() => {
                                    onQuickAddForId(lastAbsensi, quickAddTexts[lastAbsensi.id]);
                                    setQuickAddTexts(prev => ({ ...prev, [lastAbsensi.id]: '' }));
                                  }}
                                  className="w-full h-9 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 hover:bg-black text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                                >
                                  Kirim Feedback <ArrowRight size={12} />
                                </Button>
                              </div>

                              <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => lastAbsensi && onEditLogbook(lastAbsensi)}
                                  className="w-full h-9 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100"
                                >
                                  <ExternalLink size={12} /> Editor Penuh
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Status Indicator (Left Border Style) */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500 ${
                      needsVerification ? 'bg-amber-500' : isExpanded ? 'bg-indigo-600' : 'bg-transparent'
                    }`} />
                  </div>
                );
              })}

              {/* Standardized Premium Pagination Footer */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl mt-6">
                  <div className="flex items-center gap-4">
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{totalItems}</span> Siswa
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="presensi-limit-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Limit:</label>
                      <select 
                        id="presensi-limit-select"
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-2xs"
                      >
                        {[10, 25, 50, 100].map(limit => (
                          <option key={limit} value={limit}>{limit} / hal</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 border border-slate-200/80 dark:border-slate-800 rounded-xl p-0.5 bg-white dark:bg-slate-900 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage <= 1}
                      aria-label="Halaman Sebelumnya"
                      className="h-6 px-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                    >
                      Prev
                    </button>
                    <div className="px-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-900/40" aria-current="page">
                      {currentPage} / {totalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      aria-label="Halaman Selanjutnya"
                      className="h-6 px-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
});
