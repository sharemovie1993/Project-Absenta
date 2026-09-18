import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { 
  Database, 
  RefreshCw, 
  ShieldCheck, 
  Archive,
  AlertTriangle,
  Zap,
  Info,
  Loader2,
  UploadCloud,
  DownloadCloud,
  Layers
} from 'lucide-react';
import { 
  SectionCard,
  Modal,
  Input,
  Label,
  Button,
  Badge,
  PageLoader,
  SearchableSelect
} from '../../components/ui';
import toast from 'react-hot-toast';
import { backupApi, type Backup } from '../../api/superadmin-backups.api';
import { getAllTenants } from '@/api/tenants.api';
import { formatDateTime } from '../../utils/layoutUtils';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { MigrationWizardModal } from '@/components/superadmin/backups/MigrationWizardModal';
import { ExportBundleModal } from '@/components/superadmin/backups/ExportBundleModal';
import { ReplicationConfigModal } from '@/components/superadmin/backups/ReplicationConfigModal';

// Lazy load BackupList (Pilar 13)
const BackupList = lazy(() => import('../../components/superadmin/backups/BackupList').then(m => ({ default: m.BackupList })));


// Zod Schema Validation Guard (Pilar 25)
const restoreSchema = z.object({
  tenantId: z.string().min(1, 'Target Tenant ID wajib diisi')
});

