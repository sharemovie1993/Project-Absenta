import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sliders, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { SectionCard, Button } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { hubinApi } from '../../api/hubin.api';
import { toast } from 'sonner';
import { useDudiOptions } from '../../hooks/useDudiOptions';
import { useAcademicContext } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useCapabilities } from '../../hooks/useCapabilities';
import { SertifikatPklModal } from '../../components/hubin/SertifikatPklModal';
import { 
  scoreFieldSchema, 
  ScoreRow, 
  RawPklItem, 
  DeskripsiTpItem,
  calculateNilaiAkhirPkl,
  HubinAssessmentSettings
} from '../../components/hubin/nilai-pkl/types';

// Lazy loaded subcomponents to optimize bundle size and enforce architecture limits
const PklNilaiIndustriTab = lazy(() => import('../../components/hubin/nilai-pkl/PklNilaiIndustriTab'));
const PklNilaiSidangTab = lazy(() => import('../../components/hubin/nilai-pkl/PklNilaiSidangTab'));
const PklDeskripsiTpTab = lazy(() => import('../../components/hubin/nilai-pkl/PklDeskripsiTpTab'));
const PklSkemaSettingsModal = lazy(() => import('../../components/hubin/nilai-pkl/PklSkemaSettingsModal'));
const PklNilaiPasteModal = lazy(() => import('../../components/hubin/nilai-pkl/PklNilaiPasteModal'));

