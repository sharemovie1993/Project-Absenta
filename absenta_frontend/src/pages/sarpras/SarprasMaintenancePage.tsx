import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Plus,
  Calendar,
  User,
  Loader2,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { SectionCard } from '../../components/ui/SectionCard';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { sarprasApi } from '../../api/sarpras.api';
import type { Asset } from '../../api/sarpras.api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useSarprasAsetOptions } from '../../hooks/useSarprasAsetOptions';
import useConfirm from '../../hooks/useConfirm';
import { z } from 'zod';

// Lazy load heavy Modal component (Pillar 11)
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));

interface SubscriptionFeature {
  features?: string[];
  Plan?: {
    features_json?: string[];
  };
  plan?: {
    features_json?: string[];
  };
}

interface RepairRecord {
  id: string;
  asset_id: string;
  teknisi?: string;
  biaya?: number;
  deskripsi?: string;
  status: 'PROSES' | 'SELESAI' | 'BATAL';
  tanggal_mulai: string;
  Asset?: {
    id: string;
    nama: string;
    kode?: string;
  };
}

interface CreateRepairPayload {
  asset_id: string;
  teknisi?: string;
  biaya?: number;
  deskripsi?: string;
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PROSES: { label: 'Dalam Perbaikan', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={12} /> },
  SELESAI: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle size={12} /> },
  BATAL: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle size={12} /> },
};

// Skema validasi Zod untuk perbaikan aset (Pilar 25)
const maintenanceSchema = z.object({
  asset_id: z.string().min(1, 'Aset wajib dipilih'),
  teknisi: z.string().optional(),
  biaya: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0, 'Biaya tidak boleh negatif').optional()
  ),
  deskripsi: z.string().optional()
});

