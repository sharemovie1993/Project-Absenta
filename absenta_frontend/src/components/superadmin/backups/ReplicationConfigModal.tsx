import React, { useState, useEffect } from 'react';
import { 
  Server, 
  HardDrive, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Zap, 
  Plug, 
  Save, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Layers,
  Clock
} from 'lucide-react';
import { Modal, Button, Input, Label, Badge, Checkbox } from '@/components/ui';
import toast from 'react-hot-toast';
import { 
  backupApi, 
  type ReplicationConfig, 
  type ReplicationStatusSummary 
} from '@/api/superadmin-backups.api';
import { format } from 'date-fns';

interface ReplicationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshList?: () => void;
}

export const ReplicationConfigModal: React.FC<ReplicationConfigModalProps> = ({
  isOpen,
  onClose,
  onRefreshList
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [bucket, setBucket] = useState('absenta-platform-backups');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [forcePathStyle, setForcePathStyle] = useState(true);

  // Test Connection Feedback
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  // Live Status Summary
  const [statusSummary, setStatusSummary] = useState<ReplicationStatusSummary | null>(null);

  const loadData = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const [configRes, statusRes] = await Promise.all([
        backupApi.getReplicationConfig(),
        backupApi.getReplicationStatus().catch(() => null)
      ]);

      if (configRes?.data) {
        const c = configRes.data;
        setEnabled(c.enabled);
        setEndpoint(c.endpoint || '');
        setBucket(c.bucket || 'absenta-platform-backups');
        setAccessKeyId(c.accessKeyId || '');
        setSecretAccessKey(c.secretAccessKey || '');
        setRegion(c.region || 'us-east-1');
        setForcePathStyle(c.forcePathStyle !== false);
      }

      if (statusRes?.data) {
        setStatusSummary(statusRes.data);
      }
    } catch (err: any) {
      toast.error('Gagal memuat konfigurasi replikasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    if (!endpoint.trim()) {
      toast.error('Masukkan URL endpoint MinIO target');
      return;
    }
    if (!accessKeyId.trim()) {
      toast.error('Masukkan Access Key ID target');
      return;
    }

    setTesting(true);
    setTestResult(null);
    const toastId = toast.loading('Menguji keterjangkauan MinIO target...');

    try {
      const res = await backupApi.testReplicationConnection({
        endpoint: endpoint.trim(),
        bucket: bucket.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region: region.trim(),
        forcePathStyle
      });

      if (res.success) {
        setTestResult({
          success: true,
          latencyMs: res.data?.latencyMs || 0,
          message: res.message || 'Koneksi berhasil terhubung'
        });
        toast.success(res.message || 'Koneksi ke MinIO target berhasil!', { id: toastId });
      } else {
        setTestResult({
          success: false,
          latencyMs: 0,
          message: res.message || 'Gagal terhubung'
        });
        toast.error(res.message || 'Uji koneksi gagal', { id: toastId });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Uji koneksi gagal';
      setTestResult({
        success: false,
        latencyMs: 0,
        message: msg
      });
      toast.error(msg, { id: toastId });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('Menyimpan konfigurasi replikasi...');

    try {
      const res = await backupApi.saveReplicationConfig({
        enabled,
        endpoint: endpoint.trim(),
        bucket: bucket.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region: region.trim(),
        forcePathStyle
      });

      toast.success(res.message || 'Pengaturan replikasi berhasil disimpan!', { id: toastId });
      await loadData();
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan konfigurasi';
      toast.error(msg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const toastId = toast.loading('Memulai sinkronisasi seluruh cadangan ke MinIO target...');

    try {
      const res = await backupApi.syncReplication();
      toast.success(res.message || 'Sinkronisasi berhasil diselesaikan!', { id: toastId });
      await loadData();
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Sinkronisasi gagal';
      toast.error(msg, { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Replikasi Storage (MinIO Mirroring)"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Status Arsitektur Dual-Storage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Storage Primer */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                <HardDrive size={13} className="text-blue-500" />
                MinIO Primer (Mesin 1)
              </span>
              <Badge variant={statusSummary?.primary.status === 'ONLINE' ? 'success' : 'destructive'} className="text-[9px] font-bold">
                {statusSummary?.primary.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate" title={statusSummary?.primary.endpoint || 'http://10.10.10.250:9000'}>
              {statusSummary?.primary.endpoint || 'http://10.10.10.250:9000'}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 font-mono">
              <span>Bucket: {statusSummary?.primary.bucket || 'absenta-platform-backups'}</span>
              <span>{statusSummary?.primary.totalObjects || 0} Objek</span>
            </div>
          </div>

          {/* Storage Replika */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                <Layers size={13} className="text-emerald-500" />
                MinIO Replika (Mesin 2)
              </span>
              <Badge 
                variant={
                  !enabled ? 'secondary' :
                  statusSummary?.replica.status === 'ONLINE' ? 'success' : 'destructive'
                } 
                className="text-[9px] font-bold"
              >
                {!enabled ? 'NON-AKTIF' : statusSummary?.replica.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate" title={endpoint || 'Belum dikonfigurasi'}>
              {endpoint || 'Belum dikonfigurasi'}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 font-mono">
              <span>Bucket: {bucket}</span>
              <span>{statusSummary?.replica.totalObjects || 0} Objek</span>
            </div>
          </div>
        </div>

        {/* Sakelar Aktifkan Replikasi */}
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-3">
          <Checkbox
            id="enable-replication-toggle"
            checked={enabled}
            onCheckedChange={(checked: boolean) => setEnabled(checked)}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="enable-replication-toggle" className="font-bold text-slate-900 dark:text-slate-100 text-sm cursor-pointer">
              Aktifkan Replikasi Otomatis ke MinIO Sekunder
            </Label>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Setiap kali sistem menyelesaikan pencadangan platform (cronjob / manual), berkas snapshot <code className="font-bold">.absenta</code> akan langsung diduplikasi ke server target secara otomatis.
            </p>
          </div>
        </div>

        {/* Form Pengaturan Target */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Endpoint URL <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="http://10.10.10.251:9000"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="font-mono text-xs"
              />
              <span className="text-[10px] text-slate-400">
                IP dan port MinIO Server kedua di LAN Anda
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nama Bucket Target <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="absenta-platform-backups"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="font-mono text-xs"
              />
              <span className="text-[10px] text-slate-400">
                Otomatis dibuat jika belum ada di server target
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Access Key ID <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="minioadmin"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Secret Access Key <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Ketik secret key baru..."
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  className="font-mono text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Region
              </Label>
              <Input
                placeholder="us-east-1"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center pt-6">
              <Checkbox
                id="force-path-style-check"
                checked={forcePathStyle}
                onCheckedChange={(checked: boolean) => setForcePathStyle(checked)}
                className="mr-2"
              />
              <Label htmlFor="force-path-style-check" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                Force Path Style S3 (Wajib untuk MinIO On-Premise)
              </Label>
            </div>
          </div>
        </div>

        {/* Feedback Uji Koneksi */}
        {testResult && (
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-300' 
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/60 dark:text-red-300'
          }`}>
            {testResult.success ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : <XCircle size={16} className="shrink-0 text-red-600" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Sync Manual Action Bar */}
        {enabled && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-left w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Zap size={14} className="text-amber-500" />
                <span>Sinkronisasi Manual Seketika</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {statusSummary?.replica.lastSyncedAt ? (
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    Terakhir disinkronkan: {format(new Date(statusSummary.replica.lastSyncedAt), 'dd/MM/yyyy HH:mm')} WIB
                  </span>
                ) : (
                  'Belum pernah melakukan sinkronisasi massal.'
                )}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncNow}
              disabled={syncing || loading}
              className="h-8.5 px-3 text-xs font-bold border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 shrink-0 w-full sm:w-auto cursor-pointer"
            >
              <RefreshCw size={13} className={`mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
            </Button>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-900">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || loading}
            className="w-full sm:w-auto h-9 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Plug size={13} className={`mr-1.5 ${testing ? 'animate-pulse text-blue-500' : ''}`} />
            {testing ? 'Menguji...' : 'Uji Koneksi Target'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-9 text-xs flex-1 sm:flex-none cursor-pointer"
            >
              Tutup
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={saving || loading}
              className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none cursor-pointer"
            >
              <Save size={13} className="mr-1.5" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
