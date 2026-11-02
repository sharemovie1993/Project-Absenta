import { formatDate } from '@/utils/date.utils';
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, Badge, Loader, SectionCard } from '../../ui';
import type { Column } from '../../ui/Table';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { kurikulumApi } from '../../../api/kurikulum.api';
import type { Supervisi } from '../../../api/kurikulum.api';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { TabSwitcher } from '../../ui/TabSwitcher';
import { cn } from '../../../lib/utils';
import { ClipboardList, Plus, Clock, Award, BookOpen, User, Calendar, List, BarChart2, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { SupervisiSelfAssessmentModal } from '../SupervisiSelfAssessmentModal';
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
  onClose?: () => void;
}

export const SupervisiAkademikView: React.FC<UniversalSupervisiAkademikViewProps> = React.memo(({
  tahunPelajaranId: propTpId,
  semesterId: propSemId,
  guruId: propGuruId,
  hideLayout = false,
  isModal = false,
  readOnly = false,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const confirm = useConfirm();

  const { isKurikulum, isKepsek, isAdmin, can } = useCapabilities();

  const canViewAnalytics = useMemo(
    () => isAdmin || isKurikulum || isKepsek || can('curriculum.supervision.view.report'),
    [isAdmin, isKurikulum, isKepsek, can]
  );

  const canManage = useMemo(
    () => !readOnly && (isAdmin || isKurikulum || isKepsek || can('curriculum.supervision.manage')),
    [readOnly, isAdmin, isKurikulum, isKepsek, can]
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

  // ── Konteks Akademik SSOT (AcademicFilterToolbar) ──────────────────────────
  const academicFilter = useAcademicFilter({
    enableTp: !hideLayout,
    enableSemester: !hideLayout,
    enableGuru: true,
    enableSearch: true,
    initialTpId: propTpId,
    initialSemesterId: propSemId,
    initialGuruId: propGuruId,
  });

  const activeTpId = propTpId || academicFilter.values.tahunPelajaranId;
  const activeSemId = propSemId || academicFilter.values.semesterId;
  const activeGuruId = propGuruId || academicFilter.values.guruId;
  const debouncedSearch = academicFilter.debouncedSearchQuery;

  // ── Reference Options Hooks ───────────────────────────────────────────────
  const { options: guruOptions, rawList: guruItems } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { options: kelasSelectOptions, rawList: kelasItems } = useKelasOptions();
  const { options: mapelSelectOptions, rawList: mapelItems } = useMapelOptions();

  const currentGuru = useMemo(
    () => (guruItems || [])?.find((g) => g.user_id === user?.id),
    [guruItems, user]
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
  const totalData: number = supervisiRes?.data?.total ?? 0;

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
    const payload = {
      ...formData,
      nilai: formData.nilai === '' ? undefined : Number(formData.nilai),
      tahun_pelajaran_id: activeTpId || undefined,
      semester_id: activeSemId || undefined,
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
  }, [formData, activeTpId, activeSemId, selectedId, handleCloseModal, invalidateSupervisiCache, fetchData]);

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
      {
        key: 'guru',
        title: 'Guru yang Disupervisi',
        render: (_val, item) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
              {item.Guru?.nama_guru?.substring(0, 2).toUpperCase() || 'GU'}
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.Guru?.nama_guru || '-'}</div>
              <div className="text-[10px] text-slate-400">NIP: {item.Guru?.nip || '-'}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'kbm',
        title: 'Kelas / Mapel',
        render: (_val, item) => (
          <div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.mapel || '-'}</div>
            <div className="text-[10px] text-slate-400">
              Kelas {item.kelas || '-'} • Jam ke-{item.jam_ke || '-'}
            </div>
          </div>
        ),
      },
      {
        key: 'tanggal',
        title: 'Tanggal Supervisi',
        render: (_val, item) => (
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {formatDate(item.tanggal)}
          </span>
        ),
      },
      {
        key: 'supervisor',
        title: 'Supervisor',
        render: (_val, item) => (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {item.Supervisor?.nama_guru || 'Kepala Sekolah / Kurikulum'}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        render: (_val, item) => (
          <Badge
            variant={item.status === 'COMPLETED' ? 'success' : 'warning'}
            className="text-[10px] font-bold"
          >
            {item.status === 'COMPLETED' ? 'Selesai' : 'Terjadwal'}
          </Badge>
        ),
      },
      {
        key: 'nilai',
        title: 'Nilai',
        render: (_val, item) =>
          item.nilai != null ? (
            <span
              className={cn(
                'font-black text-xs px-2 py-0.5 rounded-md',
                item.nilai >= 85
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : item.nilai >= 70
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
              )}
            >
              {item.nilai}
            </span>
          ) : (
            <span className="text-slate-300 text-xs">-</span>
          ),
      },
      {
        key: 'aksi',
        title: 'Aksi',
        render: (_val, item) => {
          const isMySupervisi = item.guru_id === currentGuru?.id;
          return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {isMySupervisi && item.status === 'SCHEDULED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelfAssessmentSupervisiId(item.id);
                    setSelfAssessmentModalOpen(true);
                  }}
                  className="text-[11px] h-7 px-2 text-indigo-600 font-bold"
                >
                  Evaluasi Diri
                </Button>
              )}
              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(item)}
                    className="text-[11px] h-7 px-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    className="text-[11px] h-7 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
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
    [currentGuru, canManage, handleOpenModal, handleDelete]
  );

  const content = (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      {/* 1. TabSwitcher (hanya jika ada akses analytics) */}
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
              searchPlaceholder="Cari nama guru, mata pelajaran, atau kelas..."
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
                emptyMessage="Belum ada jadwal supervisi"
                titleKey="mapel"
                badgeKey="status"
                subtitleKey="Guru.nama_guru"
                metaKey="kelas"
                pagination={{
                  currentPage,
                  totalPages: Math.ceil(totalData / pageLimit) || 1,
                  totalItems: totalData,
                  itemsPerPage: pageLimit,
                  onPageChange: setCurrentPage,
                  onLimitChange: setPageLimit,
                }}
                onItemClick={(item) => setSelectedSupervisiId(item.id)}
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
                  onRowClick={(item) => setSelectedSupervisiId(item.id)}
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
            onSave={handleSave}
            isEditing={!!selectedId}
            guruOptions={guruOptions}
            kelasOptions={kelasOptions}
            mapelOptions={mapelOptions}
            filteredSupervisorOptions={filteredSupervisorOptions}
            recommendations={recommendations}
            loadingRecs={loadingRecs}
            selectedRecId={selectedRecId}
            onFetchRecommendations={handleFetchRecommendations}
            onSelectSlot={handleSelectSlot}
          />
        )}

        {/* 5. Self-Assessment Modal */}
        {selfAssessmentModalOpen && selfAssessmentSupervisiId && (
          <SupervisiSelfAssessmentModal
            isOpen={selfAssessmentModalOpen}
            onClose={() => {
              setSelfAssessmentModalOpen(false);
              setSelfAssessmentSupervisiId(null);
            }}
            supervisiId={selfAssessmentSupervisiId}
            onSuccess={() => {
              invalidateSupervisiCache();
              fetchData();
            }}
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
