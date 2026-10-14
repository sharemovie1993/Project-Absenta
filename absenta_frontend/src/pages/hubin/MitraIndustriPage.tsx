import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import type { MitraIndustri } from '../../api/hubin.api';
import { guruApi, jurusanApi } from '../../api/academic.api';
import { formatDate } from '../../utils/layoutUtils';
import { 
  Plus, 
  Search, 
  Building2, 
  RefreshCw, 
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Navigation
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Table, Button, Input } from '../../components/ui';
import useConfirm from '../../hooks/useConfirm';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { 
  SubscriptionWithFeatures, 
  GuruItem, 
  PenempatanItem, 
  JurusanItem, 
  MitraListResponse, 
  MitraStats 
} from '../../components/hubin/mitra/types';
import { createMitraColumns } from '../../components/hubin/mitra/MitraIndustriTableColumns';
import { MitraIndustriCard } from '../../components/hubin/mitra/MitraIndustriCard';
import { MitraMouFilterBar } from '../../components/hubin/mitra/MitraMouFilterBar';
import { MitraBulkActionBar } from '../../components/hubin/mitra/MitraBulkActionBar';
import { computeMitraStats, exportMitraToExcel, downloadMitraTemplate } from '../../components/hubin/mitra/mitraUtils';

// Lazy load heavy modal components (Refreshed import handler for ExcelImportModal)
const MitraFormModal = lazy(() => import('../../components/hubin/MitraFormModal').then(module => ({ default: module.MitraFormModal })));
const HubinMoUHistoryModal = lazy(() => import('../../components/hubin/HubinMoUHistoryModal').then(module => ({ default: module.HubinMoUHistoryModal })));
const MitraDetailModal = lazy(() => import('../../components/hubin/MitraDetailModal').then(module => ({ default: module.MitraDetailModal })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));

const mitraSearchSchema = z.object({
  searchTerm: z.string().max(100).optional(),
});