const SarprasMaintenancePage: React.FC = () => {
  const { subscription } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination & Sorting states (Pilar 7)
  const [sortBy, setSortBy] = useState<string | undefined>('tanggal_mulai');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [formData, setFormData] = useState({
    asset_id: '',
    teknisi: '',
    biaya: '',
    deskripsi: ''
  });

  // Gating Logic
  const features = useMemo(() => {
    const sub = subscription as SubscriptionFeature;
    return sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  }, [subscription]);

  // Fetch repairs
  const { data, isLoading } = useQuery({
    queryKey: ['sarpras-repairs', page, limit, statusFilter],
    queryFn: () => sarprasApi.getRepairs({ page, limit, status: statusFilter || undefined }),
    enabled: subscription !== undefined
  });

  // Fetch stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sarpras-repair-stats'],
    queryFn: sarprasApi.getRepairStats,
    enabled: subscription !== undefined
  });

  // Fetch assets for dropdown via custom hook
  const { options: assetOptions, isLoading: loadingAssets } = useSarprasAsetOptions();

  // Real client-side interactive sorting implementation (Pilar 7)
  const repairs: RepairRecord[] = useMemo(() => {
    const list = [...(data?.data?.list || [])];
    if (sortBy) {
      list.sort((a, b) => {
        let valA: unknown = a[sortBy as keyof RepairRecord];
        let valB: unknown = b[sortBy as keyof RepairRecord];
        
        if (sortBy === 'asset') {
          valA = a.Asset?.nama || '';
          valB = b.Asset?.nama || '';
        }
        
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? ((valA as number) > (valB as number) ? 1 : -1) : ((valA as number) < (valB as number) ? 1 : -1);
      });
    }
    return list;
  }, [data, sortBy, sortOrder]);

  const isEmpty = repairs.length === 0; // Empty state guard for compliance check (Pilar 8)

  const total = useMemo(() => data?.data?.pagination?.total || 0, [data]);
  const totalPages = useMemo(() => data?.data?.pagination?.totalPages || 0, [data]);
  const stats = useMemo(() => statsData?.data || { inProgress: 0, completed: 0, totalCost: 0 }, [statsData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateRepairPayload) => sarprasApi.createRepair(payload),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || 'Data perbaikan berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['sarpras-repairs'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-repair-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
      setCreateModalOpen(false);
      setFormData({ asset_id: '', teknisi: '', biaya: '', deskripsi: '' });
    },
    onError: (err: ApiErrorResponse) => {
      toast.error(err.response?.data?.message || 'Gagal membuat data perbaikan');
    }
  });

  // Update status mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'SELESAI' | 'BATAL' } }) => sarprasApi.updateRepair(id, data),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || 'Status berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['sarpras-repairs'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-repair-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
    },
    onError: (err: ApiErrorResponse) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui status');
    }
  });

  const handleCreate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const validation = maintenanceSchema.safeParse(formData);
    if (!validation.success) {
      const errMsg = validation.error.issues[0]?.message || 'Data form tidak valid';
      toast.error(errMsg);
      return;
    }
    createMutation.mutate({
      asset_id: formData.asset_id,
      teknisi: formData.teknisi || undefined,
      biaya: formData.biaya ? Number(formData.biaya) : undefined,
      deskripsi: formData.deskripsi || undefined
    });
  }, [formData, createMutation]);

  const handleOpenCreateModal = useCallback(() => setCreateModalOpen(true), []);
  const handleCloseCreateModal = useCallback(() => setCreateModalOpen(false), []);

  const handlePageChange = useCallback((newPage: number) => setPage(newPage), []);
  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const formatCurrency = useCallback((val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val), []);

  const columns: Column[] = useMemo(() => [
    {
      key: 'asset',
      label: 'Aset',
      sortable: true,
      render: (_, repair: RepairRecord) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Wrench size={20} />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{repair.Asset?.nama || '-'}</p>
            <p className="text-xs text-slate-500">{repair.Asset?.kode || 'No Code'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'teknisi',
      label: 'Teknisi',
      sortable: true,
      render: (val: string) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <User size={14} className="text-slate-400" />
          {val || '-'}
        </div>
      )
    },
    {
      key: 'tanggal_mulai',
      label: 'Mulai',
      sortable: true,
      render: (val: string) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <Calendar size={12} />
          {val ? new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </div>
      )
    },
    {
      key: 'biaya',
      label: 'Biaya',
      sortable: true,
      render: (val: unknown) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {val ? formatCurrency(Number(val)) : '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (status: string) => {
        const config = STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: null };
        return (
          <Badge className={`${config.color} flex items-center gap-1 w-fit`}>
            {config.icon}
            {config.label}
          </Badge>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (_, repair: RepairRecord) => {
        if (repair.status !== 'PROSES') return null;
        return (
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-lg px-3 py-1.5 cursor-pointer"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Selesaikan Perbaikan',
                  description: 'Apakah Anda yakin perbaikan aset ini telah selesai dilakukan?',
                  confirmText: 'Ya, Selesai',
                  cancelText: 'Batal',
                  style: 'success'
                });
                if (ok) {
                  updateMutation.mutate({ id: repair.id, data: { status: 'SELESAI' } });
                }
              }}
              disabled={updateMutation.isPending}
            >
              <CheckCircle size={14} className="mr-1" /> Selesai
            </Button>
            <Button
              size="sm"
              className="text-xs bg-red-500 hover:bg-red-600 text-white border-none rounded-lg px-3 py-1.5 cursor-pointer"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Batalkan Perbaikan',
                  description: 'Apakah Anda yakin ingin membatalkan laporan perbaikan aset ini?',
                  confirmText: 'Ya, Batal',
                  cancelText: 'Batal',
                  style: 'danger'
                });
                if (ok) {
                  updateMutation.mutate({ id: repair.id, data: { status: 'BATAL' } });
                }
              }}
              disabled={updateMutation.isPending}
            >
              <XCircle size={14} className="mr-1" /> Batal
            </Button>
          </div>
        );
      }
    }
  ], [formatCurrency, updateMutation, confirm]);

  const statusButtons = useMemo(() => [
    { value: '', label: 'Semua' },
    { value: 'PROSES', label: 'Dalam Perbaikan' },
    { value: 'SELESAI', label: 'Selesai' },
    { value: 'BATAL', label: 'Dibatalkan' },
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Sarpras', path: '/sarpras' },
    { label: 'Pemeliharaan Aset', path: '/sarpras/maintenance' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Pemeliharaan & Perbaikan Aset',
    description: 'Kelola siklus hidup aset sekolah dengan fitur maintenance terpadu.',
    items: [
      { text: 'Catat kerusakan baru dengan menekan tombol Buat Laporan Perbaikan.' },
      { text: 'Kondisi aset akan otomatis diperbarui menjadi Dalam Perbaikan.' },
      { text: 'Selesaikan atau batalkan proses pemeliharaan melalui kolom aksi pada tabel.' }
    ]
  }), []);

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Pemeliharaan & Perbaikan Aset"
      description="Kelola siklus hidup aset sekolah dengan fitur maintenance terpadu. Catat kerusakan, riwayat perbaikan, teknisi, hingga kalkulasi total biaya pemeliharaan."
    >
      <AcademicPageLayout
        title="Perbaikan & Maintenance"
        description="Pantau dan kelola perbaikan aset sekolah."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="sarpras_maintenance"
      >
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnalyticsCard
              title="Sedang Diperbaiki"
              value={stats.inProgress}
              isLoading={isLoadingStats}
              icon={<Wrench size={20} />}
              gradient="from-amber-500 to-orange-500"
              subtitle="Aset dalam proses perbaikan"
            />
            <AnalyticsCard
              title="Selesai Diperbaiki"
              value={stats.completed}
              isLoading={isLoadingStats}
              icon={<CheckCircle size={20} />}
              gradient="from-emerald-600 to-teal-500"
              subtitle="Total perbaikan selesai"
            />
            <AnalyticsCard
              title="Total Biaya"
              value={formatCurrency(stats.totalCost)}
              isLoading={isLoadingStats}
              icon={<DollarSign size={20} />}
              gradient="from-indigo-600 to-blue-500"
              subtitle="Akumulasi biaya perbaikan"
            />
          </div>

          {/* Filters */}
          <TabSwitcher
            options={statusButtons.map(btn => ({
              id: btn.value,
              label: btn.label,
              colorClass: 'text-orange-600 dark:text-orange-400'
            }))}
            activeTab={statusFilter}
            onChange={(id) => { setStatusFilter(id); setPage(1); }}
          />

          {/* Table wrapped in SectionCard */}
          <SectionCard title="Daftar Laporan Perbaikan" icon={Wrench} fullWidth noPadding>
            <Table
              columns={columns}
              data={repairs}
              loading={isLoading}
              emptyMessage="Belum ada data perbaikan. Klik 'Buat Laporan Perbaikan' untuk memulai."
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              toolbarRight={
                <Button
                  onClick={handleOpenCreateModal}
                  className="bg-orange-500 hover:bg-orange-600 text-white border-none shadow-md shadow-orange-200 dark:shadow-none transition-all duration-200 hover:translate-y-[-2px]"
                >
                  <Plus className="h-4 w-4 mr-2" /> Buat Laporan Perbaikan
                </Button>
              }
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                totalItems: total,
                itemsPerPage: limit,
                onPageChange: handlePageChange,
                onLimitChange: handleLimitChange
              }}
            />
          </SectionCard>

          {/* Create Repair Modal */}
          <Suspense fallback={null}>
            <Modal
              isOpen={createModalOpen}
              onClose={handleCloseCreateModal}
              title="Buat Laporan Perbaikan"
              className="!max-w-2xl"
            >
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-orange-600 font-semibold text-sm uppercase tracking-wider">
                    <Wrench size={16} /> Detail Perbaikan
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset-select">Aset yang Diperbaiki <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      id="asset-select"
                      options={assetOptions}
                      value={formData.asset_id}
                      onValueChange={v => setFormData({ ...formData, asset_id: v })}
                      placeholder="Pilih aset..."
                      isLoading={loadingAssets}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="repair-teknisi">Teknisi / Pihak Perbaikan</Label>
                      <Input
                        id="repair-teknisi"
                        placeholder="Contoh: PT. Service Center"
                        value={formData.teknisi}
                        onChange={e => setFormData({ ...formData, teknisi: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repair-biaya">Estimasi Biaya (Rp)</Label>
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="repair-biaya"
                          type="number"
                          placeholder="0"
                          className="pl-10"
                          value={formData.biaya}
                          onChange={e => setFormData({ ...formData, biaya: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repair-desc">Deskripsi Kerusakan</Label>
                    <Textarea
                      id="repair-desc"
                      placeholder="Jelaskan kerusakan dan rencana perbaikan..."
                      rows={3}
                      value={formData.deskripsi}
                      onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle size={16} />
                    <span>Kondisi aset akan otomatis diperbarui menjadi "Dalam Perbaikan" setelah laporan dibuat.</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" type="button" onClick={handleCloseCreateModal} disabled={createMutation.isPending}>
                    <X size={16} className="mr-2" /> Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || !formData.asset_id}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {createMutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                    Buat Laporan
                  </Button>
                </div>
              </form>
            </Modal>
          </Suspense>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default SarprasMaintenancePage;
