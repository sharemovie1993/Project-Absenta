import { formatDate } from '@/utils/date.utils';
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, Badge, Loader, SectionCard } from '../../components/ui';
import type { Column } from '../../components/ui/Table';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { useDebounce } from '../../hooks/useDebounce';
import { kurikulumApi } from '../../api/kurikulum.api';
import type { Supervisi } from '../../api/kurikulum.api';
import { guruApi, kelasApi, mapelApi } from '../../api/academic.api';
import type { Guru, Kelas, Mapel } from '../../types/academic';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { cn } from '../../lib/utils';
import { ClipboardList, Plus, Clock, Award, BookOpen, User, Calendar, List, BarChart2 } from 'lucide-react';
import { z } from 'zod';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { SupervisiSelfAssessmentModal } from '../../components/kurikulum/SupervisiSelfAssessmentModal';
import { SupervisiAnalyticsDashboard } from '@/components/kurikulum/supervisi/SupervisiAnalyticsDashboard';
import type { SupervisiFormState, RecommendationSlot } from '../../components/kurikulum/SupervisiFormModal';
import { useGuruOptions, useKelasOptions, useMapelOptions } from '../../components/common';

// ─── Lazy-loaded heavy subcomponents (Pilar 11 – Lazy Loading) ────────────────
const Table          = lazy(() => import('../../components/ui/Table').then(m => ({ default: m.Table })));
const SupervisiFormModal = lazy(() => import('../../components/kurikulum/SupervisiFormModal'));

// ─── Zod schema (Pilar 26 – Validasi Form) ───────────────────────────────────
const supervisiSchema = z.object({
  guru_id:      z.string().min(1, 'Guru wajib dipilih'),
  tanggal:      z.string().min(1, 'Tanggal wajib diisi'),
  jam_ke:       z.number().min(1, 'Jam ke- wajib diisi minimal 1').max(15, 'Jam ke- maksimal 15'),
  kelas:        z.string().min(1, 'Kelas wajib dipilih'),
  mapel:        z.string().min(1, 'Mata pelajaran wajib dipilih'),
  catatan:      z.string().optional(),
  nilai:        z.union([z.number().min(0).max(100), z.literal('')]).optional(),
  status:       z.string().min(1),
  supervisor_id: z.string().nullable().optional(),
});

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_FORM: SupervisiFormState = {
  guru_id:      '',
  tanggal:      new Date().toISOString().split('T')[0],
  jam_ke:       1,
  kelas:        '',
  mapel:        '',
  catatan:      '',
  nilai:        '',
  status:       'SCHEDULED',
  supervisor_id: '',
};

const TAB_OPTIONS = [
  { id: 'LIST',      label: 'Daftar & Penjadwalan', icon: List },
  { id: 'ANALYTICS', label: 'Analitik Kompetensi',  icon: BarChart2 },
];

