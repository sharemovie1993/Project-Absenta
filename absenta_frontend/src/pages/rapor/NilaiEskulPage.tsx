import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Loader2,
  Sparkles,
  Lock,
  Copy,
  CheckCircle2,
  AlertCircle,
  Award,
  Users,
  Search,
  Filter,
  GraduationCap,
  Bookmark
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, SectionCard, Button, Badge, SearchableSelect } from '../../components/ui';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { AcademicContextBar } from '@/components/common/AcademicContextBar';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { useCapabilities } from '@/hooks/useCapabilities';
import {
  raporApi,
  type EskulOptionItem,
  type EskulMatrixMember
} from '../../api/rapor.api';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Zod Schema Validation Guard (Pilar 25)
const eskulGradeMatrixSchema = z.object({
  jenis_kegiatan_id: z.string().min(1, 'Ekstrakurikuler wajib dipilih'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun Pelajaran wajib dipilih'),
  semester_id: z.string().min(1, 'Semester wajib dipilih'),
  grades: z.array(
    z.object({
      siswa_id: z.string().min(1),
      predikat: z.enum(['A', 'B', 'C', 'D']),
      keterangan: z.string().max(500).optional().nullable(),
    })
  ).min(1, 'Minimal 1 data penilaian siswa'),
});

const PREDIKAT_OPTIONS: Array<{
  val: 'A' | 'B' | 'C' | 'D';
  label: string;
  badgeClass: string;
  activeClass: string;
}> = [
  {
    val: 'A',
    label: 'A (Sangat Baik)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    activeClass: 'bg-emerald-600 text-white font-black shadow-sm ring-1 ring-emerald-500',
  },
  {
    val: 'B',
    label: 'B (Baik)',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    activeClass: 'bg-indigo-600 text-white font-black shadow-sm ring-1 ring-indigo-500',
  },
  {
    val: 'C',
    label: 'C (Cukup)',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    activeClass: 'bg-amber-600 text-white font-black shadow-sm ring-1 ring-amber-500',
  },
  {
    val: 'D',
    label: 'D (Kurang)',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    activeClass: 'bg-rose-600 text-white font-black shadow-sm ring-1 ring-rose-500',
  },
];

export const NilaiEskulPage: React.FC = React.memo(() => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { can, isWaliKelas, isKurikulum, isAdmin } = useCapabilities();

  // 1. Konteks Akademik Terpusat
  const academicCtx = useAcademicContext();
  const { options: kelasOptions = [], isLoading: isLoadingKelas } = useKelasOptions();

  // 2. Akses & Role Detection
  const canManageAcademic = can('academic.manage.academic') || isKurikulum || isAdmin;

  // Role Tab Options
  type RoleTabType = 'my_eskul' | 'supervisi' | 'wali_kelas';
  const [activeRoleTab, setActiveRoleTab] = useState<RoleTabType>('my_eskul');

  // Filter Selection State
  const [selectedEskul, setSelectedEskul] = useState<string>('');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');

  // 3. Fetch Opsi Ekstrakurikuler
  const { data: eskulOptionsData, isLoading: isLoadingOptions } = useQuery({
    queryKey: ['rapor-eskul-options', academicCtx.selectedTahunPelajaran],
    queryFn: () => raporApi.getEskulOptions(),
  });

  const rawEskulOptions: EskulOptionItem[] = eskulOptionsData?.data?.eskul_options || [];
  const canSupervise = eskulOptionsData?.data?.can_supervise || canManageAcademic;
  const assignedEskulIds: string[] = eskulOptionsData?.data?.assigned_eskul_ids || [];

  // Hitung tab yang tersedia
  const roleTabs: TabOption[] = useMemo(() => {
    const list: TabOption[] = [];
    list.push({ id: 'my_eskul', label: 'Eskul Binaan Saya' });
    if (canSupervise) {
      list.push({ id: 'supervisi', label: 'Supervisi (Semua Eskul)' });
    }
    if (isWaliKelas) {
      list.push({ id: 'wali_kelas', label: 'Pantau Rombel Binaan' });
    }
    return list;
  }, [canSupervise, isWaliKelas]);

  // Filter smart eskul options berdasarkan activeRoleTab
  const smartEskulOptions = useMemo(() => {
    let source = rawEskulOptions;
    if (activeRoleTab === 'my_eskul') {
      source = rawEskulOptions.filter((e) => e.is_pembina || assignedEskulIds.includes(e.id));
    }
    return (source || []).map((e) => ({
      value: e.id,
      label: `${e.nama} (${e.total_anggota} Anggota)`,
    }));
  }, [rawEskulOptions, activeRoleTab, assignedEskulIds]);

  // Otomatis pilih eskul pertama bila belum dipilih
  useEffect(() => {
    if (!selectedEskul && smartEskulOptions.length > 0) {
      setSelectedEskul(smartEskulOptions[0].value);
    }
  }, [smartEskulOptions, selectedEskul]);

  // Opsi Kelas Filter
  const smartKelasFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'Semua Anggota (Lintas Kelas)' },
      ...(kelasOptions || []).map((k) => ({
        value: k.value,
        label: k.label,
      })),
    ];
  }, [kelasOptions]);

  // Deteksi Mode Read-Only
  const isReadOnly = useMemo(() => {
    if (academicCtx.isArchivedAcademic) return true;
    if (activeRoleTab === 'my_eskul') {
      const isAssigned = assignedEskulIds.includes(selectedEskul);
      return !isAssigned && !canSupervise;
    }
    if (activeRoleTab === 'wali_kelas') return true;
    return !canSupervise;
  }, [academicCtx.isArchivedAcademic, activeRoleTab, assignedEskulIds, selectedEskul, canSupervise]);

  const readOnlyReason = useMemo(() => {
    if (!isReadOnly) return '';
    if (academicCtx.isArchivedAcademic) {
      return 'Mode Arsip Akademik (Tutup Buku): Penyimpanan nilai dikunci untuk melindungi riwayat rapor.';
    }
    if (activeRoleTab === 'wali_kelas') {
      return 'Mode Pemantauan Wali Kelas (Hanya Baca): Nilai ekstrakurikuler diisi langsung oleh Guru Pembina Eskul masing-masing.';
    }
    if (activeRoleTab === 'supervisi') {
      return 'Mode Supervisi: Anda dapat melihat seluruh rekap nilai ekstrakurikuler.';
    }
    return 'Mode Hanya Baca: Anda tidak terdaftar sebagai guru pembina untuk kegiatan eskul terpilih.';
  }, [isReadOnly, academicCtx.isArchivedAcademic, activeRoleTab]);

  // 4. Fetch Matriks Anggota & Nilai
  const {
    data: matrixData,
    isLoading: isLoadingMatrix,
    isFetching: isFetchingMatrix,
  } = useQuery({
    queryKey: [
      'rapor-eskul-matrix',
      selectedEskul,
      academicCtx.selectedTahunPelajaran,
      academicCtx.selectedSemester,
      selectedKelasFilter,
    ],
    queryFn: () =>
      raporApi.getEskulMatrix({
        jenis_kegiatan_id: selectedEskul,
        tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
        semester_id: academicCtx.selectedSemester,
        kelas_id: selectedKelasFilter || undefined,
      }),
    enabled: Boolean(
      selectedEskul &&
        academicCtx.selectedTahunPelajaran &&
        academicCtx.selectedSemester &&
        activeRoleTab !== 'wali_kelas'
    ),
  });

  // 5. Local State Matriks Nilai untuk Pengeditan Cepat
  const [scores, setScores] = useState<EskulMatrixMember[]>([]);

  useEffect(() => {
    if (matrixData?.data?.members) {
      setScores(matrixData.data.members);
    } else {
      setScores([]);
    }
  }, [matrixData]);

  // Filtered scores by memberSearchQuery
  const displayScores = useMemo(() => {
    if (!memberSearchQuery.trim()) return scores;
    const q = memberSearchQuery.toLowerCase();
    return scores.filter(
      (s) =>
        s.nama_siswa.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.kelas_nama.toLowerCase().includes(q)
    );
  }, [scores, memberSearchQuery]);

  // Selected Eskul Metadata
  const currentEskulObj = useMemo(() => {
    return rawEskulOptions.find((e) => e.id === selectedEskul);
  }, [rawEskulOptions, selectedEskul]);

  // 6. Mutasi Penyimpanan Matriks Nilai
  const saveMatrixMutation = useMutation({
    mutationFn: raporApi.upsertMatrixNilaiEskul,
    onSuccess: (res) => {
      toast.success(res?.message || 'Nilai ekstrakurikuler berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['rapor-eskul-matrix', selectedEskul] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan nilai ekstrakurikuler');
    },
  });

  // Handler: Ubah Predikat 1 Siswa
  const handleScoreChange = useCallback(
    (siswaId: string, predikat: 'A' | 'B' | 'C' | 'D') => {
      if (isReadOnly) return;
      setScores((prev) =>
        prev.map((s) => {
          if (s.siswa_id !== siswaId) return s;
          const defaultKeterangan = currentEskulObj
            ? `Aktif melaksanakan kegiatan ekstrakurikuler ${currentEskulObj.nama} dengan predikat ${predikat}.`
            : s.keterangan;
          return {
            ...s,
            predikat,
            keterangan: s.keterangan ? s.keterangan : defaultKeterangan,
          };
        })
      );
    },
    [isReadOnly, currentEskulObj]
  );

  // Handler: Ubah Keterangan 1 Siswa
  const handleKeteranganChange = useCallback(
    (siswaId: string, text: string) => {
      if (isReadOnly) return;
      setScores((prev) =>
        prev.map((s) => (s.siswa_id === siswaId ? { ...s, keterangan: text } : s))
      );
    },
    [isReadOnly]
  );

  // Quick Action: Set Semua Predikat Se-Eskul
  const handleBulkSetAllPredikat = useCallback(
    (predikat: 'A' | 'B' | 'C' | 'D') => {
      if (isReadOnly || scores.length === 0) return;
      setScores((prev) =>
        prev.map((s) => ({
          ...s,
          predikat,
          keterangan: currentEskulObj
            ? `Aktif melaksanakan kegiatan ekstrakurikuler ${currentEskulObj.nama} dengan predikat ${predikat}.`
            : s.keterangan,
        }))
      );
      toast.success(`Berhasil menerapkan predikat ${predikat} untuk seluruh anggota!`);
    },
    [isReadOnly, scores.length, currentEskulObj]
  );

  // Quick Action: Salin Catatan Baris 1 ke Semua
  const handleCopyFirstKeteranganToAll = useCallback(() => {
    if (isReadOnly || scores.length === 0) return;
    const source = scores[0].keterangan;
    if (!source?.trim()) {
      toast.error('Catatan siswa baris pertama masih kosong');
      return;
    }
    setScores((prev) => prev.map((s) => ({ ...s, keterangan: source })));
    toast.success('Catatan baris pertama berhasil disalin ke seluruh siswa!');
  }, [isReadOnly, scores]);

  // Handler: Simpan Semua Nilai Matriks
  const handleSaveMatrix = () => {
    if (isReadOnly) {
      toast.error('Anda berada dalam Mode Hanya Baca.');
      return;
    }
    if (!selectedEskul) {
      toast.error('Pilih ekstrakurikuler terlebih dahulu');
      return;
    }
    if (scores.length === 0) {
      toast.error('Tidak ada anggota eskul untuk disimpan');
      return;
    }

    const payload = {
      jenis_kegiatan_id: selectedEskul,
      tahun_pelajaran_id: academicCtx.selectedTahunPelajaran,
      semester_id: academicCtx.selectedSemester,
      grades: scores.map((s) => ({
        siswa_id: s.siswa_id,
        predikat: s.predikat,
        keterangan: s.keterangan || null,
      })),
    };

    const parsed = eskulGradeMatrixSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data nilai tidak valid');
      return;
    }

    saveMatrixMutation.mutate(payload);
  };

  const breadcrumbs = useMemo(
    () => [
      { label: 'Akademik', path: '/akademik' },
      { label: 'Rapor', path: '/rapor/input' },
      { label: 'Nilai Ekstrakurikuler', path: '/rapor/eskul' },
    ],
    []
  );

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Penilaian Ekstrakurikuler Rapor"
        description="Pengisian predikat dan deskripsi capaian kualitatif kegiatan ekstrakurikuler siswa untuk Buku Leger dan lembar Rapor."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="nilai_eskul_page"
        instruction={{
          title: 'Panduan Penilaian Ekstrakurikuler Rapor',
          description: 'Penilaian diberikan kepada seluruh siswa yang terdaftar sebagai anggota aktif ekstrakurikuler.',
          items: [
            { text: 'Pilih Ekstrakurikuler yang Anda bina dari daftar pilihan di atas.' },
            { text: 'Daftar anggota aktif akan otomatis tampil lintas kelas sesuai data penugasan anggota di modul Kesiswaan.' },
            { text: 'Gunakan tombol Set Semua A atau Set Semua B untuk pengisian cepat capaian satu eskul.' },
            { text: 'Sesuaikan predikat per siswa dan lengkapi narasi deskripsi catatan capaian bila diperlukan.' },
            { text: 'Klik Simpan Seluruh Nilai Ekstrakurikuler untuk menyimpan evaluasi ke Rapor dan Leger secara permanen.' },
          ],
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-4 pb-12 w-full min-w-0 max-w-full">
            {/* Unified Control Toolbar Container (1 Frame Box Rapi & Hemat Ruang Vertikal) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3.5">
              {/* Hardening Guard Alert: Mode Terkunci / Hanya Baca */}
              {isReadOnly && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <Lock size={16} />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>Mode Terkunci</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                          Hanya Baca
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                        {readOnlyReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Baris 1: Konteks Akademik di kiri, Role Tabs di kanan */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-full md:w-auto">
                  <AcademicContextBar
                    id="rapor-eskul"
                    tahunPelajaranId={academicCtx.selectedTahunPelajaran}
                    semesterId={academicCtx.selectedSemester}
                    onTahunPelajaranChange={academicCtx.handleTpChange}
                    onSemesterChange={academicCtx.handleSemesterChange}
                    tpOptions={academicCtx.tpOptions}
                    semesterOptions={academicCtx.semesterOptions}
                    isLoadingTp={academicCtx.isLoadingTp}
                    isLoadingSem={academicCtx.isLoadingSem}
                    variant="toolbar"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto flex-wrap">
                  <TabSwitcher
                    activeTab={activeRoleTab}
                    onChange={(id) => setActiveRoleTab(id as any)}
                    tabs={roleTabs}
                  />
                </div>
              </div>

              {/* Baris 2: Seleksi Ekstrakurikuler & Filter Rombel Asal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label htmlFor="eskul-filter-master" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Award size={12} className="text-indigo-500" />
                    1. Kegiatan Ekstrakurikuler {activeRoleTab === 'my_eskul' && '(Binaan Saya)'}
                  </label>
                  <SearchableSelect
                    id="eskul-filter-master"
                    value={selectedEskul}
                    onValueChange={setSelectedEskul}
                    options={smartEskulOptions}
                    placeholder="Pilih Ekstrakurikuler"
                    isLoading={isLoadingOptions}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eskul-filter-kelas" className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Bookmark size={12} className="text-indigo-500" />
                    2. Filter Rombongan Belajar (Asal Kelas)
                  </label>
                  <SearchableSelect
                    id="eskul-filter-kelas"
                    value={selectedKelasFilter}
                    onValueChange={setSelectedKelasFilter}
                    options={smartKelasFilterOptions}
                    placeholder="Semua Anggota (Lintas Kelas)"
                    disabled={activeRoleTab === 'wali_kelas'}
                  />
                </div>
              </div>

              {/* Baris 3: Banner Ringkasan Metadata Eskul Terpilih */}
              {selectedEskul && currentEskulObj && (
                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {currentEskulObj.nama}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50">
                        Ekstrakurikuler Resmi
                      </Badge>
                      {currentEskulObj.is_pembina && (
                        <Badge variant="outline" className="text-[10px] font-semibold border-emerald-200 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50">
                          Pembina Aktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Total anggota terdaftar di sistem: <strong className="text-slate-700 dark:text-slate-300">{currentEskulObj.total_anggota} siswa</strong>. Nilai akan otomatis masuk ke Buku Leger dan lembar cetak Rapor.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Status Tersimpan:
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs">
                      {scores.filter((s) => s.is_saved).length} / {scores.length} Siswa
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Area Matriks Penilaian Anggota Eskul ── */}
            {!selectedEskul ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent rounded-2xl space-y-2">
                <Sparkles className="w-12 h-12 text-indigo-300 dark:text-indigo-800 mx-auto" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  Pilih Ekstrakurikuler untuk Membuka Matriks Nilai
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Daftar seluruh anggota siswa aktif akan langsung tampil secara otomatis lintas kelas tanpa perlu mencari satu per satu.
                </p>
              </Card>
            ) : isLoadingMatrix ? (
              <Card className="p-12 text-center border border-slate-200/80 rounded-2xl bg-white dark:bg-slate-900 space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">Memuat data anggota & nilai ekstrakurikuler...</p>
              </Card>
            ) : scores.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-transparent rounded-2xl space-y-2">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  Belum Ada Anggota Terdaftar di Ekstrakurikuler Ini
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tambahkan anggota siswa terlebih dahulu melalui menu <strong>Kesiswaan &gt; Anggota Eskul</strong> atau lengkapi pilihan eskul pada biodata siswa.
                </p>
              </Card>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm space-y-0">
                {/* Top Action & Bulk Tools Bar */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-500" />
                      Aksi Cepat Se-Eskul:
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isReadOnly}
                      onClick={() => handleBulkSetAllPredikat('A')}
                      className="text-[11px] font-bold h-7 rounded-lg border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                    >
                      Set Semua A (Sangat Baik)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isReadOnly}
                      onClick={() => handleBulkSetAllPredikat('B')}
                      className="text-[11px] font-bold h-7 rounded-lg border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                    >
                      Set Semua B (Baik)
                    </Button>
                    <span className="text-slate-300">|</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isReadOnly}
                      onClick={handleCopyFirstKeteranganToAll}
                      className="text-[11px] font-semibold h-7 text-slate-600 hover:text-indigo-600"
                      title="Salin Keterangan Baris 1 ke Semua Siswa"
                    >
                      <Copy size={11} className="mr-1" /> Salin Catatan #1
                    </Button>
                  </div>

                  <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                    <div className="relative w-full sm:w-48">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari siswa/kelas..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="toolbarPrimary"
                      size="toolbar"
                      disabled={isReadOnly || saveMatrixMutation.isPending}
                      onClick={handleSaveMatrix}
                      className="font-bold rounded-xl shrink-0 shadow-sm"
                    >
                      {saveMatrixMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      <span>Simpan Seluruh Nilai Ekstrakurikuler</span>
                    </Button>
                  </div>
                </div>

                {/* Desktop View Table */}
                {!isMobile ? (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                          <th className="py-3 px-3 w-10 text-center">No</th>
                          <th className="py-3 px-3 w-28">NIS / NISN</th>
                          <th className="py-3 px-4 w-56">Nama Lengkap Siswa</th>
                          <th className="py-3 px-3 w-28 text-center">Rombel (Kelas)</th>
                          <th className="py-3 px-4 w-64 text-center">Predikat Capaian</th>
                          <th className="py-3 px-4">Deskripsi / Keterangan Capaian Rapor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {displayScores.map((row, idx) => (
                          <tr key={row.siswa_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-3 px-3 font-mono text-slate-500">
                              <div>{row.nis}</div>
                              {row.nisn && row.nisn !== '-' && (
                                <div className="text-[10px] text-slate-400">{row.nisn}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {row.nama_siswa}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {row.kelas_nama}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="grid grid-cols-4 gap-1 w-full max-w-xs mx-auto">
                                {PREDIKAT_OPTIONS.map((opt) => {
                                  const isSelected = row.predikat === opt.val;
                                  return (
                                    <button
                                      key={opt.val}
                                      type="button"
                                      disabled={isReadOnly}
                                      onClick={() => handleScoreChange(row.siswa_id, opt.val)}
                                      className={cn(
                                        'py-1 px-1.5 rounded-lg text-center font-bold text-xs transition-all border cursor-pointer select-none',
                                        isSelected
                                          ? opt.activeClass
                                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                      )}
                                      title={opt.label}
                                    >
                                      {opt.val}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={row.keterangan || ''}
                                onChange={(e) => handleKeteranganChange(row.siswa_id, e.target.value)}
                                placeholder="Contoh: Sangat aktif dan bertanggung jawab dalam kegiatan..."
                                className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Mobile Card Deck View */
                  <div className="p-3 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                    {displayScores.map((row, idx) => (
                      <div key={row.siswa_id} className="pt-3 first:pt-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 mr-1.5">#{idx + 1}</span>
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                              {row.nama_siswa}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {row.nis}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {row.kelas_nama}
                          </span>
                        </div>

                        {/* Mobile Predikat Pills */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Predikat:</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {PREDIKAT_OPTIONS.map((opt) => {
                              const isSelected = row.predikat === opt.val;
                              return (
                                <button
                                  key={opt.val}
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={() => handleScoreChange(row.siswa_id, opt.val)}
                                  className={cn(
                                    'py-1.5 rounded-lg text-center font-bold text-xs transition-all border select-none',
                                    isSelected
                                      ? opt.activeClass
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600'
                                  )}
                                >
                                  {opt.val}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mobile Keterangan */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">Keterangan Capaian Rapor:</label>
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={row.keterangan || ''}
                            onChange={(e) => handleKeteranganChange(row.siswa_id, e.target.value)}
                            placeholder="Tulis deskripsi..."
                            className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default NilaiEskulPage;
