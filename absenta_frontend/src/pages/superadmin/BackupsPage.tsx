import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Database, 
  RefreshCw, 
  ShieldCheck, 
  Archive,
  AlertTriangle,
  Zap,
  Info
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

// Lazy load BackupList
const BackupList = lazy(() => import('../../components/superadmin/backups/BackupList').then(m => ({ default: m.BackupList })));

function BackupsPageContent() {
  const queryClient = useQueryClient();
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [newTenantId, setNewTenantId] = useState('');

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
      window.URL.revokeObjectURL(url);
      toast.success('File cadangan berhasil diunduh');
    } catch (e: unknown) {
      toast.error('Download gagal');
    }
  }, []);

  const handleRestoreClick = useCallback((backup: Backup) => {
    setSelectedBackup(backup);
    setNewTenantId('');
    setRestoreModalOpen(true);
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!selectedBackup || !newTenantId) return;
    
    setLoading(true);
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
      setLoading(false);
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

  const toolbarSlot = useMemo(() => (
    <div className="flex items-center justify-end">
      <Button 
        variant="outline" 
        onClick={loadBackups}
        disabled={loading}
        className="h-9 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        Refresh Arsip
      </Button>
    </div>
  ), [loading, loadBackups]);

  const breadcrumbs = useMemo(() => [
    { label: 'Sistem', path: '/menu/system' },
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
    <SuperAdminPageLayout
      hardeningModuleKey="superadmin_backups"
      title="Manajemen Arsip & Cadangan"
      description="Pusat kendali untuk pembuatan, pengunduhan, dan pemulihan cadangan data (Backup & Restore) seluruh ekosistem sekolah."
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      stats={headerStats}
      toolbar={toolbarSlot}
    >
      <SectionCard
        title="Daftar Arsip Cadangan Sistem"
        icon={ShieldCheck}
        fullWidth
        noPadding
      >
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
        title={
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                <RefreshCw size={20} className="animate-spin-slow" />
             </div>
             <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Restore Archive</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pemulihan Data Antar Tenant</p>
             </div>
          </div>
        }
        size="lg"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight">Peringatan Kritis</h5>
              <p className="text-[11px] text-amber-700 dark:text-amber-500 font-medium leading-relaxed">
                Proses pemulihan ini akan menyalin seluruh data dari snapshot ke Tenant ID target. Target HARUS tenant kosong untuk menghindari konflik integritas database.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white dark:bg-slate-850 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">
                  <Archive className="text-slate-400" size={20} />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Archive</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tighter">
                    {selectedBackup?.id.substring(0, 16)}...
                  </span>
               </div>
            </div>
            <Badge variant="outline" className="font-mono">{selectedBackup?.Tenant?.name}</Badge>
          </div>

          <div className="space-y-3">
            <Label htmlFor="targetTenantIdInput" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Target Tenant ID (UUID)</Label>
            <Input 
              id="targetTenantIdInput"
              value={newTenantId} 
              onChange={(e) => setNewTenantId(e.target.value)} 
              placeholder="Masukkan UUID tenant target..."
              className="h-14 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
             <Info size={16} className="text-blue-500 shrink-0" />
             <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold leading-tight">
               ID Tenant dapat ditemukan di modul Manajemen Tenant (Superadmin).
             </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setRestoreModalOpen(false)}
              className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Batalkan
            </Button>
            <Button 
              onClick={confirmRestore} 
              disabled={!newTenantId || loading}
              className="h-12 px-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-amber-500/20"
            >
              {loading ? <RefreshCw className="animate-spin mr-2" size={14} /> : <Zap className="mr-2" size={14} />}
              Mulai Pemulihan
            </Button>
          </div>
        </div>
      </Modal>
    </SuperAdminPageLayout>
  );
}

export default function BackupsPage() {
  return (
    <BackupsPageContent />
  );
}
