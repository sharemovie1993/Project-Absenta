import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  UploadCloud,
  History,
  RefreshCw,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { purgeTenantData, getBackupHistory, BackupHistoryItem } from '@/api/academic/backup.api';
import { backupApi } from '@/api/superadmin-backups.api';
import type { MigrationManifest } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { SectionCard, Button, Badge } from '@/components/ui';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import useConfirm from '@/hooks/useConfirm';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatDate } from '@/utils/layoutUtils';

// Modular Components
import { ExportSection } from '@/components/academic/backup/ExportSection';
import { ImportSection } from '@/components/academic/backup/ImportSection';

const BackupPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { isKurikulum, isTuHead, isAdmin, can } = useCapabilities();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  // Export State
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // States for .absenta file inspection and restore
  const [importFile, setImportFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<MigrationManifest | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [restoreMessage, setRestoreMessage] = useState('Memulihkan basis data dan berkas media...');

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current !== null) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const { data: historyList = [], isLoading: isLoadingHistory, refetch: loadHistory } = useQuery<BackupHistoryItem[]>({
    queryKey: ['academic-backup-history'],
    queryFn: async () => {
      const data = await getBackupHistory();
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleExport = useCallback(async () => {
    const tenantId = user?.tenant_id;
    if (!tenantId) {
      toast.error('ID Sekolah tidak ditemukan');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Sedang mengemas database dan file media...');

    try {
      const blob = await backupApi.exportBundle(tenantId, {
        includeAttendance,
        includeMedia
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      const rawName = user?.tenant?.name || 'sekolah';
      const cleanName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      a.download = `absenta_backup_${cleanName}_${timestamp}.absenta`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Paket cadangan .absenta berhasil diunduh!', { id: toastId });
      loadHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Gagal mengunduh paket cadangan', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }, [user, includeAttendance, includeMedia, loadHistory]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImportFile(null);
      setManifest(null);
      return;
    }

    setImportFile(file);
    setIsInspecting(true);
    try {
      const res = await backupApi.inspectBundle(file);
      if (res.success && res.data) {
        setManifest(res.data);
        toast.success(`Paket terverifikasi: ${res.data.source_tenant?.name || 'Sekolah'}`);
      } else {
        toast.error(res.message || 'Format berkas .absenta tidak valid');
        setImportFile(null);
        setManifest(null);
      }
    } catch (err: any) {
      console.error('Error inspecting bundle:', err);
      toast.error(err?.response?.data?.message || err.message || 'Gagal membaca paket .absenta');
      setImportFile(null);
      setManifest(null);
    } finally {
      setIsInspecting(false);
    }
  }, []);

  const handleResetFile = useCallback(() => {
    setImportFile(null);
    setManifest(null);
  }, []);

  const executeImport = useCallback(async () => {
    if (!importFile || !manifest) return;

    const ok = await confirm({
      title: 'Mulai Pemulihan Data Sekolah?',
      description: `Sistem akan memulihkan data sekolah "${manifest.source_tenant.name}" (${manifest.stats.total_db_records} data database, ${manifest.stats.total_media_files} file media). Data duplikat akan otomatis dilewati secara aman.`,
      confirmText: 'Mulai Pemulihan',
      cancelText: 'Batalkan',
      style: 'primary'
    });

    if (!ok) return;

    try {
      setLoadingImport(true);
      setImportProgress(15);
      setRestoreMessage('Mengunggah & mengekstrak berkas .absenta...');

      progressIntervalRef.current = setInterval(() => {
        setImportProgress(prev => (prev < 90 ? prev + 8 : prev));
      }, 350);

      const res = await backupApi.importBundle(importFile, user?.tenant_id);

      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setImportProgress(100);
      setRestoreMessage('Pemulihan data dan berkas media selesai!');

      if (res.success) {
        toast.success(res.message || 'Sistem sekolah berhasil dipulihkan!');
        setImportFile(null);
        setManifest(null);
        loadHistory();
        queryClient.invalidateQueries();
      } else {
        toast.error(res.message || 'Pemulihan data gagal');
      }
    } catch (err: any) {
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      console.error('Import bundle failed:', err);
      toast.error(err?.response?.data?.message || err.message || 'Gagal memulihkan sistem');
    } finally {
      setTimeout(() => {
        setLoadingImport(false);
        setImportProgress(0);
      }, 1200);
    }
  }, [importFile, manifest, confirm, user?.tenant_id, loadHistory, queryClient]);

  const handleManualPurge = useCallback(async () => {
    const ok = await confirm({
      title: 'Kosongkan Seluruh Data Sekolah?',
      description: 'PERINGATAN: Semua data akademik (Siswa, Guru, Mapel, Kelas, Presensi, Jadwal) pada sekolah ini akan DIHAPUS BERSIH. Akun Admin Anda yang sedang login AKAN TETAP AKTIF dan tersimpan aman.',
      confirmText: 'Ya, Kosongkan Data Sekolah',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (!ok) return;

    try {
      setLoadingImport(true);
      const res = await purgeTenantData();
      if (res.success) {
        toast.success(res.message || 'Data sekolah berhasil dikosongkan!');
        setImportFile(null);
        setManifest(null);
        loadHistory();
        queryClient.invalidateQueries();
      } else {
        toast.error(`Gagal mengosongkan data: ${res.message}`);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      console.error('Purge error:', err);
      toast.error(`Gagal mengosongkan data: ${errObj.message || 'Error server'}`);
    } finally {
      setLoadingImport(false);
    }
  }, [confirm, loadHistory, queryClient]);

  const breadcrumbs = useMemo(() => [
    { label: 'Setelan', path: '/settings' },
    { label: 'Cadangan & Pemulihan' }
  ], []);

  return (
    <AcademicPageLayout
      title="Cadangan & Pemulihan Data"
      description="Ekspor seluruh data sekolah ke paket arsip .absenta atau pulihkan sistem dari berkas cadangan."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="academic_backup"
    >
      <div className="flex flex-col gap-6">
        {/* Two Columns: Export on Left, Restore on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Export Card */}
          <SectionCard
            title="Ekspor Paket Cadangan (.absenta)"
            icon={Download}
            noPadding
            fullWidth
            className="flex flex-col h-full overflow-hidden"
          >
            <ExportSection 
              includeAttendance={includeAttendance}
              setIncludeAttendance={setIncludeAttendance}
              includeMedia={includeMedia}
              setIncludeMedia={setIncludeMedia}
              onExport={handleExport}
              loading={isExporting}
            />
          </SectionCard>

          {/* Import Card */}
          <SectionCard
            title="Pemulihan Paket Cadangan (.absenta)"
            icon={UploadCloud}
            noPadding
            fullWidth
            className="flex flex-col h-full overflow-hidden"
          >
            <ImportSection 
              importFile={importFile}
              manifest={manifest}
              onFileChange={handleFileChange}
              onResetFile={handleResetFile}
              isInspecting={isInspecting}
              loadingImport={loadingImport}
              importProgress={importProgress}
              restoreMessage={restoreMessage}
              onManualPurge={handleManualPurge}
              onImport={executeImport}
            />
          </SectionCard>
        </div>

        {/* Real-time Dynamic Backup & Restore Audit History Table */}
        <SectionCard
          title="Riwayat Aktivitas Cadangan"
          icon={History}
          fullWidth
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          }
        >
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-10 gap-2 text-xs font-medium text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              Memuat riwayat aktivitas...
            </div>
          ) : historyList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 mb-2">
                <History size={20} />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Belum ada riwayat aktivitas pencadangan
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Riwayat ekspor dan pemulihan data akan tercatat secara otomatis di sini.
              </p>
            </div>
          ) : isMobile ? (
            /* Mobile Card Deck View */
            <div className="flex flex-col gap-3">
              {historyList?.map((item) => {
                const isRestore = item.restore_status === 'COMPLETED' || item.file_path.includes('restore');
                const bytes = Number(item.file_size_bytes) || 0;
                const sizeFormatted = bytes > 1024 * 1024 
                  ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` 
                  : `${(bytes / 1024).toFixed(1)} KB`;

                return (
                  <div 
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                        {formatDate(item.snapshot_date, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <Badge 
                        variant={item.restore_status === 'COMPLETED' ? 'success' : item.status === 'READY' ? 'info' : 'secondary'}
                        className="font-bold text-[10px]"
                      >
                        {item.restore_status === 'COMPLETED' ? 'SELESAI' : item.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isRestore 
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {isRestore ? 'Pemulihan (Restore)' : 'Ekspor (.absenta)'}
                      </span>
                      <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                        {sizeFormatted}
                      </span>
                    </div>

                    {item.checksum_sha256 && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>SHA-256</span>
                        <span className="font-mono">{item.checksum_sha256.substring(0, 16)}...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Waktu Snapshot</th>
                    <th className="py-3 px-4">Jenis Aktivitas</th>
                    <th className="py-3 px-4">Ukuran Berkas</th>
                    <th className="py-3 px-4">Checksum SHA-256</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {historyList?.map((item) => {
                    const isRestore = item.restore_status === 'COMPLETED' || item.file_path.includes('restore');
                    const bytes = Number(item.file_size_bytes) || 0;
                    const sizeFormatted = bytes > 1024 * 1024 
                      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` 
                      : `${(bytes / 1024).toFixed(1)} KB`;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatDate(item.snapshot_date, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isRestore 
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}>
                            {isRestore ? 'Pemulihan Data (Restore)' : 'Ekspor Cadangan (.absenta)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                          {sizeFormatted}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                          {item.checksum_sha256 ? `${item.checksum_sha256.substring(0, 16)}...` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge 
                            variant={item.restore_status === 'COMPLETED' ? 'success' : item.status === 'READY' ? 'info' : 'secondary'}
                            className="font-bold text-[10px]"
                          >
                            {item.restore_status === 'COMPLETED' ? 'SELESAI' : item.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </AcademicPageLayout>
  );
});

export default BackupPage;
