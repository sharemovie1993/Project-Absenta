import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  FileArchive, 
  Database, 
  Users, 
  GraduationCap, 
  School, 
  FolderArchive,
  Loader2, 
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Modal, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { backupApi } from '@/api/superadmin-backups.api';
import { type MigrationManifest } from '@/api/auth.api';

interface MigrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MigrationWizardModal: React.FC<MigrationWizardModalProps> = ({
  isOpen,
  onClose,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setManifest(null);
    setIsInspecting(false);
    setIsRestoring(false);
    setRestoreProgress(0);
    setRestoreMessage('');
  }, []);

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
        setManifest(res.data);
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

  const handleStartRestore = async () => {
    if (!file) return;

    setIsRestoring(true);
    setStep('restoring');
    setRestoreProgress(10);
    setRestoreMessage('Memulai pemulihan data dari arsip cadangan...');

    // Simulasi progress bar halus sambil menunggu respon backend
    const progressTimer = setInterval(() => {
      setRestoreProgress((prev) => {
        if (prev < 85) return prev + Math.floor(Math.random() * 8) + 2;
        return prev;
      });
    }, 600);

    try {
      const res = await backupApi.importBundle(file);
      clearInterval(progressTimer);
      setRestoreProgress(100);
      setRestoreMessage('Seluruh basis data dan media storage berhasil dipulihkan!');

      if (res.success) {
        setStep('completed');
        toast.success('Migrasi sistem selesai dengan sukses!');
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
      title="Migrasi & Pemulihan Sistem (UniFi / Omada Style)"
      size="lg"
    >
      <div className="space-y-6 text-slate-700 dark:text-slate-300">
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">One-Click System Restore</span>
                <p className="text-blue-700 dark:text-blue-400">
                  Unggah berkas arsip <code>.absenta</code> dari server lain. Sistem akan otomatis memvalidasi integritas, memulihkan tabel database, serta menyalin seluruh media foto ke MinIO Object Storage.
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
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <School className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sekolah Asal</span>
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

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Seluruh data sekolah, akun admin/guru/siswa, presensi, dan berkas foto akan disinkronisasikan ke server ini.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={resetState}>
                Pilih Berkas Lain
              </Button>
              <Button type="button" variant="default" onClick={handleStartRestore} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <ArrowRight className="w-4 h-4" />
                Mulai Pemulihan Sistem
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
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Memulihkan Sistem...</h4>
              <p className="text-xs text-slate-500">{restoreMessage || 'Sedang mengekstrak dan memulihkan basis data...'}</p>
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
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Pemulihan Sukses!</h4>
              <p className="text-xs text-slate-500">
                Sistem dan data sekolah telah berhasil dipulihkan secara menyeluruh.
              </p>
            </div>
            <Button type="button" variant="default" onClick={handleClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Tutup & Selesai
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
