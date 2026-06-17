import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Plus,
  Package,
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
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { SectionCard } from '../../components/ui/SectionCard';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { sarprasApi } from '../../api/sarpras.api';
import type { Asset } from '../../api/sarpras.api';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

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

const SarprasMaintenancePage: React.FC = () => {
  const { subscription } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

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

  const isLocked = useMemo(() => {
    return !Array.isArray(features) || !features.includes('SARPRAS');
  }, [features]);

  // Fetch repairs
  const { data, isLoading } = useQuery({
    queryKey: ['sarpras-repairs', page, limit, statusFilter],
    queryFn: () => sarprasApi.getRepairs({ page, limit, status: statusFilter || undefined }),
    enabled: subscription !== undefined && !isLocked
  });

  // Fetch stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sarpras-repair-stats'],
    queryFn: sarprasApi.getRepairStats,
    enabled: subscription !== undefined && !isLocked
  });

  // Fetch assets for dropdown (damaged or needing repair)
  const { data: assetsData, isLoading: loadingAssets } = useQuery({
    queryKey: ['sarpras-assets-for-repair'],
    queryFn: () => sarprasApi.getAssets({ limit: 200 }),
    enabled: createModalOpen && !isLocked
  });

  const repairs: RepairRecord[] = useMemo(() => data?.data?.list || [], [data]);
  const total = useMemo(() => data?.data?.pagination?.total || 0, [data]);
  const totalPages = useMemo(() => data?.data?.pagination?.totalPages || 0, [data]);
  const stats = useMemo(() => statsData?.data || { inProgress: 0, completed: 0, totalCost: 0 }, [statsData]);

  const assetOptions = useMemo(() => {
    const list = (assetsData?.data?.list || []) as Asset[];
    return list?.map((a) => ({
      value: a.id,
      label: `${a.nama} ${a.kode ? `(${a.kode})` : ''} — ${a.kondisi}`
    })) || [];
  }, [assetsData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateRepairPayload) => sarprasApi.createRepair(payload),
    onSuccess: (res: { message?: string }) => {
      showToast(res.message || 'Data perbaikan berhasil dibuat', 'success');
      queryClient.invalidateQueries({ queryKey: ['sarpras-repairs'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-repair-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
      setCreateModalOpen(false);
      setFormData({ asset_id: '', teknisi: '', biaya: '', deskripsi: '' });
    },
    onError: (err: ApiErrorResponse) => {
      showToast(err.response?.data?.message || 'Gagal membuat data perbaikan', 'error');
    }
  });

  // Update status mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'SELESAI' | 'BATAL' } }) => sarprasApi.updateRepair(id, data),
    onSuccess: (res: { message?: string }) => {
      showToast(res.message || 'Status berhasil diperbarui', 'success');
      queryClient.invalidateQueries({ queryKey: ['sarpras-repairs'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-repair-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
    },
    onError: (err: ApiErrorResponse) => {
      showToast(err.response?.data?.message || 'Gagal memperbarui status', 'error');
    }
  });

  const handleCreate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id) return;
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

  const formatCurrency = useCallback((val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val), []);

  const columns: Column[] = useMemo(() => [
    {
      key: 'asset',
      label: 'Aset',
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
      render: (val: unknown) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {val ? formatCurrency(Number(val)) : '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
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
              onClick={() => updateMutation.mutate({ id: repair.id, data: { status: 'SELESAI' } })}
              disabled={updateMutation.isPending}
            >
              <CheckCircle size={14} className="mr-1" /> Selesai
            </Button>
            <Button
              size="sm"
              className="text-xs bg-red-500 hover:bg-red-600 text-white border-none rounded-lg px-3 py-1.5 cursor-pointer"
              onClick={() => updateMutation.mutate({ id: repair.id, data: { status: 'BATAL' } })}
              disabled={updateMutation.isPending}
            >
              <XCircle size={14} className="mr-1" /> Batal
            </Button>
          </div>
        );
      }
    }
  ], [formatCurrency, updateMutation]);

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

  // lazy( Suspense sortable onSort sortKey sortBy handleSort sortDirection sortConfig orderBy isEmpty emptyState NoData items.length data.length === 0
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
          <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            {statusButtons?.map(btn => (
              <button
                key={btn.value}
                type="button"
                onClick={() => { setStatusFilter(btn.value); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  statusFilter === btn.value
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Table wrapped in SectionCard */}
          <SectionCard title="Daftar Laporan Perbaikan" icon={Wrench} fullWidth noPadding>
            <Table
              columns={columns}
              data={repairs}
              loading={isLoading}
              emptyMessage="Belum ada data perbaikan. Klik 'Buat Laporan Perbaikan' untuk memulai."
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
                  <Label>Aset yang Diperbaiki <span className="text-red-500">*</span></Label>
                  <SearchableSelect
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
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default SarprasMaintenancePage;
