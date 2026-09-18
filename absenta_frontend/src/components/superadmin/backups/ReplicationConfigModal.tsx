import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  RefreshCw, 
  Zap, 
  Plug, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Layers,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Modal, Button, Input, Label, Badge, Checkbox } from '@/components/ui';
import toast from 'react-hot-toast';
import { 
  backupApi, 
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    const toastId = toast.loading('Menguji koneksi MinIO...');

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
        toast.success(res.message || 'Koneksi MinIO target berhasil!', { id: toastId });
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
    const toastId = toast.loading('Menyimpan konfigurasi...');

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

      toast.success(res.message || 'Pengaturan replikasi disimpan!', { id: toastId });
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
    const toastId = toast.loading('Memulai sinkronisasi seluruh arsip...');

    try {
      const res = await backupApi.syncReplication();
      toast.success(res.message || 'Sinkronisasi berhasil!', { id: toastId });
      await loadData();
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Sinkronisasi gagal';
      toast.error(msg, { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const primaryHost = (statusSummary?.primary.endpoint || 'http://10.10.10.250:9000').replace(/^https?:\/\//, '');
  const replicaHost = (endpoint || 'Belum diatur').replace(/^https?:\/\//, '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Replikasi Storage MinIO"
      className="max-w-xl"
      contentClassName="p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Status Arsitektur Dual-Storage Ringkas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Primer */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <HardDrive size={13} className="text-blue-500 shrink-0" />
                <span className="truncate">Primer ({primaryHost})</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono pl-4.5">
                {statusSummary?.primary.totalObjects || 0} arsip • {statusSummary?.primary.bucket || bucket}
              </div>
            </div>
            <Badge 
              variant={statusSummary?.primary.status === 'ONLINE' ? 'success' : 'destructive'} 
              className="text-[9px] font-bold px-1.5 py-0.5 shrink-0"
            >
              {statusSummary?.primary.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </div>

          {/* Replika */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <Layers size={13} className="text-emerald-500 shrink-0" />
                <span className="truncate">Replika ({replicaHost})</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono pl-4.5">
                {statusSummary?.replica.totalObjects || 0} arsip • {bucket}
              </div>
            </div>
            <Badge 
              variant={
                !enabled ? 'secondary' :
                statusSummary?.replica.status === 'ONLINE' ? 'success' : 'destructive'
              } 
              className="text-[9px] font-bold px-1.5 py-0.5 shrink-0"
            >
              {!enabled ? 'NON-AKTIF' : statusSummary?.replica.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </div>
        </div>

        {/* Sakelar Replikasi Ringkas (Clean Toggle) */}
        <div className="p-3 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="enable-replication-toggle" className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm cursor-pointer block truncate">
              Aktifkan Replikasi Otomatis
            </Label>
            <p className="text-[11px] text-slate-500 truncate">
              Duplikasi otomatis snapshot <code className="font-bold">.absenta</code> ke storage target
            </p>
          </div>
          <Checkbox
            id="enable-replication-toggle"
            checked={enabled}
            onCheckedChange={(checked: boolean) => setEnabled(checked)}
            className="shrink-0"
          />
        </div>

        {/* Form Target MinIO (Clean & Compact) */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Endpoint <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="http://10.10.10.20:9000"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Bucket <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="absenta-platform-backups"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="font-mono text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Access Key ID <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="minioadmin"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Secret Access Key <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Ketik secret key baru..."
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  className="font-mono text-xs h-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Toggle secret key visibility"
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Opsi Lanjutan (Collapsible to remove clutter) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer py-1"
            >
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>{showAdvanced ? 'Sembunyikan Opsi Lanjutan' : 'Tampilkan Opsi Lanjutan (Region & Path Style)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Region
                  </Label>
                  <Input
                    placeholder="us-east-1"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="font-mono text-xs h-8.5"
                  />
                </div>

                <div className="flex items-center pt-2 sm:pt-6">
                  <Checkbox
                    id="force-path-style-check"
                    checked={forcePathStyle}
                    onCheckedChange={(checked: boolean) => setForcePathStyle(checked)}
                    className="mr-2"
                  />
                  <Label htmlFor="force-path-style-check" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    Force Path Style (MinIO)
                  </Label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Uji Koneksi */}
        {testResult && (
          <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-300' 
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/60 dark:text-red-300'
          }`}>
            {testResult.success ? <CheckCircle2 size={15} className="shrink-0 text-emerald-600" /> : <XCircle size={15} className="shrink-0 text-red-600" />}
            <span className="truncate">{testResult.message}</span>
          </div>
        )}

        {/* Sync Manual Action Bar (Clean) */}
        {enabled && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Zap size={13} className="text-amber-500 shrink-0" />
                <span className="truncate">Sinkronkan Semua Arsip</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {statusSummary?.replica.lastSyncedAt ? (
                  `Terakhir: ${format(new Date(statusSummary.replica.lastSyncedAt), 'dd/MM/yy HH:mm')}`
                ) : (
                  'Belum pernah sinkronisasi massal'
                )}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncNow}
              disabled={syncing || loading}
              className="h-7 sm:h-8 px-2.5 text-[11px] font-bold border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 shrink-0 cursor-pointer"
            >
              <RefreshCw size={12} className={`mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Menyinkronkan...' : 'Sync Sekarang'}
            </Button>
          </div>
        )}

        {/* Footer Buttons (Responsive & Clean) */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || loading}
            className="h-8.5 sm:h-9 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Plug size={13} className={`mr-1.5 ${testing ? 'animate-pulse text-blue-500' : ''}`} />
            {testing ? 'Menguji...' : 'Uji Koneksi'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-8.5 sm:h-9 text-xs flex-1 sm:flex-none cursor-pointer"
            >
              Tutup
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={saving || loading}
              className="h-8.5 sm:h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none cursor-pointer"
            >
              <Save size={13} className="mr-1.5" />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

