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
  Loader2
} from 'lucide-react';
import { 
  SectionCard,
  Modal,
  Input,
  Label,
  Button,
  Badge,
  PageLoader
} from '../../components/ui';
import toast from 'react-hot-toast';
import { backupApi, type Backup } from '../../api/superadmin-backups.api';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';

// Lazy load BackupList (Pilar 13)
const BackupList = lazy(() => import('../../components/superadmin/backups/BackupList').then(m => ({ default: m.BackupList })));

// Zod Schema Validation Guard (Pilar 25)
const restoreSchema = z.object({
  tenantId: z.string().min(1, 'Target Tenant ID wajib diisi')
});

export const BackupsPage: React.FC = React.memo(() => {
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [newTenantId, setNewTenantId] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

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
    try {
      const blob = await backupApi.downloadBlob(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${backup.Tenant?.name || 'tenant'}_${backup.id.substring(0,8)}.json.gz`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('File cadangan berhasil diunduh');
    } catch {
      toast.error('Download gagal');
    }
  }, []);

  const handleRestoreClick = useCallback((backup: Backup) => {
    setSelectedBackup(backup);
    setNewTenantId('');
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
      subtitle: "Snapshot cadangan aktif"
    },
    {
      title: "Total Size",
      value: `${(backups.reduce((acc, b) => acc + (parseInt(b.file_size_bytes) || 0), 0) / 1024 / 1024).toFixed(1)} MB`,
      icon: <Database size={14} className="text-white" />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Beban penyimpanan cloud"
    }
  ], [backups]);

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
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total {backups.length} snapshot terdaftar</span>
            <Button 
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={loadBackups}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh Arsip
            </Button>
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
          onClose={() => setRestoreModalOpen(false)} 
          title="Pemulihan Arsip Data Antar Tenant"
          size="lg"
        >
          <div className="space-y-6 text-xs">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-sm font-bold text-amber-900 dark:text-amber-400 uppercase tracking-tight">Peringatan Kritis</h5>
                <p className="text-[11px] text-amber-700 dark:text-amber-500 font-medium leading-relaxed">
                  Proses pemulihan ini akan menyalin seluruh data dari snapshot ke Tenant ID target. Target HARUS tenant kosong untuk menghindari konflik integritas database.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                    <Archive className="text-slate-400" size={20} />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected Archive</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tighter">
                      {selectedBackup?.id.substring(0, 16)}...
                    </span>
                 </div>
              </div>
              <Badge variant="outline" className="font-mono">{selectedBackup?.Tenant?.name}</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetTenantIdInput" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Tenant ID (UUID) <span className="text-rose-500">*</span>
              </Label>
              <Input 
                id="targetTenantIdInput"
                aria-label="Target Tenant ID"
                value={newTenantId} 
                onChange={(e) => setNewTenantId(e.target.value)} 
                placeholder="Masukkan UUID tenant target..."
                className="rounded-xl font-mono"
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
               <Info size={16} className="text-blue-500 shrink-0" />
               <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-tight">
                 ID Tenant dapat ditemukan di modul Manajemen Tenant (Superadmin).
               </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button 
                type="button"
                variant="toolbarOutline" 
                size="toolbar"
                onClick={() => setRestoreModalOpen(false)}
              >
                Batalkan
              </Button>
              <Button 
                type="button"
                variant="toolbarPrimary"
                size="toolbar"
                onClick={confirmRestore} 
                disabled={!newTenantId || isRestoring}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isRestoring ? <Loader2 className="animate-spin mr-1.5 w-3.5 h-3.5" /> : <Zap className="mr-1.5 w-3.5 h-3.5" />}
                Mulai Pemulihan
              </Button>
            </div>
          </div>
        </Modal>
      </SuperAdminPageLayout>
    </InfraErrorBoundary>
  );
});

export default BackupsPage;
