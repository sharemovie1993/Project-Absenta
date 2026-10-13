import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Filter,
  RefreshCw,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import api from '../../lib/axiosInstance';
import { SectionCard, Table, Button } from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import useConfirm from '../../hooks/useConfirm';
import { formatDate } from '../../utils/date.utils';
import type { CoopAssetItem, CoopAssetSummary, CoopAssetFormData } from '@/components/cooperative/assets/types';

// Zod Schema Guard for Filter & Query
const assetFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
});

// Lazy Loaded Modals for Architecture Hardening
const AssetFormModal = lazy(() => import('@/components/cooperative/assets/AssetFormModal').then(m => ({ default: m.AssetFormModal })));
const AssetDetailModal = lazy(() => import('@/components/cooperative/assets/AssetDetailModal').then(m => ({ default: m.AssetDetailModal })));

const AssetsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCondition, setSelectedCondition] = useState('ALL');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<CoopAssetItem | null>(null);

  // Validate query filters with Zod
  const validatedFilters = useMemo(() => {
    const res = assetFilterSchema.safeParse({
      search: search.trim() || undefined,
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      condition: selectedCondition !== 'ALL' ? selectedCondition : undefined,
    });
    return res.success ? res.data : {};
  }, [search, selectedCategory, selectedCondition]);

  // Fetch Assets Data
  const { data: assetResponse, isLoading } = useQuery<{
    success: boolean;
    data: {
      summary: CoopAssetSummary;
      items: CoopAssetItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>({
    queryKey: ['cooperative-assets', page, limit, validatedFilters],
    queryFn: async () => {
      const res = await api.get('/cooperative/assets', {
        params: {
          page,
          limit,
          ...validatedFilters,
        }
      });
      return res.data;
    }
  });

  const assetsList = useMemo(() => assetResponse?.data?.items || [], [assetResponse]);
  const summary = useMemo(() => assetResponse?.data?.summary || {
    totalAssets: 0,
    totalAcquisitionValue: 0,
    goodCount: 0,
    damagedCount: 0,
    inUseCount: 0,
  }, [assetResponse]);

  const totalPages = assetResponse?.data?.pagination?.totalPages || 1;
  const totalItems = assetResponse?.data?.pagination?.total || 0;

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: CoopAssetFormData) => {
      if (selectedAsset) {
        return api.put(`/cooperative/assets/${selectedAsset.id}`, payload);
      }
      return api.post('/cooperative/assets', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cooperative-assets'] });
      toast.success(selectedAsset ? 'Data aset berhasil diperbarui' : 'Aset baru berhasil didaftarkan');
      setIsFormOpen(false);
      setSelectedAsset(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data aset');
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/cooperative/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cooperative-assets'] });
      toast.success('Aset berhasil dihapus');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus aset');
    }
  });

  const handleDelete = useCallback(async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Hapus Aset Koperasi',
      message: `Apakah Anda yakin ingin menghapus data inventaris aset "${name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger',
    });

    if (isConfirmed) {
      deleteMutation.mutate(id);
    }
  }, [confirm, deleteMutation]);

  // Sync Existing Assets to General Ledger Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/cooperative/assets/sync-accounting');
      return res.data;
    },
    onSuccess: (res: { message?: string; data?: { syncedCount: number } }) => {
      queryClient.invalidateQueries({ queryKey: ['cooperative-assets'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-balance-sheet-report'] });
      const count = res?.data?.syncedCount ?? 0;
      toast.success(res?.message || `Sinkronisasi selesai. ${count} aset dibukukan ke Neraca.`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Gagal menyinkronkan aset ke neraca keuangan');
    }
  });

  const handleSyncToLedger = useCallback(async () => {
    const isConfirmed = await confirm({
      title: 'Sinkronkan Aset ke Neraca',
      message: 'Apakah Anda ingin membukukan semua aset inventaris aktif yang belum tercatat ke Buku Besar & Laporan Neraca Keuangan?',
      confirmText: 'Sinkronkan Sekarang',
      cancelText: 'Batal',
      type: 'info',
    });

    if (isConfirmed) {
      syncMutation.mutate();
    }
  }, [confirm, syncMutation]);

  // Monthly Depreciation Run Mutation
  const depreciationMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const res = await api.post('/cooperative/assets/depreciate', {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
      return res.data;
    },
    onSuccess: (res: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['cooperative-assets'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-balance-sheet-report'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-journals'] });
      toast.success(res?.message || 'Penyusutan aset periode ini berhasil dibukukan');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Gagal memproses penyusutan aset');
    }
  });

  const handleRunDepreciation = useCallback(async () => {
    const now = new Date();
    const periodName = `${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}`;
    const isConfirmed = await confirm({
      title: 'Hitung & Bukukan Penyusutan Aset',
      message: `Apakah Anda ingin menghitung dan membukukan ayat jurnal penyesuaian beban penyusutan (Straight-Line) untuk seluruh aset aktif periode ${periodName}?`,
      confirmText: 'Proses Penyusutan',
      cancelText: 'Batal',
      type: 'info',
    });

    if (isConfirmed) {
      depreciationMutation.mutate();
    }
  }, [confirm, depreciationMutation]);

  const handleOpenEdit = useCallback((asset: CoopAssetItem) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  }, []);

  const handleOpenDetail = useCallback((asset: CoopAssetItem) => {
    setSelectedAsset(asset);
    setIsDetailOpen(true);
  }, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative' },
    { label: 'Inventaris Aset', path: '/cooperative/assets' },
  ], []);

  const columns = useMemo(() => [
    {
      label: 'Kode & Nama Aset',
      key: 'name',
      sortable: true,
      render: (_: string, row: CoopAssetItem) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
            {row.name}
          </span>
          <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
            {row.code}
          </span>
        </div>
      ),
    },
    {
      label: 'Kategori',
      key: 'category',
      render: (cat: string) => {
        const labels: Record<string, string> = {
          EQUIPMENT: 'Peralatan Kasir',
          DISPLAY_FURNITURE: 'Rak / Etalase',
          COOLING_APPLIANCE: 'Mesin Pendingin',
          BUILDING_FACILITY: 'Bangunan / Kantin',
          VEHICLE: 'Kendaraan',
          OTHER: 'Lainnya',
        };
        return (
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            {labels[cat] || cat}
          </span>
        );
      },
    },
    {
      label: 'Lokasi Fisik',
      key: 'location',
      render: (loc: string) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {loc || '-'}
        </span>
      ),
    },
    {
      label: 'Harga Perolehan',
      key: 'purchasePrice',
      sortable: true,
      render: (price: number) => (
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
          Rp {Math.round(Number(price || 0)).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      label: 'Tgl Beli',
      key: 'purchaseDate',
      render: (d: string) => (
        <span className="text-[11px] text-slate-500">
          {formatDate(d)}
        </span>
      ),
    },
    {
      label: 'Kondisi',
      key: 'condition',
      render: (cond: string) => {
        if (cond === 'GOOD') {
          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Baik</span>;
        }
        if (cond === 'FAIR') {
          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">Cukup</span>;
        }
        if (cond === 'DAMAGED') {
          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">Rusak</span>;
        }
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Afkir</span>;
      },
    },
    {
      label: 'Aksi',
      key: 'actions',
      render: (_: unknown, row: CoopAssetItem) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 rounded-lg text-slate-600 dark:text-slate-400"
            onClick={() => handleOpenDetail(row)}
            title="Lihat Detail Kartu Aset"
          >
            <Eye size={13} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 rounded-lg text-indigo-600 dark:text-indigo-400"
            onClick={() => handleOpenEdit(row)}
            title="Ubah Data Aset"
          >
            <Edit size={13} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50"
            onClick={() => handleDelete(row.id, row.name)}
            title="Hapus Aset"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    }
  ], [handleDelete, handleOpenDetail, handleOpenEdit]);

  return (
    <PremiumFeatureGate moduleName="KOPERASI" featureName="Aset Koperasi">
      <AcademicPageLayout
        title="Inventaris Aset Koperasi"
        description="Pencatatan aktiva tetap, peralatan kasir, etalase toko, dan sarana operasional milik koperasi sekolah"
        hardeningModuleKey="coop_assets"
        breadcrumbs={breadcrumbs}
        topSlot={
          <div className="space-y-3">
            <WorkspaceAppLauncherCard workspaceId="COOPERATIVE_WORKSPACE" />
          </div>
        }
        instruction={{
          title: 'Panduan Inventaris Aset Tetap Koperasi',
          description: 'Kelola aktiva tetap milik koperasi yang dibeli dari dana modal/cadangan anggota.',
          items: [
            { text: 'Daftarkan peralatan operasional toko (PC Kasir, Rak, Showcase, Brankas) secara berkala.' },
            { text: 'Perbarui status kondisi fisik barang jika mengalami kerusakan atau memerlukan perbaikan.' },
            { text: 'Pantau akumulasi nilai perolehan aktiva tetap untuk kelengkapan Laporan Neraca RAT.' },
            { text: 'Cetak kartu inventaris aset untuk ditempelkan pada fisik peralatan di toko/kantin.' },
          ],
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">

            {/* ── SECTION 1: Ringkasan Nilai & Kondisi Aset Koperasi ──────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnalyticsCard
                title="Total Unit Aset"
                value={summary.totalAssets.toString()}
                icon={<Package size={24} />}
                gradient="from-indigo-500 to-indigo-700 text-white border-indigo-400/30"
                subtitle={`${summary.inUseCount} Aset aktif digunakan`}
              />

              <AnalyticsCard
                title="Nilai Aktiva Tetap"
                value={`Rp ${Math.round(summary.totalAcquisitionValue).toLocaleString('id-ID')}`}
                icon={<DollarSign size={24} />}
                gradient="from-emerald-500 to-emerald-700 text-white border-emerald-400/30"
                subtitle="Total nilai perolehan buku"
              />

              <AnalyticsCard
                title="Kondisi Baik"
                value={summary.goodCount.toString()}
                icon={<ShieldCheck size={24} />}
                gradient="from-blue-500 to-blue-700 text-white border-blue-400/30"
                subtitle="Berfungsi normal di lapangan"
              />

              <AnalyticsCard
                title="Rusak / Perlu Servis"
                value={summary.damagedCount.toString()}
                icon={<AlertTriangle size={24} />}
                gradient="from-amber-500 to-amber-700 text-white border-amber-400/30"
                subtitle={summary.damagedCount > 0 ? 'Perlu tindakan perbaikan' : 'Semua aset prima'}
              />
            </div>

            {/* ── SECTION 2: Filter Toolbar & Tabel Aset ───────────────────────────── */}
            <SectionCard title="Daftar Inventaris Aset Tetap" fullWidth noPadding>
              <div className="p-6 space-y-4">
                
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-1 flex-wrap sm:flex-nowrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <input
                        type="text"
                        aria-label="Cari nama atau kode aset"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Cari nama atau kode aset..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="w-44">
                        <SearchableSelect
                          id="asset-category-filter"
                          value={selectedCategory}
                          onChange={(val) => {
                            setSelectedCategory(String(val));
                            setPage(1);
                          }}
                          options={[
                            { value: 'ALL', label: 'Semua Kategori' },
                            { value: 'EQUIPMENT', label: 'Peralatan Kasir' },
                            { value: 'DISPLAY_FURNITURE', label: 'Rak / Etalase' },
                            { value: 'COOLING_APPLIANCE', label: 'Mesin Pendingin' },
                            { value: 'BUILDING_FACILITY', label: 'Bangunan / Kantin' },
                            { value: 'VEHICLE', label: 'Kendaraan' },
                            { value: 'OTHER', label: 'Lainnya' },
                          ]}
                          placeholder="Kategori"
                          aria-label="Filter Kategori Aset"
                        />
                      </div>

                      <div className="w-36">
                        <SearchableSelect
                          id="asset-condition-filter"
                          value={selectedCondition}
                          onChange={(val) => {
                            setSelectedCondition(String(val));
                            setPage(1);
                          }}
                          options={[
                            { value: 'ALL', label: 'Semua Kondisi' },
                            { value: 'GOOD', label: 'Baik' },
                            { value: 'FAIR', label: 'Cukup' },
                            { value: 'DAMAGED', label: 'Rusak' },
                            { value: 'DISPOSED', label: 'Afkir' },
                          ]}
                          placeholder="Kondisi"
                          aria-label="Filter Kondisi Aset"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRunDepreciation}
                      disabled={depreciationMutation.isPending}
                      className="gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Hitung dan posting beban penyusutan garis lurus bulan ini"
                    >
                      <Calculator size={14} className={depreciationMutation.isPending ? 'animate-spin' : ''} />
                      <span>{depreciationMutation.isPending ? 'Menghitung...' : 'Hitung Penyusutan'}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSyncToLedger}
                      disabled={syncMutation.isPending}
                      className="gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
                      <span>{syncMutation.isPending ? 'Menyinkronkan...' : 'Sinkron ke Neraca'}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedAsset(null);
                        setIsFormOpen(true);
                      }}
                      className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Plus size={14} />
                      <span>Tambah Aset</span>
                    </Button>
                  </div>
                </div>

                {/* Table Data Master */}
                <Table
                  data={assetsList}
                  columns={columns}
                  loading={isLoading}
                  emptyMessage="Belum ada data inventaris aset tetap koperasi yang tercatat."
                  pagination={{
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                    onPageChange: (p) => setPage(p),
                    onLimitChange: () => {},
                  }}
                />
              </div>
            </SectionCard>

          </div>
        </SectionCard>

        {/* Modal Form Tambah/Ubah */}
        {isFormOpen && (
          <Suspense fallback={null}>
            <AssetFormModal
              isOpen={isFormOpen}
              onClose={() => {
                setIsFormOpen(false);
                setSelectedAsset(null);
              }}
              onSubmit={async (data) => {
                await saveMutation.mutateAsync(data);
              }}
              asset={selectedAsset}
              loading={saveMutation.isPending}
            />
          </Suspense>
        )}

        {/* Modal Detail & Cetak Kartu Aset */}
        {isDetailOpen && selectedAsset && (
          <Suspense fallback={null}>
            <AssetDetailModal
              isOpen={isDetailOpen}
              onClose={() => {
                setIsDetailOpen(false);
                setSelectedAsset(null);
              }}
              asset={selectedAsset}
              onEdit={(asset) => {
                handleOpenEdit(asset);
              }}
            />
          </Suspense>
        )}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

AssetsPage.displayName = 'CooperativeAssetsPage';

export default AssetsPage;
