import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Save, 
  Layers, 
  ClipboardPaste, 
  Sparkles, 
  Award, 
  Printer,
  CheckCircle2,
  Users,
  Settings,
  Sliders,
  ExternalLink,
  FileText,
  Check,
  AlertCircle,
  Info,
  BookOpen,
  GraduationCap,
  Lock,
  Copy,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { Card, SectionCard, Button, SearchableSelect } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { hubinApi } from '../../api/hubin.api';
import { kelasApi } from '../../api/academic.api';
import { toast } from 'sonner';
import { useDudiOptions } from '../../hooks/useDudiOptions';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useAuthStore } from '../../store/authStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useCapabilities } from '../../hooks/useCapabilities';
import { SertifikatPklModal } from '../../components/hubin/SertifikatPklModal';
import { SiswaIdentityCell } from '../../components/common/SiswaIdentityCell';

// Zod Schema Validation Guard (Pilar 25)
const scoreFieldSchema = z.number().min(0).max(100).nullable();
const deskripsiTpSchema = z.object({
  mitra_id: z.string().min(1, 'Mitra DUDI wajib dipilih'),
  deskripsi_tp: z.string().min(5, 'Deskripsi TP minimal 5 karakter'),
});

const scoreSchema = z.object({
  score: z.number().min(0).max(100).optional(),
});

interface ScoreRow {
  siswa_pkl_id: string;
  nama_siswa: string;
  nis: string;
  foto?: string | null;
  kelas_id?: string;
  nama_kelas?: string;
  mitra_nama: string;
  instruktur_nama: string;
  penanggung_jawab_nama: string;
  alamat_dudi: string;
  hard_kompetensi_teknis: number | null;
  hard_sop_k3lh: number | null;
  hard_alur_bisnis: number | null;
  soft_kedisiplinan: number | null;
  soft_kerajinan_inisiatif: number | null;
  soft_kerjasama: number | null;
  soft_kejujuran: number | null;
  soft_tanggung_jawab: number | null;
  nilai_laporan: number | null;
  nilai_sidang: number | null;
  penguji_nama: string;
  catatan_sidang: string;
  file_portofolio?: string | null;
  nilai_akhir_pkl: number | null;
  predikat_pkl: string;
  catatan_pkl: string;
  sakit_pkl: number;
  izin_pkl: number;
  alpa_pkl: number;
  auto_sakit?: number;
  auto_izin?: number;
  auto_alpa?: number;
  auto_hadir?: number;
  nomor_sertifikat: string;
  deskripsi_tp: string;
  status?: string;
}

interface RawPklItem {
  id?: string;
  siswa_pkl_id?: string;
  Siswa?: { 
    id?: string;
    nama_siswa?: string; 
    nis?: string; 
    nisn?: string;
    kelas_id?: string;
    Kelas?: { id?: string; nama_kelas?: string };
  };
  SiswaAkademik?: {
    id?: string;
    kelas_id?: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
    kelas?: { id?: string; nama_kelas?: string };
    tahunPelajaran?: { id?: string; tahun?: string };
    semester?: { id?: string; nama_semester?: string };
  };
  Pembimbing?: {
    id?: string;
    nama_guru?: string;
    nip?: string;
  };
  siswa_nama?: string;
  nis?: string;
  Mitra?: { nama?: string; alamat?: string };
  mitra_nama?: string;
  instruktur_nama?: string;
  penanggung_jawab_nama?: string;
  alamat_dudi?: string;
  hard_kompetensi_teknis?: number | null;
  hard_sop_k3lh?: number | null;
  hard_alur_bisnis?: number | null;
  soft_kedisiplinan?: number | null;
  soft_kerajinan_inisiatif?: number | null;
  soft_kerjasama?: number | null;
  soft_kejujuran?: number | null;
  soft_tanggung_jawab?: number | null;
  jurnal_json?: {
    file_url?: string;
    status?: string;
  };
  nilai_json?: {
    dudi_avg?: number | null;
    nilai_laporan?: number | null;
    nilai_sidang?: number | null;
    penguji_nama?: string | null;
    penguji_id?: string | null;
    catatan_sidang?: string | null;
    tanggal_sidang?: string | null;
  };
  nilai_akhir_pkl?: number | null;
  predikat_pkl?: string;
  catatan_pkl?: string;
  sakit_pkl?: number;
  izin_pkl?: number;
  alpa_pkl?: number;
  auto_sakit?: number;
  auto_izin?: number;
  auto_alpa?: number;
  auto_hadir?: number;
  nomor_sertifikat?: string;
  deskripsi_tp?: string;
}

