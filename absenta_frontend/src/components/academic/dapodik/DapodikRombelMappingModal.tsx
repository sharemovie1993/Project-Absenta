/**
 * DapodikRombelMappingModal.tsx
 * Modal Wizard Pemetaan Rombel Dapodik ke Kelas Platform Absenta
 * Lengkap dengan Pengikatan Konteks Akademik Resmi (Tahun Pelajaran & Semester)
 * Standar Industri: Shopee-Grade Zero-Noise, High-Density Mapping Interface & Smart Auto-Matcher.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  School,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  Users,
  Check,
  RefreshCw,
  Info,
  ShieldCheck,
  Layers,
  Calendar,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { Modal, Button, Badge, Loader, Input } from '@/components/ui';
import {
  getKelasForDropdown,
  getTahunPelajaranForDropdown,
  getSemesterForDropdown,
} from '@/api/dropdown.api';
import type { ReconciledStudent } from '@/api/dapodik.api';

export interface DapodikRombelMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: ReconciledStudent[];
  onConfirmImport: (
    studentsWithKelas: {
      nisn?: string;
      nik?: string;
      nis?: string;
      nama: string;
      jenis_kelamin: string;
      tempat_lahir?: string;
      tanggal_lahir?: string;
      rombel?: string;
      kelas_id?: string;
      jurusan_id?: string;
      tahun_pelajaran_id?: string;
      semester_id?: string;
    }[],
    academicContext: {
      tahun_pelajaran_id?: string;
      semester_id?: string;
    }
  ) => void;
  isSubmitting?: boolean;
}

interface RombelGroup {
  dapodikRombel: string;
  studentCount: number;
  students: ReconciledStudent[];
}

// Normalizer untuk auto-matching cerdas
const cleanName = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeRoman = (s: string) => {
  return (s || '')
    .replace(/^10\b/i, 'X')
    .replace(/^11\b/i, 'XI')
    .replace(/^12\b/i, 'XII')
    .replace(/^kelas\s+/i, '');
};

export const DapodikRombelMappingModal: React.FC<DapodikRombelMappingModalProps> = ({
  isOpen,
  onClose,
  students,
  onConfirmImport,
  isSubmitting = false,
}) => {
  // 1. Fetch Data Master Akademik untuk Pemetaan
  const { data: kelasOptions = [], isLoading: isLoadingKelas } = useQuery({
    queryKey: ['dropdown-kelas-all'],
    queryFn: getKelasForDropdown,
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  });

  const { data: tpOptions = [], isLoading: isLoadingTp } = useQuery({
    queryKey: ['dropdown-tp-all'],
    queryFn: getTahunPelajaranForDropdown,
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });

  const { data: semOptions = [], isLoading: isLoadingSem } = useQuery({
    queryKey: ['dropdown-semester-all'],
    queryFn: getSemesterForDropdown,
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  });

  // 2. State Konteks Akademik & Pemetaan Rombel
  const [selectedTpId, setSelectedTpId] = useState<string>('');
  const [selectedSemId, setSelectedSemId] = useState<string>('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStep, setActiveStep] = useState<'map' | 'review'>('map');

  // Auto-select Tahun Pelajaran Aktif
  useEffect(() => {
    if (tpOptions.length > 0 && !selectedTpId) {
      const active = tpOptions.find((t) => t.label.includes('(Aktif)')) || tpOptions[0];
      if (active) setSelectedTpId(String(active.value));
    }
  }, [tpOptions, selectedTpId]);

  // Auto-select Semester Aktif
  useEffect(() => {
    if (semOptions.length > 0 && !selectedSemId) {
      const active = semOptions.find((s) => s.label.includes('(Aktif)')) || semOptions[0];
      if (active) setSelectedSemId(String(active.value));
    }
  }, [semOptions, selectedSemId]);

  // 3. Kelompokkan Siswa Terpilih Berdasarkan Rombel Dapodik
  const rombelGroups = useMemo<RombelGroup[]>(() => {
    const map = new Map<string, ReconciledStudent[]>();

    for (const s of students) {
      const rombelName = (
        s.rombel ||
        s.dapodikRaw?.nama_rombel ||
        s.dapodikRaw?.rombongan_belajar?.nama ||
        'Tanpa Rombel'
      ).trim();

      if (!map.has(rombelName)) {
        map.set(rombelName, []);
      }
      map.get(rombelName)!.push(s);
    }

    return Array.from(map.entries())
      .map(([dapodikRombel, list]) => ({
        dapodikRombel,
        studentCount: list.length,
        students: list,
      }))
      .sort((a, b) => {
        if (a.dapodikRombel === 'Tanpa Rombel') return 1;
        if (b.dapodikRombel === 'Tanpa Rombel') return -1;
        return a.dapodikRombel.localeCompare(b.dapodikRombel);
      });
  }, [students]);

  // 4. Smart Auto-Matcher Engine
  const executeAutoMatch = (groups: RombelGroup[], classes: typeof kelasOptions) => {
    const newMapping: Record<string, string> = {};

    for (const g of groups) {
      const rName = g.dapodikRombel;
      if (!rName || rName === 'Tanpa Rombel') {
        newMapping[rName] = '';
        continue;
      }

      const cDap = cleanName(rName);
      const cDapRoman = cleanName(normalizeRoman(rName));

      // Prioritas 1: Exact string / normalized string match (e.g. "XII KUL 2" -> "XII KUL 2")
      const exact = classes.find((k) => {
        const cK = cleanName((k as any).nama_kelas || k.label || '');
        return cK === cDap || cK === cDapRoman;
      });

      if (exact) {
        newMapping[rName] = String(exact.value);
        continue;
      }

      // Prioritas 2: Multi-token inclusion (e.g. "X TKRO 1" matches "X-TKRO-1")
      const tokens = rName.toUpperCase().split(/[\s-_]+/).filter(Boolean);
      if (tokens.length >= 2) {
        const tokenMatch = classes.find((k) => {
          const kStr = ((k as any).nama_kelas || k.label || '').toUpperCase();
          return tokens.every((tok) => kStr.includes(tok));
        });
        if (tokenMatch) {
          newMapping[rName] = String(tokenMatch.value);
          continue;
        }
      }

      newMapping[rName] = '';
    }

    return newMapping;
  };

  // Inisialisasi Auto-Match saat Modal Dibuka & Kelas Siap
  useEffect(() => {
    if (isOpen && kelasOptions.length > 0 && rombelGroups.length > 0) {
      const autoMatched = executeAutoMatch(rombelGroups, kelasOptions);
      setMapping(autoMatched);
      setActiveStep('map');
      setSearchQuery('');
    }
  }, [isOpen, kelasOptions, rombelGroups]);

  // Handler Ganti Pemetaan Manual per Rombel
  const handleSelectKelas = (dapodikRombel: string, kelasId: string) => {
    setMapping((prev) => ({
      ...prev,
      [dapodikRombel]: kelasId,
    }));
  };

  // Handler Trigger Auto-Match Manual Ulang
  const handleResetAutoMatch = () => {
    const autoMatched = executeAutoMatch(rombelGroups, kelasOptions);
    setMapping(autoMatched);
    const matchedCount = Object.values(autoMatched).filter(Boolean).length;
    toast.success(`Auto-matcher diterapkan: ${matchedCount} dari ${rombelGroups.length} rombel berhasil dicocokkan!`);
  };

  // 5. Hitung Statistik Pemetaan
  const stats = useMemo(() => {
    let mappedRombelCount = 0;
    let mappedStudentsCount = 0;
    let unmappedStudentsCount = 0;

    for (const g of rombelGroups) {
      const isMapped = Boolean(mapping[g.dapodikRombel]);
      if (isMapped) {
        mappedRombelCount++;
        mappedStudentsCount += g.studentCount;
      } else {
        unmappedStudentsCount += g.studentCount;
      }
    }

    const totalRombel = rombelGroups.length;
    const matchPercentage = totalRombel > 0 ? Math.round((mappedRombelCount / totalRombel) * 100) : 0;

    return {
      totalRombel,
      mappedRombelCount,
      unmappedRombelCount: totalRombel - mappedRombelCount,
      mappedStudentsCount,
      unmappedStudentsCount,
      matchPercentage,
    };
  }, [rombelGroups, mapping]);

  // 6. Filter Rombel Groups berdasarkan Pencarian
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return rombelGroups;
    const q = searchQuery.toLowerCase().trim();
    return rombelGroups.filter((g) => {
      const matchRombel = g.dapodikRombel.toLowerCase().includes(q);
      const targetKelas = kelasOptions.find((k) => k.value === mapping[g.dapodikRombel]);
      const matchTargetKelas = targetKelas?.label?.toLowerCase().includes(q) || false;
      return matchRombel || matchTargetKelas;
    });
  }, [rombelGroups, searchQuery, mapping, kelasOptions]);

  // 7. Kelas Options Grouped by Tingkat
  const groupedClasses = useMemo(() => {
    const tingkat10 = kelasOptions.filter((k) => (k as any).tingkat === 10);
    const tingkat11 = kelasOptions.filter((k) => (k as any).tingkat === 11);
    const tingkat12 = kelasOptions.filter((k) => (k as any).tingkat === 12);
    const other = kelasOptions.filter(
      (k) => (k as any).tingkat !== 10 && (k as any).tingkat !== 11 && (k as any).tingkat !== 12
    );

    return [
      { label: 'Kelas Tingkat 10', items: tingkat10 },
      { label: 'Kelas Tingkat 11', items: tingkat11 },
      { label: 'Kelas Tingkat 12', items: tingkat12 },
      { label: 'Lainnya', items: other },
    ].filter((g) => g.items.length > 0);
  }, [kelasOptions]);

  // Nama label TP & Semester terpilih untuk display review
  const selectedTpLabel = useMemo(() => {
    return tpOptions.find((t) => t.value === selectedTpId)?.label || 'Belum dipilih';
  }, [tpOptions, selectedTpId]);

  const selectedSemLabel = useMemo(() => {
    return semOptions.find((s) => s.value === selectedSemId)?.label || 'Belum dipilih';
  }, [semOptions, selectedSemId]);

  // 8. Submit Handler: Pasangkan Setiap Siswa dengan kelas_id & Konteks Akademik
  const handleSubmit = () => {
    const payload = students.map((s) => {
      const rombelName = (
        s.rombel ||
        s.dapodikRaw?.nama_rombel ||
        s.dapodikRaw?.rombongan_belajar?.nama ||
        'Tanpa Rombel'
      ).trim();

      const targetKelasId = mapping[rombelName] || undefined;
      const targetKelas = kelasOptions.find((k) => k.value === targetKelasId);

      return {
        nisn: s.nisn || s.dapodikRaw?.nisn || undefined,
        nik: s.nik || s.dapodikRaw?.nik || undefined,
        nis: s.nis || s.dapodikRaw?.registrasi_peserta_didik?.nipd || undefined,
        nama: s.nama || s.dapodikRaw?.nama || s.dapodikRaw?.nama_siswa,
        jenis_kelamin: s.jenis_kelamin || s.dapodikRaw?.jenis_kelamin || 'L',
        tempat_lahir: s.tempat_lahir || s.dapodikRaw?.tempat_lahir || undefined,
        tanggal_lahir: s.tanggal_lahir || s.dapodikRaw?.tanggal_lahir || undefined,
        rombel: s.rombel || s.dapodikRaw?.nama_rombel || undefined,
        kelas_id: targetKelasId,
        jurusan_id: (targetKelas as any)?.jurusan_id || undefined,
        tahun_pelajaran_id: selectedTpId || undefined,
        semester_id: selectedSemId || undefined,
      };
    });

    onConfirmImport(payload, {
      tahun_pelajaran_id: selectedTpId || undefined,
      semester_id: selectedSemId || undefined,
    });
  };

  const isMasterLoading = isLoadingKelas || isLoadingTp || isLoadingSem;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <School className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Pemetaan Konteks Akademik &amp; Rombel Dapodik</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                {activeStep === 'map' ? 'Langkah 1 dari 2' : 'Langkah 2 dari 2'}
              </span>
            </h3>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {activeStep === 'map'
                ? `Tentukan tahun ajaran, semester, dan petakan rombel agar siswa langsung aktif di platform`
                : `Verifikasi ringkasan akhir penempatan periode & kelas sebelum data disimpan`}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">
        {isMasterLoading ? (
          <div className="p-12 text-center space-y-2">
            <Loader className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs text-slate-500">Memuat data master akademik platform...</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════
                BANNER STATISTIK & REKONSILIASI KELAS (HIGH DENSITY STRIP)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Siswa</div>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{students.length} Siswa</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Rombel Dapodik</div>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>{stats.totalRombel} Rombel</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50">
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                  Terpetakan
                </div>
                <div className="text-base font-extrabold text-emerald-800 dark:text-emerald-300 mt-0.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {stats.mappedRombelCount} <span className="text-xs font-normal text-emerald-600">({stats.matchPercentage}%)</span>
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50">
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
                  Tanpa Kelas
                </div>
                <div className="text-base font-extrabold text-amber-800 dark:text-amber-300 mt-0.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{stats.unmappedStudentsCount} Siswa</span>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                LANGKAH 1: KONTEKS AKADEMIK & TABEL PEMETAAN ROMBEL
            ═══════════════════════════════════════════════════════════════ */}
            {activeStep === 'map' && (
              <div className="space-y-3.5">
                {/* 1. SEKSI KONTEKS PERIODE AKADEMIK TARGET IMPORT */}
                <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-purple-50/60 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>1. Konteks Periode Akademik Target Penempatan</span>
                    </span>
                    <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Rekam SiswaAkademik
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tahun Pelajaran:
                      </label>
                      <select
                        value={selectedTpId}
                        onChange={(e) => setSelectedTpId(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs rounded-lg border font-medium bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                      >
                        {tpOptions.map((tp) => (
                          <option key={tp.value} value={tp.value}>
                            {tp.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Semester:
                      </label>
                      <select
                        value={selectedSemId}
                        onChange={(e) => setSelectedSemId(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs rounded-lg border font-medium bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                      >
                        {semOptions.map((sem) => (
                          <option key={sem.value} value={sem.value}>
                            {sem.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. SEKSI PEMETAAN ROMBEL DAPODIK KE KELAS */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                      <School className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>2. Pemetaan Rombel Dapodik ke Kelas Platform</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleResetAutoMatch}
                      className="h-7 text-[11px] gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100"
                      title="Jalankan kembali algoritma pencocokan nama otomatis"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Petakan Ulang Otomatis</span>
                    </Button>
                  </div>

                  {/* Toolbar Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Cari rombel Dapodik atau nama kelas platform..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* List Pemetaan (Scrollable High-Density List) */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredGroups.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        Tidak ada rombel yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
                      </div>
                    ) : (
                      filteredGroups.map((g) => {
                        const currentKelasId = mapping[g.dapodikRombel] || '';
                        const isMapped = Boolean(currentKelasId);

                        return (
                          <div
                            key={g.dapodikRombel}
                            className={`p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                              isMapped
                                ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                : 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60'
                            }`}
                          >
                            {/* Sisi Kiri: Rombel Dapodik */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                  {g.dapodikRombel}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {g.studentCount} Siswa
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                Contoh: {g.students.slice(0, 3).map((s) => s.nama).join(', ')}
                                {g.students.length > 3 && ` +${g.students.length - 3} lainnya`}
                              </div>
                            </div>

                            {/* Arrow Divider */}
                            <div className="hidden sm:flex items-center text-slate-300 dark:text-slate-600">
                              <ArrowRight className="w-4 h-4" />
                            </div>

                            {/* Sisi Kanan: Dropdown Pemilihan Kelas di Absenta */}
                            <div className="w-full sm:w-[260px] shrink-0 flex items-center gap-2">
                              <select
                                value={currentKelasId}
                                onChange={(e) => handleSelectKelas(g.dapodikRombel, e.target.value)}
                                className={`w-full h-8 px-2.5 text-xs rounded-lg border font-medium transition-colors focus:ring-1 focus:ring-indigo-500 focus:outline-hidden ${
                                  isMapped
                                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                                    : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                                }`}
                              >
                                <option value="">-- Jangan Petakan (Tanpa Kelas / Calon) --</option>
                                {groupedClasses.map((group) => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.items.map((k) => (
                                      <option key={k.value} value={k.value}>
                                        {(k as any).nama_kelas || k.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>

                              {/* Status Pill */}
                              {isMapped ? (
                                <span
                                  className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center shrink-0"
                                  title="Rombel berhasil dipetakan ke kelas platform"
                                >
                                  <Check className="w-3 h-3" />
                                </span>
                              ) : (
                                <span
                                  className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center shrink-0"
                                  title="Rombel belum dipetakan. Siswa akan diimpor sebagai Calon Siswa (tanpa rombel aktif)"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Siswa dengan rombel yang <strong>terpetakan</strong> akan langsung dicatat ke{' '}
                    <strong>{selectedTpLabel}</strong> ({selectedSemLabel}) serta dibuatkan akun pengguna untuk login.
                    Siswa tanpa pemetaan kelas akan disimpan sebagai <em>Calon Siswa</em> dan dapat di-rolling kemudian.
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                LANGKAH 2: VERIFIKASI RINGKASAN AKHIR SEBELUM IMPORT
            ═══════════════════════════════════════════════════════════════ */}
            {activeStep === 'review' && (
              <div className="space-y-3.5">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Konfirmasi Rencana Import Data Siswa</span>
                  </h4>

                  <div className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Tahun Pelajaran Target:</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400">{selectedTpLabel}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Semester Target:</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400">{selectedSemLabel}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Jumlah Siswa Siap Diimpor:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{students.length} Siswa</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Siswa Masuk Kelas &amp; Semester:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {stats.mappedStudentsCount} Siswa ({stats.mappedRombelCount} Rombel)
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Siswa Tanpa Kelas (Status Calon):</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {stats.unmappedStudentsCount} Siswa ({stats.unmappedRombelCount} Rombel)
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Pembuatan Akun Login Siswa:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        Otomatis (Email NISN / NIS)
                      </span>
                    </div>
                  </div>
                </div>

                {stats.unmappedStudentsCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      Terdapat <strong>{stats.unmappedStudentsCount} siswa</strong> yang belum dipetakan ke kelas.
                      Siswa-siswa ini akan diimpor tanpa alokasi rombel. Anda tetap bisa memasukkan mereka ke kelas
                      melalui menu Rombel &amp; Siswa kapan saja.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                FOOTER ACTIONS
            ═══════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              {activeStep === 'map' ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveStep('review')}
                    className="gap-1.5"
                  >
                    <span>Lanjutkan ke Konfirmasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveStep('map')}
                    disabled={isSubmitting}
                  >
                    Kembali ke Pemetaan
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengimpor Siswa...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Ya, Import Sekarang ({students.length} Siswa)</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default DapodikRombelMappingModal;
