import { formatDate } from '@/utils/date.utils';
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, Badge, Loader, SectionCard, Modal } from '../../ui';
import type { Column } from '../../ui/Table';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { kurikulumApi } from '../../../api/kurikulum.api';
import type { Supervisi } from '../../../api/kurikulum.api';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { TabSwitcher } from '../../ui/TabSwitcher';
import { cn } from '../../../lib/utils';
import { ClipboardList, Plus, Clock, Award, BookOpen, User, Calendar, List, BarChart2, ShieldCheck, AlertCircle, Eye, CheckCircle2, Printer, Camera } from 'lucide-react';
import { z } from 'zod';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { SupervisiSelfAssessmentModal } from '../SupervisiSelfAssessmentModal';
import { SupervisiPenilaianModal } from '../SupervisiPenilaianModal';
import { SupervisiBeritaAcaraPrintModal } from './SupervisiBeritaAcaraPrintModal';
import { SupervisiAnalyticsDashboard } from './SupervisiAnalyticsDashboard';
import type { SupervisiFormState, RecommendationSlot } from '../SupervisiFormModal';
import { useGuruOptions, useKelasOptions, useMapelOptions } from '../../common';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../academic/shared/MobileAcademicList';
import { AcademicFilterToolbar, useAcademicFilter } from '../../common/academic-filter';

// ─── Lazy-loaded subcomponents ────────────────────────────────────────────────
const Table = lazy(() => import('../../ui/Table').then((m) => ({ default: m.Table })));
const SupervisiFormModal = lazy(() => import('../SupervisiFormModal'));