// ─── Page Component ───────────────────────────────────────────────────────────
export default function SupervisiPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const invalidateSupervisiCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['supervisi-list'] });
    queryClient.invalidateQueries({ queryKey: ['supervisi-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['supervisi-recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
  }, [queryClient]);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'LIST' | 'ANALYTICS'>('LIST');

  // ── Self-assessment modal ──────────────────────────────────────────────────
  const [selfAssessmentModalOpen,  setSelfAssessmentModalOpen]  = useState(false);
  const [selfAssessmentSupervisiId, setSelfAssessmentSupervisiId] = useState<string | null>(null);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [modalOpen,    setModalOpen]    = useState(false);
  const [searchTerm,   setSearchTerm]   = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [formData,     setFormData]     = useState<SupervisiFormState>(DEFAULT_FORM);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageLimit,    setPageLimit]    = useState(10);
  const [selectedSupervisiId, setSelectedSupervisiId] = useState<string | null>(null);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  // ── Recommendation state ───────────────────────────────────────
  const [recommendations, setRecommendations] = useState<RecommendationSlot[]>([]);
  const [loadingRecs,     setLoadingRecs]     = useState(false);
  const [selectedRecId,   setSelectedRecId]   = useState<string | null>(null);

  // ── Canonical Reference Options Hooks ─────────────────────────────────────
  const { options: guruOptions, rawList: guruItems } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { options: kelasSelectOptions, rawList: kelasItems } = useKelasOptions();
  const { options: mapelSelectOptions, rawList: mapelItems } = useMapelOptions();

  // ── useQuery: Supervisi List ──────────────────────────────────────────────
  const { data: supervisiRes, isLoading: loading, refetch: fetchData } = useQuery({
    queryKey: ['supervisi-list', currentPage, pageLimit, debouncedSearch],
    queryFn: () => kurikulumApi.getSupervisi({
      limit: pageLimit,
      page: currentPage,
      search: debouncedSearch,
    }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => supervisiRes?.data?.list ?? [], [supervisiRes]);
  const totalData = supervisiRes?.data?.total ?? 0;

  const { isKurikulum, isKepsek, isAdmin, can } = useCapabilities();

  // ── Derived permissions ────────────────────────────────────────────────────
  const canViewAnalytics = useMemo(() =>
    isAdmin || isKurikulum || isKepsek || can('curriculum.supervision.view.report'),
  [isAdmin, isKurikulum, isKepsek, can]);

  const canManage = useMemo(() =>
    isAdmin || isKurikulum || isKepsek || can('curriculum.supervision.manage'),
  [isAdmin, isKurikulum, isKepsek, can]);

  const currentGuru = useMemo(
    () => guruItems.find(g => g.user_id === user?.id),
    [guruItems, user],
  );

  // ── Recommendation helpers ─────────────────────────────────────────────────
  const currentRecSlot = useMemo(
    () => recommendations.find(r => r.id === selectedRecId),
    [recommendations, selectedRecId],
  );

  const kelasOptions = useMemo(() => (kelasItems ?? [])?.map(k => ({ label: k.nama_kelas, value: k.nama_kelas })), [kelasItems]);
  const mapelOptions = useMemo(() => (mapelItems ?? [])?.map(m => ({ label: m.nama_mapel, value: m.nama_mapel })), [mapelItems]);

  // Pilar 2 – safe mapping with optional chaining (?.)
  const filteredSupervisorOptions = useMemo(() => {
    if (currentRecSlot?.recommended_supervisors) {
      return currentRecSlot.recommended_supervisors?.map(s => ({
        label: `${s.nama_guru} (Bebas Bentrok)`,
        value: s.id,
      }));
    }
    return guruOptions.filter(o => o.value !== formData.guru_id);
  }, [currentRecSlot, guruOptions, formData.guru_id]);

  const selectedSupervisi = useMemo(() => {
    if (data.length === 0) return null;
    if (!selectedSupervisiId) return data[0];
    return data.find(s => s.id === selectedSupervisiId) ?? data[0];
  }, [data, selectedSupervisiId]);

  const confirm = useConfirm();

  // ── Reset recommendations on guru/date change ─────────────────────────────
  useEffect(() => {
    setRecommendations([]);
    setSelectedRecId(null);
  }, [formData.guru_id, formData.tanggal]);

  const fetchRecommendations = useCallback(async () => {
    if (!formData.guru_id || !formData.tanggal) {
      toast.error('Pilih Guru dan Tanggal terlebih dahulu.');
      return;
    }
    setLoadingRecs(true);
    try {
      const res: unknown = await queryClient.fetchQuery({
        queryKey: ['supervisi-recommendations', formData.guru_id, formData.tanggal],
        queryFn: () => kurikulumApi.getSupervisiRecommendations(formData.guru_id, formData.tanggal).catch(() => null),
        staleTime: 10 * 60 * 1000,
      });

      const slots: RecommendationSlot[] = res?.data ?? [];
      setRecommendations(slots);
      if (slots.length === 0) {
        toast.error('Tidak ada jadwal mengajar untuk guru ini pada tanggal tersebut.');
      } else {
        toast.success(`Ditemukan ${slots.length} slot jadwal mengajar.`);
      }
    } catch {
      const cached = queryClient.getQueryData(['supervisi-recommendations', formData.guru_id, formData.tanggal]) as Record<string, unknown>;
      if (cached?.data) {
        setRecommendations(cached.data);
      }
    } finally {
      setLoadingRecs(false);
    }
  }, [formData.guru_id, formData.tanggal, queryClient]);

  // ── Form handlers ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Pilar 26 – Zod validation
    const validation = supervisiSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Data formulir tidak valid');
      return;
    }

    try {
      const payload = {
        ...formData,
        nilai:        formData.nilai === '' ? null : Number(formData.nilai),
        supervisor_id: formData.supervisor_id || null,
      };
      if (selectedId) {
        await kurikulumApi.updateSupervisi(selectedId, payload);
        toast.success('Jadwal supervisi berhasil diperbarui');
      } else {
        await kurikulumApi.createSupervisi(payload);
        toast.success('Jadwal supervisi berhasil disimpan');
      }
      setModalOpen(false);
      setFormData(DEFAULT_FORM);
      setSelectedId(null);
      invalidateSupervisiCache();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan data');
    }
  }, [selectedId, formData, fetchData]);

  const handleEdit = useCallback((item: Supervisi) => {
    setFormData({
      guru_id:      item.guru_id,
      tanggal:      new Date(item.tanggal).toISOString().split('T')[0],
      jam_ke:       item.jam_ke ?? 1,
      kelas:        item.kelas ?? '',
      mapel:        item.mapel ?? '',
      catatan:      item.catatan ?? '',
      nilai:        item.nilai ?? '',
      status:       item.status,
      supervisor_id: item.supervisor_id ?? '',
    });
    setSelectedId(item.id);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (item: Supervisi) => {
    const ok = await confirm({
      title:       'Hapus Jadwal Supervisi',
      description: `Apakah Anda yakin ingin menghapus jadwal supervisi untuk ${item.Guru?.nama_guru ?? 'guru ini'}?`,
      confirmText: 'Hapus',
      style:       'danger',
    });
    if (!ok) return;
    try {
      await kurikulumApi.deleteSupervisi(item.id);
      toast.success('Jadwal supervisi berhasil dihapus');
      invalidateSupervisiCache();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus jadwal');
    }
  }, [confirm, fetchData]);

  // ── Handle slot recommendation selection ──────────────────────────────────
  const handleSelectRec = useCallback((rec: RecommendationSlot) => {
    setSelectedRecId(rec.id);
    setFormData(prev => ({
      ...prev,
      jam_ke:       rec.jam_ke,
      kelas:        rec.kelas,
      mapel:        rec.mapel,
      supervisor_id: rec.recommended_supervisors[0]?.id ?? '',
    }));
  }, []);

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: Column[] = useMemo(() => [
    {
      key:      'tanggal',
      label:    'Tanggal',
      sortable: true,
      render:   (value: string) => new Date(value).toLocaleDateString('id-ID'),
    },
    {
      key:      'guru',
      label:    'Guru',
      sortable: true,
      render:   (_: unknown, item: Supervisi) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">{item.Guru?.nama_guru}</div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.Guru?.nip || '-'}</div>
          {item.Supervisor?.nama_guru && (
            <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Penilai: {item.Supervisor.nama_guru}</div>
          )}
        </div>
      ),
    },
    {
      key:    'mapel',
      label:  'Mapel / Kelas',
      render: (_: unknown, item: Supervisi) => (
        <div>
          <div className="font-semibold text-slate-700 dark:text-slate-300">{item.mapel || '-'}</div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.kelas || '-'}</div>
        </div>
      ),
    },
    { key: 'jam_ke', label: 'Jam Ke', sortable: true },
    {
      key:      'status',
      label:    'Status',
      sortable: true,
      render:   (value: string) => (
        <Badge variant={value === 'COMPLETED' ? 'success' : 'default'}>
          {value === 'COMPLETED' ? 'SELESAI' : 'TERJADWAL'}
        </Badge>
      ),
    },
    {
      key:    'actions',
      label:  'Aksi',
      render: (_: unknown, item: Supervisi) => {
        const isMySupervisi = currentGuru && item.guru_id === currentGuru.id;
        return (
          <div className="flex gap-2">
            {isMySupervisi && item.status === 'SCHEDULED' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setSelfAssessmentSupervisiId(item.id); setSelfAssessmentModalOpen(true); }}
                className="text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold"
              >
                Evaluasi Diri
              </Button>
            )}
            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                  className="text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                  className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50/10 dark:hover:bg-rose-950/20"
                >
                  Hapus
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ], [handleEdit, handleDelete, currentGuru, canManage]);

  // ── Stats for layout header ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total     = data.length;
    const completed = data.filter(s => s.status === 'COMPLETED').length;
    const scheduled = data.filter(s => s.status === 'SCHEDULED').length;
    const graded    = data.filter(s => s.status === 'COMPLETED' && s.nilai != null && s.nilai !== 0);
    const avg       = graded.length > 0
      ? Math.round(graded.reduce((acc, curr) => acc + (curr.nilai ?? 0), 0) / graded.length)
      : 0;
    return [
      { title: 'Total Supervisi',  value: total,                 icon: <ClipboardList size={14} />, gradient: 'from-blue-500 to-indigo-600',  subtitle: 'Jadwal terdaftar' },
      { title: 'Supervisi Selesai', value: completed,            icon: <Badge variant="success">✓</Badge>, gradient: 'from-emerald-500 to-teal-600', subtitle: 'Sudah diobservasi' },
      { title: 'Dijadwalkan',       value: scheduled,            icon: <Clock size={14} />,         gradient: 'from-indigo-500 to-indigo-600', subtitle: 'Menunggu pelaksanaan' },
      { title: 'Rata-rata Nilai',   value: avg > 0 ? `${avg}/100` : '-', icon: <Award size={14} />, gradient: 'from-amber-500 to-orange-600',  subtitle: 'Kinerja mengajar guru' },
    ];
  }, [data]);

  // ── Toolbar slots ─────────────────────────────────────────────────────────
  const toolbarLeft = (
    <Input
      placeholder="Cari supervisi..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-64"
      aria-label="Cari jadwal supervisi"
    />
  );

  const toolbarRight = canManage ? (
    <Button
      variant="toolbarPrimary"
      size="toolbar"
      onClick={() => { setFormData(DEFAULT_FORM); setSelectedId(null); setModalOpen(true); }}
    >
      <Plus size={14} className="mr-1" /> Tambah Jadwal
    </Button>
  ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AcademicPageLayout
      title="Jadwal Supervisi Guru"
      description="Kelola jadwal supervisi pembelajaran guru di setiap kelas dan mata pelajaran."
      stats={stats}
      hardeningModuleKey="supervisipage"
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Kurikulum', path: '/kurikulum' },
        { label: 'Supervisi Guru' },
      ]}
      instruction={{
        title: 'Panduan Supervisi Guru',
        description: 'Supervisi adalah kegiatan monitoring kualitas pembelajaran oleh kepala sekolah atau wakil kurikulum.',
        items: [
          { text: 'Tambahkan jadwal supervisi dengan memilih guru, tanggal, dan kelas yang akan disupervisi.' },
          { text: 'Status SCHEDULED berarti supervisi dijadwalkan, COMPLETED berarti sudah dilakukan.' },
          { text: 'Gunakan kolom catatan untuk mencatat hasil observasi pembelajaran.' },
        ],
      }}
    >
      {/* ── Pilar 27: TabSwitcher (hanya tampil jika punya akses analytics) ─ */}
      {canViewAnalytics && (
        <div className="px-6 lg:px-8 border-b border-gray-100 dark:border-slate-800 py-2">
          <TabSwitcher
            options={TAB_OPTIONS}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'LIST' | 'ANALYTICS')}
          />
        </div>
      )}

      <div className="p-6 lg:p-8">
        {activeTab === 'ANALYTICS' && canViewAnalytics ? (
          <SupervisiAnalyticsDashboard />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* ── Table (kiri) ─────────────────────────────────────────── */}
            <div className="lg:col-span-7 flex">
              <SectionCard fullWidth className="flex flex-col justify-between w-full min-w-0">
                <Suspense fallback={<div className="flex items-center justify-center py-10"><Loader /></div>}>
                  <Table
                    columns={columns}
                    data={data ?? []}
                    loading={loading}
                    emptyMessage="Belum ada jadwal supervisi"
                    toolbarLeft={toolbarLeft}
                    toolbarRight={toolbarRight}
                    onRowClick={(row: Supervisi) => setSelectedSupervisiId(row.id)}
                    rowClassName={(row: Supervisi) => cn(
                      'cursor-pointer transition-all duration-200',
                      selectedSupervisi?.id === row.id ? 'bg-indigo-50/40 dark:bg-indigo-950/20 font-medium' : '',
                    )}
                    pagination={{
                      currentPage,
                      totalPages:   Math.ceil(totalData / pageLimit),
                      totalItems:   totalData,
                      itemsPerPage: pageLimit,
                      onPageChange: setCurrentPage,
                      onLimitChange: setPageLimit,
                    }}
                  />
                </Suspense>
              </SectionCard>
            </div>

            {/* ── Detail / Coaching panel (kanan) ──────────────────────── */}
            <div className="lg:col-span-5 flex">
              <SectionCard fullWidth className="flex flex-col justify-between w-full min-h-[500px] min-w-0">
                {selectedSupervisi ? (
                  <div className="space-y-6">
                    {/* Teacher profile header */}
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg shadow-inner">
                        {selectedSupervisi.Guru?.nama_guru?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-800 dark:text-white uppercase leading-none">{selectedSupervisi.Guru?.nama_guru}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">NIP: {selectedSupervisi.Guru?.nip || '-'}</p>
                      </div>
                    </div>

                    {/* Observasi details */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Observasi</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { icon: <BookOpen size={10} />, label: 'Mapel', value: selectedSupervisi.mapel || '-' },
                          { icon: <User size={10} />,     label: 'Kelas', value: selectedSupervisi.kelas || '-' },
                          { icon: <Calendar size={10} />, label: 'Tanggal', value: new Date(selectedSupervisi.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
                          { icon: <Clock size={10} />,    label: 'Jam Ke-', value: selectedSupervisi.jam_ke || '-' },
                        ]?.map(item => (
                          <div key={item.label} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl space-y-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">{item.icon} {item.label}</span>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Score & evaluation */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hasil Kinerja Observasi</h4>
                      {selectedSupervisi.status === 'COMPLETED' ? (
                        <div className="flex items-center gap-5 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className={cn(
                            'w-16 h-16 rounded-full flex flex-col items-center justify-center font-black text-xl border-4 shadow-inner shrink-0',
                            (selectedSupervisi.nilai ?? 0) >= 85 ? 'border-emerald-500 bg-emerald-50/10 text-emerald-600' :
                            (selectedSupervisi.nilai ?? 0) >= 70 ? 'border-blue-500 bg-blue-50/10 text-blue-600' :
                            (selectedSupervisi.nilai ?? 0) >= 55 ? 'border-amber-500 bg-amber-50/10 text-amber-600' :
                                                                   'border-rose-500 bg-rose-50/10 text-rose-600',
                          )}>
                            {selectedSupervisi.nilai ?? '-'}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                              {(selectedSupervisi.nilai ?? 0) >= 85 ? 'SANGAT BAIK' :
                               (selectedSupervisi.nilai ?? 0) >= 70 ? 'BAIK' :
                               (selectedSupervisi.nilai ?? 0) >= 55 ? 'CUKUP' : 'PERLU PEMBINAAN'}
                            </p>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                              {(selectedSupervisi.nilai ?? 0) >= 85 ? 'Guru menunjukkan kompetensi profesional yang luar biasa dalam pengelolaan kelas.' :
                               (selectedSupervisi.nilai ?? 0) >= 70 ? 'Kombinasi instruksi dan penyampaian materi sudah berjalan baik dan terstruktur.' :
                               (selectedSupervisi.nilai ?? 0) >= 55 ? 'Beberapa aspek pedagogis seperti interaksi siswa dan asesmen masih dapat ditingkatkan.' :
                               'Membutuhkan pendampingan intensif (coaching) guna menyelaraskan kembali modul ajar dengan implementasi kelas.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                          <Clock size={24} className="mx-auto text-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Supervisi Belum Terlaksana</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">Nilai dan rekomendasi tindak lanjut akan tampil setelah status diubah menjadi SELESAI.</p>
                        </div>
                      )}
                    </div>

                    {/* Self-assessment summary (fully typed – no more `as Record<string, unknown>`) */}
                    {(selectedSupervisi.is_self_evaluated || selectedSupervisi.target_pembelajaran) && (
                      <div className="space-y-2 border-t border-slate-50 dark:border-slate-800 pt-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <Award size={10} className="text-indigo-500" />
                          Evaluasi Diri Guru (Pra-Observasi)
                        </h4>
                        <div className="p-3 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-50 dark:border-indigo-900/20 rounded-xl space-y-2">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Target Pembelajaran</p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{selectedSupervisi.target_pembelajaran || '-'}</p>
                          </div>
                          {selectedSupervisi.nilai_self != null && (
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Skor Evaluasi Mandiri</p>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-black">{selectedSupervisi.nilai_self}/100</p>
                            </div>
                          )}
                          {selectedSupervisi.catatan_self && (
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Catatan Guru</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{selectedSupervisi.catatan_self}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Catatan penilai */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Catatan Penilai (Supervisor)</h4>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100/50 dark:border-slate-800 min-h-[80px]">
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap italic">
                          {selectedSupervisi.catatan ? `"${selectedSupervisi.catatan}"` : 'Tidak ada catatan tambahan.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto text-center space-y-3">
                    <ClipboardList size={40} className="mx-auto text-slate-200" />
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Pilih Jadwal Supervisi</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Klik salah satu baris jadwal supervisi di tabel untuk melihat detail observasi, nilai kinerja, dan rekomendasi tindak lanjut.</p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold italic">
                    * Indikator penilaian berdasarkan Standar Proses Kurikulum Merdeka: pembelajaran interaktif, asesmen otentik, dan diferensiasi materi.
                  </p>
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </div>

      {/* ── Lazy-loaded Form Modal (Pilar 11) ────────────────────────────── */}
      <Suspense fallback={null}>
        <SupervisiFormModal
          isOpen={modalOpen}
          isEditMode={!!selectedId}
          formData={formData}
          onFormChange={setFormData}
          onClose={() => { setModalOpen(false); setFormData(DEFAULT_FORM); setSelectedId(null); }}
          onSubmit={handleSubmit}
          guruOptions={guruOptions}
          kelasOptions={kelasOptions}
          mapelOptions={mapelOptions}
          filteredSupervisorOptions={filteredSupervisorOptions}
          recommendations={recommendations}
          loadingRecs={loadingRecs}
          selectedRecId={selectedRecId}
          onSelectRec={handleSelectRec}
          onFetchRecommendations={fetchRecommendations}
        />
      </Suspense>

      {/* ── Self-assessment modal ─────────────────────────────────────────── */}
      {selfAssessmentModalOpen && selfAssessmentSupervisiId && (
        <SupervisiSelfAssessmentModal
          isOpen={selfAssessmentModalOpen}
          onClose={() => { setSelfAssessmentModalOpen(false); setSelfAssessmentSupervisiId(null); }}
          supervisiId={selfAssessmentSupervisiId}
          initialData={{
            target_pembelajaran: selectedSupervisi?.target_pembelajaran,
            nilai_self:          selectedSupervisi?.nilai_self,
            catatan_self:        selectedSupervisi?.catatan_self,
          }}
          onSuccess={fetchData}
        />
      )}
    </AcademicPageLayout>
  );
}
