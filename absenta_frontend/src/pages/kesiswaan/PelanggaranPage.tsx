import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Label } from '../../components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { useDebounce } from '../../hooks/useDebounce';
import { kesiswaanApi, kesiswaanQueryKeys } from '../../api/kesiswaan.api';
import type { Pelanggaran, JenisPelanggaran } from '../../api/kesiswaan.api';
import { bpbkApi, bpbkQueryKeys } from '../../api/bpbk.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { resolveProfilePhotoUrl } from '../../lib/utils';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Trash2,
  Edit2,
  BookOpen,
  TrendingDown,
  Search,
  X,
  Plus,
  User,
  HeartHandshake
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Loader } from '../../components/ui/Loader';
import { SiswaIdentityCell } from '../../components/common/SiswaIdentityCell';

import { z } from 'zod';

import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useNavStore } from '../../store/navStore';
import { useJenisPelanggaranOptions } from '../../hooks/useJenisPelanggaranOptions';
import { useWaliKelasOptions } from '../../hooks/useWaliKelasOptions';
import { TahunPelajaranSelect } from '../../components/common/TahunPelajaranSelect';
import { SemesterSelect } from '../../components/common/SemesterSelect';

import { formatDate } from '../../utils/layoutUtils';

// Lazy load heavy components
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

// Tipe badge variant eksplisit – pengganti tipe longgar
type BadgeVariant = 'error' | 'warning' | 'success' | 'outline' | 'default';

interface StatusConfig {
  variant: BadgeVariant;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}

interface Student {
  id: string;
  nama_siswa?: string;
  nis?: string;
  Kelas?: {
    nama_kelas: string;
  };
  foto_profile_url?: string;
  no_rfid?: string;
}

type GuruProfileType = {
  wali_kelas_di?: { id?: string; nama_kelas?: string } | string;
  kelas_id?: string;
  id?: string;
};

// Skema validasi Zod untuk form data (Pilar 25)
const pelanggaranSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa wajib dipilih'),
  jenis_pelanggaran: z.string().min(1, 'Kategori perilaku wajib dipilih'),
  poin: z.number().min(0, 'Bobot poin minimal 0'),
  keterangan: z.string().optional(),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  status: z.string().min(1, 'Status wajib dipilih')
});

export interface PelanggaranPageProps {
  hideLayout?: boolean;
}