export const InputNilaiPklPage: React.FC = React.memo(() => {
  const isMobile = useIsMobile(768);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>('dudi');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMitra, setSelectedMitra] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [selectedSiswaSertifikat, setSelectedSiswaSertifikat] = useState<ScoreRow | null>(null);

  // Settings Form State
  const [formMode, setFormMode] = useState<'DUDI_ONLY' | 'COMPOSITE'>('DUDI_ONLY');
  const [formWeightDudi, setFormWeightDudi] = useState<number>(70);
  const [formWeightLaporan, setFormWeightLaporan] = useState<number>(15);
  const [formWeightSidang, setFormWeightSidang] = useState<number>(15);

  // Deskripsi TP Form State
  const [deskripsiTpText, setDeskripsiTpText] = useState('');

  // Role Scoping: Guru Pembimbing vs Admin/Hubin vs Kaprog vs Wali Kelas
  const { user } = useAuthStore();
  const { can, isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, activeGuruId: capActiveGuruId } = useCapabilities();
  const isPrivilegedHubin = can('hubin.partners.manage') || user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN' || can('hubin.pkl.manage') || isKaprog;
  const canManageAll = isPrivilegedHubin || isWaliKelas;
  const activeGuruId = capActiveGuruId || user?.guru_profile?.id || (user as any)?.guru_id || (user as any)?.Guru?.id || null;
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

  // Academic Year & Semester Options
  const { options: tpOptions, activeYear, isLoading: isLoadingTp } = useTahunPelajaranOptions();
  const [selectedTp, setSelectedTp] = useState<string>('');

  useEffect(() => {
    if (activeYear?.id && !selectedTp) {
      setSelectedTp(activeYear.id);
    }
  }, [activeYear, selectedTp]);

  const { options: semesterOptions, activeSemester, isLoading: isLoadingSem } = useSemesterOptions({
    tahunPelajaranId: selectedTp || undefined,
  });
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  useEffect(() => {
    if (activeSemester?.id && !selectedSemester) {
      setSelectedSemester(activeSemester.id);
    }
  }, [activeSemester, selectedSemester]);

  // Integrated Custom Hooks (Pilar 31 Data Layer)
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

  // Query stabil untuk menghitung jumlah siswa per tab
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

  // Fetch Hubin Settings (Assessment Mode & Weights)
  const { data: hubinSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['hubin-settings'],
    queryFn: () => hubinApi.getSettings(),
  });

  const effectiveSettings = useMemo(() => {
    const raw = hubinSettings as any;
    return raw?.data ?? raw;
  }, [hubinSettings]);

  const isCompositeMode = effectiveSettings?.assessmentMode === 'COMPOSITE';

  // Sync form state when hubinSettings loads
  useEffect(() => {
    if (effectiveSettings) {
      setFormMode(effectiveSettings.assessmentMode || 'DUDI_ONLY');
      setFormWeightDudi(effectiveSettings.weightDudi ?? 70);
      setFormWeightLaporan(effectiveSettings.weightLaporan ?? 15);
      setFormWeightSidang(effectiveSettings.weightSidang ?? 15);
    }
  }, [effectiveSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => hubinApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['rapor'] });
      toast.success('Pengaturan skema & bobot penilaian PKL berhasil disimpan!');
      setShowSettingsModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan pengaturan bobot PKL');
    },
  });

  // Fetch Setting Deskripsi TP List
  const { data: deskripsiList, isLoading: isLoadingDeskripsi } = useQuery({
    queryKey: ['deskripsi-tp-list', selectedMitra],
    queryFn: () => hubinApi.getSettingDeskripsiPklList({ mitra_id: selectedMitra || undefined }),
  });

  // Scores Grid State
  const [scores, setScores] = useState<ScoreRow[]>([]);

  useEffect(() => {
    const rawResponse = pklRekap as { data?: RawPklItem[] | { list?: RawPklItem[] } } | RawPklItem[] | undefined;
    const rawList = Array.isArray((rawResponse as { data?: RawPklItem[] })?.data) 
      ? (rawResponse as { data: RawPklItem[] }).data 
      : Array.isArray(rawResponse) 
      ? rawResponse 
      : (rawResponse as { data?: { list?: RawPklItem[] } })?.data?.list || [];

    if (Array.isArray(rawList)) {
      setScores(rawList?.map((item: any) => ({
        siswa_pkl_id: item.id || item.siswa_pkl_id || '',
        nama_siswa: item.Siswa?.nama_siswa || item.siswa_nama || '',
        nis: item.Siswa?.nis || item.nis || '',
        foto: item.Siswa?.foto || item.foto || null,
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

  // Smart Class Options: derived from students who have active PKL in this academic context!
  const smartClassOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    // Wali Kelas mode ALL: hanya tampilkan opsi kelas binaan saja
    const scoresForOptions = (guidanceScope === 'ALL' && isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id)
      ? scores.filter((s) => s.kelas_id === walikelasKelas.id)
      : scores;
    scoresForOptions.forEach((s) => {
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
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((k) => ({
        value: k.id,
        label: `${k.name} (${k.count} Siswa)`,
      }));
  }, [scores, guidanceScope, isWaliKelas, isPrivilegedHubin, walikelasKelas]);

  // Displayed scores filtered by selected class
  const displayedScores = useMemo(() => {
    let filtered = scores;

    // Wali Kelas mode ALL: hanya tampilkan siswa kelas binaan saja
    // Siswa bimbingan lintas kelas hanya muncul di mode MY_GUIDANCE
    if (guidanceScope === 'ALL' && isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id) {
      filtered = filtered.filter((s) => s.kelas_id === walikelasKelas.id);
    }

    if (!selectedKelas) return filtered;
    return filtered.filter((s) => s.kelas_id === selectedKelas);
  }, [scores, selectedKelas, guidanceScope, isWaliKelas, isPrivilegedHubin, walikelasKelas]);

  // Count per scope tab (stabel & akurat dari allPklRekap)
  const allScopedCount = useMemo(() => {
    const raw = allPklRekap as any;
    const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : raw?.data?.list || [];
    if (isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id) {
      return list.filter((item: any) => {
        const kId = item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id;
        return kId === walikelasKelas.id;
      }).length;
    }
    return list.length;
  }, [allPklRekap, isWaliKelas, isPrivilegedHubin, walikelasKelas]);

  const myGuidanceCountNilai = useMemo(() => {
    if (!activeGuruId) return 0;
    const raw = allPklRekap as any;
    const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : raw?.data?.list || [];
    return list.filter((item: any) => {
      const pId = item.pembimbing_id || item.Pembimbing?.id;
      return pId === activeGuruId;
    }).length;
  }, [allPklRekap, activeGuruId]);

  // Pagination State for Input Nilai Table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to page 1 when scope or filter changes
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

  // Upsert Batch Mutation
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

  // Save Setting TP Mutation
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

  // Handle Score Input Change with Auto-Calc (Smart Dynamic Fallback)
  const handleScoreChange = useCallback((siswaPklId: string, field: keyof ScoreRow, val: string) => {
    setScores(prev => {
      const clone = [...prev];
      const index = clone.findIndex(s => s.siswa_pkl_id === siswaPklId);
      if (index === -1) return prev;
      const target = { ...clone[index] };

      if (
        field.startsWith('hard_') || 
        field.startsWith('soft_') || 
        field === 'nilai_laporan' || 
        field === 'nilai_sidang'
      ) {
        const parsedVal = val === '' ? null : Math.min(100, Math.max(0, parseFloat(val) || 0));
        scoreFieldSchema.parse(parsedVal);
        (target as Record<string, unknown>)[field] = parsedVal;

        // Auto Calc Nilai DUDI (8 Aspek)
        const dudiGradeList = [
          target.hard_kompetensi_teknis,
          target.hard_sop_k3lh,
          target.hard_alur_bisnis,
          target.soft_kedisiplinan,
          target.soft_kerajinan_inisiatif,
          target.soft_kerjasama,
          target.soft_kejujuran,
          target.soft_tanggung_jawab,
        ].filter((g): g is number => typeof g === 'number' && g !== null);

        const dudiAvg = dudiGradeList.length > 0
          ? dudiGradeList.reduce((a, b) => a + b, 0) / dudiGradeList.length
          : null;

        const isComposite = effectiveSettings?.assessmentMode === 'COMPOSITE';
        const wDudi = effectiveSettings?.weightDudi ?? 70;
        const wLaporan = effectiveSettings?.weightLaporan ?? 15;
        const wSidang = effectiveSettings?.weightSidang ?? 15;

        if (isComposite) {
          let totalScore = 0;
          let totalWeight = 0;

          if (dudiAvg !== null) {
            totalScore += dudiAvg * wDudi;
            totalWeight += wDudi;
          }
          if (target.nilai_laporan !== null && target.nilai_laporan !== undefined) {
            totalScore += Number(target.nilai_laporan) * wLaporan;
            totalWeight += wLaporan;
          }
          if (target.nilai_sidang !== null && target.nilai_sidang !== undefined) {
            totalScore += Number(target.nilai_sidang) * wSidang;
            totalWeight += wSidang;
          }

          if (totalWeight > 0) {
            const finalScore = totalScore / totalWeight;
            target.nilai_akhir_pkl = Math.round(finalScore * 10) / 10;
          } else {
            target.nilai_akhir_pkl = null;
          }
        } else {
          target.nilai_akhir_pkl = dudiAvg !== null ? Math.round(dudiAvg * 10) / 10 : null;
        }

        if (target.nilai_akhir_pkl !== null) {
          if (target.nilai_akhir_pkl >= 90) target.predikat_pkl = 'Amat Baik';
          else if (target.nilai_akhir_pkl >= 80) target.predikat_pkl = 'Baik';
          else if (target.nilai_akhir_pkl >= 70) target.predikat_pkl = 'Cukup';
          else target.predikat_pkl = 'Kurang';
        } else {
          target.predikat_pkl = '-';
        }
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

  // Helper: Salin Nama Instruktur & PIC ke semua siswa di Mitra DUDI yang sama
  const handleApplyToSameMitra = useCallback((mitraNama: string, instruktur: string, pic?: string) => {
    if (!mitraNama || !instruktur) return;
    setScores(prev => prev.map(s => {
      if (s.mitra_nama === mitraNama) {
        return {
          ...s,
          instruktur_nama: instruktur,
          ...(pic ? { penanggung_jawab_nama: pic } : {})
        };
      }
      return s;
    }));
    toast.success(`Data instruktur diterapkan ke seluruh siswa di ${mitraNama}`);
  }, []);

  // Helper: Sinkronkan S/I/A dari Presensi Harian Siswa PKL (AbsensiPkl)
  const handleSyncFromDailyAttendance = useCallback(() => {
    setScores(prev => prev.map(s => ({
      ...s,
      sakit_pkl: s.auto_sakit ?? 0,
      izin_pkl: s.auto_izin ?? 0,
      alpa_pkl: s.auto_alpa ?? 0,
    })));
    toast.success('Presensi PKL (S/I/A) berhasil ditarik & disinkronkan dari data absensi harian siswa!');
  }, []);

  const handleProcessPaste = useCallback(() => {
    if (!pasteRawText.trim()) return;
    const lines = pasteRawText.trim().split('\n');
    let matchedCount = 0;

    setScores(prev => {
      const clone = [...prev];
      lines.forEach(line => {
        const parts = line.split('\t')?.map(p => p.trim());
        if (parts.length >= 2) {
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

            // Re-calculate
            const gradeList = [
              t.hard_kompetensi_teknis,
              t.hard_sop_k3lh,
              t.hard_alur_bisnis,
              t.soft_kedisiplinan,
              t.soft_kerajinan_inisiatif,
              t.soft_kerjasama,
              t.soft_kejujuran,
              t.soft_tanggung_jawab
            ].filter(g => typeof g === 'number' && g !== null) as number[];

            const dAvg = gradeList.length > 0 ? gradeList.reduce((a, b) => a + b, 0) / gradeList.length : null;

            const isComposite = effectiveSettings?.assessmentMode === 'COMPOSITE';
            const wDudi = effectiveSettings?.weightDudi ?? 70;
            const wLaporan = effectiveSettings?.weightLaporan ?? 15;
            const wSidang = effectiveSettings?.weightSidang ?? 15;

            if (isComposite) {
              let totalScore = 0;
              let totalWeight = 0;
              if (dAvg !== null) {
                totalScore += dAvg * wDudi;
                totalWeight += wDudi;
              }
              if (t.nilai_laporan !== null && t.nilai_laporan !== undefined) {
                totalScore += Number(t.nilai_laporan) * wLaporan;
                totalWeight += wLaporan;
              }
              if (t.nilai_sidang !== null && t.nilai_sidang !== undefined) {
                totalScore += Number(t.nilai_sidang) * wSidang;
                totalWeight += wSidang;
              }
              t.nilai_akhir_pkl = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : null;
            } else {
              t.nilai_akhir_pkl = dAvg !== null ? Math.round(dAvg * 10) / 10 : null;
            }

            if (t.nilai_akhir_pkl !== null) {
              if (t.nilai_akhir_pkl >= 90) t.predikat_pkl = 'Amat Baik';
              else if (t.nilai_akhir_pkl >= 80) t.predikat_pkl = 'Baik';
              else if (t.nilai_akhir_pkl >= 70) t.predikat_pkl = 'Cukup';
              else t.predikat_pkl = 'Kurang';
            }

            clone[idx] = t;
          }
        }
      });
      return clone;
    });

    toast.success(`Berhasil memetakan ${matchedCount} data siswa dari Excel!`);
    setShowPasteModal(false);
    setPasteRawText('');
  }, [pasteRawText, effectiveSettings]);

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
      }))
    });
  }, [scores, selectedTp, selectedSemester, saveBatchMutation]);

  const breadcrumbs = useMemo(() => [
    { label: 'Hubin & PKL', path: '/hubin/workspace' },
    { label: 'Penilaian PKL' }
  ], []);

  const deskripsiListData = useMemo(() => {
    const raw = (deskripsiList as { data?: Array<{ id: string; Mitra?: { nama: string }; deskripsi_tp: string }> })?.data;
    return Array.isArray(raw) ? raw : [];
  }, [deskripsiList]);

  const tabs = useMemo(() => [
    { id: 'dudi', label: `🏢 Nilai Industri (${displayedScores.length})` },
    { id: 'sidang', label: `🎓 Nilai Sidang & Laporan (${displayedScores.length})` },
    { id: 'deskripsi', label: '📝 Deskripsi TP DUDI' }
  ], [displayedScores.length]);

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
              {/* Banner Khusus Kaprog: Scope Terkunci ke Jurusan */}
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

              {/* Banner Khusus Wali Kelas: Scope Terkunci ke Kelas Binaan */}
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

              {/* Tab Switcher & Configuration Bar */}
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

              {(activeTab === 'dudi' || activeTab === 'nilai') && (
                <div className="space-y-4">
                  {/* Filter & Action Card */}
                  <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                    {/* Top Scoping & Status Filter Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      {canManageAll && activeGuruId ? (
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setGuidanceScope('ALL');
                              setSelectedKelas('');
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                              guidanceScope === 'ALL'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            {isKaprog ? 'Semua Siswa Jurusan' : (isWaliKelas ? `Semua Siswa ${walikelasKelas?.nama_kelas || 'Kelas'}` : 'Semua Siswa PKL')} ({allScopedCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGuidanceScope('MY_GUIDANCE');
                              setSelectedKelas('');
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                              guidanceScope === 'MY_GUIDANCE'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Bimbingan Saya ({myGuidanceCountNilai})
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Mode: {canManageAll ? 'Administrator Hubin' : 'Guru Pembimbing Lapangan'}
                        </span>
                      )}

                      {/* Status Penempatan Filter (Desktop only, mobile defaults to ELIGIBLE / Siap Dinilai) */}
                      {!isMobile && (
                        <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
                          <button
                            type="button"
                            onClick={() => setStatusFilter('ELIGIBLE')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                              statusFilter === 'ELIGIBLE'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Mode Fleksibel: Menampilkan siswa aktif & selesai tanpa duplikat riwayat mutasi (Rekomendasi Penilaian)"
                          >
                            🎯 Siap Dinilai (Fleksibel)
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('AKTIF')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                              statusFilter === 'AKTIF'
                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Hanya tampilkan penempatan siswa yang berstatus aktif"
                          >
                            🟢 Aktif
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('SELESAI')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                              statusFilter === 'SELESAI'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Hanya tampilkan siswa yang masa PKL-nya telah selesai/ditarik"
                          >
                            ✅ Selesai
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                              statusFilter === 'ALL'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Tampilkan semua data penempatan termasuk riwayat mutasi siswa"
                          >
                            📋 Semua
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
                      {/* 1. Tahun Pelajaran */}
                      <div>
                        <label htmlFor="filter-tp-pkl" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Tahun Pelajaran
                        </label>
                        <SearchableSelect
                          id="filter-tp-pkl"
                          aria-label="Pilih tahun pelajaran"
                          value={selectedTp}
                          onValueChange={(val) => {
                            setSelectedTp(val);
                            setSelectedKelas('');
                          }}
                          options={tpOptions}
                          placeholder="Pilih Tahun Pelajaran"
                          isLoading={isLoadingTp}
                        />
                      </div>

                      {/* 2. Semester */}
                      <div>
                        <label htmlFor="filter-semester-pkl" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Semester
                        </label>
                        <SearchableSelect
                          id="filter-semester-pkl"
                          aria-label="Pilih semester"
                          value={selectedSemester}
                          onValueChange={(val) => {
                            setSelectedSemester(val);
                            setSelectedKelas('');
                          }}
                          options={semesterOptions}
                          placeholder="Pilih Semester"
                          isLoading={isLoadingSem}
                        />
                      </div>

                      {/* 3. Smart Filter Kelas */}
                      <div>
                        <label htmlFor="filter-kelas-pkl" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Filter Kelas Siswa PKL
                        </label>
                        <SearchableSelect
                          id="filter-kelas-pkl"
                          aria-label="Pilih kelas siswa PKL"
                          value={selectedKelas}
                          onValueChange={setSelectedKelas}
                          options={[
                            { value: '', label: `-- Semua Kelas PKL (${scores.length} Siswa) --` },
                            ...smartClassOptions
                          ]}
                          placeholder="Pilih Kelas"
                          isLoading={isLoadingRekap}
                        />
                      </div>

                      {/* 4. Action Button: Paste Excel */}
                      <div>
                        <label className="block text-[10px] font-bold text-transparent uppercase mb-1 select-none hidden lg:block">
                          Impor
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPasteModal(true)}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl h-10 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        >
                          <ClipboardPaste size={14} className="text-emerald-500" />
                          Paste dari Excel
                        </Button>
                      </div>

                      {/* 5. Action Button: Simpan Nilai PKL */}
                      <div>
                        <label className="block text-[10px] font-bold text-transparent uppercase mb-1 select-none hidden lg:block">
                          Simpan
                        </label>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleSaveBatch}
                          disabled={saveBatchMutation.isPending || scores.length === 0}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl h-10 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                        >
                          <Save size={14} />
                          {saveBatchMutation.isPending ? 'Menyimpan...' : 'Simpan Nilai PKL'}
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Grid Table */}
                  <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden p-0 bg-white dark:bg-slate-900">
                    {isLoadingRekap ? (
                      <div className="text-center py-20 text-xs text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
                        Memuat data penilaian PKL siswa...
                      </div>
                    ) : displayedScores.length === 0 ? (
                      <div className="text-center py-20 text-xs text-slate-400">
                        {selectedKelas 
                          ? 'Belum ada data penempatan PKL aktif pada kelas yang dipilih.' 
                          : 'Belum ada data penempatan PKL aktif pada periode akademik ini.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="p-3 text-center w-12">No</th>
                              <th className="p-3 min-w-[160px]">Siswa & Mitra DUDI</th>
                              <th className="p-3 min-w-[150px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Instruktur & PIC</span>
                                <span className="text-[9px] font-normal text-indigo-500 uppercase tracking-tight">DUDI / Lapangan</span>
                              </th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Teknis</span>
                                <span className="text-[9px] font-normal text-indigo-500 uppercase tracking-tight">Hard Skill</span>
                              </th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">K3LH</span>
                                <span className="text-[9px] font-normal text-indigo-500 uppercase tracking-tight">Hard Skill</span>
                              </th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Bisnis</span>
                                <span className="text-[9px] font-normal text-indigo-500 uppercase tracking-tight">Hard Skill</span>
                              </th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Disiplin</span>
                                <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                              </th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Inisiatif</span>
                                <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                              </th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Kerjasama</span>
                                <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                              </th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Kejujuran</span>
                                <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                              </th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Tanggung Jwb</span>
                                <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Soft Skill</span>
                              </th>
                              <th className="p-3 text-center min-w-[80px]">Nilai Akhir</th>
                              <th className="p-3 text-center min-w-[80px]">Predikat</th>
                              <th className="p-3 text-center min-w-[130px]">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Presensi PKL</span>
                                  <button
                                    type="button"
                                    onClick={handleSyncFromDailyAttendance}
                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer"
                                    title="Tarik & sinkronkan Sakit/Izin/Alpa dari presensi harian siswa"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                </div>
                                <span className="text-[9px] font-normal text-amber-600 dark:text-amber-400 uppercase tracking-tight">S / I / A (Hari)</span>
                              </th>
                              <th className="p-3 min-w-[150px]">Catatan Evaluasi</th>
                              <th className="p-3 text-center min-w-[100px]">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginatedScores?.map((score, index) => {
                              const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                              return (
                                <tr key={score.siswa_pkl_id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                  <td className="p-3 text-center font-mono font-bold text-slate-400">{globalIndex}</td>
                                  <td className="p-3">
                                    <SiswaIdentityCell
                                      foto={score.foto}
                                      nama={score.nama_siswa}
                                      nis={score.nis}
                                      kelas={score.nama_kelas}
                                      size="sm"
                                      nameClassName="font-bold text-slate-900 dark:text-white"
                                      showMeta={true}
                                    />
                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 pl-12">🏢 {score.mitra_nama}</p>
                                    {score.catatan_pkl && score.catatan_pkl.includes('Mutasi:') ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40 mt-1 ml-12">
                                        🏷️ {score.catatan_pkl} (Selesai)
                                      </span>
                                    ) : score.status === 'SELESAI' ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40 mt-1 ml-12">
                                        ✅ Selesai
                                      </span>
                                    ) : score.status === 'AKTIF' ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40 mt-1 ml-12">
                                        🟢 Aktif
                                      </span>
                                    ) : null}
                                  </td>

                                  <td className="p-2">
                                    <div className="space-y-1">
                                      <input
                                        id={`score-instruktur-${globalIndex}`}
                                        aria-label={`Nama instruktur ${score.nama_siswa}`}
                                        type="text"
                                        placeholder="Nama Instruktur..."
                                        value={score.instruktur_nama || ''}
                                        onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'instruktur_nama', e.target.value)}
                                        className="w-full min-w-[130px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium px-2 py-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                        title="Nama Instruktur Industri / Pembimbing Lapangan"
                                      />
                                      <div className="flex items-center gap-1">
                                        <input
                                          id={`score-pic-${globalIndex}`}
                                          aria-label={`Penanggung jawab DUDI ${score.nama_siswa}`}
                                          type="text"
                                          placeholder="PIC / Pimpinan DUDI..."
                                          value={score.penanggung_jawab_nama || ''}
                                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'penanggung_jawab_nama', e.target.value)}
                                          className="w-full text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          title="Penanggung Jawab / Pimpinan Mitra DUDI (Opsional)"
                                        />
                                        {score.mitra_nama && score.instruktur_nama && (
                                          <button
                                            type="button"
                                            onClick={() => handleApplyToSameMitra(score.mitra_nama, score.instruktur_nama, score.penanggung_jawab_nama)}
                                            className="shrink-0 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer"
                                            title={`Terapkan instruktur ini ke semua siswa di ${score.mitra_nama}`}
                                          >
                                            <Copy size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-tek-${globalIndex}`}
                                      aria-label={`Nilai teknis ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      placeholder="0"
                                      value={score.hard_kompetensi_teknis ?? ''}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_kompetensi_teknis', e.target.value)}
                                      className="w-16 h-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-center text-blue-900 dark:text-blue-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-k3-${globalIndex}`}
                                      aria-label={`Nilai SOP K3LH ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      placeholder="0"
                                      value={score.hard_sop_k3lh ?? ''}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_sop_k3lh', e.target.value)}
                                      className="w-16 h-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-center text-blue-900 dark:text-blue-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-bis-${globalIndex}`}
                                      aria-label={`Nilai alur bisnis ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      placeholder="0"
                                      value={score.hard_alur_bisnis ?? ''}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'hard_alur_bisnis', e.target.value)}
                                      className="w-16 h-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-center text-blue-900 dark:text-blue-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-dis-${globalIndex}`}
                                      aria-label={`Nilai kedisiplinan ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      placeholder="0"
                                      value={score.soft_kedisiplinan ?? ''}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kedisiplinan', e.target.value)}
                                      className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-ini-${globalIndex}`}
                                      aria-label={`Nilai inisiatif & kerajinan ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      placeholder="0"
                                      value={score.soft_kerajinan_inisiatif ?? ''}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kerajinan_inisiatif', e.target.value)}
                                      className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-ker-${globalIndex}`}
                                      aria-label={`Nilai kerjasama ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      placeholder="0"
                                      value={score.soft_kerjasama ?? ''}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kerjasama', e.target.value)}
                                      className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-juj-${globalIndex}`}
                                      aria-label={`Nilai kejujuran ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      placeholder="0"
                                      value={score.soft_kejujuran ?? ''}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_kejujuran', e.target.value)}
                                      className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-tj-${globalIndex}`}
                                      aria-label={`Nilai tanggung jawab ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      placeholder="0"
                                      value={score.soft_tanggung_jawab ?? ''}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'soft_tanggung_jawab', e.target.value)}
                                      className="w-16 h-8 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-center text-emerald-900 dark:text-emerald-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>

                                  <td className="p-2 text-center font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                    {score.nilai_akhir_pkl ?? '-'}
                                  </td>

                                  <td className="p-2 text-center">
                                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                                      {score.predikat_pkl}
                                    </span>
                                  </td>

                                  <td className="p-2 text-center">
                                    <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 leading-none mb-0.5" title="Sakit">S</span>
                                        <input
                                          id={`score-sakit-${globalIndex}`}
                                          aria-label={`Sakit ${score.nama_siswa}`}
                                          type="number"
                                          min={0}
                                          max={365}
                                          placeholder="0"
                                          value={score.sakit_pkl || ''}
                                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'sakit_pkl', e.target.value)}
                                          className="w-8 h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          title="Ketidakhadiran Sakit (Hari)"
                                        />
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 leading-none mb-0.5" title="Izin">I</span>
                                        <input
                                          id={`score-izin-${globalIndex}`}
                                          aria-label={`Izin ${score.nama_siswa}`}
                                          type="number"
                                          min={0}
                                          max={365}
                                          placeholder="0"
                                          value={score.izin_pkl || ''}
                                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'izin_pkl', e.target.value)}
                                          className="w-8 h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          title="Ketidakhadiran Izin (Hari)"
                                        />
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 leading-none mb-0.5" title="Alpa">A</span>
                                        <input
                                          id={`score-alpa-${globalIndex}`}
                                          aria-label={`Alpa ${score.nama_siswa}`}
                                          type="number"
                                          min={0}
                                          max={365}
                                          placeholder="0"
                                          value={score.alpa_pkl || ''}
                                          onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'alpa_pkl', e.target.value)}
                                          className="w-8 h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          title="Ketidakhadiran Alpa / Tanpa Keterangan (Hari)"
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-2">
                                    <input
                                      id={`score-cat-${globalIndex}`}
                                      aria-label={`Catatan evaluasi ${score.nama_siswa}`}
                                      type="text"
                                      placeholder="Catatan evaluasi..."
                                      value={score.catatan_pkl}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'catatan_pkl', e.target.value)}
                                      className="w-full min-w-[140px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                    />
                                  </td>

                                  <td className="p-2 text-center">
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      onClick={() => setSelectedSiswaSertifikat(score)}
                                      className="text-[10px] font-bold flex items-center gap-1 mx-auto"
                                    >
                                      <Printer size={12} />
                                      Sertifikat
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Standardized Premium Pagination Footer */}
                    {totalItems > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-4">
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{totalItems}</span> Siswa
                          </div>

                          <div className="flex items-center gap-2">
                            <label htmlFor="nilai-limit-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Limit:</label>
                            <select 
                              id="nilai-limit-select"
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
                  </Card>
                </div>
              )}

              {activeTab === 'sidang' && (
                /* Tab: Sidang & Laporan PKL */
                <div className="space-y-4">
                  {/* Filter & Action Card */}
                  <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                    {/* Top Scoping & Status Filter Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      {canManageAll && activeGuruId ? (
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setGuidanceScope('ALL');
                              setSelectedKelas('');
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                              guidanceScope === 'ALL'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            {isKaprog ? 'Semua Siswa Jurusan' : (isWaliKelas ? `Semua Siswa ${walikelasKelas?.nama_kelas || 'Kelas'}` : 'Semua Siswa PKL')} ({allScopedCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGuidanceScope('MY_GUIDANCE');
                              setSelectedKelas('');
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                              guidanceScope === 'MY_GUIDANCE'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Bimbingan / Ujian Saya ({myGuidanceCountNilai})
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Mode: {canManageAll ? 'Administrator Hubin' : 'Guru Penguji / Pembimbing'}
                        </span>
                      )}

                      {/* Status Penempatan Filter (Desktop only, mobile defaults to ELIGIBLE / Siap Dinilai) */}
                      {!isMobile && (
                        <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
                          <button
                            type="button"
                            onClick={() => setStatusFilter('ELIGIBLE')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                              statusFilter === 'ELIGIBLE'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Mode Fleksibel: Menampilkan siswa aktif & selesai tanpa duplikat riwayat mutasi (Rekomendasi Penilaian)"
                          >
                            🎯 Siap Dinilai (Fleksibel)
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('AKTIF')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                              statusFilter === 'AKTIF'
                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Hanya tampilkan penempatan siswa yang berstatus aktif"
                          >
                            🟢 Aktif
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('SELESAI')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                              statusFilter === 'SELESAI'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Hanya tampilkan siswa yang masa PKL-nya telah selesai/ditarik"
                          >
                            ✅ Selesai
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                              statusFilter === 'ALL'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                            title="Tampilkan semua data penempatan termasuk riwayat mutasi siswa"
                          >
                            📋 Semua
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                      {/* Filter Kelas */}
                      <div>
                        <label htmlFor="filter-kelas-sidang" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Filter Kelas Siswa PKL
                        </label>
                        <SearchableSelect
                          id="filter-kelas-sidang"
                          aria-label="Pilih kelas sidang"
                          value={selectedKelas}
                          onValueChange={setSelectedKelas}
                          options={[
                            { value: '', label: `-- Semua Kelas PKL (${scores.length} Siswa) --` },
                            ...smartClassOptions
                          ]}
                          placeholder="Pilih Kelas"
                          isLoading={isLoadingRekap}
                        />
                      </div>

                      {/* Info Bobot Penilaian Aktif */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 col-span-1 sm:col-span-2">
                        {isCompositeMode ? (
                          <>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                              <Info size={14} className="text-indigo-500 shrink-0" />
                              <span>Bobot Penilaian Gabungan Aktif:</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold">
                                DUDI: {effectiveSettings?.weightDudi ?? 70}%
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold">
                                Laporan: {effectiveSettings?.weightLaporan ?? 15}%
                              </span>
                              <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-semibold">
                                Sidang: {effectiveSettings?.weightSidang ?? 15}%
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                              <Lock size={14} className="text-amber-600 shrink-0" />
                              <span>Skema Aktif: Nilai Industri Murni (100% DUDI)</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-snug">
                              Form input nilai laporan & sidang dinonaktifkan. Nilai akhir rapor 100% dari DUDI. Hubungi Bagian Hubin jika ingin mengaktifkan skema gabungan.
                            </p>
                          </>
                        )}
                      </div>

                      {/* Simpan Nilai Sidang */}
                      <div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleSaveBatch}
                          disabled={saveBatchMutation.isPending || scores.length === 0 || !isCompositeMode}
                          title={!isCompositeMode ? 'Form terkunci karena skema aktif adalah DUDI 100%' : undefined}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl h-10 shadow-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={14} />
                          {saveBatchMutation.isPending ? 'Menyimpan...' : (!isCompositeMode ? 'Skema Terkunci (DUDI 100%)' : 'Simpan Nilai Sidang')}
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Sidang Table */}
                  <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden p-0 bg-white dark:bg-slate-900">
                    {isLoadingRekap ? (
                      <div className="text-center py-20 text-xs text-slate-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
                        Memuat data ujian sidang PKL siswa...
                      </div>
                    ) : displayedScores.length === 0 ? (
                      <div className="text-center py-20 text-xs text-slate-400">
                        Belum ada siswa pada filter ini.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="p-3 text-center w-12">No</th>
                              <th className="p-3 min-w-[170px]">Siswa & Rombel</th>
                              <th className="p-3 min-w-[130px]">Portofolio / Laporan</th>
                              <th className="p-3 text-center min-w-[85px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">DUDI</span>
                                <span className="text-[9px] font-normal text-blue-500 uppercase tracking-tight">
                                  {isCompositeMode ? `Rerata (${effectiveSettings?.weightDudi ?? 70}%)` : 'Rerata (100%)'}
                                </span>
                              </th>
                              <th className="p-3 text-center min-w-[95px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Laporan</span>
                                <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                                  {isCompositeMode ? `(${effectiveSettings?.weightLaporan ?? 15}%)` : '(Arsip)'}
                                </span>
                              </th>
                              <th className="p-3 text-center min-w-[95px]">
                                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-200">Sidang</span>
                                <span className="text-[9px] font-normal text-purple-600 dark:text-purple-400 uppercase tracking-tight">
                                  {isCompositeMode ? `(${effectiveSettings?.weightSidang ?? 15}%)` : '(Arsip)'}
                                </span>
                              </th>
                              <th className="p-3 min-w-[150px]">Guru Penguji</th>
                              <th className="p-3 min-w-[160px]">Catatan / Revisi Sidang</th>
                              <th className="p-3 text-center min-w-[85px]">Nilai Akhir</th>
                              <th className="p-3 text-center min-w-[80px]">Predikat</th>
                              <th className="p-3 text-center min-w-[100px]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginatedScores?.map((score, index) => {
                              const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                              const dudiScores = [
                                score.hard_kompetensi_teknis,
                                score.hard_sop_k3lh,
                                score.hard_alur_bisnis,
                                score.soft_kedisiplinan,
                                score.soft_kerajinan_inisiatif,
                                score.soft_kerjasama,
                                score.soft_kejujuran,
                                score.soft_tanggung_jawab
                              ].filter((g): g is number => typeof g === 'number' && g !== null);
                              const dAvg = dudiScores.length > 0 ? (dudiScores.reduce((a, b) => a + b, 0) / dudiScores.length).toFixed(1) : null;
                              const hasExamined = score.nilai_sidang !== null && score.nilai_sidang !== undefined;

                              return (
                                <tr key={`sidang-${score.siswa_pkl_id || index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                  <td className="p-3 text-center font-mono font-bold text-slate-400">{globalIndex}</td>
                                  <td className="p-3">
                                    <SiswaIdentityCell
                                      foto={score.foto}
                                      nama={score.nama_siswa}
                                      nis={score.nis}
                                      kelas={score.nama_kelas}
                                      size="sm"
                                      nameClassName="font-bold text-slate-900 dark:text-white"
                                      showMeta={true}
                                    />
                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 pl-12">🏢 {score.mitra_nama}</p>
                                    {score.catatan_pkl && score.catatan_pkl.includes('Mutasi:') ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40 mt-1 ml-12">
                                        🏷️ {score.catatan_pkl} (Selesai)
                                      </span>
                                    ) : score.status === 'SELESAI' ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40 mt-1 ml-12">
                                        ✅ Selesai
                                      </span>
                                    ) : score.status === 'AKTIF' ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-800/40 mt-1 ml-12">
                                        🟢 Aktif
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="p-3">
                                    {score.file_portofolio ? (
                                      <a
                                        href={score.file_portofolio}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                                      >
                                        <FileText size={12} />
                                        Buka Berkas ↗
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium italic">Belum Ada</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    <span className="inline-block px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs">
                                      {dAvg ?? '-'}
                                    </span>
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-lap-${globalIndex}`}
                                      aria-label={`Nilai laporan ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      disabled={!isCompositeMode}
                                      placeholder={!isCompositeMode ? '-' : '0'}
                                      value={!isCompositeMode ? '' : (score.nilai_laporan ?? '')}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'nilai_laporan', e.target.value)}
                                      className={`w-16 h-8 rounded-lg text-xs font-bold text-center shadow-sm focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                        !isCompositeMode
                                          ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                          : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      id={`score-sid-${globalIndex}`}
                                      aria-label={`Nilai sidang ${score.nama_siswa}`}
                                      type="number" min={0} max={100}
                                      disabled={!isCompositeMode}
                                      placeholder={!isCompositeMode ? '-' : '0'}
                                      value={!isCompositeMode ? '' : (score.nilai_sidang ?? '')}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'nilai_sidang', e.target.value)}
                                      className={`w-16 h-8 rounded-lg text-xs font-bold text-center shadow-sm focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                        !isCompositeMode
                                          ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                          : 'bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      id={`score-penguji-${globalIndex}`}
                                      aria-label={`Nama penguji ${score.nama_siswa}`}
                                      type="text"
                                      disabled={!isCompositeMode}
                                      placeholder={!isCompositeMode ? 'Terkunci (DUDI 100%)' : 'Nama Guru Penguji'}
                                      value={!isCompositeMode ? '' : score.penguji_nama}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'penguji_nama', e.target.value)}
                                      className={`w-full min-w-[130px] rounded-lg text-xs font-medium px-2.5 py-1.5 shadow-sm focus:outline-none transition-colors ${
                                        !isCompositeMode
                                          ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                          : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      id={`score-catatan-sidang-${globalIndex}`}
                                      aria-label={`Catatan sidang ${score.nama_siswa}`}
                                      type="text"
                                      disabled={!isCompositeMode}
                                      placeholder={!isCompositeMode ? 'Terkunci (DUDI 100%)' : 'Catatan & masukan penguji'}
                                      value={!isCompositeMode ? '' : score.catatan_sidang}
                                      onChange={(e) => handleScoreChange(score.siswa_pkl_id, 'catatan_sidang', e.target.value)}
                                      className={`w-full min-w-[140px] rounded-lg text-xs font-medium px-2.5 py-1.5 shadow-sm focus:outline-none transition-colors ${
                                        !isCompositeMode
                                          ? 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                          : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                                      }`}
                                    />
                                  </td>
                                  <td className="p-2 text-center font-bold font-mono">
                                    <div className="flex flex-col items-center">
                                      <span className={score.nilai_akhir_pkl !== null ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}>
                                        {score.nilai_akhir_pkl ?? '-'}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-normal tracking-tight">
                                        {isCompositeMode ? (hasExamined ? 'Gabungan' : 'Fallback DUDI') : 'DUDI 100%'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                                    {score.predikat_pkl}
                                  </td>
                                  <td className="p-2 text-center">
                                    {!isCompositeMode ? (
                                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        Non-Sidang
                                      </span>
                                    ) : hasExamined ? (
                                      Number(score.nilai_sidang) >= 70 ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                          <Check size={10} /> Lulus
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                          Revisi
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        Belum Sidang
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

                    {/* Pagination Footer */}
                    {totalItems > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-4">
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{totalItems}</span> Siswa
                          </div>
                          <div className="flex items-center gap-2">
                            <label htmlFor="sidang-limit-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Limit:</label>
                            <select 
                              id="sidang-limit-select"
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
                  </Card>
                </div>
              )}

              {activeTab === 'deskripsi' && (
                /* Tab 3: Deskripsi TP PKL */
                <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                      <Building2 size={18} className="text-indigo-500" />
                      Pengaturan Deskripsi Tujuan Pembelajaran (TP) PKL
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Diisi oleh Ketua Program Keahlian untuk narasi kompetensi yang dicetak pada sertifikat PKL.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="tp-mitra-select" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Pilih Perusahaan / Mitra DUDI
                        </label>
                        <SearchableSelect
                          id="tp-mitra-select"
                          aria-label="Pilih mitra DUDI untuk deskripsi TP"
                          value={selectedMitra}
                          onValueChange={setSelectedMitra}
                          options={[
                            { value: '', label: '-- Semua Mitra DUDI --' },
                            ...mitraOptions
                          ]}
                          placeholder="Pilih Mitra DUDI"
                        />
                      </div>

                      <div>
                        <label htmlFor="tp-deskripsi-text" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Deskripsi Capaian Pembelajaran PKL
                        </label>
                        <textarea
                          id="tp-deskripsi-text"
                          aria-label="Deskripsi capaian pembelajaran PKL"
                          rows={6}
                          value={deskripsiTpText}
                          onChange={(e) => setDeskripsiTpText(e.target.value)}
                          placeholder="Peserta didik mampu memahami dan mempraktikkan SOP industri..."
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-medium"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          const parsed = deskripsiTpSchema.safeParse({
                            mitra_id: selectedMitra,
                            deskripsi_tp: deskripsiTpText,
                          });
                          if (!parsed.success) {
                            toast.error(parsed.error.errors[0]?.message || 'Data TP belum lengkap');
                            return;
                          }
                          saveDeskripsiTpMutation.mutate({
                            mitra_id: selectedMitra,
                            deskripsi_tp: deskripsiTpText,
                          });
                        }}
                        disabled={saveDeskripsiTpMutation.isPending}
                        className="w-full font-bold rounded-xl text-xs"
                      >
                        <Save className="w-4 h-4 mr-1.5" />
                        {saveDeskripsiTpMutation.isPending ? 'Menyimpan...' : 'Simpan Deskripsi TP DUDI'}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                        Daftar Deskripsi TP DUDI Tersimpan
                      </h4>
                      {isLoadingDeskripsi ? (
                        <div className="text-center py-10 text-slate-400 text-xs">Memuat deskripsi...</div>
                      ) : deskripsiListData.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs italic">Belum ada deskripsi TP tersimpan.</div>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          {deskripsiListData?.map((item) => (
                            <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
                              <div className="font-bold text-indigo-600 dark:text-indigo-400">🏢 {item.Mitra?.nama}</div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{item.deskripsi_tp}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </SectionCard>
        </AcademicPageLayout>

        {/* Modal Paste Excel */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Paste Data Nilai PKL dari Excel</h3>
                </div>
                <button type="button" onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Salin kolom dari Excel dengan urutan format: <br />
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                    NIS [TAB] Teknis [TAB] K3LH [TAB] Bisnis [TAB] Disiplin [TAB] Inisiatif [TAB] Kerjasama [TAB] Jujur [TAB] TanggungJwb [TAB] Catatan
                  </strong>
                </p>

                <textarea
                  id="paste-excel-text"
                  aria-label="Area paste data dari Excel"
                  rows={8}
                  value={pasteRawText}
                  onChange={(e) => setPasteRawText(e.target.value)}
                  placeholder="2324100289&#9;90&#9;90&#9;85&#9;90&#9;90&#9;90&#9;90&#9;90&#9;Sangat disiplin"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setShowPasteModal(false)} className="rounded-xl text-xs font-bold">Batal</Button>
                <Button type="button" variant="primary" onClick={handleProcessPaste} className="rounded-xl text-xs font-bold">
                  <Sparkles className="w-4 h-4 mr-1.5" /> Pasang ke Tabel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Certificate Print Preview (Format Resmi Depan & Belakang SMKN 1 Plered) */}
        {selectedSiswaSertifikat && (
          <SertifikatPklModal
            isOpen={Boolean(selectedSiswaSertifikat)}
            onClose={() => setSelectedSiswaSertifikat(null)}
            siswaPklId={selectedSiswaSertifikat.siswa_pkl_id}
            defaultData={selectedSiswaSertifikat}
          />
        )}

        {/* Modal Pengaturan Skema & Bobot Penilaian PKL */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Skema & Bobot Penilaian PKL</h3>
                </div>
                <button type="button" onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
              </div>

              <div className="space-y-4">
                {!canEditScheme && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Mode Hanya-Lihat (Transparansi Guru Pembimbing)</p>
                      <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                        Skema dan persentase bobot penilaian PKL ditetapkan secara terpusat oleh <strong>Bagian Hubin / Kurikulum</strong> untuk menjamin keseragaman seluruh siswa.
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Radio Mode Penilaian */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mode Penilaian yang Diterapkan Sekolah:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canEditScheme}
                      onClick={() => canEditScheme && setFormMode('DUDI_ONLY')}
                      className={`p-3 rounded-2xl border text-left transition-all ${canEditScheme ? 'cursor-pointer select-none' : 'cursor-default'} ${
                        formMode === 'DUDI_ONLY'
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏢</span>
                          <span className="text-xs font-bold">Hanya Industri (DUDI)</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          formMode === 'DUDI_ONLY' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {formMode === 'DUDI_ONLY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal mt-1 leading-snug">
                        Nilai akhir 100% diambil dari 8 aspek kinerja yang dinilai pembimbing DUDI.
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={!canEditScheme}
                      onClick={() => canEditScheme && setFormMode('COMPOSITE')}
                      className={`p-3 rounded-2xl border text-left transition-all ${canEditScheme ? 'cursor-pointer select-none' : 'cursor-default'} ${
                        formMode === 'COMPOSITE'
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-bold ring-2 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">⚖️</span>
                          <span className="text-xs font-bold">Gabungan (DUDI + Sidang)</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          formMode === 'COMPOSITE' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {formMode === 'COMPOSITE' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-normal mt-1 leading-snug">
                        Kompilasi nilai industri dengan nilai laporan dan sidang seminar di sekolah.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Weight Inputs if COMPOSITE */}
                {formMode === 'COMPOSITE' && (
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {canEditScheme ? 'Atur Persentase Bobot (%):' : 'Rincian Persentase Bobot (%):'}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        (formWeightDudi + formWeightLaporan + formWeightSidang) === 100
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}>
                        Total: {formWeightDudi + formWeightLaporan + formWeightSidang}% {(formWeightDudi + formWeightLaporan + formWeightSidang) === 100 ? '✓' : '(Harus 100%)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="input-bobot-dudi" className="block text-[10px] font-bold text-slate-500 mb-1">
                          Industri (DUDI)
                        </label>
                        <div className="relative">
                          <input
                            id="input-bobot-dudi"
                            type="number" min={0} max={100}
                            disabled={!canEditScheme}
                            value={formWeightDudi}
                            onChange={(e) => setFormWeightDudi(Number(e.target.value) || 0)}
                            className={`w-full h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-5 ${
                              !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                            }`}
                          />
                          <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="input-bobot-laporan" className="block text-[10px] font-bold text-slate-500 mb-1">
                          Laporan
                        </label>
                        <div className="relative">
                          <input
                            id="input-bobot-laporan"
                            type="number" min={0} max={100}
                            disabled={!canEditScheme}
                            value={formWeightLaporan}
                            onChange={(e) => setFormWeightLaporan(Number(e.target.value) || 0)}
                            className={`w-full h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-5 ${
                              !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                            }`}
                          />
                          <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="input-bobot-sidang" className="block text-[10px] font-bold text-slate-500 mb-1">
                          Sidang Presentasi
                        </label>
                        <div className="relative">
                          <input
                            id="input-bobot-sidang"
                            type="number" min={0} max={100}
                            disabled={!canEditScheme}
                            value={formWeightSidang}
                            onChange={(e) => setFormWeightSidang(Number(e.target.value) || 0)}
                            className={`w-full h-9 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xs font-bold text-slate-800 dark:text-slate-200 pr-5 ${
                              !canEditScheme ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900'
                            }`}
                          />
                          <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 leading-snug flex items-start gap-1.5">
                      <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                      <span>
                        <strong>Smart Fallback Aktif:</strong> Jika ada siswa yang belum melaksanakan sidang, sistem otomatis menggunakan nilai DUDI secara proporsional agar nilai rapor tidak rusak/kosong.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowSettingsModal(false);
                    navigate(`/hubin/settings?tab=skema${selectedTp ? `&tp=${selectedTp}` : ''}`);
                  }}
                  className="rounded-xl text-xs font-bold px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1.5"
                >
                  <Settings size={14} />
                  Pusat Pengaturan & Referensi Hubin
                </Button>

                <div className="flex items-center gap-2">
                  {canEditScheme ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => setShowSettingsModal(false)} className="rounded-xl text-xs font-bold px-4 py-2">
                        Batal
                      </Button>
                      <Button
                        type="button"
                        disabled={updateSettingsMutation.isPending || (formMode === 'COMPOSITE' && (formWeightDudi + formWeightLaporan + formWeightSidang) !== 100)}
                        onClick={() => {
                          updateSettingsMutation.mutate({
                            assessmentMode: formMode,
                            weightDudi: formWeightDudi,
                            weightLaporan: formWeightLaporan,
                            weightSidang: formWeightSidang
                          });
                        }}
                        className="rounded-xl text-xs font-bold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {updateSettingsMutation.isPending ? 'Menyimpan...' : 'Terapkan Skema'}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setShowSettingsModal(false)} className="rounded-xl text-xs font-bold px-4 py-2">
                      Tutup
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default InputNilaiPklPage;