export const MitraIndustriSection: React.FC<{ hideLayout?: boolean }> = React.memo(({ hideLayout = false }) => {
  const { subscription, user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMitra, setEditingMitra] = useState<MitraIndustri | null>(null);
  const [selectedMoUMitra, setSelectedMoUMitra] = useState<MitraIndustri | null>(null);
  const [selectedDetailMitra, setSelectedDetailMitra] = useState<MitraIndustri | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMouFilter, setSelectedMouFilter] = useState<'ALL' | 'AKTIF' | 'EXPIRING_SOON' | 'EXPIRED'>('ALL');
  const [editingQuotaId, setEditingQuotaId] = useState<string | null>(null);
  const [tempQuotaValue, setTempQuotaValue] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  // Gating Logic
  const sub = subscription as unknown as SubscriptionWithFeatures | null;
  const features = sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('HUBIN');

  // Role & Capability Checks
  const { isHubin: isHubinRole, isAdmin, can } = useCapabilities();
  const isHubin = useMemo(() => {
    return isAdmin || isHubinRole || can('hubin.partners.manage') || can('hubin.mou.manage');
  }, [isAdmin, isHubinRole, can]);

  // Queries
  const { data: penempatanData } = useQuery({
    queryKey: ['penempatan-pkl', { limit: 100 }],
    queryFn: () => hubinApi.getPenempatan({ limit: 100 }),
    enabled: !!user?.isTeacher || isHubin
  });

  const { data: guruList } = useQuery({
    queryKey: ['guru', { limit: 100 }],
    queryFn: () => guruApi.getAll({ limit: 100 }),
    enabled: !!user?.isTeacher
  });

  const rawGuru = useMemo(() => {
    if (Array.isArray(guruList)) return guruList;
    if (guruList && typeof guruList === 'object' && 'data' in guruList) {
      return (guruList as { data: unknown[] }).data || [];
    }
    return [];
  }, [guruList]);

  const { data: jurusanListQuery } = useQuery({
    queryKey: ['jurusan', { limit: 100 }],
    queryFn: () => jurusanApi.getAll({ limit: 100 }),
  });

  const jurusanList = useMemo((): JurusanItem[] => {
    if (Array.isArray(jurusanListQuery)) return (jurusanListQuery as unknown as JurusanItem[]);
    if (jurusanListQuery && typeof jurusanListQuery === 'object' && 'data' in jurusanListQuery) {
      return ((jurusanListQuery as unknown as { data: JurusanItem[] }).data) || [];
    }
    return [];
  }, [jurusanListQuery]);

  const activeGuruId = useMemo(() => {
    if (user?.guru_profile?.id) return user.guru_profile.id;
    const matchedGuru = rawGuru.find((g: GuruItem) => g.user_id === user?.id);
    return matchedGuru?.id || null;
  }, [rawGuru, user]);

  const isPembimbing = useMemo(() => {
    if (!user || !user.isTeacher) return false;
    const guruId = activeGuruId;
    const dataObj = penempatanData as { data?: unknown[] } | undefined;
    const penempatanList = Array.isArray(penempatanData?.data) ? penempatanData.data : dataObj?.data || [];
    if (!guruId || !Array.isArray(penempatanList)) return false;
    return penempatanList.some((p: PenempatanItem) => p.pembimbing_id === guruId);
  }, [user, activeGuruId, penempatanData]);

  const { data: mitraData, isLoading, refetch } = useQuery({
    queryKey: ['mitra-industri', { search: searchTerm, page, limit, mou_status: selectedMouFilter }],
    queryFn: () => hubinApi.getMitra({ 
      search: searchTerm, 
      page, 
      limit, 
      mou_status: selectedMouFilter !== 'ALL' ? selectedMouFilter : undefined 
    }),
    enabled: subscription !== undefined
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<MitraIndustri>) => hubinApi.createMitra(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Mitra industri berhasil ditambahkan');
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menambahkan mitra'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MitraIndustri> }) => hubinApi.updateMitra(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Perubahan berhasil disimpan');
      setIsModalOpen(false);
      setEditingMitra(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal mengedit mitra'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hubinApi.deleteMitra(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Mitra berhasil dihapus');
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menghapus mitra'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => hubinApi.bulkDeleteMitra(ids),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success(res?.message || 'Mitra industri terpilih berhasil dihapus');
      setSelectedRowKeys(new Set());
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal menghapus mitra terpilih'),
  });

  const handleBulkDelete = useCallback(async () => {
    if (selectedRowKeys.size === 0) return;
    const ok = await confirm({
      title: 'Hapus Mitra Industri Terpilih',
      description: `Apakah Anda yakin ingin menghapus ${selectedRowKeys.size} mitra industri terpilih? Tindakan ini akan menghapus semua riwayat penempatan PKL terkait perusahaan ini.`,
      confirmText: `Ya, Hapus (${selectedRowKeys.size})`,
      cancelText: 'Batal',
      style: 'danger'
    });

    if (ok) {
      bulkDeleteMutation.mutate(Array.from(selectedRowKeys));
    }
  }, [confirm, selectedRowKeys, bulkDeleteMutation]);

  const quickQuotaMutation = useMutation({
    mutationFn: ({ id, kuota }: { id: string; kuota: number }) => hubinApi.updateMitra(id, { kuota_pkl: kuota }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
      toast.success('Kuota PKL berhasil diperbarui');
      setEditingQuotaId(null);
    },
    onError: (error: Error) => toast.error(error.message || 'Gagal memperbarui kuota PKL'),
  });

  const handleSaveQuickQuota = useCallback((id: string) => {
    quickQuotaMutation.mutate({ id, kuota: Math.max(0, tempQuotaValue) });
  }, [quickQuotaMutation, tempQuotaValue]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const tMulai = formData.get('mou_tanggal_mulai') as string;
    const tSelesai = formData.get('mou_tanggal_berakhir') as string;

    const data = {
      nama: formData.get('nama') as string,
      logo_url: formData.get('logo_url') as string || null,
      bidang: formData.get('bidang') as string || null,
      alamat: formData.get('alamat') as string || null,
      kontak: formData.get('kontak') as string || null,
      mou_url: formData.get('mou_url') as string || null,
      latitude: parseFloat(formData.get('latitude') as string) || null,
      longitude: parseFloat(formData.get('longitude') as string) || null,
      radius: parseInt(formData.get('radius') as string) || 100,

      // PIC Details
      pic_nama: formData.get('pic_nama') as string || null,
      pic_jabatan: formData.get('pic_jabatan') as string || null,
      pic_telepon: formData.get('pic_telepon') as string || null,
      pic_email: formData.get('pic_email') as string || null,

      // MoU Details
      mou_nomor: formData.get('mou_nomor') as string || null,
      mou_status: formData.get('mou_status') as string || 'AKTIF',
      mou_tanggal_mulai: tMulai ? new Date(tMulai).toISOString() : null,
      mou_tanggal_berakhir: tSelesai ? new Date(tSelesai).toISOString() : null,

      // PKL Capacity
      kuota_pkl: parseInt(formData.get('kuota_pkl') as string) || 0,
      kompetensi_keahlian: (() => {
        const checkedKeahlian = (formData.getAll('kompetensi_keahlian') ?? [])
          ?.map(val => (val as string).split(','))
          .flat()
          ?.map(s => s.trim())
          .filter(Boolean);
        return checkedKeahlian && checkedKeahlian.length > 0 ? checkedKeahlian.join(', ') : null;
      })(),
    };

    if (editingMitra) {
      updateMutation.mutate({ id: editingMitra.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = useCallback(async (mitra: MitraIndustri) => {
    const ok = await confirm({
      title: 'Hapus Mitra Industri',
      description: `Apakah Anda yakin ingin menghapus mitra industri "${mitra.nama}"? Tindakan ini akan menghapus semua riwayat penempatan PKL terkait perusahaan ini.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (ok) {
      deleteMutation.mutate(mitra.id);
    }
  }, [confirm, deleteMutation]);

  const handleDownloadTemplate = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      toast('Menyiapkan template...');
      await downloadMitraTemplate(jurusanList);
      toast.success('Template berhasil diunduh.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengunduh template.';
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, jurusanList]);

  const handleImportMitra = useCallback(async (file: File, onProgress: (progress: number) => void, socketId?: string) => {
    return hubinApi.importMitraFromExcel(file, onProgress, socketId);
  }, []);

  const typedMitraResponse = mitraData as MitraListResponse | undefined;
  const rawList: MitraIndustri[] = useMemo(() => {
    if (Array.isArray(mitraData)) return mitraData;
    if (typedMitraResponse && Array.isArray(typedMitraResponse.data)) {
      return typedMitraResponse.data;
    }
    return [];
  }, [mitraData, typedMitraResponse]);

  const pagination = typedMitraResponse?.pagination;

  const mouStats: MitraStats = useMemo(() => {
    return computeMitraStats(typedMitraResponse, pagination?.total, rawList);
  }, [typedMitraResponse, pagination?.total, rawList]);

  const handleBulkExport = useCallback(() => {
    if (selectedRowKeys.size === 0) return;
    const selectedList = rawList.filter((m) => selectedRowKeys.has(m.id));
    if (selectedList.length === 0) {
      toast.error('Tidak ada data mitra terpilih');
      return;
    }
    exportMitraToExcel(selectedList, 'Mitra_Industri_Terpilih');
    toast.success(`${selectedList.length} mitra industri berhasil diekspor`);
  }, [selectedRowKeys, rawList]);

  const handleToggleSelectRow = useCallback((id: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const stats = useMemo(() => [
    {
      title: 'Total Mitra',
      value: mouStats.total,
      icon: <Building2 size={24} />,
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'MoU Aktif',
      value: mouStats.aktif,
      icon: <CheckCircle2 size={24} />,
      gradient: 'from-emerald-400 to-teal-600'
    },
    {
      title: 'Mendekati Berakhir',
      value: mouStats.expiringSoon,
      icon: <Clock size={24} />,
      gradient: 'from-amber-400 to-orange-600'
    },
    {
      title: 'Ter-Geofence',
      value: rawList?.filter((m: MitraIndustri) => m.latitude && m.longitude).length || 0,
      icon: <Navigation size={24} />,
      gradient: 'from-purple-500 to-indigo-600'
    }
  ], [mouStats, rawList]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Mitra Industri', path: '/hubin/mitra' }
  ], []);

  // Table Columns generated from modular column factory
  const columns = useMemo(() => {
    return createMitraColumns({
      isHubin,
      isPembimbing,
      jurusanList,
      editingQuotaId,
      tempQuotaValue,
      setEditingQuotaId,
      setTempQuotaValue,
      onSaveQuickQuota: handleSaveQuickQuota,
      isPendingQuota: quickQuotaMutation.isPending,
      onSelectDetail: (m) => setSelectedDetailMitra(m),
      onEdit: (m) => {
        setEditingMitra(m);
        setIsModalOpen(true);
      },
      onSelectMoU: (m) => setSelectedMoUMitra(m),
      onDelete: handleDelete,
    });
  }, [
    isHubin,
    isPembimbing,
    jurusanList,
    editingQuotaId,
    tempQuotaValue,
    handleSaveQuickQuota,
    quickQuotaMutation.isPending,
    handleDelete,
  ]);

  const paginationProps = useMemo(() => ({
    page,
    totalPages: pagination?.totalPages || 1,
    limit,
    onPageChange: (p: number) => setPage(p),
    onLimitChange: (l: number) => {
      setLimit(l);
      setPage(1);
    }
  }), [page, pagination?.totalPages, limit]);

  const SectionCardTitle = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between w-full pr-4">
      <div className="flex items-center gap-2">
        <Building2 className="text-indigo-600 dark:text-indigo-400" size={20} />
        <span>Daftar Mitra Industri</span>
      </div>
      <div className="flex items-center">
        {isHubin ? (
          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Manajemen Penuh (Hubin)
          </span>
        ) : isPembimbing ? (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Peninjau (Pembimbing Aktif)
          </span>
        ) : (
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Peninjau (Guru Akademik)
          </span>
        )}
      </div>
    </div>
  );

  const tableToolbarLeft = useMemo(() => (
    <div className="relative w-72 sm:w-80 md:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <Input
        aria-label="Cari nama mitra atau bidang industri"
        placeholder="Cari nama mitra atau bidang..."
        value={searchTerm}
        onChange={(e) => {
          const parsed = mitraSearchSchema.safeParse({ searchTerm: e.target.value });
          if (parsed.success) {
            setSearchTerm(e.target.value);
          }
        }}
        className="w-full h-9 text-[13px] rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm pl-9"
      />
    </div>
  ), [searchTerm]);

  const tableToolbarRight = useMemo(() => (
    <div className="flex items-center gap-2">
      <Button
        variant="toolbarOutline"
        size="toolbarIcon"
        onClick={() => refetch()}
        disabled={isLoading}
        className="rounded-xl h-9 w-9"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
      </Button>
      {isHubin && (
        <>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="toolbarOutline"
            size="toolbar"
            disabled={isExporting}
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold text-xs text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40 hover:bg-emerald-100/80"
            title="Import Mitra Industri dari Excel"
          >
            <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel</span>
          </Button>
          <Button
            onClick={() => {
              setEditingMitra(null);
              setIsModalOpen(true);
            }}
            variant="toolbarPrimary"
            size="toolbar"
            className="h-9 px-4 rounded-xl flex items-center gap-1.5"
          >
            <Plus size={16} />
            Tambah Mitra
          </Button>
        </>
      )}
    </div>
  ), [isLoading, isHubin, isExporting, refetch]);

  const renderMobileCardItem = useCallback((row: MitraIndustri) => (
    <MitraIndustriCard
      key={row.id}
      row={row}
      isHubin={isHubin}
      isPembimbing={isPembimbing}
      jurusanList={jurusanList}
      editingQuotaId={editingQuotaId}
      tempQuotaValue={tempQuotaValue}
      setEditingQuotaId={setEditingQuotaId}
      setTempQuotaValue={setTempQuotaValue}
      onSaveQuickQuota={handleSaveQuickQuota}
      isPendingQuota={quickQuotaMutation.isPending}
      onSelectDetail={(m) => setSelectedDetailMitra(m)}
      onEdit={(m) => {
        setEditingMitra(m);
        setIsModalOpen(true);
      }}
      onSelectMoU={(m) => setSelectedMoUMitra(m)}
      onDelete={handleDelete}
      isSelected={selectedRowKeys.has(row.id)}
      onToggleSelect={handleToggleSelectRow}
    />
  ), [
    isHubin,
    isPembimbing,
    jurusanList,
    editingQuotaId,
    tempQuotaValue,
    handleSaveQuickQuota,
    quickQuotaMutation.isPending,
    handleDelete,
    selectedRowKeys,
    handleToggleSelectRow
  ]);

  const mainContent = (
    <div className="space-y-6">
      <SectionCard title={SectionCardTitle} icon={Building2} fullWidth noPadding>
        <div className="bg-transparent overflow-hidden">
          <MitraMouFilterBar
            selectedMouFilter={selectedMouFilter}
            setSelectedMouFilter={setSelectedMouFilter}
            setPage={setPage}
            mouStats={mouStats}
          />
          {isMobile ? (
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between mb-4">
                {tableToolbarLeft}
                {tableToolbarRight}
              </div>
              <MobileAcademicList
                title="Daftar Mitra Industri"
                data={rawList}
                loading={isLoading}
                totalItems={pagination?.total || 0}
                emptyMessage="Tidak ada data mitra industri ditemukan"
                pagination={paginationProps}
                renderCard={renderMobileCardItem}
              />
            </div>
          ) : (
            <Table
              columns={columns}
              data={rawList}
              loading={isLoading}
              emptyMessage="Tidak ada data mitra industri ditemukan"
              compact={true}
              rowKey="id"
              selectedRowKeys={selectedRowKeys}
              onSelectedRowKeysChange={setSelectedRowKeys}
              pagination={paginationProps}
              toolbarLeft={tableToolbarLeft}
              toolbarRight={tableToolbarRight}
            />
          )}
        </div>
      </SectionCard>

      {/* Floating Bulk Action Bar */}
      <MitraBulkActionBar
        selectedCount={selectedRowKeys.size}
        onClearSelection={() => setSelectedRowKeys(new Set())}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        isDeleting={bulkDeleteMutation.isPending}
        canManage={isHubin}
      />

      {/* Modals with Suspense fallback */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <MitraFormModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            editingMitra={editingMitra}
            isPending={createMutation.isPending || updateMutation.isPending}
            isEditKontakOnly={isPembimbing && !isHubin}
            jurusanList={jurusanList}
          />
        )}
        {selectedMoUMitra && (
          <HubinMoUHistoryModal
            isOpen={Boolean(selectedMoUMitra)}
            onClose={() => setSelectedMoUMitra(null)}
            mitraId={selectedMoUMitra?.id || null}
            mitraNama={selectedMoUMitra?.nama || null}
          />
        )}
        {selectedDetailMitra && (
          <MitraDetailModal
            isOpen={Boolean(selectedDetailMitra)}
            onClose={() => setSelectedDetailMitra(null)}
            mitra={selectedDetailMitra}
          />
        )}
        {isImportModalOpen && (
          <ExcelImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            title="Import Mitra Industri"
            description="Unggah data master rekanan DUDI dan tempat PKL dari file Excel (.xlsx)."
            sampleDataHint="Pastikan kolom Nama Mitra diisi. Untuk memperbarui data mitra eksisting, samakan nama perusahaannya."
            onImport={handleImportMitra}
            onDownloadTemplate={handleDownloadTemplate}
            onSuccess={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['mitra-industri'] });
              toast.success('Data mitra industri berhasil diimpor.');
            }}
          />
        )}
      </Suspense>
    </div>
  );

  if (hideLayout) {
    return mainContent;
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Manajemen Mitra Industri"
      description="Bangun ekosistem kemitraan industri yang kuat. Kelola database perusahaan rekanan, pantau status MOU, hingga sinkronisasi lokasi industri untuk geofencing absensi PKL."
    >
      <AcademicPageLayout
        title="Mitra Industri"
        description="Kelola daftar rekanan industri untuk program PKL"
        breadcrumbs={breadcrumbs}
        stats={stats}
        isLoadingStats={isLoading}
        hardeningModuleKey="mitraindustripage"
        instruction={{
          title: "Panduan Manajemen Mitra Industri",
          description: "Kelola data mitra industri (DU/DI) untuk kelancaran program Praktik Kerja Lapangan (PKL).",
          items: [
            { text: "Daftarkan data nama perusahaan/instansi mitra industri baru." },
            { text: "Tambahkan dokumen kerjasama (MOU) dan tentukan koordinat geofencing untuk presensi PKL siswa." },
            { text: "Gunakan fitur Update Kontak untuk menyesuaikan nomor telepon operasional sewaktu-waktu." }
          ]
        }}
      >
        {mainContent}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export const MitraIndustriPage = React.memo(() => <MitraIndustriSection />);
export default MitraIndustriPage;