export default React.memo(function PelanggaranPage({ hideLayout = false }: PelanggaranPageProps) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const guruProfile = (user as { guru_profile?: GuruProfileType } | null)?.guru_profile;
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);

  // Reset pagination saat search term berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  const [selectedTahunPelajaranId, setSelectedTahunPelajaranId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  const { activeWorkspaceId } = useNavStore();
  const { rawList: waliKelasAssignments } = useWaliKelasOptions();

  // Resolusi nama & ID rombel binaan Wali Kelas menggunakan profile & useWaliKelasOptions hook
  const effectiveWaliKelasId = useMemo(() => {
    if ((user as any)?.walikelas_kelas?.id) return (user as any).walikelas_kelas.id;
    const directObj = guruProfile?.wali_kelas_di;
    const directId = typeof directObj === 'object' ? directObj?.id : directObj || guruProfile?.kelas_id;
    if (directId) return directId;

    if (waliKelasAssignments && waliKelasAssignments.length > 0 && user?.id) {
      const found = waliKelasAssignments.find(
        (item: any) => item.user_id === user.id || item.Guru?.user_id === user.id || item.Guru?.id === guruProfile?.id
      );
      if (found?.kelas_id) return found.kelas_id;
      if (found?.Kelas?.id) return found.Kelas.id;
      if (found?.StrukturOrganisasi?.kelas_id) return found.StrukturOrganisasi.kelas_id;
      if (found?.StrukturOrganisasi?.Kelas?.id) return found.StrukturOrganisasi.Kelas.id;
    }
    return null;
  }, [user, guruProfile, waliKelasAssignments]);

  const waliKelasNama = useMemo(() => {
    if ((user as any)?.walikelas_kelas?.nama_kelas) return (user as any).walikelas_kelas.nama_kelas;
    const directObj = guruProfile?.wali_kelas_di;
    if (typeof directObj === 'object' && directObj?.nama_kelas) return directObj.nama_kelas;

    if (waliKelasAssignments && waliKelasAssignments.length > 0 && user?.id) {
      const found = waliKelasAssignments.find(
        (item: any) => item.user_id === user.id || item.Guru?.user_id === user.id || item.Guru?.id === guruProfile?.id
      );
      if (found?.Kelas?.nama_kelas) return found.Kelas.nama_kelas;
      if (found?.StrukturOrganisasi?.Kelas?.nama_kelas) return found.StrukturOrganisasi.Kelas.nama_kelas;
    }
    return '';
  }, [user, guruProfile, waliKelasAssignments]);

  const isWaliKelasRole = useMemo(() => {
    const pos = user?.position_codes || [];
    return !!effectiveWaliKelasId || pos.includes('WALIKELAS');
  }, [user, effectiveWaliKelasId]);

  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlContext = searchParams.get('context') || searchParams.get('tab') || searchParams.get('mode');

  const { isKesiswaan, isKurikulum, isKepsek, isAdmin, isBpbk, can } = useCapabilities();

  // Deteksi apakah user memegang Double Jabatan (Wali Kelas + Pimpinan/Struktur Sekolah)
  const isDualRoleUser = useMemo(() => {
    if (!effectiveWaliKelasId) return false;
    return isAdmin || isKesiswaan || isKurikulum || isKepsek || can('affairs.violations.manage');
  }, [effectiveWaliKelasId, isAdmin, isKesiswaan, isKurikulum, isKepsek, can]);

  const handleContextSwitch = useCallback((targetContext: 'walikelas' | 'kesiswaan') => {
    const params = new URLSearchParams(location.search);
    params.set('context', targetContext);
    navigate({ search: params.toString() }, { replace: true });
  }, [location.search, navigate]);

  const isWaliKelas = useMemo(() => {
    if (!effectiveWaliKelasId) return false;

    if (urlContext === 'walikelas' || urlContext === 'manual') return true;
    if (urlContext === 'kesiswaan' || urlContext === 'kurikulum' || urlContext === 'sekolah') return false;

    const isPureAdminOrKesiswaan = isAdmin || isKesiswaan || can('affairs.violations.manage');

    if (activeWorkspaceId === 'WALIKELAS_WORKSPACE') return true;
    if (!isPureAdminOrKesiswaan && isWaliKelasRole) return true;
    return false;
  }, [effectiveWaliKelasId, urlContext, activeWorkspaceId, isAdmin, isKesiswaan, can, isWaliKelasRole]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    siswa_id: '',
    jenis_pelanggaran: '',
    poin: 0,
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'BARU'
  });
  const [selectedSiswa, setSelectedSiswa] = useState<Student | null>(null);

  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canDeleteViolation = isAdmin || can('affairs.violations.delete');
  const canCounsel = isBpbk || isAdmin || can('bk.konseling.create') || can('bk.counselings.create');

  const [counselingTarget, setCounselingTarget] = useState<Pelanggaran | null>(null);
  const [counselingPendingIds, setCounselingPendingIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'records' | 'aggregated'>(() =>
    isBpbk && !isKesiswaan ? 'aggregated' : 'records'
  );
  const [counselingTipe, setCounselingTipe] = useState<'INDIVIDU' | 'KELOMPOK' | 'KARIR'>('INDIVIDU');
  const [counselingMasalah, setCounselingMasalah] = useState('');
  const [counselingSolusi, setCounselingSolusi] = useState('');
  const [counselingStatus, setCounselingStatus] = useState<'PROSES' | 'SELESAI'>('PROSES');
  const [autoAdvanceStatus, setAutoAdvanceStatus] = useState(true);
  const [savingCounseling, setSavingCounseling] = useState(false);

  // ── useQuery: Fetch pelanggaran list ─────────────────────────────────────
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page: viewMode === 'aggregated' ? 1 : currentPage,
      limit: viewMode === 'aggregated' ? 500 : itemsPerPage,
      search: debouncedSearch,
      elevated_context: 'true',
      tahun_pelajaran_id: selectedTahunPelajaranId || undefined,
      semester_id: selectedSemesterId || undefined,
    };
    if (isWaliKelas && effectiveWaliKelasId) {
      params.kelas_id = effectiveWaliKelasId;
    }
    return params;
  }, [viewMode, currentPage, itemsPerPage, debouncedSearch, isWaliKelas, effectiveWaliKelasId, selectedTahunPelajaranId, selectedSemesterId]);

  const { data: pelanggaranRes, isLoading: loading, refetch } = useQuery({
    queryKey: kesiswaanQueryKeys.pelanggaranList(queryParams),
    queryFn: () => kesiswaanApi.getPelanggaran(queryParams),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => pelanggaranRes?.data?.list || pelanggaranRes?.list || [], [pelanggaranRes]);
  const totalPages = pelanggaranRes?.pagination?.totalPages || 1;
  const totalItems = pelanggaranRes?.pagination?.total || data.length;

  // Hook Kanonikal Jenis Pelanggaran (Query Caching & Auto-sync)
  const { rawList: jenisPelanggaranList, options: jenisPelanggaranSelectOptions } = useJenisPelanggaranOptions({ valueMode: 'name' });

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Comprehensive Cache Invalidation Helper (Pilar Cache Hardening)
  const invalidateAllPelanggaranCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] });
    queryClient.invalidateQueries({ queryKey: ['jenis-pelanggaran-options-list'] });
    queryClient.invalidateQueries({ queryKey: ['siswa-options-list'] });
    queryClient.invalidateQueries({ queryKey: ['bpbk-cases-list'] });
    queryClient.invalidateQueries({ queryKey: ['bpbk-ews-list'] });
    queryClient.invalidateQueries({ queryKey: ['pelanggaran-list'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    queryClient.invalidateQueries({ queryKey: ['pelanggaran-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
  }, [queryClient]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      jenis_pelanggaran: '',
      poin: 0,
      keterangan: '',
      tanggal: new Date().toISOString().split('T')[0],
      status: 'BARU'
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = pelanggaranSchema.safeParse(formData);
    if (!validation.success) {
      const errMsg = validation.error.issues[0]?.message || 'Data form tidak valid';
      toast.error(errMsg);
      return;
    }
    try {
      if (selectedId) {
        await kesiswaanApi.updatePelanggaran(selectedId, formData);
        toast.success('Catatan perkembangan berhasil diperbarui');
      } else {
        await kesiswaanApi.createPelanggaran(formData);
        toast.success('Catatan perkembangan berhasil disimpan');
      }
      invalidateAllPelanggaranCaches();
      queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.all });
      setModalOpen(false);
      refetch();
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      toast.error('Gagal menyimpan catatan');
    }
  }, [selectedId, formData, refetch, queryClient, invalidateAllPelanggaranCaches, resetForm]);

  const handleEdit = useCallback((item: Pelanggaran) => {
    setFormData({
      siswa_id: item.siswa_id,
      jenis_pelanggaran: item.jenis_pelanggaran,
      poin: item.poin,
      keterangan: item.keterangan || '',
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      status: item.status
    });
    setSelectedSiswa(item.Siswa ? { ...item.Siswa, id: item.siswa_id } : null);
    setSelectedId(item.id);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (item: Pelanggaran) => {
    const ok = await confirm({
      title: 'Hapus Catatan',
      description: 'Apakah Anda yakin ingin menghapus catatan perkembangan ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      try {
        await kesiswaanApi.deletePelanggaran(item.id);
        toast.success('Catatan perkembangan berhasil dihapus');
        invalidateAllPelanggaranCaches();
        queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.all });
        refetch();
      } catch {
        toast.error('Gagal menghapus catatan perkembangan');
      }
    }
  }, [confirm, invalidateAllPelanggaranCaches, queryClient, refetch]);

  const handleOpenBimbing = useCallback((item: Pelanggaran) => {
    setCounselingTarget(item);
    setCounselingPendingIds(item.status !== 'SELESAI' ? [item.id] : []);
    setCounselingTipe('INDIVIDU');
    setCounselingMasalah(
      `Pembinaan pelanggaran: ${item.jenis_pelanggaran} (+${item.poin} poin)${item.keterangan ? ` — ${item.keterangan}` : ''}`
    );
    setCounselingSolusi('');
    setCounselingStatus('PROSES');
    setAutoAdvanceStatus(item.status === 'BARU' || item.status === 'PERLU_PEMBINAAN');
  }, []);

  const aggregatedStudents = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        siswa_id: string;
        Siswa: Pelanggaran['Siswa'];
        totalIncidents: number;
        totalPoints: number;
        pendingCount: number;
        processCount: number;
        pendingIds: string[];
        categoryCounts: Map<string, number>;
        latestItem: Pelanggaran;
      }
    >();

    for (const item of data as Pelanggaran[]) {
      const sid = item.siswa_id;
      if (!sid) continue;
      let entry = map.get(sid);
      if (!entry) {
        entry = {
          id: sid,
          siswa_id: sid,
          Siswa: item.Siswa,
          totalIncidents: 0,
          totalPoints: 0,
          pendingCount: 0,
          processCount: 0,
          pendingIds: [],
          categoryCounts: new Map(),
          latestItem: item,
        };
        map.set(sid, entry);
      }
      entry.totalIncidents += 1;
      entry.totalPoints += Number(item.poin || 0);
      if (item.status === 'BARU' || item.status === 'PERLU_PEMBINAAN') {
        entry.pendingCount += 1;
        entry.pendingIds.push(item.id);
      } else if (item.status === 'PROSES') {
        entry.processCount += 1;
        entry.pendingIds.push(item.id);
      }
      const cat = item.jenis_pelanggaran || 'Lainnya';
      entry.categoryCounts.set(cat, (entry.categoryCounts.get(cat) || 0) + 1);
      if (new Date(item.tanggal).getTime() > new Date(entry.latestItem.tanggal).getTime()) {
        entry.latestItem = item;
      }
    }

    return Array.from(map.values())
      .map((e) => ({
        ...e,
        topCategories: Array.from(e.categoryCounts.entries()).map(([name, cnt]) =>
          cnt > 1 ? `${name} (${cnt}x)` : name
        ),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || b.totalIncidents - a.totalIncidents);
  }, [data]);

  const handleOpenBimbingAggregated = useCallback((row: (typeof aggregatedStudents)[number]) => {
    setCounselingTarget({
      ...row.latestItem,
      poin: row.totalPoints,
      jenis_pelanggaran: row.topCategories.join(', '),
      keterangan: `Akumulasi ${row.totalIncidents} kejadian pelanggaran`,
    });
    setCounselingPendingIds(row.pendingIds);
    setCounselingTipe('INDIVIDU');
    setCounselingMasalah(
      `Pembinaan akumulasi ${row.totalIncidents} pelanggaran (+${row.totalPoints} poin): ${row.topCategories.join(', ')}`
    );
    setCounselingSolusi('');
    setCounselingStatus('PROSES');
    setAutoAdvanceStatus(row.pendingCount > 0 || row.processCount > 0);
  }, []);

  const handleSubmitBimbing = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counselingTarget) return;
    if (!counselingMasalah.trim()) {
      toast.error('Harap isi uraian pembinaan / masalah');
      return;
    }
    setSavingCounseling(true);
    try {
      await bpbkApi.createKonseling({
        siswa_id: counselingTarget.siswa_id,
        tanggal: new Date().toISOString().split('T')[0],
        tipe: counselingTipe,
        masalah: counselingMasalah.trim(),
        solusi: counselingSolusi.trim() || undefined,
        status: counselingStatus,
        visibility: 'LIMITED',
      });
      if (autoAdvanceStatus && counselingPendingIds.length > 0) {
        const nextStatus = counselingStatus === 'SELESAI' ? 'SELESAI' : 'PROSES';
        await Promise.all(
          counselingPendingIds.map((pid) =>
            kesiswaanApi.updatePelanggaran(pid, { status: nextStatus })
          )
        );
      }
      await Promise.all([
        invalidateAllPelanggaranCaches(),
        queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['bpbk-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['ews-risk-students'] }),
        queryClient.invalidateQueries({ queryKey: ['konseling-history'] }),
      ]);
      toast.success(`Bimbingan untuk ${counselingTarget.Siswa?.nama_siswa || 'siswa'} berhasil dicatat`);
      setCounselingTarget(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mencatat sesi bimbingan');
    } finally {
      setSavingCounseling(false);
    }
  }, [counselingTarget, counselingPendingIds, counselingTipe, counselingMasalah, counselingSolusi, counselingStatus, autoAdvanceStatus, invalidateAllPelanggaranCaches, queryClient, refetch]);

  const statusConfig: Record<string, StatusConfig> = useMemo(() => ({
    'BARU': {
      variant: 'error',
      label: 'Menunggu Pembinaan',
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
      colorClass: 'text-rose-600 bg-rose-50 border-rose-100'
    },
    'PERLU_PEMBINAAN': {
      variant: 'error',
      label: 'Menunggu Pembinaan',
      icon: <AlertCircle className="w-3 h-3 mr-1" />,
      colorClass: 'text-rose-600 bg-rose-50 border-rose-100'
    },
    'PROSES': {
      variant: 'warning',
      label: 'Pendampingan',
      icon: <Clock className="w-3 h-3 mr-1" />,
      colorClass: 'text-amber-600 bg-amber-50 border-amber-100'
    },
    'SELESAI': {
      variant: 'success',
      label: 'Selesai Pembinaan',
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    },
    'SELESAI_PEMBINAAN': {
      variant: 'success',
      label: 'Selesai Pembinaan',
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    }
  }), []);

  const getStatusDisplay = useCallback((status: string) => {
    const defaultConfig: StatusConfig = { variant: 'outline', label: status, icon: null, colorClass: '' };
    const config: StatusConfig = statusConfig[status] || defaultConfig;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
        {config.icon}
        {config.label}
      </Badge>
    );
  }, [statusConfig]);

  const renderMobileCard = useCallback((item: Pelanggaran) => {
    const statusInfo = statusConfig[item.status] || { variant: 'outline', label: item.status, icon: null };
    return (
      <div
        key={item.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <SiswaIdentityCell
              foto={item.Siswa?.foto}
              nama={item.Siswa?.nama_siswa}
              nis={item.Siswa?.nis}
              kelas={item.Siswa?.Kelas?.nama_kelas}
              size="md"
              nameClassName="font-extrabold text-xs uppercase tracking-tight"
              showMeta={true}
            />
          </div>
          <Badge variant={statusInfo.variant} className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg flex items-center gap-1">
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </Badge>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Kategori Perilaku</span>
            <span className={cn(
              "font-black text-xs px-2 py-0.5 rounded-md",
              (Number(item.poin) || 0) >= 50 
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" 
                : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
            )}>
              +{item.poin} Poin
            </span>
          </div>
          <p className="font-extrabold text-slate-800 dark:text-slate-200">
            {item.jenis_pelanggaran || '-'}
          </p>
          {item.keterangan && (
            <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
              "{item.keterangan}"
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1 font-bold">
            <Calendar size={12} className="text-slate-400" />
            <span>{item.tanggal ? formatDate(item.tanggal, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
          </div>
          <div className="flex items-center gap-1">
            {canCounsel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenBimbing(item)}
                className="h-8 px-2.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1"
              >
                <HeartHandshake size={13} />
                <span>Bimbing</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(item)}
              className="h-8 px-2.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1"
            >
              <Edit2 size={13} />
              <span>Edit</span>
            </Button>
            {canDeleteViolation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item)}
                className="h-8 px-2.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Hapus</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }, [statusConfig, canCounsel, canDeleteViolation, handleOpenBimbing, handleEdit, handleDelete]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
           {value ? formatDate(value, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_: unknown, item: Pelanggaran) => (
        <SiswaIdentityCell
          foto={item.Siswa?.foto}
          nama={item.Siswa?.nama_siswa}
          nis={item.Siswa?.nis}
          kelas={item.Siswa?.Kelas?.nama_kelas}
          size="xs"
          nameClassName="font-black text-xs uppercase tracking-tight"
          showMeta={false}
        />
      )
    },
    {
      key: 'jenis_pelanggaran',
      label: 'Kategori Perilaku',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{value}</span>
      )
    },
    {
      key: 'poin',
      label: 'Bobot',
      sortable: true,
      render: (value: number) => (
        <span className={cn(
          "font-black text-sm",
          value >= 50 ? "text-rose-600" : "text-amber-600"
        )}>+{value}</span>
      )
    },
    {
      key: 'status',
      label: 'Tahapan',
      render: (value: string) => getStatusDisplay(value)
    },
    {
      key: 'actions',
      label: 'Tindakan',
      render: (_: unknown, item: Pelanggaran) => (
        <div className="flex gap-1">
          {canCounsel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenBimbing(item)}
              className="w-8 h-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              title="Bimbing / Catat Konseling"
              aria-label="Bimbing siswa"
            >
              <HeartHandshake size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            className="w-8 h-8 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            title="Edit catatan"
            aria-label="Edit catatan"
          >
            <Edit2 size={14} />
          </Button>
          {canDeleteViolation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item)}
              className="w-8 h-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              title="Hapus catatan"
              aria-label="Hapus catatan"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      )
    }
  ], [getStatusDisplay, canCounsel, canDeleteViolation, handleOpenBimbing, handleEdit, handleDelete]);

  const aggregatedColumns: Column[] = useMemo(() => [
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_: unknown, row: (typeof aggregatedStudents)[number]) => (
        <SiswaIdentityCell
          student={row.Siswa}
          showNis={false}
          avatarSize="sm"
          nameClassName="font-bold text-slate-800 dark:text-slate-100 text-xs"
          subtitleClassName="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
        />
      )
    },
    {
      key: 'topCategories',
      label: 'Ringkasan Pelanggaran',
      render: (_: unknown, row: (typeof aggregatedStudents)[number]) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2 max-w-xs">
          {row.topCategories.join(', ')}
        </span>
      )
    },
    {
      key: 'totalIncidents',
      label: 'Frekuensi',
      render: (_: unknown, row: (typeof aggregatedStudents)[number]) => (
        <Badge variant="outline" className="text-[10px] font-black">
          {row.totalIncidents}x Kejadian
        </Badge>
      )
    },
    {
      key: 'totalPoints',
      label: 'Total Bobot',
      render: (_: unknown, row: (typeof aggregatedStudents)[number]) => (
        <span className="font-black text-rose-600 dark:text-rose-400 text-xs">+{row.totalPoints}</span>
      )
    },
    {
      key: 'status',
      label: 'Tahapan Pembinaan',
      render: (_: unknown, row: (typeof aggregatedStudents)[number]) => {
        if (row.pendingCount > 0) return getStatusDisplay('BARU');
        if (row.processCount > 0) return getStatusDisplay('PROSES');
        return getStatusDisplay('SELESAI');
      }
    },
    {
      key: 'actions',
      label: 'Tindakan',
      render: (_: unknown, row: (typeof aggregatedStudents)[number]) => (
        <div className="flex gap-1 justify-end">
          {canCounsel && (
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              onClick={() => handleOpenBimbingAggregated(row)}
              className="bg-emerald-600 hover:bg-emerald-700 text-[10px] h-7 px-2.5 rounded-lg font-bold"
            >
              <HeartHandshake size={12} className="mr-1" />
              Bimbing
            </Button>
          )}
        </div>
      )
    }
  ], [getStatusDisplay, canCounsel, handleOpenBimbingAggregated]);

  const pageStats = useMemo(() => {
    const total = data?.length || 0;
    const today = data?.filter(d => {
      const dDate = new Date(d.tanggal).toDateString();
      return dDate === new Date().toDateString();
    }).length || 0;
    const totalPoints = data?.reduce((acc, curr) => acc + (Number(curr.poin) || 0), 0) || 0;
    const pending = data?.filter(d => d.status !== 'SELESAI').length || 0;

    return [
      {
        title: 'Total Jejak',
        value: total,
        icon: <BookOpen size={14} />,
        gradient: 'from-indigo-500 to-violet-600',
        subtitle: 'Seluruh catatan perilaku'
      },
      {
        title: 'Catatan Hari Ini',
        value: today,
        icon: <Calendar size={14} />,
        gradient: 'from-amber-500 to-orange-600',
        subtitle: 'Dibuat pada hari ini'
      },
      {
        title: 'Poin Akumulasi',
        value: totalPoints,
        icon: <TrendingDown size={14} />,
        gradient: 'from-rose-500 to-pink-600',
        subtitle: 'Total bobot poin tercatat'
      },
      {
        title: 'Menunggu Solusi',
        value: pending,
        icon: <Clock size={14} />,
        gradient: 'from-blue-500 to-cyan-600',
        subtitle: 'Belum selesai ditangani'
      },
    ];
  }, [data]);

  const toolbar = useMemo(() => (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Context Switcher Pill untuk Pengguna Double Jabatan (Wali Kelas + Pimpinan) */}
      {isDualRoleUser && (
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs">
          <button
            type="button"
            onClick={() => handleContextSwitch('walikelas')}
            className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${
              isWaliKelas
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🟢</span>
            <span>Rombel {waliKelasNama || 'Binaan'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleContextSwitch('kesiswaan')}
            className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${
              !isWaliKelas
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🔵</span>
            <span>Seluruh Sekolah</span>
          </button>
        </div>
      )}

      <div className="w-48">
        <TahunPelajaranSelect
          value={selectedTahunPelajaranId}
          onValueChange={setSelectedTahunPelajaranId}
          autoSelectActive={true}
          triggerClassName="h-9 text-[11px] font-medium w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
        />
      </div>
      <div className="w-40">
        <SemesterSelect
          tahunPelajaranId={selectedTahunPelajaranId}
          value={selectedSemesterId}
          onValueChange={setSelectedSemesterId}
          autoSelectActive={true}
          triggerClassName="h-9 text-[11px] font-medium w-full rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
        />
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <Input
          placeholder="Cari Siswa / Kategori..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Cari Siswa atau Kategori"
          className="w-48 h-9 pl-9 pr-8 text-[11px] font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Hapus pencarian"
            aria-label="Hapus kata kunci pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs">
        <button
          type="button"
          onClick={() => { setViewMode('aggregated'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold cursor-pointer ${
            viewMode === 'aggregated'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Rekap Per Siswa
        </button>
        <button
          type="button"
          onClick={() => { setViewMode('records'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold cursor-pointer ${
            viewMode === 'records'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Log Kejadian
        </button>
      </div>

      <Button
        variant="toolbarPrimary"
        size="toolbar"
        onClick={() => { resetForm(); setModalOpen(true); }}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Tambah Catatan
      </Button>
    </div>
  ), [isDualRoleUser, isWaliKelas, waliKelasNama, handleContextSwitch, selectedTahunPelajaranId, selectedSemesterId, searchTerm, resetForm, viewMode]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: isWaliKelas ? 'Wali Kelas' : 'Kesiswaan', path: isWaliKelas ? '/academic/siswa' : '/kesiswaan' },
    { label: 'Kasus Pelanggaran', path: '/kesiswaan/pelanggaran' }
  ], [isWaliKelas]);

  const mainBody = (
    <>
      <Card noPadding className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900 mb-6">
        {isMobile ? (
          <div className="p-4 space-y-4">
            {/* Mobile Filter & Action Header */}
            <div className="space-y-2.5">
              {toolbar}
            </div>

            <MobileAcademicList
              title={viewMode === 'aggregated' ? 'Rekap Pelanggaran Per Siswa' : 'Catatan Perkembangan & Pelanggaran'}
              data={viewMode === 'aggregated' ? aggregatedStudents : data}
              loading={loading}
              totalItems={viewMode === 'aggregated' ? aggregatedStudents.length : totalItems}
              emptyMessage="Belum ada data perkembangan tercatat"
              pagination={viewMode === 'aggregated' ? undefined : {
                currentPage,
                totalPages,
                totalItems,
                itemsPerPage,
                onPageChange: handlePageChange,
                onLimitChange: (limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }
              }}
              renderCard={viewMode === 'aggregated' ? (row: (typeof aggregatedStudents)[number]) => (
                <div key={row.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <SiswaIdentityCell student={row.Siswa} showNis={false} avatarSize="sm" nameClassName="font-bold text-slate-800 dark:text-slate-100 text-xs" subtitleClassName="text-[10px] font-bold text-slate-400 uppercase" />
                    <span className="font-black text-rose-600 text-xs shrink-0">+{row.totalPoints} ({row.totalIncidents}x)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{row.topCategories.join(', ')}</p>
                  <div className="flex items-center justify-between pt-1">
                    {row.pendingCount > 0 ? getStatusDisplay('BARU') : row.processCount > 0 ? getStatusDisplay('PROSES') : getStatusDisplay('SELESAI')}
                    {canCounsel && (
                      <Button variant="toolbarPrimary" size="toolbar" onClick={() => handleOpenBimbingAggregated(row)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8 px-3 rounded-lg font-bold">
                        <HeartHandshake size={13} className="mr-1" /> Bimbing
                      </Button>
                    )}
                  </div>
                </div>
              ) : renderMobileCard}
            />
          </div>
        ) : (
          <Table
            columns={viewMode === 'aggregated' ? aggregatedColumns : columns}
            data={viewMode === 'aggregated' ? aggregatedStudents : data}
            loading={loading}
            emptyMessage="Belum ada data perkembangan tercatat"
            toolbarLeft={toolbar}
            pagination={viewMode === 'aggregated' ? undefined : {
              currentPage,
              totalPages,
              totalItems,
              itemsPerPage,
              onPageChange: handlePageChange,
              onLimitChange: (limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }
            }}
          />
        )}
      </Card>

      <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedId ? "Edit Catatan" : "Catatan Perkembangan Baru"} size="md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50/70 to-orange-50 dark:from-rose-950/30 dark:to-amber-950/30 border border-rose-200/80 dark:border-rose-800/50">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs font-black text-xs">
                !
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Catatan Perkembangan & Kedisiplinan</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Catat pelanggaran atau perilaku siswa beserta bobot poin pembinaannya.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Identitas Siswa</Label>
              {!selectedSiswa ? (
                <Suspense fallback={<div className="h-10 animate-pulse bg-slate-100 rounded-xl" />}>
                  <SmartStudentPicker
                    scope="piket"
                    onSelect={(s) => {
                      setSelectedSiswa(s);
                      setFormData(prev => ({ ...prev, siswa_id: s.id }));
                    }}
                    placeholder="Scan kartu atau ketik nama siswa..."
                    className="w-full"
                    autoFocus
                    aria-label="Pilih siswa"
                  />
                </Suspense>
              ) : (
                <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-700 overflow-hidden">
                      {selectedSiswa.foto_profile_url ? (
                        <img src={resolveProfilePhotoUrl(selectedSiswa.foto_profile_url)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-indigo-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tight leading-none">
                        {selectedSiswa.nama_siswa}
                      </div>
                      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                        {selectedSiswa.Kelas?.nama_kelas || 'Tanpa Kelas'} • {selectedSiswa.nis || selectedSiswa.no_rfid || 'ID Aktif'}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSiswa(null);
                      setFormData(prev => ({ ...prev, siswa_id: '' }));
                    }}
                    className="h-8 w-8 p-0 rounded-full hover:bg-rose-50 text-rose-500"
                    aria-label="Batalkan pilihan siswa"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-rose-50/45 dark:bg-rose-950/20 border border-rose-200/70">
              <Label htmlFor="jenis-pelanggaran-select" className="text-[10px] font-black uppercase tracking-widest text-rose-800 dark:text-rose-300">Kategori Perilaku</Label>
              <SearchableSelect
                id="jenis-pelanggaran-select"
                value={formData.jenis_pelanggaran}
                onValueChange={(val) => {
                  const selectedItem = (jenisPelanggaranList || []).find(i => i.nama_pelanggaran === val || i.id === val);
                  setFormData(prev => ({
                    ...prev,
                    jenis_pelanggaran: selectedItem ? selectedItem.nama_pelanggaran : val,
                    poin: selectedItem ? selectedItem.poin : prev.poin
                  }));
                }}
                options={jenisPelanggaranSelectOptions}
                placeholder="Pilih kategori perilaku..."
                searchPlaceholder="Cari kategori..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-amber-50/45 dark:bg-amber-950/20 border border-amber-200/70">
              <div className="space-y-1.5">
                <Label htmlFor="poin-input" className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">Bobot Poin</Label>
                <Input
                  id="poin-input"
                  type="number"
                  min="0"
                  value={formData.poin}
                  onChange={(e) => setFormData(prev => ({...prev, poin: Number(e.target.value)}))}
                  required
                  className="h-11 bg-white dark:bg-slate-900 border-amber-200/80 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tanggal-input" className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">Waktu Kejadian</Label>
                <Input
                  id="tanggal-input"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({...prev, tanggal: e.target.value}))}
                  required
                  className="h-11 bg-white dark:bg-slate-900 border-amber-200/80 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-sky-50/45 dark:bg-sky-950/20 border border-sky-200/70">
              <Label htmlFor="keterangan-input" className="text-[10px] font-black uppercase tracking-widest text-sky-800 dark:text-sky-300">Catatan/Keterangan</Label>
              <Input
                id="keterangan-input"
                value={formData.keterangan}
                onChange={(e) => setFormData(prev => ({...prev, keterangan: e.target.value}))}
                placeholder="Tambahkan konteks kejadian..."
                className="h-11 bg-white dark:bg-slate-900 border-sky-200/80 rounded-xl"
              />
            </div>
            {selectedId && (
              <div className="space-y-2">
                <Label htmlFor="status-select" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tahapan Pendampingan</Label>
                <SearchableSelect
                  id="status-select"
                  value={formData.status}
                  onValueChange={(val) => setFormData(prev => ({...prev, status: val}))}
                  options={[
                    { label: 'MENUNGGU PEMBINAAN', value: 'BARU' },
                    { label: 'PENDAMPINGAN / PROSES', value: 'PROSES' },
                    { label: 'SELESAI PEMBINAAN', value: 'SELESAI' }
                  ]}
                  placeholder="Pilih tahapan..."
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
              <Button type="button" variant="outline" className="rounded-xl h-12 px-6 font-bold" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white hover:text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 border-none">Simpan Catatan</Button>
            </div>
          </form>
        </Modal>
      </Suspense>

      {/* Modal Bimbing / Konseling Pelanggaran */}
      <Suspense fallback={null}>
        <Modal
          isOpen={Boolean(counselingTarget)}
          onClose={() => setCounselingTarget(null)}
          title="Catat Bimbingan / Konseling Pelanggaran"
          size="lg"
        >
          {counselingTarget && (
            <form onSubmit={handleSubmitBimbing} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {counselingTarget.Siswa?.nama_siswa || 'Siswa'}
                  </span>
                  <Badge variant="error" className="text-[10px] font-bold">
                    +{counselingTarget.poin} Poin
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {counselingTarget.Siswa?.Kelas?.nama_kelas || '-'} • {counselingTarget.jenis_pelanggaran}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipe Sesi</Label>
                  <SearchableSelect
                    value={counselingTipe}
                    onValueChange={(val) => setCounselingTipe((val as 'INDIVIDU' | 'KELOMPOK' | 'KARIR') || 'INDIVIDU')}
                    options={[
                      { value: 'INDIVIDU', label: 'Konseling Individu' },
                      { value: 'KELOMPOK', label: 'Konseling Kelompok' },
                      { value: 'KARIR', label: 'Konseling Karir' },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Pendampingan</Label>
                  <SearchableSelect
                    value={counselingStatus}
                    onValueChange={(val) => setCounselingStatus((val as 'PROSES' | 'SELESAI') || 'PROSES')}
                    options={[
                      { value: 'PROSES', label: 'Pendampingan Berjalan (PROSES)' },
                      { value: 'SELESAI', label: 'Selesai Pembinaan (SELESAI)' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Fokus Bimbingan / Masalah</Label>
                <textarea
                  rows={3}
                  value={counselingMasalah}
                  onChange={(e) => setCounselingMasalah(e.target.value)}
                  className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Solusi / Komitmen Pembinaan</Label>
                <textarea
                  rows={2}
                  value={counselingSolusi}
                  onChange={(e) => setCounselingSolusi(e.target.value)}
                  placeholder="Catat hasil pembinaan dan komitmen siswa..."
                  className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {counselingTarget.status !== 'SELESAI' && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAdvanceStatus}
                    onChange={(e) => setAutoAdvanceStatus(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Otomatis perbarui tahapan pelanggaran menjadi{' '}
                    <strong>{counselingStatus === 'SELESAI' ? 'Selesai Pembinaan' : 'Pendampingan (PROSES)'}</strong>
                  </span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setCounselingTarget(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={savingCounseling} className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                  <HeartHandshake className="w-3.5 h-3.5 mr-1.5" />
                  <span>{savingCounseling ? 'Menyimpan...' : 'Simpan Bimbingan'}</span>
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </Suspense>
    </>
  );

  if (hideLayout) {
    return (
      <div className="space-y-4 w-full min-w-0">
        {mainBody}
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title={isWaliKelas ? `Kasus Pelanggaran Siswa ${waliKelasNama ? `(${waliKelasNama})` : ''}` : "Manajemen Kasus Pelanggaran Siswa"}
      description={isWaliKelas 
        ? `Pantauan khusus catatan kedisiplinan dan pembinaan karakter siswa kelas ${waliKelasNama || 'bimbingan Anda'}.`
        : "Pusat pemantauan & penanganan kedisiplinan siswa seluruh sekolah."}
      breadcrumbs={breadcrumbs}
      stats={pageStats}
      hardeningModuleKey="kesiswaan_pelanggaran"
      instruction={{
        title: "Panduan Catatan",
        description: "Kelola riwayat perkembangan dan kedisiplinan siswa.",
        items: [
          { text: "Gunakan 'Tambah Catatan' untuk merekam kejadian baru." },
          { text: "Pilih siswa menggunakan scanner RFID atau pencarian nama." },
          { text: "Update tahapan penyelesaian melalui tombol Edit." }
        ]
      }}
    >
      {mainBody}
    </AcademicPageLayout>
  );
});