// ─── Zod schema ───────────────────────────────────────────────────────────────
const supervisiSchema = z.object({
  guru_id: z.string().min(1, 'Guru wajib dipilih'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  jam_ke: z.number().min(1, 'Jam ke- wajib diisi minimal 1').max(15, 'Jam ke- maksimal 15'),
  kelas: z.string().min(1, 'Kelas wajib dipilih'),
  mapel: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  catatan: z.string().optional(),
  nilai: z.union([z.number().min(0).max(100), z.literal('')]).optional(),
  status: z.string().min(1),
  supervisor_id: z.string().nullable().optional(),
});

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_FORM: SupervisiFormState = {
  guru_id: '',
  tanggal: new Date().toISOString().split('T')[0],
  jam_ke: 1,
  kelas: '',
  mapel: '',
  catatan: '',
  nilai: '',
  status: 'SCHEDULED',
  supervisor_id: '',
};

const TAB_OPTIONS = [
  { id: 'LIST', label: 'Daftar & Penjadwalan', icon: List },
  { id: 'ANALYTICS', label: 'Analitik Kompetensi', icon: BarChart2 },
];

export interface UniversalSupervisiAkademikViewProps {
  tahunPelajaranId?: string;
  semesterId?: string;
  guruId?: string;
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  roleContext?: 'GURU' | 'KURIKULUM' | 'ADMIN';
  onClose?: () => void;
}

export const SupervisiAkademikView: React.FC<UniversalSupervisiAkademikViewProps> = React.memo(({
  tahunPelajaranId: propTpId,
  semesterId: propSemId,
  guruId: propGuruId,
  hideLayout = false,
  isModal = false,
  readOnly = false,
  roleContext,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const confirm = useConfirm();

  const { isKurikulum, isKepsek, isAdmin, can } = useCapabilities();

  // 🛡️ Context Guard: Guru Context isolasi total dari hak akses kurikulum/eksekutif
  const isGuruContext = roleContext === 'GURU' || Boolean(propGuruId);

  const canViewAnalytics = useMemo(
    () => !isGuruContext && (isAdmin || isKurikulum || isKepsek || can('curriculum.supervision.view.report')),
    [isGuruContext, isAdmin, isKurikulum, isKepsek, can]
  );

  const canManage = useMemo(
    () => !readOnly && !isGuruContext && (isAdmin || isKurikulum || isKepsek || can('curriculum.supervision.manage')),
    [readOnly, isGuruContext, isAdmin, isKurikulum, isKepsek, can]
  );

  const invalidateSupervisiCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['supervisi-list'] });
    queryClient.invalidateQueries({ queryKey: ['supervisi-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['supervisi-recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
    queryClient.invalidateQueries({ queryKey: ['evaluasi-kinerja-guru'] });
  }, [queryClient]);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'LIST' | 'ANALYTICS'>('LIST');

  // ── Self-assessment modal ──────────────────────────────────────────────────
  const [selfAssessmentModalOpen, setSelfAssessmentModalOpen] = useState(false);
  const [selfAssessmentSupervisiId, setSelfAssessmentSupervisiId] = useState<string | null>(null);
  const [selfAssessmentItem, setSelfAssessmentItem] = useState<Supervisi | null>(null);

  // ── Detail & Feedback Modal (Guru / Review) ────────────────────────────────
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Supervisi | null>(null);

  // ── Penilaian Supervisor Modal ─────────────────────────────────────────────
  const [penilaianModalOpen, setPenilaianModalOpen] = useState(false);
  const [penilaianItem, setPenilaianItem] = useState<Supervisi | null>(null);

  // ── Print Berita Acara Modal ───────────────────────────────────────────────
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState<Supervisi | null>(null);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<SupervisiFormState>(DEFAULT_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const [selectedSupervisiId, setSelectedSupervisiId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Recommendation state ───────────────────────────────────────────────────
  const [recommendations, setRecommendations] = useState<RecommendationSlot[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);

  // ── Reference Options Hooks ───────────────────────────────────────────────
  const { options: guruOptions, rawList: guruItems } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { options: kelasSelectOptions, rawList: kelasItems } = useKelasOptions();
  const { options: mapelSelectOptions, rawList: mapelItems } = useMapelOptions();

  const userGuruProfileId = (user?.guru_profile as { id?: string })?.id;
  const currentGuru = useMemo(
    () => (guruItems || [])?.find((g) => g.user_id === user?.id || g.id === userGuruProfileId),
    [guruItems, user, userGuruProfileId]
  );

  const initialGuruId = isGuruContext
    ? (propGuruId || userGuruProfileId || currentGuru?.id)
    : propGuruId;

  const isSupervisorOf = useCallback(
    (item: Supervisi) => {
      const myGuruId = currentGuru?.id || userGuruProfileId;
      return Boolean(item.supervisor_id && myGuruId && item.supervisor_id === myGuruId);
    },
    [currentGuru?.id, userGuruProfileId]
  );

  const canGradeSupervisi = useCallback(
    (item: Supervisi) => {
      return Boolean(canManage || isSupervisorOf(item));
    },
    [canManage, isSupervisorOf]
  );

  // ── Konteks Akademik SSOT (AcademicFilterToolbar) ──────────────────────────
  const academicFilter = useAcademicFilter({
    enableTp: !hideLayout,
    enableSemester: !hideLayout,
    enableGuru: !isGuruContext,
    enableSearch: true,
    initialTpId: propTpId,
    initialSemesterId: propSemId,
    initialGuruId,
  });

  const activeTpId = propTpId || academicFilter.values.tahunPelajaranId;
  const activeSemId = propSemId || academicFilter.values.semesterId;
  const activeGuruId = isGuruContext
    ? (propGuruId || userGuruProfileId || currentGuru?.id)
    : (propGuruId || academicFilter.values.guruId);
  const debouncedSearch = academicFilter.debouncedSearchQuery;

  // 🛡️ Academic Context Guard: Deteksi apakah user sedang melihat tahun ajaran arsip/lampau
  const isViewingArchiveYear = Boolean(
    academicFilter.activeAcademicYear?.id &&
    activeTpId &&
    academicFilter.activeAcademicYear.id !== activeTpId
  );

  // ── useQuery: Supervisi List ──────────────────────────────────────────────
  const { data: supervisiRes, isLoading: loading, refetch: fetchData } = useQuery({
    queryKey: ['supervisi-list', currentPage, pageLimit, debouncedSearch, activeGuruId, activeTpId, activeSemId],
    queryFn: () =>
      kurikulumApi.getSupervisi({
        limit: pageLimit,
        page: currentPage,
        search: debouncedSearch || undefined,
        guru_id: activeGuruId || undefined,
        tahun_pelajaran_id: activeTpId || undefined,
        semester_id: activeSemId || undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const data: Supervisi[] = useMemo(() => supervisiRes?.data?.list ?? [], [supervisiRes]);
  const totalData: number = supervisiRes?.data?.pagination?.total ?? supervisiRes?.data?.total ?? data.length;

  const currentRecSlot = useMemo(
    () => recommendations.find((r) => r.id === selectedRecId),
    [recommendations, selectedRecId]
  );

  const kelasOptions = useMemo(
    () => (kelasItems ?? []).map((k) => ({ label: k.nama_kelas, value: k.nama_kelas })),
    [kelasItems]
  );
  const mapelOptions = useMemo(
    () => (mapelItems ?? []).map((m) => ({ label: m.nama_mapel, value: m.nama_mapel })),
    [mapelItems]
  );

  const filteredSupervisorOptions = useMemo(() => {
    if (currentRecSlot?.recommended_supervisors) {
      return currentRecSlot.recommended_supervisors.map((s) => ({
        label: `${s.nama_guru} (Bebas Bentrok)`,
        value: s.id,
      }));
    }
    return guruOptions.filter((o) => o.value !== formData.guru_id);
  }, [currentRecSlot, guruOptions, formData.guru_id]);

  const selectedSupervisi = useMemo(() => {
    if (data.length === 0) return null;
    if (!selectedSupervisiId) return data[0];
    return data.find((s) => s.id === selectedSupervisiId) ?? data[0];
  }, [data, selectedSupervisiId]);

  useEffect(() => {
    setRecommendations([]);
    setSelectedRecId(null);
  }, [formData.guru_id, formData.tanggal]);

  const handleFetchRecommendations = useCallback(async () => {
    if (!formData.guru_id || !formData.tanggal) {
      toast.error('Pilih guru dan tanggal terlebih dahulu');
      return;
    }
    setLoadingRecs(true);
    try {
      const res = await kurikulumApi.getSupervisiRecommendations(formData.guru_id, formData.tanggal);
      if (res?.data && res.data.length > 0) {
        setRecommendations(res.data);
        toast.success(`Ditemukan ${res.data.length} slot rekomendasi`);
      } else {
        setRecommendations([]);
        toast('Tidak ada jadwal KBM guru pada tanggal ini', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error('Gagal memuat rekomendasi slot KBM');
    } finally {
      setLoadingRecs(false);
    }
  }, [formData.guru_id, formData.tanggal]);

  const handleSelectSlot = useCallback(
    (slot: RecommendationSlot) => {
      setSelectedRecId(slot.id);
      setFormData((prev) => ({
        ...prev,
        jam_ke: slot.jam_ke,
        kelas: slot.kelas,
        mapel: slot.mapel,
        supervisor_id: slot.recommended_supervisors?.[0]?.id ?? prev.supervisor_id,
      }));
    },
    []
  );

  const handleOpenModal = useCallback(
    (item?: Supervisi) => {
      setRecommendations([]);
      setSelectedRecId(null);
      if (item) {
        setSelectedId(item.id);
        setFormData({
          guru_id: item.guru_id,
          tanggal: item.tanggal ? item.tanggal.split('T')[0] : new Date().toISOString().split('T')[0],
          jam_ke: item.jam_ke ?? 1,
          kelas: item.kelas ?? '',
          mapel: item.mapel ?? '',
          catatan: item.catatan ?? '',
          nilai: item.nilai ?? '',
          status: item.status,
          supervisor_id: item.supervisor_id ?? '',
        });
      } else {
        setSelectedId(null);
        setFormData({
          ...DEFAULT_FORM,
          guru_id: activeGuruId || '',
          supervisor_id: user?.guru_profile?.id ?? '',
        });
      }
      setModalOpen(true);
    },
    [activeGuruId, user]
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedId(null);
    setFormData(DEFAULT_FORM);
    setRecommendations([]);
    setSelectedRecId(null);
  }, []);

  const handleSave = useCallback(async () => {
    // 🛡️ Academic Context Hardening: Untuk jadwal baru, selalu alokasikan ke Periode Aktif
    const targetTpId = selectedId
      ? (activeTpId || undefined)
      : (academicFilter.activeAcademicYear?.id || activeTpId || undefined);
    const targetSemId = selectedId
      ? (activeSemId || undefined)
      : (academicFilter.activeSemester?.id || activeSemId || undefined);

    const payload = {
      ...formData,
      nilai: formData.nilai === '' ? undefined : Number(formData.nilai),
      tahun_pelajaran_id: targetTpId,
      semester_id: targetSemId,
    };

    const parseResult = supervisiSchema.safeParse(payload);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message ?? 'Validasi form gagal';
      toast.error(firstError);
      return;
    }

    try {
      if (selectedId) {
        await kurikulumApi.updateSupervisi(selectedId, payload);
        toast.success('Jadwal supervisi berhasil diperbarui');
      } else {
        await kurikulumApi.createSupervisi(payload);
        toast.success('Jadwal supervisi berhasil ditambahkan');
      }
      handleCloseModal();
      invalidateSupervisiCache();
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Gagal menyimpan data';
      toast.error(msg);
    }
  }, [formData, activeTpId, activeSemId, selectedId, handleCloseModal, invalidateSupervisiCache, fetchData, academicFilter]);

  const handleDelete = useCallback(
    async (item: Supervisi) => {
      const ok = await confirm({
        title: 'Hapus Jadwal Supervisi',
        message: `Hapus jadwal supervisi untuk ${item.Guru?.nama_guru ?? 'guru ini'}? Tindakan ini tidak dapat dibatalkan.`,
        confirmText: 'Hapus',
        style: 'danger',
      });
      if (!ok) return;

      try {
        await kurikulumApi.deleteSupervisi(item.id);
        toast.success('Jadwal supervisi berhasil dihapus');
        if (selectedSupervisiId === item.id) setSelectedSupervisiId(null);
        invalidateSupervisiCache();
        fetchData();
      } catch (error: any) {
        toast.error(error.response?.data?.message || error.message || 'Gagal menghapus data');
      }
    },
    [confirm, selectedSupervisiId, invalidateSupervisiCache, fetchData]
  );

  // ── Stat calculations ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = totalData;
    const selesai = data.filter((d) => d.status === 'COMPLETED').length;
    const terjadwal = data.filter((d) => d.status === 'SCHEDULED').length;
    const avgScore =
      data.filter((d) => d.nilai != null && d.nilai > 0).reduce((acc, d) => acc + (d.nilai ?? 0), 0) /
        (data.filter((d) => d.nilai != null && d.nilai > 0).length || 1);

    return [
      {
        title: 'Total Supervisi',
        value: total,
        icon: <ClipboardList className="h-4 w-4 text-white" />,
        gradient: 'from-blue-500 to-indigo-600',
        subtitle: 'Terjadwal & Selesai',
      },
      {
        title: 'Terjadwal',
        value: terjadwal,
        icon: <Clock className="h-4 w-4 text-white" />,
        gradient: 'from-amber-500 to-orange-600',
        subtitle: 'Menunggu Pelaksanaan',
      },
      {
        title: 'Selesai Diobservasi',
        value: selesai,
        icon: <Award className="h-4 w-4 text-white" />,
        gradient: 'from-emerald-500 to-teal-600',
        subtitle: 'Telah Dilakukan',
      },
      {
        title: 'Rata-rata Skor',
        value: avgScore > 0 ? avgScore.toFixed(1) : '-',
        icon: <Award className="h-4 w-4 text-white" />,
        gradient: 'from-purple-500 to-pink-600',
        subtitle: 'Indeks Observasi',
      },
    ];
  }, [totalData, data]);

  // ── Columns Table ──────────────────────────────────────────────────────────
  const columns: Column<Supervisi>[] = useMemo(
    () => [
      ...(!isGuruContext
        ? [
            {
              key: 'guru',
              label: 'Guru / Pendidik',
              title: 'Guru / Pendidik',
              className: 'min-w-[200px] whitespace-nowrap',
              render: (_val: unknown, item: Supervisi) => (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100/60 dark:border-indigo-900/40">
                    {item.Guru?.nama_guru?.substring(0, 2).toUpperCase() || 'GU'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{item.Guru?.nama_guru || '-'}</div>
                    <div className="text-[10px] text-slate-400">NIP: {item.Guru?.nip || '-'}</div>
                  </div>
                </div>
              ),
            },
          ]
        : []),
      {
        key: 'kbm',
        label: 'Mata Pelajaran & Kelas',
        title: 'Mata Pelajaran & Kelas',
        className: 'min-w-[220px]',
        render: (_val: unknown, item: Supervisi) => (
          <div className="space-y-0.5">
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-snug">{item.mapel || '-'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
              Kelas {item.kelas || '-'} • <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Jam ke-{item.jam_ke || '-'}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'tanggal',
        label: 'Jadwal Observasi',
        title: 'Jadwal Observasi',
        className: 'min-w-[130px] whitespace-nowrap',
        render: (_val: unknown, item: Supervisi) => (
          <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
            {formatDate(item.tanggal)}
          </span>
        ),
      },
      {
        key: 'supervisor',
        label: 'Supervisor / Penilai',
        title: 'Supervisor / Penilai',
        className: 'min-w-[160px] whitespace-nowrap',
        render: (_val: unknown, item: Supervisi) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {item.Supervisor?.nama_guru || 'Tim Kurikulum'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        title: 'Status',
        className: 'min-w-[130px] whitespace-nowrap text-center',
        render: (_val: unknown, item: Supervisi) => (
          <Badge
            variant={item.status === 'COMPLETED' ? 'success' : 'warning'}
            className="text-[10px] font-bold px-2.5 py-0.5 whitespace-nowrap"
          >
            {item.status === 'COMPLETED' ? 'Selesai Diobservasi' : 'Terjadwal'}
          </Badge>
        ),
      },
      {
        key: 'nilai',
        label: 'Nilai',
        title: 'Nilai',
        className: 'min-w-[80px] whitespace-nowrap text-center',
        render: (_val: unknown, item: Supervisi) =>
          item.nilai != null ? (
            <span
              className={cn(
                'font-black text-xs px-2.5 py-0.5 rounded-lg inline-block',
                item.nilai >= 85
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : item.nilai >= 70
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              )}
            >
              {item.nilai}
            </span>
          ) : (
            <span className="text-slate-400 text-xs italic whitespace-nowrap">Belum dinilai</span>
          ),
      },
      {
        key: 'catatan',
        label: 'Catatan & Rekomendasi',
        title: 'Catatan & Rekomendasi',
        className: 'min-w-[200px] max-w-[260px]',
        render: (_val: unknown, item: Supervisi) => (
          <div className="max-w-[240px] truncate text-xs text-slate-600 dark:text-slate-400 font-normal" title={item.catatan || 'Belum ada catatan'}>
            {item.catatan || '-'}
          </div>
        ),
      },
      {
        key: 'aksi',
        label: 'Aksi',
        title: 'Aksi',
        className: 'min-w-[240px] whitespace-nowrap text-right',
        render: (_val: unknown, item: Supervisi) => {
          const isMySupervisi = item.guru_id === (propGuruId || currentGuru?.id);
          return (
            <div className="flex items-center justify-end gap-1.5 flex-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDetailItem(item);
                  setDetailModalOpen(true);
                }}
                className="text-xs h-7 px-2.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 rounded-lg whitespace-nowrap"
                title="Lihat Detail Observasi"
              >
                <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" /> Detail
              </Button>

              {isMySupervisi && item.status === 'SCHEDULED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelfAssessmentSupervisiId(item.id);
                    setSelfAssessmentItem(item);
                    setSelfAssessmentModalOpen(true);
                  }}
                  className="text-xs h-7 px-2.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-bold bg-indigo-50/50 hover:bg-indigo-100 rounded-lg whitespace-nowrap"
                >
                  Evaluasi Diri
                </Button>
              )}

              {canGradeSupervisi(item) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPenilaianItem(item);
                    setPenilaianModalOpen(true);
                  }}
                  className="text-xs h-7 px-2.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-bold bg-indigo-50/50 hover:bg-indigo-100 rounded-lg whitespace-nowrap shrink-0"
                  title="Isi Penilaian & Catatan Observasi"
                >
                  <Award className="w-3.5 h-3.5 mr-1" />
                  <span>{item.status === 'COMPLETED' ? 'Edit Nilai' : 'Nilai'}</span>
                </Button>
              )}

              {(item.status === 'COMPLETED' || item.nilai != null) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPrintItem(item);
                    setPrintModalOpen(true);
                  }}
                  className="text-xs h-7 px-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0"
                  title="Cetak Berita Acara Supervisi"
                >
                  <Printer className="w-3.5 h-3.5 mr-1 text-slate-400" /> Cetak
                </Button>
              )}

              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(item)}
                    className="text-xs h-7 px-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    className="text-xs h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                  >
                    Hapus
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [isGuruContext, currentGuru, propGuruId, canGradeSupervisi, canManage, handleOpenModal, handleDelete]
  );

  const content = (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      {/* 🛡️ Mode Arsip Historis Alert Banner */}
      {isViewingArchiveYear && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Mode Arsip Supervisi:</strong> Anda sedang meninjau jadwal supervisi tahun pelajaran non-aktif ({academicFilter.selectedTahunPelajaranNama || 'Lampau'}). Jadwal supervisi baru otomatis dialokasikan ke Periode Akademik Aktif ({academicFilter.activeAcademicYear?.tahun || 'Aktif'}).
          </span>
        </div>
      )}

      {/* 🌟 Guru Context Header Banner */}
      {isGuruContext && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-200/60 dark:border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Supervisi Akademik Saya
                </h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Akun Terverifikasi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Memantau jadwal observasi kelas, umpan balik refleksi, dan hasil pendampingan KBM Anda.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-medium">Terjadwal</div>
              <div className="text-xs font-bold text-amber-600">{stats[1].value}</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-medium">Selesai</div>
              <div className="text-xs font-bold text-emerald-600">{stats[2].value}</div>
            </div>
            {stats[3].value !== '-' && (
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 font-medium">Skor Rata-Rata</div>
                <div className="text-xs font-bold text-indigo-600">{stats[3].value}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. TabSwitcher (hanya jika ada akses analytics dan bukan Guru Context) */}
      {canViewAnalytics && (
        <TabSwitcher
          options={TAB_OPTIONS}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'LIST' | 'ANALYTICS')}
        />
      )}

      {activeTab === 'ANALYTICS' && canViewAnalytics ? (
        <SupervisiAnalyticsDashboard />
      ) : (
        <SectionCard fullWidth noPadding>
          {/* 2. Unified Filter Toolbar (SSOT) */}
          <div className="p-3 sm:p-4 space-y-3">
            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="plain"
              searchPlaceholder={isGuruContext ? "Cari mata pelajaran, kelas, atau catatan..." : "Cari nama guru, mata pelajaran, atau kelas..."}
              actionsRight={
                canManage ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleOpenModal()}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs h-9 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Jadwalkan Supervisi</span>
                  </Button>
                ) : undefined
              }
            />
          </div>

          {/* 3. Table or Mobile Card View */}
          <div className="p-4 pt-0">
            {isMobile ? (
              <MobileAcademicList
                title="Daftar Supervisi"
                data={data ?? []}
                isLoading={loading}
                totalItems={totalData}
                emptyMessage={isGuruContext ? "Belum ada jadwal supervisi untuk Anda pada periode ini" : "Belum ada jadwal supervisi"}
                titleKey="mapel"
                badgeKey="status"
                subtitleKey={isGuruContext ? "Supervisor.nama_guru" : "Guru.nama_guru"}
                metaKey="kelas"
                pagination={{
                  currentPage,
                  totalPages: Math.ceil(totalData / pageLimit) || 1,
                  totalItems: totalData,
                  itemsPerPage: pageLimit,
                  onPageChange: setCurrentPage,
                  onLimitChange: setPageLimit,
                }}
                onItemClick={(item) => {
                  setDetailItem(item);
                  setDetailModalOpen(true);
                }}
              />
            ) : (
              <Suspense
                fallback={
                  <div className="p-8 flex justify-center">
                    <Loader size="md" />
                  </div>
                }
              >
                <Table
                  data={data ?? []}
                  columns={columns}
                  isLoading={loading}
                  hoverable={true}
                  className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs"
                  pagination={{
                    currentPage,
                    totalPages: Math.ceil(totalData / pageLimit) || 1,
                    totalItems: totalData,
                    itemsPerPage: pageLimit,
                    onPageChange: (newPage) => setCurrentPage(newPage),
                    onItemsPerPageChange: (newLimit) => {
                      setPageLimit(newLimit);
                      setCurrentPage(1);
                    },
                  }}
                  onRowClick={(item) => {
                    setDetailItem(item);
                    setDetailModalOpen(true);
                  }}
                />
              </Suspense>
            )}
          </div>
        </SectionCard>
      )}

      {/* 4. Supervisi Form Modal */}
      <Suspense fallback={null}>
        {modalOpen && (
          <SupervisiFormModal
            isOpen={modalOpen}
            onClose={handleCloseModal}
            formData={formData}
            setFormData={setFormData}
            onFormChange={(data) => setFormData(data)}
            onSave={handleSave}
            onSubmit={handleSave}
            isEditing={!!selectedId}
            isEditMode={!!selectedId}
            guruOptions={guruOptions}
            kelasOptions={kelasOptions}
            mapelOptions={mapelOptions}
            filteredSupervisorOptions={filteredSupervisorOptions}
            recommendations={recommendations}
            loadingRecs={loadingRecs}
            selectedRecId={selectedRecId}
            onFetchRecommendations={handleFetchRecommendations}
            onSelectSlot={handleSelectSlot}
            onSelectRec={handleSelectSlot}
          />
        )}

        {/* 5. Self-Assessment Modal */}
        {selfAssessmentModalOpen && selfAssessmentSupervisiId && (
          <SupervisiSelfAssessmentModal
            isOpen={selfAssessmentModalOpen}
            onClose={() => {
              setSelfAssessmentModalOpen(false);
              setSelfAssessmentSupervisiId(null);
              setSelfAssessmentItem(null);
            }}
            supervisiId={selfAssessmentSupervisiId}
            item={selfAssessmentItem}
            onSuccess={() => {
              invalidateSupervisiCache();
              fetchData();
            }}
          />
        )}

        {/* 6. Detail & Feedback Modal (True WYSIWYG Insight) */}
        {detailModalOpen && detailItem && (
          <Modal
            isOpen={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false);
              setDetailItem(null);
            }}
            title="Detail & Umpan Balik Supervisi Akademik"
            size="lg"
          >
            <div className="space-y-4 text-xs">
              {/* Header Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {detailItem.mapel || 'Mata Pelajaran'}
                  </span>
                  <Badge
                    variant={detailItem.status === 'COMPLETED' ? 'success' : 'warning'}
                    className="text-[10px] font-bold"
                  >
                    {detailItem.status === 'COMPLETED' ? 'Selesai Diobservasi' : 'Terjadwal'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                  <div>
                    <span className="block text-slate-400">Kelas:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{detailItem.kelas || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Jam KBM:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Jam ke-{detailItem.jam_ke || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Tanggal:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(detailItem.tanggal)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Supervisor:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{detailItem.Supervisor?.nama_guru || 'Tim Penilai'}</span>
                  </div>
                </div>
              </div>

              {/* Nilai & Skor Section */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Hasil Evaluasi Observasi</div>
                  <div className="text-[11px] text-indigo-700/80 dark:text-indigo-300">
                    {detailItem.nilai != null ? 'Penilaian observasi telah tuntas dilakukan oleh supervisor.' : 'Observasi belum dinilai.'}
                  </div>
                </div>
                {detailItem.nilai != null ? (
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{detailItem.nilai}</span>
                    <span className="text-[10px] block font-bold text-slate-400">/ 100</span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    Menunggu Observasi
                  </span>
                )}
              </div>

              {/* Catatan / Feedback Supervisor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Umpan Balik & Catatan Supervisor
                </label>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[70px]">
                  {detailItem.catatan || (
                    <span className="text-slate-400 italic">Belum ada catatan atau umpan balik tertulis dari supervisor.</span>
                  )}
                </div>
              </div>

              {/* Target Pembelajaran / Evaluasi Diri Guru (Jika ada) */}
              {(detailItem.target_pembelajaran || detailItem.catatan_self) && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Refleksi Mandiri / Target Guru (Pra-Observasi)
                  </label>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed whitespace-pre-wrap">
                    {detailItem.target_pembelajaran && (
                      <p className="mb-1"><strong>Target:</strong> {detailItem.target_pembelajaran}</p>
                    )}
                    {detailItem.catatan_self && (
                      <p><strong>Catatan Refleksi:</strong> {detailItem.catatan_self}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Foto Eviden Dokumentasi KBM (Jika ada) */}
              {detailItem.foto_kegiatan && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dokumentasi Foto KBM (Eviden Lapangan)
                  </label>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 flex items-center gap-3">
                    <img
                      src={detailItem.foto_kegiatan}
                      alt="Dokumentasi KBM"
                      className="w-24 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs"
                    />
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        Foto Kegiatan Belajar Mengajar
                      </span>
                      Bukti otentik pendampingan observasi kelas untuk pemenuhan instrumen akreditasi sekolah & PKG.
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  {detailItem.guru_id === (propGuruId || currentGuru?.id) && detailItem.status === 'SCHEDULED' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDetailModalOpen(false);
                        setSelfAssessmentSupervisiId(detailItem.id);
                        setSelfAssessmentItem(detailItem);
                        setSelfAssessmentModalOpen(true);
                      }}
                      className="rounded-xl text-indigo-600 font-bold border-indigo-200"
                    >
                      Isi Evaluasi Diri
                    </Button>
                  )}

                  {canGradeSupervisi(detailItem) && (
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => {
                        const target = detailItem;
                        setDetailModalOpen(false);
                        setPenilaianItem(target);
                        setPenilaianModalOpen(true);
                      }}
                      className="rounded-xl text-xs h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-xs"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{detailItem.status === 'COMPLETED' ? 'Edit Penilaian & Umpan Balik' : 'Mulai Penilaian Observasi'}</span>
                    </Button>
                  )}

                  {(detailItem.status === 'COMPLETED' || detailItem.nilai != null) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const target = detailItem;
                        setDetailModalOpen(false);
                        setPrintItem(target);
                        setPrintModalOpen(true);
                      }}
                      className="rounded-xl text-xs h-9 px-3.5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold gap-1.5 hover:bg-slate-100"
                      title="Cetak Berita Acara & Instrumen Supervisi"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cetak Berita Acara</span>
                    </Button>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setDetailItem(null);
                  }}
                  className="rounded-xl font-bold ml-auto"
                >
                  TUTUP
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* 7. Supervisor Penilaian Modal */}
        {penilaianModalOpen && penilaianItem && (
          <SupervisiPenilaianModal
            isOpen={penilaianModalOpen}
            onClose={() => {
              setPenilaianModalOpen(false);
              setPenilaianItem(null);
            }}
            supervisi={penilaianItem}
            onSuccess={() => {
              invalidateSupervisiCache();
              fetchData();
            }}
          />
        )}

        {/* 8. Berita Acara & Instrumen Print Modal */}
        {printModalOpen && printItem && (
          <SupervisiBeritaAcaraPrintModal
            isOpen={printModalOpen}
            onClose={() => {
              setPrintModalOpen(false);
              setPrintItem(null);
            }}
            supervisi={printItem}
            tahunPelajaranNama={academicFilter.activeAcademicYear?.nama}
            semesterNama={academicFilter.activeSemester?.nama}
          />
        )}
      </Suspense>
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AcademicPageLayout
      title="Jadwal Supervisi Guru"
      description="Kelola jadwal supervisi pembelajaran guru di setiap kelas dan mata pelajaran."
      stats={stats}
      hardeningModuleKey="supervisipage"
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum' },
        { label: 'Supervisi Guru' },
      ]}
      instruction={{
        title: 'Panduan Supervisi Guru',
        description: 'Supervisi adalah kegiatan monitoring kualitas pembelajaran oleh kepala sekolah atau tim penjamin mutu kurikulum.',
        items: [
          { text: 'Tambahkan jadwal supervisi dengan memilih guru, tanggal, dan kelas yang akan disupervisi.' },
          { text: 'Filter periode akademik (Tahun Pelajaran & Semester) untuk menyaring riwayat observasi.' },
          { text: 'Gunakan fitur "Slot KBM Bebas Bentrok" untuk memilih jam supervisi yang optimal.' },
        ],
      }}
    >
      {content}
    </AcademicPageLayout>
  );
});