export const InputNilaiPklPage: React.FC = React.memo(() => {
  const isMobile = useIsMobile(768);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>('dudi');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMitra, setSelectedMitra] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSiswaSertifikat, setSelectedSiswaSertifikat] = useState<ScoreRow | null>(null);

  // Settings Form State
  const [formMode, setFormMode] = useState<'DUDI_ONLY' | 'COMPOSITE'>('DUDI_ONLY');
  const [formWeightDudi, setFormWeightDudi] = useState<number>(70);
  const [formWeightLaporan, setFormWeightLaporan] = useState<number>(15);
  const [formWeightSidang, setFormWeightSidang] = useState<number>(15);

  // Deskripsi TP Form State
  const [deskripsiTpText, setDeskripsiTpText] = useState('');

  // Role Scoping
  const { user } = useAuthStore();
  const { can, isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, activeGuruId: capActiveGuruId } = useCapabilities();
  const isPrivilegedHubin = can('hubin.partners.manage') || user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN' || can('hubin.pkl.manage') || isKaprog;
  const canManageAll = isPrivilegedHubin || isWaliKelas;
  const typedUser = user as { guru_profile?: { id?: string }; guru_id?: string; Guru?: { id?: string } } | null;
  const activeGuruId = capActiveGuruId || typedUser?.guru_profile?.id || typedUser?.guru_id || typedUser?.Guru?.id || null;
  const canEditScheme = can('hubin.partners.manage') || user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN';
  const canViewScheme = canEditScheme || can('hubin.guidance.manage') || Boolean(activeGuruId) || isKaprog || isWaliKelas;
  const [guidanceScope, setGuidanceScope] = useState<'ALL' | 'MY_GUIDANCE'>(canManageAll ? 'ALL' : 'MY_GUIDANCE');
  const [statusFilter, setStatusFilter] = useState<'ELIGIBLE' | 'AKTIF' | 'SELESAI' | 'ALL'>('ELIGIBLE');

  useEffect(() => {
    if (isMobile) {
      setStatusFilter('ELIGIBLE');
    }
  }, [isMobile]);

  useEffect(() => {
    if (!canManageAll) {
      setGuidanceScope('MY_GUIDANCE');
    }
  }, [canManageAll]);

  // Academic Context
  const {
    selectedTahunPelajaran: selectedTp,
    selectedSemester,
    handleTpChange: setSelectedTp,
    handleSemesterChange: setSelectedSemester,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
  } = useAcademicContext({
    onTpChange: () => setSelectedKelas(''),
    onSemesterChange: () => setSelectedKelas(''),
  });

  const { options: mitraOptions } = useDudiOptions();

  const { data: pklRekap, isLoading: isLoadingRekap } = useQuery({
    queryKey: ['pkl-rekap', selectedTp, selectedSemester, guidanceScope, activeGuruId, statusFilter],
    queryFn: () =>
      hubinApi.getRekapPklSiswa({
        tahun_pelajaran_id: selectedTp || undefined,
        semester_id: selectedSemester || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        pembimbing_id: guidanceScope === 'MY_GUIDANCE' && activeGuruId ? activeGuruId : undefined,
      }),
  });

  const { data: allPklRekap } = useQuery({
    queryKey: ['pkl-rekap-counts', selectedTp, selectedSemester, statusFilter],
    queryFn: () =>
      hubinApi.getRekapPklSiswa({
        tahun_pelajaran_id: selectedTp || undefined,
        semester_id: selectedSemester || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    staleTime: 30000,
  });

  const { data: hubinSettings } = useQuery({
    queryKey: ['hubin-settings', selectedTp],
    queryFn: () => hubinApi.getSettings({ tahun_pelajaran_id: selectedTp || undefined }),
  });

  const effectiveSettings = useMemo((): HubinAssessmentSettings | undefined => {
    const raw = hubinSettings as { data?: HubinAssessmentSettings } & HubinAssessmentSettings | undefined;
    return raw?.data ?? raw;
  }, [hubinSettings]);

  const isCompositeMode = effectiveSettings?.assessmentMode === 'COMPOSITE';

  useEffect(() => {
    if (effectiveSettings) {
      setFormMode(effectiveSettings.assessmentMode || 'DUDI_ONLY');
      setFormWeightDudi(effectiveSettings.weightDudi ?? 70);
      setFormWeightLaporan(effectiveSettings.weightLaporan ?? 15);
      setFormWeightSidang(effectiveSettings.weightSidang ?? 15);
    }
  }, [effectiveSettings]);

  useEffect(() => {
    if (!isCompositeMode && activeTab === 'sidang') {
      setActiveTab('dudi');
    }
  }, [isCompositeMode, activeTab]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Parameters<typeof hubinApi.updateSettings>[0]) => hubinApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['rapor'] });
      toast.success('Pengaturan skema & bobot penilaian PKL berhasil disimpan!');
      setShowSettingsModal(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan bobot PKL');
    },
  });

  const { data: deskripsiList, isLoading: isLoadingDeskripsi } = useQuery({
    queryKey: ['deskripsi-tp-list', selectedMitra],
    queryFn: () => hubinApi.getSettingDeskripsiPklList({ mitra_id: selectedMitra || undefined }),
  });

  const [scores, setScores] = useState<ScoreRow[]>([]);

  useEffect(() => {
    const rawResponse = pklRekap as { data?: RawPklItem[] | { list?: RawPklItem[] } } | RawPklItem[] | undefined;
    const rawList = Array.isArray((rawResponse as { data?: RawPklItem[] })?.data) 
      ? (rawResponse as { data: RawPklItem[] }).data 
      : Array.isArray(rawResponse) 
      ? rawResponse 
      : (rawResponse as { data?: { list?: RawPklItem[] } })?.data?.list || [];

    if (Array.isArray(rawList)) {
      setScores(rawList?.map((item: RawPklItem) => ({
        siswa_pkl_id: item.id || item.siswa_pkl_id || '',
        nama_siswa: item.Siswa?.nama_siswa || item.siswa_nama || '',
        nis: item.Siswa?.nis || item.nis || '',
        foto: item.Siswa?.foto || null,
        kelas_id: item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id || '',
        nama_kelas: item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '',
        mitra_nama: item.Mitra?.nama || item.mitra_nama || '-',
        instruktur_nama: item.instruktur_nama || '',
        penanggung_jawab_nama: item.penanggung_jawab_nama || '',
        alamat_dudi: item.alamat_dudi || item.Mitra?.alamat || '',
        hard_kompetensi_teknis: item.hard_kompetensi_teknis ?? null,
        hard_sop_k3lh: item.hard_sop_k3lh ?? null,
        hard_alur_bisnis: item.hard_alur_bisnis ?? null,
        soft_kedisiplinan: item.soft_kedisiplinan ?? null,
        soft_kerajinan_inisiatif: item.soft_kerajinan_inisiatif ?? null,
        soft_kerjasama: item.soft_kerjasama ?? null,
        soft_kejujuran: item.soft_kejujuran ?? null,
        soft_tanggung_jawab: item.soft_tanggung_jawab ?? null,
        nilai_laporan: item.nilai_json?.nilai_laporan ?? null,
        nilai_sidang: item.nilai_json?.nilai_sidang ?? null,
        penguji_nama: item.nilai_json?.penguji_nama || item.Pembimbing?.nama_guru || '',
        catatan_sidang: item.nilai_json?.catatan_sidang || '',
        file_portofolio: item.jurnal_json?.file_url || null,
        nilai_akhir_pkl: item.nilai_akhir_pkl ?? null,
        predikat_pkl: item.predikat_pkl || '-',
        catatan_pkl: item.catatan_pkl || '',
        sakit_pkl: item.sakit_pkl !== null && item.sakit_pkl !== undefined && item.sakit_pkl > 0 ? item.sakit_pkl : (item.auto_sakit ?? 0),
        izin_pkl: item.izin_pkl !== null && item.izin_pkl !== undefined && item.izin_pkl > 0 ? item.izin_pkl : (item.auto_izin ?? 0),
        alpa_pkl: item.alpa_pkl !== null && item.alpa_pkl !== undefined && item.alpa_pkl > 0 ? item.alpa_pkl : (item.auto_alpa ?? 0),
        auto_sakit: item.auto_sakit ?? 0,
        auto_izin: item.auto_izin ?? 0,
        auto_alpa: item.auto_alpa ?? 0,
        auto_hadir: item.auto_hadir ?? 0,
        nomor_sertifikat: item.nomor_sertifikat || '',
        deskripsi_tp: item.deskripsi_tp || '',
        status: item.status || 'AKTIF',
      })));
    }
  }, [pklRekap]);

  const smartClassOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    const scoresForOptions = (guidanceScope === 'ALL' && isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id)
      ? scores.filter((s) => s.kelas_id === walikelasKelas.id)
      : scores;
    scoresForOptions?.forEach((s) => {
      if (s.kelas_id && s.nama_kelas) {
        const existing = map.get(s.kelas_id);
        if (existing) {
          existing.count++;
        } else {
          map.set(s.kelas_id, { id: s.kelas_id, name: s.nama_kelas, count: 1 });
        }
      }
    });

    return Array.from(map.values())
      ?.sort((a, b) => a.name.localeCompare(b.name))
      ?.map((k) => ({
        value: k.id,
        label: `${k.name} (${k.count} Siswa)`,
      })) || [];
  }, [scores, guidanceScope, isWaliKelas, isPrivilegedHubin, walikelasKelas]);

  const displayedScores = useMemo(() => {
    let filtered = scores;
    if (guidanceScope === 'ALL' && isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id) {
      filtered = filtered.filter((s) => s.kelas_id === walikelasKelas.id);
    }
    if (!selectedKelas) return filtered;
    return filtered.filter((s) => s.kelas_id === selectedKelas);
  }, [scores, selectedKelas, guidanceScope, isWaliKelas, isPrivilegedHubin, walikelasKelas]);

  const allScopedCount = useMemo(() => {
    const raw = allPklRekap as { data?: RawPklItem[] | { list?: RawPklItem[] } } | RawPklItem[] | undefined;
    const list = Array.isArray((raw as { data?: RawPklItem[] })?.data)
      ? (raw as { data: RawPklItem[] }).data
      : Array.isArray(raw)
      ? raw
      : (raw as { data?: { list?: RawPklItem[] } })?.data?.list || [];
    if (isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id) {
      return list.filter((item: RawPklItem) => {
        const kId = item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id;
        return kId === walikelasKelas.id;
      }).length;
    }
    return list.length;
  }, [allPklRekap, isWaliKelas, isPrivilegedHubin, walikelasKelas]);

  const myGuidanceCountNilai = useMemo(() => {
    if (!activeGuruId) return 0;
    const raw = allPklRekap as { data?: RawPklItem[] | { list?: RawPklItem[] } } | RawPklItem[] | undefined;
    const list = Array.isArray((raw as { data?: RawPklItem[] })?.data)
      ? (raw as { data: RawPklItem[] }).data
      : Array.isArray(raw)
      ? raw
      : (raw as { data?: { list?: RawPklItem[] } })?.data?.list || [];
    return list.filter((item: RawPklItem) => {
      const pId = item.Pembimbing?.id;
      return pId === activeGuruId;
    }).length;
  }, [allPklRekap, activeGuruId]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKelas, selectedTp, selectedSemester, guidanceScope, statusFilter]);

  const totalItems = displayedScores.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedScores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedScores.slice(start, start + itemsPerPage);
  }, [displayedScores, currentPage, itemsPerPage]);

  const saveBatchMutation = useMutation({
    mutationFn: hubinApi.upsertNilaiPklBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['rapor'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing-tab'] });
      toast.success('Nilai PKL, identitas instruktur, dan presensi berhasil disimpan!');
    },
    onError: () => {
      toast.error('Gagal menyimpan nilai PKL');
    }
  });

  const saveDeskripsiTpMutation = useMutation({
    mutationFn: hubinApi.upsertSettingDeskripsiPkl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deskripsi-tp-list'] });
      toast.success('Deskripsi Tujuan Pembelajaran PKL berhasil disimpan!');
      setDeskripsiTpText('');
    },
    onError: () => {
      toast.error('Gagal menyimpan deskripsi TP PKL');
    }
  });

  const handleScoreChange = useCallback((siswaPklId: string, field: keyof ScoreRow, val: string | number | null) => {
    setScores(prev => {
      const clone = [...(prev || [])];
      const index = clone.findIndex(s => s.siswa_pkl_id === siswaPklId);
      if (index === -1) return prev;
      const target = { ...clone[index] };

      if (field.startsWith('hard_') || field.startsWith('soft_') || field === 'nilai_laporan' || field === 'nilai_sidang') {
        const parsedVal = val === '' || val === null ? null : Math.min(100, Math.max(0, parseFloat(String(val)) || 0));
        scoreFieldSchema.parse(parsedVal);
        (target as Record<string, unknown>)[field] = parsedVal;

        const calculated = calculateNilaiAkhirPkl(target, effectiveSettings);
        target.nilai_akhir_pkl = calculated.nilai_akhir_pkl;
        target.predikat_pkl = calculated.predikat_pkl;
      } else if (field === 'sakit_pkl' || field === 'izin_pkl' || field === 'alpa_pkl') {
        const numVal = val === '' || val === null || val === undefined ? 0 : Math.max(0, parseInt(String(val), 10) || 0);
        (target as Record<string, unknown>)[field] = numVal;
      } else {
        (target as Record<string, unknown>)[field] = val;
      }

      clone[index] = target;
      return clone;
    });
  }, [effectiveSettings]);

  const handleApplyToSameMitra = useCallback((mitraNama: string, instruktur: string, pic?: string) => {
    if (!mitraNama || !instruktur) return;
    setScores(prev => prev?.map(s => {
      if (s.mitra_nama === mitraNama) {
        return {
          ...s,
          instruktur_nama: instruktur,
          ...(pic ? { penanggung_jawab_nama: pic } : {})
        };
      }
      return s;
    }) || []);
    toast.success(`Data instruktur diterapkan ke seluruh siswa di ${mitraNama}`);
  }, []);

  const handleSyncFromDailyAttendance = useCallback(() => {
    setScores(prev => prev?.map(s => ({
      ...s,
      sakit_pkl: s.auto_sakit ?? 0,
      izin_pkl: s.auto_izin ?? 0,
      alpa_pkl: s.auto_alpa ?? 0,
    })) || []);
    toast.success('Presensi PKL (S/I/A) berhasil ditarik & disinkronkan dari data absensi harian siswa!');
  }, []);

  const handleProcessPaste = useCallback((rawText: string) => {
    if (!rawText.trim()) return;
    const lines = rawText.trim().split('\n');
    let matchedCount = 0;

    setScores(prev => {
      const clone = [...(prev || [])];
      lines?.forEach(line => {
        const parts = line.split('\t')?.map(p => p.trim());
        if (parts && parts.length >= 2) {
          const nis = parts[0];
          const idx = clone.findIndex(s => s.nis === nis);
          if (idx !== -1) {
            matchedCount++;
            const t = { ...clone[idx] };
            if (parts[1] !== undefined && parts[1] !== '') t.hard_kompetensi_teknis = parseFloat(parts[1]) || null;
            if (parts[2] !== undefined && parts[2] !== '') t.hard_sop_k3lh = parseFloat(parts[2]) || null;
            if (parts[3] !== undefined && parts[3] !== '') t.hard_alur_bisnis = parseFloat(parts[3]) || null;
            if (parts[4] !== undefined && parts[4] !== '') t.soft_kedisiplinan = parseFloat(parts[4]) || null;
            if (parts[5] !== undefined && parts[5] !== '') t.soft_kerajinan_inisiatif = parseFloat(parts[5]) || null;
            if (parts[6] !== undefined && parts[6] !== '') t.soft_kerjasama = parseFloat(parts[6]) || null;
            if (parts[7] !== undefined && parts[7] !== '') t.soft_kejujuran = parseFloat(parts[7]) || null;
            if (parts[8] !== undefined && parts[8] !== '') t.soft_tanggung_jawab = parseFloat(parts[8]) || null;
            if (parts[9] !== undefined && parts[9] !== '') t.catatan_pkl = parts[9];

            const calculated = calculateNilaiAkhirPkl(t, effectiveSettings);
            t.nilai_akhir_pkl = calculated.nilai_akhir_pkl;
            t.predikat_pkl = calculated.predikat_pkl;
            clone[idx] = t;
          }
        }
      });
      return clone;
    });

    toast.success(`Berhasil memetakan ${matchedCount} data siswa dari Excel!`);
  }, [effectiveSettings]);

  const handleSaveBatch = useCallback(() => {
    if (scores.length === 0) {
      toast.error('Tidak ada data siswa untuk disimpan');
      return;
    }
    saveBatchMutation.mutate({
      tahun_pelajaran_id: selectedTp || undefined,
      semester_id: selectedSemester || undefined,
      scores: scores?.map(s => ({
        siswa_pkl_id: s.siswa_pkl_id,
        hard_kompetensi_teknis: s.hard_kompetensi_teknis,
        hard_sop_k3lh: s.hard_sop_k3lh,
        hard_alur_bisnis: s.hard_alur_bisnis,
        soft_kedisiplinan: s.soft_kedisiplinan,
        soft_kerajinan_inisiatif: s.soft_kerajinan_inisiatif,
        soft_kerjasama: s.soft_kerjasama,
        soft_kejujuran: s.soft_kejujuran,
        soft_tanggung_jawab: s.soft_tanggung_jawab,
        nilai_laporan: s.nilai_laporan,
        nilai_sidang: s.nilai_sidang,
        penguji_nama: s.penguji_nama,
        catatan_sidang: s.catatan_sidang,
        nilai_akhir_pkl: s.nilai_akhir_pkl,
        predikat_pkl: s.predikat_pkl,
        catatan_pkl: s.catatan_pkl,
        sakit_pkl: Number(s.sakit_pkl) || 0,
        izin_pkl: Number(s.izin_pkl) || 0,
        alpa_pkl: Number(s.alpa_pkl) || 0,
        nomor_sertifikat: s.nomor_sertifikat,
        deskripsi_tp: s.deskripsi_tp,
        instruktur_nama: s.instruktur_nama,
        penanggung_jawab_nama: s.penanggung_jawab_nama,
        alamat_dudi: s.alamat_dudi
      })) || []
    });
  }, [scores, selectedTp, selectedSemester, saveBatchMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Hubin & PKL', path: '/hubin/workspace' },
    { label: 'Penilaian PKL' }
  ], []);

  const deskripsiListData = useMemo(() => {
    const raw = (deskripsiList as { data?: DeskripsiTpItem[] })?.data;
    return Array.isArray(raw) ? raw : [];
  }, [deskripsiList]);

  const tabs = useMemo(() => [
    { id: 'dudi', label: `🏢 Nilai Industri (${displayedScores.length})` },
    ...(isCompositeMode ? [{ id: 'sidang', label: `🎓 Nilai Sidang & Laporan (${displayedScores.length})` }] : []),
    { id: 'deskripsi', label: '📝 Deskripsi TP DUDI' }
  ], [displayedScores.length, isCompositeMode]);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Penilaian & Sertifikasi PKL Siswa"
      description="Kelola penilaian hard skills, soft skills, catatan instruktur industri, dan sertifikat resmi PKL siswa."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Penilaian & Sertifikasi Praktik Kerja Lapangan (PKL)"
          description="Entri nilai hard skills & soft skills, catatan instruktur DUDI, serta pratinjau sertifikat resmi PKL siswa."
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="hubin_input_nilai_pkl"
          instruction={{
            title: "Panduan Penilaian PKL",
            description: "Gunakan modul ini untuk memasukkan capaian kompetensi siswa di DUDI mitra.",
            items: [
              { text: "Pilih kelas untuk memuat daftar siswa yang sedang atau telah menyelesaikan masa PKL." },
              { text: "Gunakan fitur Paste dari Excel untuk mempercepat entri massal nilai dari instruktur industri." },
              { text: "Buka tab Nilai Sidang & Laporan untuk menginput nilai ujian presentasi dan memeriksa portofolio." },
              { text: "Klik tombol Sertifikat pada baris siswa untuk mencetak sertifikat resmi PKL." }
            ]
          }}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="space-y-6">
              {isKaprog && (
                <div className="flex items-center gap-2.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
                  <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-bold">Mode Ketua Program Keahlian (Kaprog):</span>{' '}
                    <span>
                      Rekap nilai PKL dibatasi otomatis untuk Jurusan{' '}
                      <strong>{kaprogJurusan?.nama || 'Binaan Anda'}</strong>
                      {kaprogJurusan?.singkatan ? ` (${kaprogJurusan.singkatan})` : ''}.
                    </span>
                  </div>
                </div>
              )}

              {isWaliKelas && !isKaprog && !isPrivilegedHubin && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold">Mode Wali Kelas (Monitoring Kelas Binaan):</span>{' '}
                    <span>
                      Rekap nilai PKL disaring khusus untuk siswa kelas{' '}
                      <strong>{walikelasKelas?.nama_kelas || 'Binaan Anda'}</strong>.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                <TabSwitcher
                  activeTab={activeTab}
                  onChange={(t) => setActiveTab(t as string)}
                  tabs={tabs}
                />

                {canViewScheme && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormMode(effectiveSettings?.assessmentMode || 'DUDI_ONLY');
                      setFormWeightDudi(effectiveSettings?.weightDudi ?? 70);
                      setFormWeightLaporan(effectiveSettings?.weightLaporan ?? 15);
                      setFormWeightSidang(effectiveSettings?.weightSidang ?? 15);
                      setShowSettingsModal(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto"
                  >
                    <Sliders size={14} className="text-indigo-600 dark:text-indigo-400" />
                    {canEditScheme ? 'Skema & Bobot Nilai' : 'Informasi Bobot Nilai'}
                    {isCompositeMode ? (
                      <span className="ml-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                        Gabungan ({effectiveSettings?.weightDudi}% / {effectiveSettings?.weightLaporan}% / {effectiveSettings?.weightSidang}%)
                      </span>
                    ) : (
                      <span className="ml-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                        DUDI 100%
                      </span>
                    )}
                  </Button>
                )}
              </div>

              <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat modul nilai PKL...</div>}>
                {(activeTab === 'dudi' || activeTab === 'nilai') && (
                  <PklNilaiIndustriTab
                    canManageAll={canManageAll}
                    activeGuruId={activeGuruId || undefined}
                    isKaprog={isKaprog}
                    isWaliKelas={isWaliKelas}
                    walikelasKelas={walikelasKelas}
                    allScopedCount={allScopedCount}
                    myGuidanceCountNilai={myGuidanceCountNilai}
                    guidanceScope={guidanceScope}
                    setGuidanceScope={setGuidanceScope}
                    isMobile={isMobile}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    selectedTp={selectedTp}
                    selectedSemester={selectedSemester}
                    setSelectedTp={setSelectedTp}
                    setSelectedSemester={setSelectedSemester}
                    tpOptions={tpOptions}
                    semesterOptions={semesterOptions}
                    isLoadingTp={isLoadingTp}
                    isLoadingSem={isLoadingSem}
                    selectedKelas={selectedKelas}
                    setSelectedKelas={setSelectedKelas}
                    smartClassOptions={smartClassOptions}
                    isLoadingRekap={isLoadingRekap}
                    totalRawScores={scores.length}
                    onOpenPasteModal={() => setShowPasteModal(true)}
                    onSaveBatch={handleSaveBatch}
                    isSavingBatch={saveBatchMutation.isPending}
                    displayedScores={displayedScores}
                    paginatedScores={paginatedScores}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    setCurrentPage={setCurrentPage}
                    handleScoreChange={handleScoreChange}
                    handleApplyToSameMitra={handleApplyToSameMitra}
                    handleSyncFromDailyAttendance={handleSyncFromDailyAttendance}
                    onPrintSertifikat={(row) => setSelectedSiswaSertifikat(row)}
                  />
                )}

                {activeTab === 'sidang' && (
                  <PklNilaiSidangTab
                    canManageAll={canManageAll}
                    activeGuruId={activeGuruId || undefined}
                    isKaprog={isKaprog}
                    isWaliKelas={isWaliKelas}
                    walikelasKelas={walikelasKelas}
                    allScopedCount={allScopedCount}
                    myGuidanceCountNilai={myGuidanceCountNilai}
                    guidanceScope={guidanceScope}
                    setGuidanceScope={setGuidanceScope}
                    isMobile={isMobile}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    selectedTp={selectedTp}
                    selectedSemester={selectedSemester}
                    setSelectedTp={setSelectedTp}
                    setSelectedSemester={setSelectedSemester}
                    tpOptions={tpOptions}
                    semesterOptions={semesterOptions}
                    isLoadingTp={isLoadingTp}
                    isLoadingSem={isLoadingSem}
                    selectedKelas={selectedKelas}
                    setSelectedKelas={setSelectedKelas}
                    smartClassOptions={smartClassOptions}
                    isLoadingRekap={isLoadingRekap}
                    totalRawScores={scores.length}
                    isCompositeMode={isCompositeMode}
                    effectiveSettings={effectiveSettings ? {
                      assessmentMode: effectiveSettings.assessmentMode || 'DUDI_ONLY',
                      weightDudi: effectiveSettings.weightDudi ?? 70,
                      weightLaporan: effectiveSettings.weightLaporan ?? 15,
                      weightSidang: effectiveSettings.weightSidang ?? 15,
                    } : undefined}
                    onSaveBatch={handleSaveBatch}
                    isSavingBatch={saveBatchMutation.isPending}
                    displayedScores={displayedScores}
                    paginatedScores={paginatedScores}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    setCurrentPage={setCurrentPage}
                    handleScoreChange={handleScoreChange}
                  />
                )}

                {activeTab === 'deskripsi' && (
                  <PklDeskripsiTpTab
                    mitraOptions={mitraOptions}
                    selectedMitra={selectedMitra}
                    setSelectedMitra={setSelectedMitra}
                    deskripsiTpText={deskripsiTpText}
                    setDeskripsiTpText={setDeskripsiTpText}
                    onSave={(payload) => saveDeskripsiTpMutation.mutate(payload)}
                    isSaving={saveDeskripsiTpMutation.isPending}
                    deskripsiListData={deskripsiListData}
                    isLoadingDeskripsi={isLoadingDeskripsi}
                  />
                )}
              </Suspense>
            </div>
          </SectionCard>
        </AcademicPageLayout>

        <Suspense fallback={null}>
          {showPasteModal && (
            <PklNilaiPasteModal
              isOpen={showPasteModal}
              onClose={() => setShowPasteModal(false)}
              onProcessPaste={handleProcessPaste}
            />
          )}

          {showSettingsModal && (
            <PklSkemaSettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              canEditScheme={canEditScheme}
              selectedTp={selectedTp}
              formMode={formMode}
              setFormMode={setFormMode}
              formWeightDudi={formWeightDudi}
              setFormWeightDudi={setFormWeightDudi}
              formWeightLaporan={formWeightLaporan}
              setFormWeightLaporan={setFormWeightLaporan}
              formWeightSidang={formWeightSidang}
              setFormWeightSidang={setFormWeightSidang}
              onSave={(payload) => updateSettingsMutation.mutate(payload)}
              isSaving={updateSettingsMutation.isPending}
              onNavigateToSettings={() => {
                setShowSettingsModal(false);
                navigate(`/hubin/settings?tab=skema${selectedTp ? `&tp=${selectedTp}` : ''}`);
              }}
            />
          )}
        </Suspense>

        {selectedSiswaSertifikat && (
          <SertifikatPklModal
            isOpen={Boolean(selectedSiswaSertifikat)}
            onClose={() => setSelectedSiswaSertifikat(null)}
            siswaPklId={selectedSiswaSertifikat.siswa_pkl_id}
            defaultData={selectedSiswaSertifikat}
          />
        )}
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default InputNilaiPklPage;