export const BackupsPage: React.FC = React.memo(() => {
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [replicationModalOpen, setReplicationModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [newTenantId, setNewTenantId] = useState('');
  const [restoreMode, setRestoreMode] = useState<'SAME_TENANT' | 'DIFFERENT_TENANT'>('SAME_TENANT');
  const [isRestoring, setIsRestoring] = useState(false);

  const tenantsQuery = useQuery({
    queryKey: ['superadmin-all-tenants-simple'],
    queryFn: async () => {
      const res = await getAllTenants({ limit: 100 }, { skipTenantHeader: true });
      return res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const allTenants = tenantsQuery.data || [];

  const backupsQuery = useQuery({
    queryKey: ['superadmin-backups-list'],
    queryFn: async () => {
      const res = await backupApi.list();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const backups = backupsQuery.data || [];
  const loading = backupsQuery.isLoading;

  const loadBackups = useCallback(async () => {
    await backupsQuery.refetch();
  }, [backupsQuery]);

  const handleDownload = useCallback(async (backup: Backup) => {
    const toastId = toast.loading('Mengunduh paket arsip cadangan...');
    try {
      const blob = await backupApi.downloadBlob(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (backup.Tenant?.name || 'tenant').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const isBundle = backup.file_path?.includes('.absenta') ?? true;
      const ext = isBundle ? 'absenta' : 'json.gz';
      a.download = `backup_${safeName}_${backup.id.substring(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('File cadangan berhasil diunduh', { id: toastId });
    } catch (err: unknown) {
      console.error('[handleDownload] Error:', err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj?.response?.data?.message || errorObj?.message || 'Download gagal';
      toast.error(`Download gagal: ${msg}`, { id: toastId });
    }
  }, []);

  const handleRestoreClick = useCallback((backup: Backup) => {
    setSelectedBackup(backup);
    setNewTenantId(backup.tenant_id || '');
    setRestoreMode('SAME_TENANT');
    setRestoreModalOpen(true);
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!selectedBackup) return;
    const parsed = restoreSchema.safeParse({ tenantId: newTenantId });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Target Tenant ID wajib diisi');
      return;
    }
    
    setIsRestoring(true);
    try {
      const res = await backupApi.restore(selectedBackup.id, newTenantId);
      if (res.success) {
        toast.success('Proses pemulihan data telah dimulai');
        setRestoreModalOpen(false);
        loadBackups();
      } else {
        toast.error(res.message || 'Proses pemulihan gagal');
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message || 'Pemulihan data gagal');
    } finally {
      setIsRestoring(false);
    }
  }, [selectedBackup, newTenantId, loadBackups]);

  const headerStats = useMemo(() => [
    {
      title: "Arsip Dingin",
      value: backups.length,
      icon: <Archive size={14} className="text-white" />,
      gradient: "from-slate-600 to-slate-800",
      subtitle: "Snapshot cadangan aktif",
      variant: "compact-premium" as const,
      mobileCompact: true
    },
    {
      title: "Total Size",
      value: `${(backups.reduce((acc, b) => acc + (parseInt(b.file_size_bytes) || 0), 0) / 1024 / 1024).toFixed(1)} MB`,
      icon: <Database size={14} className="text-white" />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Beban penyimpanan cloud",
      variant: "compact-premium" as const,
      mobileCompact: true
    }
  ], [backups]);

  const tenantSelectOptions = useMemo(() => {
    return (allTenants || [])?.map(t => ({
      value: t.id,
      label: `${t.name}${t.subdomain ? ` (${t.subdomain})` : ''}`
    })) || [];
  }, [allTenants]);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem' },
    { label: 'Arsip & Cadangan Data' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Arsip & Cadangan',
    description: 'Kelola cadangan database dan arsip data sekolah untuk keamanan dan pemulihan bencana.',
    items: [
      { text: 'Daftar arsip menampilkan cadangan yang siap diunduh atau dipulihkan.' },
      { text: 'Anda dapat memulihkan cadangan ke tenant kosong untuk keperluan audit atau migrasi.' },
      { text: 'Pastikan untuk mengunduh cadangan penting secara berkala ke penyimpanan eksternal.' },
      { text: 'Status READY menandakan snapshot siap digunakan untuk pemulihan instan.' }
    ]
  }), []);

  return (
    <InfraErrorBoundary>
      <SuperAdminPageLayout
        hardeningModuleKey="superadmin_backups"
        title="Manajemen Arsip & Cadangan"
        description="Pusat kendali untuk pembuatan, pengunduhan, dan pemulihan cadangan data (Backup & Restore) seluruh ekosistem sekolah."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        stats={headerStats}
      >
        <SectionCard
          title="Daftar Arsip Cadangan Sistem"
          icon={ShieldCheck}
          fullWidth
          noPadding
        >
          <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <span className="text-xs font-bold text-slate-500">Total {backups.length} snapshot terdaftar</span>
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap max-w-full">
              <Button 
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setMigrationModalOpen(true)}
                className="gap-1.5 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs whitespace-nowrap shrink-0 sm:shrink"
              >
                <UploadCloud size={13} />
                <span>Import Paket</span>
              </Button>
              <Button 
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setReplicationModalOpen(true)}
                className="gap-1.5 border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs whitespace-nowrap shrink-0 sm:shrink"
                title="Konfigurasi Replikasi Storage MinIO / Cloud Mirror"
              >
                <Layers size={13} />
                <span>Replikasi</span>
              </Button>
              {backups.length > 0 && (
                <Button 
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => setExportModalOpen(true)}
                  className="gap-1.5 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs whitespace-nowrap shrink-0 sm:shrink"
                >
                  <DownloadCloud size={13} />
                  <span>Export</span>
                </Button>
              )}
              <Button 
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={loadBackups}
                disabled={loading}
                className="gap-1.5 text-xs whitespace-nowrap shrink-0 sm:shrink"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>


          <Suspense fallback={<PageLoader />}>
            <BackupList 
              items={backups}
              loading={loading}
              onRefresh={loadBackups}
              onDownload={handleDownload}
              onRestore={handleRestoreClick}
            />
          </Suspense>
        </SectionCard>

        <Modal 
          isOpen={restoreModalOpen} 
          onClose={() => !isRestoring && setRestoreModalOpen(false)} 
          title="Pemulihan Arsip Cadangan"
          className="max-w-lg w-full"
          contentClassName="p-4 sm:p-6 w-full max-w-full min-w-0"
        >
          <div className="space-y-4 text-xs w-full max-w-full min-w-0">
            {/* Kartu Informasi Arsip Terpilih */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 w-full max-w-full min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                  <Archive size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sekolah Sumber</span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedBackup?.Tenant?.name || 'System Platform'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    Snapshot: {selectedBackup?.snapshot_date ? formatDateTime(selectedBackup.snapshot_date) : '-'}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                {selectedBackup?.file_size_bytes ? `${(parseInt(selectedBackup.file_size_bytes) / 1024 / 1024).toFixed(2)} MB` : ''}
              </Badge>
            </div>

            {/* Pilihan Mode Pemulihan */}
            <div className="space-y-2 w-full max-w-full min-w-0">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Tujuan Pemulihan
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-full min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setRestoreMode('SAME_TENANT');
                    setNewTenantId(selectedBackup?.tenant_id || '');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    restoreMode === 'SAME_TENANT'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/20 font-bold'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs block">Pulihkan ke Asal</span>
                  <span className="text-[10px] font-normal opacity-80 block truncate">
                    Rollback data {selectedBackup?.Tenant?.name || ''}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRestoreMode('DIFFERENT_TENANT');
                    const other = allTenants.find(t => t.id !== selectedBackup?.tenant_id);
                    setNewTenantId(other ? other.id : '');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    restoreMode === 'DIFFERENT_TENANT'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/20 font-bold'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs block">Salin ke Sekolah Lain</span>
                  <span className="text-[10px] font-normal opacity-80 block">
                    Kloning ke tenant lain
                  </span>
                </button>
              </div>
            </div>

            {/* Target Sekolah Input / Selector */}
            {restoreMode === 'DIFFERENT_TENANT' ? (
              <div className="space-y-1.5 w-full max-w-full min-w-0">
                <Label htmlFor="targetTenantSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Sekolah / Tenant Target <span className="text-rose-500">*</span>
                </Label>
                <SearchableSelect
                  id="targetTenantSelect"
                  value={newTenantId}
                  onChange={(val) => setNewTenantId(val)}
                  options={tenantSelectOptions}
                  placeholder="-- Pilih Sekolah Tujuan --"
                  searchPlaceholder="Cari sekolah atau ID tenant..."
                  className="w-full max-w-full min-w-0"
                />
                <p className="text-[10px] text-slate-400">
                  Disarankan memilih tenant baru atau kosong untuk mencegah konflik data.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1 w-full max-w-full min-w-0">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>Target Restorasi:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{selectedBackup?.Tenant?.name}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Data sekolah saat ini akan dikembalikan ke kondisi saat snapshot ini dibuat.
                </p>
              </div>
            )}

            {/* Peringatan Kontekstual */}
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] space-y-0.5 leading-relaxed">
                <span className="font-bold block">Perhatian Sebelum Memulihkan</span>
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  {restoreMode === 'SAME_TENANT'
                    ? 'Proses ini akan mengembalikan data sekolah ke arsip snapshot terpilih. Pastikan tidak ada aktivitas absensi penting yang sedang berlangsung.'
                    : 'Seluruh tabel snapshot akan disalin ke tenant tujuan. Pastikan tenant tujuan sudah siap menerima data.'}
                </p>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => setRestoreModalOpen(false)}
                disabled={isRestoring}
                className="h-9 text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button 
                type="button"
                variant="default"
                onClick={confirmRestore} 
                disabled={!newTenantId || isRestoring}
                className="h-9 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                {isRestoring ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                {isRestoring ? 'Memproses...' : 'Mulai Pemulihan'}
              </Button>
            </div>
          </div>
        </Modal>

        <MigrationWizardModal
          isOpen={migrationModalOpen}
          onClose={() => setMigrationModalOpen(false)}
          onSuccess={loadBackups}
        />

        <ExportBundleModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          tenantId={selectedBackup?.tenant_id}
          tenantName={selectedBackup?.Tenant?.name}
          tenants={(allTenants || [])?.map(t => ({ id: t.id, name: t.name })) || []}
        />

        <ReplicationConfigModal
          isOpen={replicationModalOpen}
          onClose={() => setReplicationModalOpen(false)}
          onRefreshList={loadBackups}
        />
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});


export default BackupsPage;
