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
  Cloud,
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

  // Active Tab: 'tier2' (LAN) | 'tier3' (Cloud)
  const [activeTab, setActiveTab] = useState<'tier2' | 'tier3'>('tier2');

  // Tier 2 Form State (LAN Mirror - e.g. Mesin 20)
  const [tier2Enabled, setTier2Enabled] = useState(false);
  const [tier2Name, setTier2Name] = useState('LAN Mirror (Mesin 2)');
  const [tier2Endpoint, setTier2Endpoint] = useState('');
  const [tier2Bucket, setTier2Bucket] = useState('absenta-platform-backups');
  const [tier2AccessKey, setTier2AccessKey] = useState('');
  const [tier2SecretKey, setTier2SecretKey] = useState('');
  const [tier2Region, setTier2Region] = useState('us-east-1');
  const [tier2ForcePathStyle, setTier2ForcePathStyle] = useState(true);

  // Tier 3 Form State (Cloud Mirror - e.g. Cloudflare R2 / AWS S3)
  const [tier3Enabled, setTier3Enabled] = useState(false);
  const [tier3Name, setTier3Name] = useState('Cloud Mirror (Cloudflare R2)');
  const [tier3Endpoint, setTier3Endpoint] = useState('');
  const [tier3Bucket, setTier3Bucket] = useState('absenta-platform-backups');
  const [tier3AccessKey, setTier3AccessKey] = useState('');
  const [tier3SecretKey, setTier3SecretKey] = useState('');
  const [tier3Region, setTier3Region] = useState('auto');
  const [tier3ForcePathStyle, setTier3ForcePathStyle] = useState(true);

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
      const [configRes, statusRes] = await Promise.allSettled([
        backupApi.getReplicationConfig(),
        backupApi.getReplicationStatus()
      ]);

      if (configRes.status === 'fulfilled' && configRes.value?.data) {
        const c = configRes.value.data;
        if (c.tier2) {
          setTier2Enabled(Boolean(c.tier2.enabled));
          setTier2Name(c.tier2.name || 'LAN Mirror (Mesin 2)');
          setTier2Endpoint(c.tier2.endpoint || '');
          setTier2Bucket(c.tier2.bucket || 'absenta-platform-backups');
          setTier2AccessKey(c.tier2.accessKeyId || '');
          setTier2SecretKey('');
          setTier2Region(c.tier2.region || 'us-east-1');
          setTier2ForcePathStyle(c.tier2.forcePathStyle !== false);
        }
        if (c.tier3) {
          setTier3Enabled(Boolean(c.tier3.enabled));
          setTier3Name(c.tier3.name || 'Cloud Mirror (Cloudflare R2)');
          setTier3Endpoint(c.tier3.endpoint || '');
          setTier3Bucket(c.tier3.bucket || 'absenta-platform-backups');
          setTier3AccessKey(c.tier3.accessKeyId || '');
          setTier3SecretKey('');
          setTier3Region(c.tier3.region || 'auto');
          setTier3ForcePathStyle(c.tier3.forcePathStyle !== false);
        }
      }

      if (statusRes.status === 'fulfilled' && statusRes.value?.data) {
        setStatusSummary(statusRes.value.data);
      }
    } catch {
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
    const isTier2 = activeTab === 'tier2';
    const targetEndpoint = isTier2 ? tier2Endpoint : tier3Endpoint;
    const targetAccessKey = isTier2 ? tier2AccessKey : tier3AccessKey;
    const targetSecretKey = isTier2 ? tier2SecretKey : tier3SecretKey;
    const targetBucket = isTier2 ? tier2Bucket : tier3Bucket;
    const targetRegion = isTier2 ? tier2Region : tier3Region;
    const targetForcePath = isTier2 ? tier2ForcePathStyle : tier3ForcePathStyle;
    const label = isTier2 ? 'Tier 2 (LAN)' : 'Tier 3 (Cloud)';

    if (!targetEndpoint.trim()) {
      toast.error(`Masukkan URL endpoint target untuk ${label}`);
      return;
    }
    if (!targetAccessKey.trim()) {
      toast.error(`Masukkan Access Key ID untuk ${label}`);
      return;
    }

    setTesting(true);
    setTestResult(null);
    const toastId = toast.loading(`Menguji koneksi ${label}...`);

    try {
      const res = await backupApi.testReplicationConnection({
        tier: activeTab,
        config: {
          endpoint: targetEndpoint.trim(),
          bucket: targetBucket.trim(),
          accessKeyId: targetAccessKey.trim(),
          secretAccessKey: targetSecretKey.trim(),
          region: targetRegion.trim(),
          forcePathStyle: targetForcePath
        }
      });

      if (res.success) {
        setTestResult({
          success: true,
          latencyMs: res.data?.latencyMs || 0,
          message: res.message || 'Koneksi berhasil terhubung'
        });
        toast.success(res.message || `Koneksi ${label} berhasil!`, { id: toastId });
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
    const toastId = toast.loading('Menyimpan konfigurasi multi-tier...');

    try {
      const res = await backupApi.saveReplicationConfig({
        tier2: {
          enabled: tier2Enabled,
          name: tier2Name.trim(),
          endpoint: tier2Endpoint.trim(),
          bucket: tier2Bucket.trim(),
          accessKeyId: tier2AccessKey.trim(),
          secretAccessKey: tier2SecretKey.trim(),
          region: tier2Region.trim(),
          forcePathStyle: tier2ForcePathStyle
        },
        tier3: {
          enabled: tier3Enabled,
          name: tier3Name.trim(),
          endpoint: tier3Endpoint.trim(),
          bucket: tier3Bucket.trim(),
          accessKeyId: tier3AccessKey.trim(),
          secretAccessKey: tier3SecretKey.trim(),
          region: tier3Region.trim(),
          forcePathStyle: tier3ForcePathStyle
        }
      });

      toast.success(res.message || 'Pengaturan replikasi multi-tier disimpan!', { id: toastId });
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
    const toastId = toast.loading('Memulai sinkronisasi seluruh arsip ke seluruh node aktif...');

    try {
      const res = await backupApi.syncReplication('all');
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

  const primaryHost = (statusSummary?.primary.endpoint || 'Node Primer').replace(/^https?:\/\//, '');
  const tier2Host = (statusSummary?.tier2.endpoint || tier2Endpoint || 'Belum diatur').replace(/^https?:\/\//, '');
  const tier3Host = (statusSummary?.tier3.endpoint || tier3Endpoint || 'Belum diatur').replace(/^https?:\/\//, '');

  const isTier2 = activeTab === 'tier2';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Replikasi Multi-Tier (Backup 3-2-1)"
      className="max-w-2xl"
      contentClassName="p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Status Arsitektur 3-Tier Dual/Triple Storage */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Tier 1: Primer */}
          <div className="flex flex-col justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                <HardDrive size={13} className="text-blue-500 shrink-0" />
                <span className="truncate">Tier 1: Primer</span>
              </div>
              <Badge 
                variant={
                  loading ? 'secondary' :
                  statusSummary?.primary.status === 'ONLINE' ? 'success' : 'destructive'
                } 
                className={`text-[8.5px] font-bold px-1.5 py-0.2 shrink-0 ${loading ? 'animate-pulse' : ''}`}
              >
                {loading ? '...' : statusSummary?.primary.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate" title={statusSummary?.primary.endpoint}>
              {primaryHost}
            </div>
            <div className="text-[9.5px] text-slate-400 font-mono">
              {statusSummary?.primary.totalObjects || 0} arsip
            </div>
          </div>

          {/* Tier 2: LAN Mirror */}
          <div className="flex flex-col justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                <Layers size={13} className="text-emerald-500 shrink-0" />
                <span className="truncate">Tier 2: LAN</span>
              </div>
              <Badge 
                variant={
                  loading ? 'secondary' :
                  !tier2Enabled ? 'secondary' :
                  statusSummary?.tier2.status === 'ONLINE' ? 'success' : 'destructive'
                } 
                className={`text-[8.5px] font-bold px-1.5 py-0.2 shrink-0 ${loading ? 'animate-pulse' : ''}`}
              >
                {loading ? '...' : !tier2Enabled ? 'NON-AKTIF' : statusSummary?.tier2.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate" title={tier2Endpoint}>
              {tier2Host}
            </div>
            <div className="text-[9.5px] text-slate-400 font-mono">
              {statusSummary?.tier2.totalObjects || 0} arsip
            </div>
          </div>

          {/* Tier 3: Cloud Mirror */}
          <div className="flex flex-col justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                <Cloud size={13} className="text-amber-500 shrink-0" />
                <span className="truncate">Tier 3: Cloud</span>
              </div>
              <Badge 
                variant={
                  loading ? 'secondary' :
                  !tier3Enabled ? 'secondary' :
                  statusSummary?.tier3.status === 'ONLINE' ? 'success' : 'destructive'
                } 
                className={`text-[8.5px] font-bold px-1.5 py-0.2 shrink-0 ${loading ? 'animate-pulse' : ''}`}
              >
                {loading ? '...' : !tier3Enabled ? 'NON-AKTIF' : statusSummary?.tier3.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate" title={tier3Endpoint}>
              {tier3Host}
            </div>
            <div className="text-[9.5px] text-slate-400 font-mono">
              {statusSummary?.tier3.totalObjects || 0} arsip
            </div>
          </div>
        </div>

        {/* Tab Navigasi Konfigurasi Tier Target */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('tier2'); setTestResult(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tier2'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={14} className="text-emerald-500 shrink-0" />
            <span className="truncate">Tier 2: LAN Mirror (Mesin 2)</span>
            {tier2Enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>}
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('tier3'); setTestResult(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tier3'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cloud size={14} className="text-amber-500 shrink-0" />
            <span className="truncate">Tier 3: Cloud Mirror (Cloudflare R2)</span>
            {tier3Enabled && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>}
          </button>
        </div>

        {/* Sakelar Replikasi Ringkas untuk Tier yang Sedang Dipilih */}
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
          isTier2 
            ? 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
            : 'border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20'
        }`}>
          <div className="min-w-0">
            <Label htmlFor="tier-toggle" className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm cursor-pointer block truncate">
              {isTier2 ? 'Aktifkan Replikasi Tier 2 (LAN Mirror)' : 'Aktifkan Replikasi Tier 3 (Cloud Mirror)'}
            </Label>
            <p className="text-[11px] text-slate-500 truncate">
              {isTier2 
                ? 'Duplikasi snapshot lokal ke server sekunder di jaringan lokal yang sama'
                : 'Duplikasi snapshot secara aman ke Cloudflare R2 / AWS S3 off-site'
              }
            </p>
          </div>
          <Checkbox
            id="tier-toggle"
            checked={isTier2 ? tier2Enabled : tier3Enabled}
            onCheckedChange={(checked: boolean) => {
              if (isTier2) setTier2Enabled(checked);
              else setTier3Enabled(checked);
            }}
            className="shrink-0"
          />
        </div>

        {/* Form Input Sesuai Tab Aktif */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Endpoint <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={isTier2 ? "http://10.10.10.20:9000" : "https://<account-id>.r2.cloudflarestorage.com"}
                value={isTier2 ? tier2Endpoint : tier3Endpoint}
                onChange={(e) => {
                  if (isTier2) setTier2Endpoint(e.target.value);
                  else setTier3Endpoint(e.target.value);
                }}
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Target Bucket <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="absenta-platform-backups"
                value={isTier2 ? tier2Bucket : tier3Bucket}
                onChange={(e) => {
                  if (isTier2) setTier2Bucket(e.target.value);
                  else setTier3Bucket(e.target.value);
                }}
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
                placeholder={isTier2 ? "minioadmin" : "Token Access Key ID"}
                value={isTier2 ? tier2AccessKey : tier3AccessKey}
                onChange={(e) => {
                  if (isTier2) setTier2AccessKey(e.target.value);
                  else setTier3AccessKey(e.target.value);
                }}
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
                  value={isTier2 ? tier2SecretKey : tier3SecretKey}
                  onChange={(e) => {
                    if (isTier2) setTier2SecretKey(e.target.value);
                    else setTier3SecretKey(e.target.value);
                  }}
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

          {/* Opsi Lanjutan (Region & Path Style) */}
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
                    Region {isTier2 ? '(Default us-east-1)' : '(Cloudflare R2: auto)'}
                  </Label>
                  <Input
                    placeholder={isTier2 ? "us-east-1" : "auto"}
                    value={isTier2 ? tier2Region : tier3Region}
                    onChange={(e) => {
                      if (isTier2) setTier2Region(e.target.value);
                      else setTier3Region(e.target.value);
                    }}
                    className="font-mono text-xs h-8.5"
                  />
                </div>

                <div className="flex items-center pt-2 sm:pt-6">
                  <Checkbox
                    id="force-path-check"
                    checked={isTier2 ? tier2ForcePathStyle : tier3ForcePathStyle}
                    onCheckedChange={(checked: boolean) => {
                      if (isTier2) setTier2ForcePathStyle(checked);
                      else setTier3ForcePathStyle(checked);
                    }}
                    className="mr-2"
                  />
                  <Label htmlFor="force-path-check" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    Force Path Style (MinIO / S3)
                  </Label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Uji Koneksi */}
        {testResult && (
          <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-300' 
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/60 dark:text-red-300'
          }`}>
            {testResult.success ? <CheckCircle2 size={15} className="shrink-0 text-emerald-600" /> : <XCircle size={15} className="shrink-0 text-red-600" />}
            <span className="truncate">{testResult.message}</span>
          </div>
        )}

        {/* Sync Action Bar */}
        {(tier2Enabled || tier3Enabled) && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Zap size={13} className="text-amber-500 shrink-0" />
                <span className="truncate">Sinkronkan Semua Node Aktif</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {statusSummary?.tier2.lastSyncedAt || statusSummary?.tier3.lastSyncedAt ? (
                  `Terakhir sync: ${format(new Date(statusSummary?.tier2.lastSyncedAt || statusSummary?.tier3.lastSyncedAt || ''), 'dd/MM/yy HH:mm')}`
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

        {/* Footer Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || loading}
            className="h-8.5 sm:h-9 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Plug size={13} className={`mr-1.5 ${testing ? 'animate-pulse text-blue-500' : ''}`} />
            {testing ? 'Menguji...' : `Uji Koneksi ${isTier2 ? 'Tier 2' : 'Tier 3'}`}
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
              {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};


