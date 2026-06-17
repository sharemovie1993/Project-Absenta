import React, { useEffect, useState, useMemo } from 'react';
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
  Badge
} from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { backupApi, type Backup } from '../../api/superadmin-backups.api';
import { SuperAdminPageLayout } from '../../components/layout/SuperAdminPageLayout';
import { BackupList } from '../../components/superadmin/backups/BackupList';

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [newTenantId, setNewTenantId] = useState('');
  const { success, error, warning } = useToast();

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await backupApi.list();
      if (res.success) {
        setBackups(res.data || []);
      }
    } catch (e) {
      error('Gagal memuat arsip cadangan');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const blob = await backupApi.downloadBlob(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${backup.Tenant?.name || 'tenant'}_${backup.id.substring(0,8)}.json.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      success('File cadangan berhasil diunduh');
    } catch (e) {
      error('Download gagal');
    }
  };

  const handleRestoreClick = (backup: Backup) => {
    setSelectedBackup(backup);
    setNewTenantId('');
    setRestoreModalOpen(true);
  };

  const confirmRestore = async () => {
    if (!selectedBackup || !newTenantId) return;
    
    setLoading(true);
    try {
      const res = await backupApi.restore(selectedBackup.id, newTenantId);
      if (res.success) {
        success('Proses pemulihan data telah dimulai');
        setRestoreModalOpen(false);
        loadBackups();
      } else {
        error(res.message || 'Proses pemulihan gagal');
      }
    } catch (e: any) {
      error(e.message || 'Pemulihan data gagal');
    } finally {
      setLoading(false);
    }
  };

  const headerStats = useMemo(() => [
    {
      title: "Arsip Dingin",
      value: backups.length,
      icon: <Archive size={14} />,
      gradient: "from-slate-600 to-slate-800"
    },
    {
      title: "Total Size",
      value: `${(backups.reduce((acc, b) => acc + parseInt(b.file_size_bytes), 0) / 1024 / 1024).toFixed(1)} MB`,
      icon: <Database size={14} />,
      gradient: "from-blue-500 to-indigo-600"
    }
  ], [backups]);

  const toolbarSlot = (
    <div className="flex items-center justify-end">
      <Button 
        variant="toolbarOutline" 
        onClick={loadBackups}
        disabled={loading}
        className="h-9 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2 border-slate-200 dark:border-slate-800"
      >
        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        Refresh Arsip
      </Button>
    </div>
  );

  return (
    <SuperAdminPageLayout
      title="Global Cold Archive"
      description="Manajemen arsip cadangan sistem di seluruh tenant platform Absenta."
      breadcrumbs={[
        { label: 'Infrastruktur & Server', path: '/menu/infrastructure' },
        { label: 'Arsip & Cadangan Sistem' }
      ]}
      stats={headerStats}
      isLoadingStats={loading}
      toolbar={toolbarSlot}
    >
      <SectionCard
        title="Daftar Arsip Cadangan Sistem"
        icon={ShieldCheck}
        fullWidth
        noPadding
      >
        <BackupList 
          items={backups}
          loading={loading}
          onRefresh={loadBackups}
          onDownload={handleDownload}
          onRestore={handleRestoreClick}
        />
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
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-4">
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
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Target Tenant ID (UUID)</Label>
            <Input 
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
              variant="toolbarOutline" 
              onClick={() => setRestoreModalOpen(false)}
              className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Batalkan
            </Button>
            <Button 
              variant="toolbarPrimary"
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
