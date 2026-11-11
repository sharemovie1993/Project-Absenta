import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Database, 
  RefreshCw, 
  ShieldCheck, 
  Archive,
  AlertTriangle,
  Zap,
  Loader2,
  UploadCloud,
  DownloadCloud,
  Layers,
  Camera,
  AlertOctagon,
  Copy,
  Globe,
  CheckCircle2
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
import { CreateSnapshotModal } from '@/components/superadmin/backups/CreateSnapshotModal';
import { FactoryResetModal } from '@/components/superadmin/backups/FactoryResetModal';

// Lazy load BackupList (Pilar 13)
const BackupList = lazy(() => import('../../components/superadmin/backups/BackupList').then(m => ({ default: m.BackupList })));


// Zod Schema Validation Guard (Pilar 25)
const restoreSchema = z.object({
  tenantId: z.string().min(1, 'Target Tenant ID wajib diisi')
});

export const BackupsPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [replicationModalOpen, setReplicationModalOpen] = useState(false);
  const [createSnapshotModalOpen, setCreateSnapshotModalOpen] = useState(false);
  const [factoryResetModalOpen, setFactoryResetModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [newTenantId, setNewTenantId] = useState('');
  const [restoreMode, setRestoreMode] = useState<'SAME_TENANT' | 'DIFFERENT_TENANT'>('SAME_TENANT');
  const [isRestoring, setIsRestoring] = useState(false);
  const [cloneTargetSubdomain, setCloneTargetSubdomain] = useState('');
  const [cloneTargetName, setCloneTargetName] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneSuccessResult, setCloneSuccessResult] = useState<{ targetSubdomain?: string; targetName?: string; message?: string } | null>(null);

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

  const replicationQuery = useQuery({
    queryKey: ['superadmin-replication-status-summary'],
    queryFn: async () => {
      const res = await backupApi.getReplicationStatus().catch(() => null);
      return res?.data || null;
    },
    staleTime: 10 * 1000,
  });
  const replicationStatus = replicationQuery.data;

  const loadBackups = useCallback(async () => {
    await Promise.all([
      backupsQuery.refetch(),
      replicationQuery.refetch()
    ]);
  }, [backupsQuery, replicationQuery]);

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
      let msg = 'Download gagal';
      const errorObj = err as { response?: { data?: unknown }; message?: string };
      if (errorObj?.response?.data instanceof Blob) {
        try {
          const text = await errorObj.response.data.text();
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch {
          msg = errorObj?.message || 'Berkas fisik arsip tidak ditemukan di penyimpanan server';
        }
      } else {
        const fallbackObj = errorObj?.response?.data as { message?: string } | undefined;
        msg = fallbackObj?.message || errorObj?.message || 'Download gagal';
      }
      toast.error(`Download gagal: ${msg}`, { id: toastId });
      loadBackups();
    }
  }, [loadBackups]);

  const handleRestoreClick = useCallback((backup: Backup) => {
    setSelectedBackup(backup);
    setNewTenantId(backup.tenant_id || '');
    setRestoreMode('SAME_TENANT');
    setRestoreModalOpen(true);
  }, []);

  const handleCloneClick = useCallback((backup: Backup) => {
    setSelectedBackup(backup);
    const sourceSub = (backup.Tenant?.subdomain || backup.Tenant?.name || 'sekolah')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setCloneTargetSubdomain(`${sourceSub || 'tenant'}-demo`);
    setCloneTargetName(`${backup.Tenant?.name || 'Tenant'} (Demo)`);
    setCloneSuccessResult(null);
    setCloneModalOpen(true);
  }, []);

  const confirmClone = useCallback(async () => {
    if (!selectedBackup) return;
    const cleanSub = cloneTargetSubdomain.trim().toLowerCase();
    const cleanName = cloneTargetName.trim();
    const sourceSub = (selectedBackup.Tenant?.subdomain || '').toLowerCase();

    if (!cleanSub || !/^[a-z0-9-]+$/.test(cleanSub)) {
      toast.error('Subdomain target hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).');
      return;
    }
    if (sourceSub && cleanSub === sourceSub) {
      toast.error(`Subdomain target harus berbeda dari sekolah sumber (${sourceSub}).`);
      return;
    }
    if (!cleanName) {
      toast.error('Nama sekolah demo wajib diisi.');
      return;
    }

    setIsCloning(true);
    try {
      const res = await backupApi.cloneSnapshot(selectedBackup.id, {
        targetSubdomain: cleanSub,
        targetName: cleanName
      });
      if (res?.success) {
        setCloneSuccessResult({
          targetSubdomain: res.data?.targetSubdomain || cleanSub,
          targetName: res.data?.targetName || cleanName,
          message: res.message
        });
        toast.success(`Tenant kloning ${cleanSub}.absenta.id berhasil dibuat!`);
        await loadBackups();
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        queryClient.invalidateQueries({ queryKey: ['tenants-statistics'] });
        queryClient.invalidateQueries({ queryKey: ['superadmin-all-tenants-simple'] });
      } else {
        toast.error(res?.message || 'Kloning snapshot gagal');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengkloning snapshot');
    } finally {
      setIsCloning(false);
    }
  }, [selectedBackup, cloneTargetSubdomain, cloneTargetName, loadBackups, queryClient]);

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
    title: 'Panduan Arsip & Kloning Tenant',
    description: 'Kelola cadangan data sekolah, unduh arsip, atau kloning tenant produksi menjadi tenant demo untuk simulasi sosialisasi.',
    items: [
      { text: 'Buat Snapshot: menyimpan cadangan arsip (.absenta) tenant pilihan ke server penyimpanan.' },
      { text: 'Kloning (tombol di baris arsip): menggandakan snapshot langsung ke subdomain baru (misal smkn1pld-demo) tanpa mengubah data & lisensi produksi.' },
      { text: 'Pulihkan (tombol di baris arsip): menimpa ulang/rollback data ke sekolah yang sudah ada.' },
      { text: 'Import / Kloning File & Export (.absenta): untuk mengunggah atau mengunduh arsip antar server.' }
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
                onClick={() => setCreateSnapshotModalOpen(true)}
                className="gap-1.5 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs whitespace-nowrap shrink-0 sm:shrink font-bold"
                title="Buat snapshot cadangan baru langsung ke MinIO & Cloud Storage"
              >
                <Camera size={13} />
                <span>Buat Snapshot</span>
              </Button>
              <Button 
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setMigrationModalOpen(true)}
                className="gap-1.5 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs whitespace-nowrap shrink-0 sm:shrink"
                title="Unggah file .absenta dari komputer untuk pemulihan atau kloning ke tenant baru"
              >
                <UploadCloud size={13} />
                <span>Import / Kloning File</span>
              </Button>
              <Button 
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setReplicationModalOpen(true)}
                className="gap-1.5 border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs whitespace-nowrap shrink-0 sm:shrink relative"
                title="Konfigurasi Replikasi Storage MinIO / Cloud Mirror"
              >
                <Layers size={13} />
                <span>Replikasi</span>
                {(() => {
                  const tier2 = replicationStatus?.tier2 || replicationStatus?.replica;
                  const tier3 = replicationStatus?.tier3;
                  const activeReplicas = [
                    tier2?.enabled ? { name: 'Tier 2 (LAN)', ...tier2 } : null,
                    tier3?.enabled ? { name: 'Tier 3 (Cloud)', ...tier3 } : null
                  ].filter(Boolean) as { name: string; status: string; totalObjects?: number }[];

                  if (activeReplicas.length === 0) return null;

                  const anyOffline = activeReplicas.some(r => r.status !== 'ONLINE');
                  const totalPrimary = replicationStatus?.primary?.totalObjects || 0;
                  const outdatedReplicas = activeReplicas.filter(r => r.status === 'ONLINE' && (r.totalObjects || 0) < totalPrimary);

                  if (anyOffline) {
                    const offlineNames = activeReplicas.filter(r => r.status !== 'ONLINE').map(r => r.name).join(', ');
                    return (
                      <span 
                        className="inline-block w-2 h-2 rounded-full bg-rose-500"
                        title={`Replika Offline: ${offlineNames}`}
                      />
                    );
                  }

                  if (outdatedReplicas.length > 0) {
                    const msg = outdatedReplicas.map(r => `${r.name}: ${r.totalObjects || 0}/${totalPrimary}`).join('; ');
                    return (
                      <span 
                        className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                        title={`Perlu Sinkronisasi (${msg})`}
                      />
                    );
                  }

                  return (
                    <span 
                      className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                      title={`Replikasi Multi-Tier Aktif & Sinkron (${activeReplicas.length + 1} Node Terhubung)`}
                    />
                  );
                })()}
              </Button>
              {backups.length > 0 && (
                <Button 
                  type="button"
                  variant="toolbarOutline"
                  size="toolbar"
                  onClick={() => setExportModalOpen(true)}
                  className="gap-1.5 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs whitespace-nowrap shrink-0 sm:shrink"
                  title="Ekspor & unduh arsip lengkap sekolah menjadi berkas .absenta"
                >
                  <DownloadCloud size={13} />
                  <span>Export (.absenta)</span>
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
              <Button 
                type="button"
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setFactoryResetModalOpen(true)}
                className="gap-1.5 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs whitespace-nowrap shrink-0 sm:shrink font-bold"
                title="Reset sistem ke Fresh Deploy Baseline (Kondisi Pabrik)"
              >
                <AlertOctagon size={13} />
                <span>Reset Pabrik</span>
              </Button>
            </div>
          </div>


          <Suspense fallback={<PageLoader />}>
            <BackupList 
              items={backups}
              loading={loading}
              replicationStatus={replicationStatus}
              onRefresh={loadBackups}
              onDownload={handleDownload}
              onRestore={handleRestoreClick}
              onClone={handleCloneClick}
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
                  <span className="text-xs block">Salin ke Sekolah Existing</span>
                  <span className="text-[10px] font-normal opacity-80 block">
                    Timpa ke tenant terdaftar
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
                  Ingin membuat tenant demo baru tanpa membuat tenant dulu? Gunakan tombol <strong className="text-indigo-600 dark:text-indigo-400">Kloning</strong> langsung pada baris arsip.
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
                variant="primary"
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

        <Modal
          isOpen={cloneModalOpen}
          onClose={() => !isCloning && setCloneModalOpen(false)}
          title="Kloning Snapshot ke Tenant Baru"
          className="max-w-lg w-full"
          contentClassName="p-4 sm:p-6 w-full max-w-full min-w-0"
        >
          {cloneSuccessResult ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Kloning Tenant Berhasil!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cloneSuccessResult.message || `Seluruh data sekolah berhasil dikloning ke tenant "${cloneSuccessResult.targetName}".`}
                </p>
              </div>
              {cloneSuccessResult.targetSubdomain && (
                <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">Alamat Subdomain Baru</span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    https://{cloneSuccessResult.targetSubdomain}.absenta.id
                  </span>
                </div>
              )}
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setCloneModalOpen(false)}
                  className="h-9 px-5 text-xs font-bold cursor-pointer"
                >
                  Selesai
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs w-full max-w-full min-w-0">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                    <Copy size={17} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Arsip Sumber</span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedBackup?.Tenant?.name || 'Sekolah'}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      {selectedBackup?.Tenant?.subdomain && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {selectedBackup.Tenant.subdomain}.absenta.id
                        </span>
                      )}
                      <span>
                        {selectedBackup?.snapshot_date ? formatDateTime(selectedBackup.snapshot_date) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                  {selectedBackup?.file_size_bytes ? `${(parseInt(selectedBackup.file_size_bytes) / 1024 / 1024).toFixed(2)} MB` : ''}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cloneTargetSubdomain" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subdomain Tenant Baru <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30">
                  <Globe className="w-3.5 h-3.5 text-slate-400 ml-3 shrink-0" />
                  <Input
                    id="cloneTargetSubdomain"
                    type="text"
                    value={cloneTargetSubdomain}
                    onChange={(e) => setCloneTargetSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="smkn1pld-demo"
                    disabled={isCloning}
                    className="border-0 focus-visible:ring-0 font-mono text-xs h-9"
                  />
                  <span className="px-3 text-[11px] font-mono font-semibold text-slate-400 bg-slate-50 dark:bg-slate-900 h-9 flex items-center border-l border-slate-200 dark:border-slate-800 shrink-0">
                    .absenta.id
                  </span>
                </div>
                {selectedBackup?.Tenant?.subdomain && cloneTargetSubdomain.trim().toLowerCase() === selectedBackup.Tenant.subdomain.toLowerCase() && (
                  <p className="text-[10px] text-rose-500 font-semibold">
                    Subdomain kloning tidak boleh sama dengan sekolah produksi asal ({selectedBackup.Tenant.subdomain}).
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cloneTargetName" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Sekolah / Label Tenant Baru <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="cloneTargetName"
                  type="text"
                  value={cloneTargetName}
                  onChange={(e) => setCloneTargetName(e.target.value)}
                  placeholder="SMKN 1 Plered (Demo)"
                  disabled={isCloning}
                  className="text-xs h-9"
                />
              </div>

              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl flex items-start gap-2.5 text-indigo-900 dark:text-indigo-200">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold block">Aman untuk Data & Lisensi Produksi</span>
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300">
                    Sistem akan otomatis membuat tenant baru dengan UUID mandiri, menyalin data & akun guru/siswa, serta melewati re-bind lisensi dan custom domain sekolah asal.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCloneModalOpen(false)}
                  disabled={isCloning}
                  className="h-9 text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={confirmClone}
                  disabled={
                    isCloning ||
                    !cloneTargetSubdomain.trim() ||
                    !cloneTargetName.trim() ||
                    (Boolean(selectedBackup?.Tenant?.subdomain) &&
                      cloneTargetSubdomain.trim().toLowerCase() === selectedBackup?.Tenant?.subdomain?.toLowerCase())
                  }
                  className="h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  {isCloning ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCloning ? 'Mengkloning...' : 'Kloning Sekarang'}
                </Button>
              </div>
            </div>
          )}
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

        <CreateSnapshotModal
          isOpen={createSnapshotModalOpen}
          onClose={() => setCreateSnapshotModalOpen(false)}
          onSuccess={loadBackups}
          tenants={(allTenants || []).map(t => ({ id: t.id, name: t.name, subdomain: t.subdomain }))}
        />

        <FactoryResetModal
          isOpen={factoryResetModalOpen}
          onClose={() => setFactoryResetModalOpen(false)}
          onSuccess={loadBackups}
        />
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});


export default BackupsPage;
