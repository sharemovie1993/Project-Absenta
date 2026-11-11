import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  School, 
  Loader2, 
  ArrowRight,
  RefreshCw,
  Sparkles,
  Copy,
  ShieldAlert,
  Globe,
  ExternalLink
} from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { backupApi } from '@/api/superadmin-backups.api';
import { type MigrationManifest } from '@/api/auth.api';

interface MigrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTenantId?: string;
  onSuccess?: () => void;
}

export const MigrationWizardModal: React.FC<MigrationWizardModalProps> = ({
  isOpen,
  onClose,
  targetTenantId,
  onSuccess
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'restoring' | 'completed'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<MigrationManifest | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreMessage, setRestoreMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [importMode, setImportMode] = useState<'clone' | 'in_place'>(targetTenantId ? 'in_place' : 'clone');
  const [targetSubdomain, setTargetSubdomain] = useState('');
  const [targetName, setTargetName] = useState('');
  const [restoredResult, setRestoredResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setManifest(null);
    setIsInspecting(false);
    setIsRestoring(false);
    setRestoreProgress(0);
    setRestoreMessage('');
    setImportMode(targetTenantId ? 'in_place' : 'clone');
    setTargetSubdomain('');
    setTargetName('');
    setRestoredResult(null);
  }, [targetTenantId]);

  const handleClose = () => {
    if (isRestoring) {
      if (!confirm('Proses pemulihan data sedang berlangsung. Menutup modal tidak akan menghentikan proses di server. Yakin ingin menutup?')) {
        return;
      }
    }
    resetState();
    onClose();
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.absenta') && !selectedFile.name.endsWith('.zip')) {
      toast.error('Format berkas harus berekstensi .absenta atau .zip');
      return;
    }

    setFile(selectedFile);
    setIsInspecting(true);

    try {
      const res = await backupApi.inspectBundle(selectedFile);
      if (res.success && res.data) {
        const m = res.data as MigrationManifest;
        setManifest(m);
        const baseSub = (m.source_tenant.subdomain || 'tenant').toLowerCase().replace(/[^a-z0-9-]/g, '');
        setTargetSubdomain(`${baseSub}-demo`);
        setTargetName(`${m.source_tenant.name} (Demo)`);
        setImportMode(targetTenantId ? 'in_place' : 'clone');
        setStep('preview');
        toast.success('Manifest berkas berhasil diverifikasi!');
      } else {
        toast.error(res.message || 'Berkas cadangan tidak valid');
        setFile(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal membaca berkas cadangan');
      setFile(null);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const sourceSubdomain = (manifest?.source_tenant?.subdomain || '').toLowerCase();
  const isCloneSameSubdomainError = importMode === 'clone' && !!sourceSubdomain && targetSubdomain.trim().toLowerCase() === sourceSubdomain;
  const isCloneInvalid = importMode === 'clone' && (!targetSubdomain.trim() || !/^[a-z0-9-]+$/.test(targetSubdomain.trim()) || isCloneSameSubdomainError || !targetName.trim());

  const handleStartRestore = async () => {
    if (!file) return;

    if (importMode === 'clone' && isCloneInvalid) {
      toast.error(isCloneSameSubdomainError
        ? `Subdomain kloning harus berbeda dari subdomain asal (${sourceSubdomain})`
        : 'Harap lengkapi subdomain baru & nama sekolah tujuan dengan format yang valid'
      );
      return;
    }

    setIsRestoring(true);
    setStep('restoring');
    setRestoreProgress(10);
    setRestoreMessage(
      importMode === 'clone'
        ? `Mengkloning data ke tenant baru ${targetSubdomain.trim()}.absenta.id...`
        : 'Memulai pemulihan data dari arsip cadangan...'
    );

    // Simulasi progress bar halus sambil menunggu respon backend
    const progressTimer = setInterval(() => {
      setRestoreProgress((prev) => {
        if (prev < 85) return prev + Math.floor(Math.random() * 8) + 2;
        return prev;
      });
    }, 600);

    try {
      const res = await backupApi.importBundle(file, {
        targetTenantId,
        cloneMode: importMode === 'clone',
        targetSubdomain: importMode === 'clone' ? targetSubdomain.trim().toLowerCase() : undefined,
        targetName: importMode === 'clone' ? targetName.trim() : undefined,
      });
      clearInterval(progressTimer);
      setRestoreProgress(100);
      setRestoreMessage('Sinkronisasi selesai!');

      if (res.success) {
        setRestoredResult(res.data || null);
        setStep('completed');
        toast.success(
          importMode === 'clone'
            ? `Kloning tenant ${targetSubdomain}.absenta.id berhasil!`
            : 'Migrasi sistem selesai dengan sukses!'
        );
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.message || 'Pemulihan gagal');
        setStep('preview');
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      toast.error(err.response?.data?.message || err.message || 'Proses pemulihan data gagal');
      setStep('preview');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Impor Paket Migrasi (.absenta)"
      size="lg"
    >
      <div className="space-y-6 text-slate-700 dark:text-slate-300">
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">Pemulihan Sekolah Mandiri</span>
                <p className="text-blue-700 dark:text-blue-400">
                  Unggah berkas arsip <code>.absenta</code> hasil ekspor dari server lain. Sistem akan otomatis memvalidasi manifest, memulihkan tabel database, serta menyalin seluruh berkas foto ke MinIO Object Storage.
                </p>
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => !isInspecting && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".absenta,.zip"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              />
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-inner">
                {isInspecting ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isInspecting ? 'Memvalidasi Berkas Cadangan...' : 'Klik atau Tarik Berkas .absenta ke Sini'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Mendukung paket arsip migrasi tunggal (.absenta atau .zip)
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && manifest && (
          <div className="space-y-5">
            {/* Kartu Ringkasan Paket Cadangan Asal */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sekolah Sumber Arsip</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{manifest.source_tenant.name}</h4>
                  </div>
                </div>
                <Badge variant="success" className="font-mono text-xs">
                  {manifest.source_tenant.subdomain || 'tenant'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Siswa</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">{manifest.stats.total_students}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Guru & Staf</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">{manifest.stats.total_teachers}</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Media & Foto</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">{manifest.stats.total_media_files} file</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ukuran Berkas</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {((file?.size || 0) / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              </div>
            </div>

            {/* Pemilihan Mode: Kloning vs Restore In-Place */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Target Pemulihan di Server Ini:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opsi Kloning */}
                <div 
                  onClick={() => setImportMode('clone')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    importMode === 'clone'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
                      <Copy className="w-4 h-4" />
                    </div>
                    <Badge variant={importMode === 'clone' ? 'info' : 'outline'} className="text-[10px]">
                      Aman di Mesin Sama
                    </Badge>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Kloning ke Tenant Baru (Sandbox / Demo)</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Membuat tenant independen dengan subdomain baru. Seluruh data master, akun, dan presensi diduplikasi tanpa menimpa tenant asal.
                  </p>
                </div>

                {/* Opsi In-Place Restore */}
                <div 
                  onClick={() => setImportMode('in_place')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    importMode === 'in_place'
                      ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/30 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <Badge variant={importMode === 'in_place' ? 'warning' : 'outline'} className="text-[10px]">
                      Menimpa Data Asal
                    </Badge>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Pulihkan ke Tenant Asal (Disaster Recovery)</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Menyinkronkan dan menimpa langsung ke tenant {manifest.source_tenant.subdomain || 'asal'}.absenta.id. Gunakan hanya jika ingin me-restore tenant tersebut.
                  </p>
                </div>
              </div>
            </div>

            {/* Konfigurasi Metadata Baru saat Kloning */}
            {importMode === 'clone' && (
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Pengaturan Identitas Tenant Kloning</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Subdomain Baru <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-blue-500">
                      <span className="text-slate-400 mr-1 select-none font-mono">https://</span>
                      <input
                        type="text"
                        value={targetSubdomain}
                        onChange={(e) => setTargetSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="smkn1pld-demo"
                        className="bg-transparent border-0 outline-none w-full font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      />
                      <span className="text-slate-400 select-none font-mono">.absenta.id</span>
                    </div>
                    {isCloneSameSubdomainError ? (
                      <p className="text-[10px] text-red-500 mt-1 font-semibold">
                        Subdomain kloning tidak boleh sama dengan subdomain asal ({sourceSubdomain}).
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Hanya huruf kecil, angka, dan tanda hubung (-).
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Nama Sekolah Target <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      placeholder="SMK Negeri 1 Pld (Demo)"
                      className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Nama tenant yang akan ditampilkan pada dashboard baru.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Peringatan Konfirmasi */}
            {importMode === 'in_place' ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Perhatian:</strong> Mode ini akan menimpa data tenant <code>{manifest.source_tenant.subdomain || 'asal'}.absenta.id</code> di database server ini. Pastikan Anda telah memiliki cadangan sebelum melanjutkan.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl flex items-start gap-3 text-xs text-blue-800 dark:text-blue-300">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Sistem akan mengkloning seluruh data sekolah, akun guru/siswa, konfigurasi, dan file foto ke tenant <code>https://{targetSubdomain || '...'}.absenta.id</code> dengan ID mandiri baru.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={resetState}>
                Pilih Berkas Lain
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={importMode === 'clone' && isCloneInvalid}
                onClick={handleStartRestore}
                className={`gap-2 text-white ${
                  importMode === 'clone'
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
                {importMode === 'clone' ? 'Mulai Kloning Tenant' : 'Mulai Pemulihan Sistem'}
              </Button>
            </div>
          </div>
        )}

        {step === 'restoring' && (
          <div className="space-y-6 py-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {importMode === 'clone' ? 'Mengkloning Data Tenant...' : 'Memulihkan Sistem...'}
              </h4>
              <p className="text-xs text-slate-500">{restoreMessage || 'Sedang mengekstrak dan memproses basis data...'}</p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${restoreProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">{restoreProgress}% Selesai</span>
          </div>
        )}

        {step === 'completed' && (
          <div className="space-y-6 py-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                {importMode === 'clone' ? 'Kloning Tenant Berhasil!' : 'Pemulihan Sukses!'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {importMode === 'clone'
                  ? `Tenant baru telah aktif. Seluruh data akademik, akun guru/siswa, dan berkas telah siap digunakan secara independen.`
                  : 'Sistem dan data sekolah telah berhasil dipulihkan secara menyeluruh.'}
              </p>
            </div>

            {/* URL Akses Tenant Baru jika Mode Kloning */}
            {importMode === 'clone' && (restoredResult?.targetSubdomain || targetSubdomain) && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tautan Akses Tenant Baru</span>
                  <p className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                    https://{restoredResult?.targetSubdomain || targetSubdomain}.absenta.id
                  </p>
                </div>
                <a
                  href={`https://${restoredResult?.targetSubdomain || targetSubdomain}.absenta.id`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Tenant di Tab Baru
                </a>
              </div>
            )}

            <Button type="button" variant="default" onClick={handleClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Tutup & Selesai
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
