import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import {
  FileText,
  Printer,
  Award,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  Search,
  Filter,
  GraduationCap,
  Building2,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button, Input, SearchableSelect } from '@/components/ui';
import { HubCard } from '@/components/ui/hub';
import { ScoreRow } from './types';
import { PklSidangCetakModal, PklDocType } from './PklSidangCetakModal';
import { useJurusanOptions } from '@/hooks/useJurusanOptions';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';

export interface PklMonitoringSidangTabProps {
  scores: ScoreRow[];
  totalRawScores: number;
  isLoadingRekap: boolean;
  selectedTp: string;
  selectedSemester: string;
  tpOptions: { value: string; label: string }[];
  semesterOptions: { value: string; label: string }[];
  isKaprog: boolean;
  canManageAll: boolean;
  isHubin: boolean;
  jurusanId?: string;
  jurusanNama?: string;
  activeGuruId?: string;
  isMobile: boolean;
  smartClassOptions: { value: string; label: string }[];
  selectedKelas?: string;
  setSelectedKelas?: (kelasId: string) => void;
  onNavigateCetakRapor?: () => void;
}

export const PklMonitoringSidangTab: React.FC<PklMonitoringSidangTabProps> = React.memo(({
  scores,
  totalRawScores,
  isLoadingRekap,
  selectedTp,
  selectedSemester,
  tpOptions,
  semesterOptions,
  isKaprog,
  canManageAll,
  isHubin,
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  activeGuruId,
  isMobile,
  smartClassOptions,
  selectedKelas: propSelectedKelas,
  setSelectedKelas: propSetSelectedKelas,
  onNavigateCetakRapor,
}) => {
  const { options: jurusanOptions, rawList: rawJurusanList } = useJurusanOptions();

  // ───────────────────────────────────────────────────────────────────────────
  // 1. FILTER BERKAS & SCOPE BERTINGKAT
  // ───────────────────────────────────────────────────────────────────────────
  // Level 1: Scope Jurusan (Kaprog terkunci ke jurusannya; Waka Hubin dapat pilih 'ALL' atau per Jurusan)
  const [selectedJurusan, setSelectedJurusan] = useState<string>(() => {
    if (propJurusanId) return propJurusanId;
    return 'ALL';
  });

  // Level 2: Scope Penguji (Semua atau Penguji Tertentu)
  const [selectedPenguji, setSelectedPenguji] = useState<string>('ALL');

  // Level 3: Filter Kelas (Sinkron dengan prop jika ada)
  const [internalKelas, setInternalKelas] = useState<string>('');
  const activeSelectedKelas = propSelectedKelas !== undefined ? propSelectedKelas : internalKelas;
  const handleKelasChange = useCallback((k: string) => {
    if (propSetSelectedKelas) propSetSelectedKelas(k);
    else setInternalKelas(k);
  }, [propSetSelectedKelas]);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LENGKAP' | 'BELUM' | 'TTD_SUDAH' | 'TTD_BELUM'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Paginasi
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Modal Cetak Berkas Resmi
  const [showCetakModal, setShowCetakModal] = useState<boolean>(false);
  const [cetakDocType, setCetakDocType] = useState<PklDocType>('BERITA_ACARA');
  const [targetPengujiNama, setTargetPengujiNama] = useState<string>('');

  // Sinkronisasi propJurusanId jika berubah dari luar (khusus mode Kaprog)
  React.useEffect(() => {
    if (propJurusanId) {
      setSelectedJurusan(propJurusanId);
    }
  }, [propJurusanId]);

  // Reset pagination on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedJurusan, selectedPenguji, activeSelectedKelas, statusFilter, deferredSearchQuery]);

  // Label TP dan Semester aktif (Pure memoized lookup)
  const selectedTpNama = useMemo(() => {
    return tpOptions.find((t) => t.value === selectedTp)?.label || '';
  }, [tpOptions, selectedTp]);

  const selectedSemesterNama = useMemo(() => {
    return semesterOptions.find((s) => s.value === selectedSemester)?.label || '';
  }, [semesterOptions, selectedSemester]);

  // Jurusan Terpilih Object (Single lookup)
  const activeJurusanObj = useMemo(() => {
    if (selectedJurusan === 'ALL') return null;
    return rawJurusanList.find((j) => j.id === selectedJurusan) || null;
  }, [selectedJurusan, rawJurusanList]);

  const activeJurusanNama = useMemo(() => {
    if (activeJurusanObj) {
      const nama = activeJurusanObj.nama || (activeJurusanObj as any).nama_jurusan || '';
      const kode = activeJurusanObj.singkatan || activeJurusanObj.kode || '';
      return `${nama}${kode ? ` (${kode})` : ''}`;
    }
    if (propJurusanNama && propJurusanNama !== 'Semua Program Keahlian') {
      return propJurusanNama;
    }
    return 'Semua Program Keahlian';
  }, [activeJurusanObj, propJurusanNama]);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. FILTERING DATA SECARA BERJENJANG (HIERARCHICAL SCOPE ENGINE - O(N))
  // ───────────────────────────────────────────────────────────────────────────

  // Tahap A: Filter Jurusan (Pre-compiled pattern matching for zero iteration overhead)
  const targetJurusanSingkatan = useMemo(() => {
    if (selectedJurusan === 'ALL') return '';
    const j = rawJurusanList.find((item) => item.id === selectedJurusan);
    return (j?.singkatan || j?.kode || '').toLowerCase();
  }, [selectedJurusan, rawJurusanList]);

  const jurusanFilteredScores = useMemo(() => {
    if (selectedJurusan === 'ALL') return scores;

    return scores.filter((s) => {
      if (s.jurusan_id === selectedJurusan) return true;
      if (targetJurusanSingkatan) {
        if (s.singkatan_jurusan && s.singkatan_jurusan.toLowerCase() === targetJurusanSingkatan) return true;
        if (s.nama_kelas && s.nama_kelas.toLowerCase().includes(targetJurusanSingkatan)) return true;
      }
      return false;
    });
  }, [scores, selectedJurusan, targetJurusanSingkatan]);

  // Ekstraksi Daftar Penguji Unik dari Jurusan yang terpilih (O(N) Map Pass)
  const pengujiSummaryList = useMemo(() => {
    const map = new Map<string, {
      nama: string;
      id?: string | null;
      totalSiswa: number;
      sudahDinilai: number;
      belumDinilai: number;
      sudahTtd: number;
      totalNilai: number;
    }>();

    for (let i = 0; i < jurusanFilteredScores.length; i++) {
      const s = jurusanFilteredScores[i];
      const nama = s.penguji_nama ? s.penguji_nama.trim() : 'Belum Diploting';
      let existing = map.get(nama);
      if (!existing) {
        existing = {
          nama,
          id: s.penguji_id,
          totalSiswa: 0,
          sudahDinilai: 0,
          belumDinilai: 0,
          sudahTtd: 0,
          totalNilai: 0,
        };
        map.set(nama, existing);
      }

      existing.totalSiswa += 1;

      const hasScore = s.nilai_sidang !== null && s.nilai_sidang !== undefined && s.nilai_sidang !== '';
      if (hasScore) {
        existing.sudahDinilai += 1;
        existing.totalNilai += Number(s.nilai_sidang) || 0;
      } else {
        existing.belumDinilai += 1;
      }

      if (s.ttd_siswa) {
        existing.sudahTtd += 1;
      }
    }

    return Array.from(map.values()).map((p) => {
      const persentase = p.totalSiswa > 0 ? Math.round((p.sudahDinilai / p.totalSiswa) * 100) : 0;
      const avgNilai = p.sudahDinilai > 0 ? (p.totalNilai / p.sudahDinilai).toFixed(1) : '-';
      return {
        ...p,
        persentase,
        avgNilai,
        isComplete: p.totalSiswa > 0 && p.sudahDinilai === p.totalSiswa,
      };
    }).sort((a, b) => {
      if (a.nama === 'Belum Diploting') return 1;
      if (b.nama === 'Belum Diploting') return -1;
      return a.nama.localeCompare(b.nama);
    });
  }, [jurusanFilteredScores]);

  // Options Penguji untuk Dropdown
  const pengujiDropdownOptions = useMemo(() => {
    const opts = [
      { value: 'ALL', label: `👥 Semua Guru Penguji (${pengujiSummaryList.length} Penguji)` },
    ];
    for (let i = 0; i < pengujiSummaryList.length; i++) {
      const p = pengujiSummaryList[i];
      opts.push({
        value: p.nama,
        label: `${p.nama} (${p.sudahDinilai}/${p.totalSiswa} Siswa ${p.isComplete ? '✓' : ''})`,
      });
    }
    return opts;
  }, [pengujiSummaryList]);

  // Options Jurusan untuk Dropdown
  const jurusanDropdownOptions = useMemo(() => {
    return [
      { value: 'ALL', label: '🏢 Semua Program Keahlian (Tingkat Sekolah)' },
      ...jurusanOptions,
    ];
  }, [jurusanOptions]);

  // Tahap B: Filter Lengkap dengan Deferred Query (Mencegah input lag pada keyboard)
  const fullyFilteredScores = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();

    return jurusanFilteredScores.filter((s) => {
      // Filter Penguji
      if (selectedPenguji !== 'ALL') {
        const pNama = s.penguji_nama ? s.penguji_nama.trim() : 'Belum Diploting';
        if (pNama !== selectedPenguji) return false;
      }

      // Filter Kelas
      if (activeSelectedKelas && s.kelas_id !== activeSelectedKelas && s.nama_kelas !== activeSelectedKelas) {
        return false;
      }

      // Filter Status Nilai & Presensi
      const hasScore = s.nilai_sidang !== null && s.nilai_sidang !== undefined && s.nilai_sidang !== '';
      if (statusFilter === 'LENGKAP' && !hasScore) return false;
      if (statusFilter === 'BELUM' && hasScore) return false;
      if (statusFilter === 'TTD_SUDAH' && !s.ttd_siswa) return false;
      if (statusFilter === 'TTD_BELUM' && Boolean(s.ttd_siswa)) return false;

      // Filter Search
      if (q) {
        const matchNama = s.nama_siswa?.toLowerCase().includes(q);
        const matchNis = s.nis?.toLowerCase().includes(q);
        const matchKelas = s.nama_kelas?.toLowerCase().includes(q);
        const matchMitra = s.mitra_nama?.toLowerCase().includes(q);
        const matchPenguji = s.penguji_nama?.toLowerCase().includes(q);
        if (!matchNama && !matchNis && !matchKelas && !matchMitra && !matchPenguji) return false;
      }

      return true;
    });
  }, [jurusanFilteredScores, selectedPenguji, activeSelectedKelas, statusFilter, deferredSearchQuery]);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. STATISTIK KPI EKSEKUTIF (EXECUTIVE SUMMARY)
  // ───────────────────────────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const list = fullyFilteredScores;
    const total = list.length;
    let lengkap = 0;
    let belum = 0;
    let sudahTtd = 0;
    let belumTtd = 0;
    let totalScore = 0;
    let lulusCount = 0;

    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const hasScore = s.nilai_sidang !== null && s.nilai_sidang !== undefined && s.nilai_sidang !== '';
      if (hasScore) {
        lengkap += 1;
        const val = Number(s.nilai_sidang) || 0;
        totalScore += val;
        if (val >= 70) lulusCount += 1;
      } else {
        belum += 1;
      }

      if (s.ttd_siswa) sudahTtd += 1;
      else belumTtd += 1;
    }

    const persentase = total > 0 ? Math.round((lengkap / total) * 100) : 0;
    const avgScore = lengkap > 0 ? (totalScore / lengkap).toFixed(1) : '-';
    const ttdPersentase = total > 0 ? Math.round((sudahTtd / total) * 100) : 0;

    return {
      total,
      lengkap,
      belum,
      sudahTtd,
      belumTtd,
      persentase,
      avgScore,
      lulusCount,
      ttdPersentase,
    };
  }, [fullyFilteredScores]);

  // Paginasi Data Siswa
  const totalPages = Math.max(1, Math.ceil(fullyFilteredScores.length / itemsPerPage));
  const paginatedScores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return fullyFilteredScores.slice(start, start + itemsPerPage);
  }, [fullyFilteredScores, currentPage, itemsPerPage]);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. HANDLER CETAK DOKUMEN RESMI (TRUE WYSIWYG VIA PklSidangCetakModal)
  // ───────────────────────────────────────────────────────────────────────────
  const handleOpenCetak = useCallback((type: PklDocType, specificPenguji?: string) => {
    setCetakDocType(type);
    setTargetPengujiNama(specificPenguji || (selectedPenguji !== 'ALL' ? selectedPenguji : ''));
    setShowCetakModal(true);
  }, [selectedPenguji]);

  // Resolusi data siswa spesifik untuk Modal Cetak (Akurat per Penguji / Jurusan)
  const modalScores = useMemo(() => {
    if (targetPengujiNama) {
      // Jika cetak spesifik penguji dari matriks kartu, ambil seluruh siswa penguji tersebut di jurusan aktif
      return jurusanFilteredScores.filter((s) => s.penguji_nama === targetPengujiNama);
    }
    return fullyFilteredScores;
  }, [targetPengujiNama, jurusanFilteredScores, fullyFilteredScores]);

  // Deskripsi Scope Cetak Aktif
  const activeScopeDescription = useMemo(() => {
    const scopePenguji = selectedPenguji !== 'ALL' ? `Penguji: ${selectedPenguji}` : 'Semua Penguji';
    const scopeJurusan = selectedJurusan !== 'ALL' ? activeJurusanNama : 'Seluruh Sekolah';
    return `${scopeJurusan} • ${scopePenguji} (${fullyFilteredScores.length} Siswa)`;
  }, [selectedPenguji, selectedJurusan, activeJurusanNama, fullyFilteredScores.length]);

  return (
    <div className="space-y-4">
      {/* ── Banner Informasi Mode Monitoring & Pelaporan ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-indigo-50/90 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Monitoring &amp; Pelaporan Sidang PKL</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {isKaprog ? 'Scope Jurusan' : 'Executive Hubin'}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Pantau progres kelulusan sidang, audit nilai penguji, verifikasi presensi tanda tangan, dan cetak Berita Acara &amp; Daftar Hadir resmi institusi.
            </p>
          </div>
        </div>

        {/* Action Group: Cetak Berkas Cepat */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenCetak('BERITA_ACARA')}
            disabled={fullyFilteredScores.length === 0}
            className="border-indigo-300 dark:border-indigo-750 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-8 px-3 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Cetak Berita Acara Pelaksanaan Sidang PKL resmi"
          >
            <FileText size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Berita Acara</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenCetak('DAFTAR_HADIR')}
            disabled={fullyFilteredScores.length === 0}
            className="border-emerald-300 dark:border-emerald-750 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-8 px-3 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Cetak Lembar Presensi / Daftar Hadir Peserta Sidang PKL"
          >
            <UserCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Daftar Hadir</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenCetak(selectedPenguji !== 'ALL' ? 'REKAP_PENGUJI' : 'REKAP_JURUSAN')}
            disabled={fullyFilteredScores.length === 0}
            className="border-amber-300 dark:border-amber-750 text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-8 px-3 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Cetak Rekapitulasi Nilai Sidang 4 Aspek"
          >
            <Award size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Rekap Nilai</span>
          </Button>

          {onNavigateCetakRapor && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNavigateCetakRapor}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs h-8 px-3 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Buka Lembar Cetak Rapor &amp; Sertifikat PKL"
            >
              <Printer size={13} className="text-slate-500 shrink-0" />
              <span>Rapor PKL</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Strip Ringkasan Real-Time (Shopee-Grade Clean KPI) ── */}
      <HubCard noPadding className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800/80 py-2 sm:py-3 text-center">
          {/* Total Siswa dalam Scope */}
          <div className="px-2 min-w-0">
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
              {kpiStats.total}
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Peserta Sidang ({selectedPenguji !== 'ALL' ? 'Penguji Ini' : (selectedJurusan !== 'ALL' ? 'Jurusan' : 'Sekolah')})
            </div>
          </div>

          {/* Sudah Diuji / Dinilai */}
          <div className="px-2 min-w-0">
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
              {kpiStats.lengkap}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                ({kpiStats.persentase}%)
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Sudah Diuji (Rata-rata: {kpiStats.avgScore})
            </div>
          </div>

          {/* Belum Diuji / Nilai Tertunda */}
          <div className="px-2 min-w-0">
            <div className={cn(
              "text-base sm:text-lg font-black leading-none",
              kpiStats.belum > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
            )}>
              {kpiStats.belum}
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Menunggu Nilai Penguji
            </div>
          </div>

          {/* Status Presensi Tanda Tangan */}
          <div className="px-2 min-w-0">
            <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {kpiStats.sudahTtd}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                ({kpiStats.ttdPersentase}%)
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              Presensi TTD Digital
            </div>
          </div>
        </div>
      </HubCard>

      {/* ── Toolbar Filter Scope Bertingkat ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Dropdown Jurusan & Penguji */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
            {/* Level 1: Scope Jurusan */}
            <div className="min-w-[200px] sm:max-w-[260px] flex-1">
              {isKaprog && propJurusanId ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-bold h-9">
                  <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">{activeJurusanNama}</span>
                </div>
              ) : (
                <SearchableSelect
                  value={selectedJurusan}
                  onChange={(val) => {
                    setSelectedJurusan(val);
                    setSelectedPenguji('ALL'); // Reset penguji jika ganti jurusan
                  }}
                  options={jurusanDropdownOptions}
                  placeholder="Pilih Jurusan..."
                  className="w-full text-xs"
                />
              )}
            </div>

            {/* Level 2: Scope Penguji */}
            <div className="min-w-[220px] sm:max-w-[300px] flex-1">
              <SearchableSelect
                value={selectedPenguji}
                onChange={(val) => setSelectedPenguji(val)}
                options={pengujiDropdownOptions}
                placeholder="Pilih Penguji Sidang..."
                className="w-full text-xs"
              />
            </div>

            {/* Level 3: Filter Kelas */}
            <div className="min-w-[150px] sm:max-w-[200px]">
              <SearchableSelect
                value={activeSelectedKelas}
                onChange={handleKelasChange}
                options={[
                  { value: '', label: '-- Semua Kelas --' },
                  ...smartClassOptions,
                ]}
                placeholder="Semua Kelas..."
                className="w-full text-xs"
              />
            </div>
          </div>

          {/* Search Box with Deferred Value */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari siswa / NIS / mitra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Baris Filter Status Quick Pills & Info Scope Target Cetak */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={11} />
              <span>Status:</span>
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer",
                statusFilter === 'ALL'
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              Semua ({jurusanFilteredScores.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('LENGKAP')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1",
                statusFilter === 'LENGKAP'
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
              )}
            >
              <Check size={11} />
              <span>Sudah Dinilai</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('BELUM')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1",
                statusFilter === 'BELUM'
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
              )}
            >
              <Clock size={11} />
              <span>Belum Dinilai</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('TTD_SUDAH')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1",
                statusFilter === 'TTD_SUDAH'
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
              )}
            >
              <UserCheck size={11} />
              <span>Presensi Lengkap</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Target Dokumen:</span>{' '}
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{activeScopeDescription}</span>
          </div>
        </div>
      </div>

      {/* ── Matriks Progres per Penguji (Penguji Progress Matrix) ── */}
      <HubCard
        title={
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Progres per Guru Penguji Sidang ({pengujiSummaryList.length} Penguji)
            </span>
          </div>
        }
        subtitle="Pantau beban uji masing-masing penguji dan cetak dokumen resmi spesifik per meja penguji"
        noPadding
      >
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pengujiSummaryList.map((penguji) => {
              const isSelected = selectedPenguji === penguji.nama;
              return (
                <div
                  key={penguji.nama}
                  className={cn(
                    "p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5",
                    isSelected
                      ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-2xs"
                      : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-indigo-200"
                  )}
                >
                  {/* Info Header Penguji */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate" title={penguji.nama}>
                          {penguji.nama}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {penguji.sudahDinilai} dari {penguji.totalSiswa} siswa dinilai
                        </div>
                      </div>

                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                        penguji.isComplete
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                          : penguji.sudahDinilai > 0
                          ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      )}>
                        {penguji.persentase}% Selesai
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          penguji.isComplete ? "bg-emerald-500" : "bg-indigo-600"
                        )}
                        style={{ width: `${penguji.persentase}%` }}
                      />
                    </div>

                    {/* Mini Stats: Rata-rata & Presensi */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                      <span>Rata-rata: <strong className="text-slate-700 dark:text-slate-200">{penguji.avgNilai}</strong></span>
                      <span>Presensi TTD: <strong className="text-slate-700 dark:text-slate-200">{penguji.sudahTtd}/{penguji.totalSiswa}</strong></span>
                    </div>
                  </div>

                  {/* Quick Action Buttons per Penguji */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-750 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedPenguji(isSelected ? 'ALL' : penguji.nama)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer",
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      )}
                    >
                      {isSelected ? '✓ Terpilih' : 'Filter Siswa'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCetak('BERITA_ACARA', penguji.nama)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1"
                      title={`Cetak Berita Acara untuk ${penguji.nama}`}
                    >
                      <FileText size={10} />
                      <span>Berita Acara</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCetak('DAFTAR_HADIR', penguji.nama)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                      title={`Cetak Daftar Hadir untuk ${penguji.nama}`}
                    >
                      <UserCheck size={10} />
                      <span>Daftar Hadir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCetak('REKAP_PENGUJI', penguji.nama)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
                      title={`Cetak Rekap Nilai untuk ${penguji.nama}`}
                    >
                      <Award size={10} />
                      <span>Rekap</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </HubCard>

      {/* ── Tabel Detail Peserta Sidang PKL (Audit List) ── */}
      <HubCard
        title={
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Daftar Peserta Sidang PKL ({fullyFilteredScores.length} Siswa)
            </span>
          </div>
        }
        subtitle="Rincian 4 aspek nilai sidang, nilai akhir ujian, dan status presensi bertanda tangan siswa"
        noPadding
      >
        {fullyFilteredScores.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Tidak ada siswa sidang yang sesuai dengan filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Siswa &amp; Kelas</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Mitra DUDI</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Penguji Sidang</th>
                  <th className="py-2.5 px-2 text-center w-16" title="Sistematika Laporan">Laporan</th>
                  <th className="py-2.5 px-2 text-center w-16" title="Penguasaan Materi">Materi</th>
                  <th className="py-2.5 px-2 text-center w-16" title="Presentasi / Tanya Jawab">Tanya Jwb</th>
                  <th className="py-2.5 px-2 text-center w-16" title="Sikap & Etika">Sikap</th>
                  <th className="py-2.5 px-2 text-center w-20 bg-indigo-50/50 dark:bg-indigo-950/20">Nilai Akhir</th>
                  <th className="py-2.5 px-3 text-center w-28">Status Kelulusan</th>
                  <th className="py-2.5 px-3 text-center w-28">Presensi TTD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedScores.map((score, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const hasScore = score.nilai_sidang !== null && score.nilai_sidang !== undefined && score.nilai_sidang !== '';
                  const numScore = Number(score.nilai_sidang) || 0;
                  const isPassed = numScore >= 70;

                  return (
                    <tr
                      key={score.siswa_pkl_id || idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {globalIdx}
                      </td>

                      {/* Identitas Siswa */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {score.nama_siswa}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span>NIS: {score.nis || '-'}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {score.nama_kelas || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Mitra DUDI */}
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[180px]" title={score.mitra_nama}>
                          {score.mitra_nama || '-'}
                        </div>
                      </td>

                      {/* Penguji */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={score.penguji_nama}>
                          {score.penguji_nama || <span className="text-amber-500 italic">Belum Diploting</span>}
                        </div>
                      </td>

                      {/* 4 Aspek Nilai */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                        {score.sidang_portofolio ?? '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                        {score.sidang_materi ?? '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                        {score.sidang_komunikasi ?? '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                        {score.sidang_sikap ?? '-'}
                      </td>

                      {/* Nilai Akhir Sidang */}
                      <td className="py-2.5 px-2 text-center font-bold font-mono text-xs bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                        {hasScore ? numScore : '-'}
                      </td>

                      {/* Status Kelulusan */}
                      <td className="py-2.5 px-3 text-center">
                        {hasScore ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold inline-block",
                            isPassed
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                          )}>
                            {isPassed ? 'Lulus Sidang' : 'Perlu Revisi'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-750 text-slate-500 inline-block">
                            Belum Ujian
                          </span>
                        )}
                      </td>

                      {/* Status Presensi Siswa */}
                      <td className="py-2.5 px-3 text-center">
                        {score.ttd_siswa ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                            <Check size={11} />
                            <span>Sudah TTD</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                            <Clock size={11} />
                            <span>Belum TTD</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginasi Footer */}
        {fullyFilteredScores.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span>Menampilkan</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>dari <strong>{fullyFilteredScores.length}</strong> siswa</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2.5 text-xs font-bold cursor-pointer"
              >
                Prev
              </Button>
              <span className="px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Hal {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2.5 text-xs font-bold cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </HubCard>

      {/* ── Modal Cetak Berita Acara, Daftar Hadir, & Rekap Nilai (DRY Reuse PklSidangCetakModal) ── */}
      {showCetakModal && (
        <PklSidangCetakModal
          isOpen={showCetakModal}
          onClose={() => setShowCetakModal(false)}
          initialDocType={cetakDocType}
          scores={modalScores}
          jurusanId={selectedJurusan !== 'ALL' ? selectedJurusan : propJurusanId}
          jurusanNama={selectedJurusan !== 'ALL' ? activeJurusanNama : propJurusanNama}
          selectedTpNama={selectedTpNama}
          selectedSemesterNama={selectedSemesterNama}
          activePengujiNama={targetPengujiNama || (selectedPenguji !== 'ALL' ? selectedPenguji : '')}
          isKaprog={isKaprog}
        />
      )}
    </div>
  );
});

PklMonitoringSidangTab.displayName = 'PklMonitoringSidangTab';
export default PklMonitoringSidangTab;
