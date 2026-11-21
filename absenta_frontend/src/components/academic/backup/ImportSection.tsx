import React from 'react';
import { 
  UploadCloud, 
  FileArchive, 
  Loader2, 
  CheckCircle2,
  Trash2,
  RotateCcw,
  Layers,
  Database,
  Image,
  Info
} from 'lucide-react';
import { Button } from '../../ui';
import type { MigrationManifest } from '@/api/auth.api';
import type { RestoreBundleMode, BackupBundleMode } from '@/api/superadmin-backups.api';

interface ImportSectionProps {
  importFile: File | null;
  manifest: MigrationManifest | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetFile: () => void;
  isInspecting: boolean;
  loadingImport: boolean;
  importProgress: number;
  restoreMessage?: string;
  restoreMode: RestoreBundleMode;
  setRestoreMode: (mode: RestoreBundleMode) => void;
  onImport: () => void;
  onManualPurge?: () => void;
}

export const ImportSection: React.FC<ImportSectionProps> = React.memo(({
  importFile,
  manifest,
  onFileChange,
  onResetFile,
  isInspecting,
  loadingImport,
  importProgress,
  restoreMessage = 'Memulihkan basis data dan berkas media...',
  restoreMode,
  setRestoreMode,
  onImport,
  onManualPurge,
}) => {
  const bundleMode: BackupBundleMode = manifest ? (
    (manifest as any).backup_mode || 
    (manifest.options as any)?.backup_mode || 
    ((manifest.stats?.total_media_files ?? 0) > 0 
      ? ((manifest.stats?.total_students ?? 0) > 0 ? 'FULL' : 'MEDIA_ONLY') 
      : 'DATABASE_ONLY')
  ) : 'FULL';

  return (
    <div className="flex flex-col h-full justify-between p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div className="space-y-4">
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Pilih atau tarik berkas paket cadangan <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">.absenta</code> untuk mengembalikan basis data atau media sekolah.
        </p>

        {/* Dropzone */}
        {!importFile ? (
          <div className="group relative border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer">
            <input
              type="file"
              accept=".absenta,.zip"
              onChange={onFileChange}
              disabled={loadingImport || isInspecting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tarik & lepaskan berkas <span className="text-emerald-600 dark:text-emerald-400 font-mono">.absenta</span> ke sini
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">atau klik untuk memilih dari komputer</p>
              </div>
            </div>
          </div>
        ) : (
          /* Card File Terpilih & Preview Manifest */
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{importFile.name}</h6>
                  <p className="text-[10px] text-slate-400 font-mono">{(importFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              {!loadingImport && (
                <button
                  type="button"
                  onClick={onResetFile}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Ganti berkas"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Inspeksi */}
            {isInspecting ? (
              <div className="flex items-center gap-2 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memeriksa integritas paket cadangan...</span>
              </div>
            ) : manifest ? (
              <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Asal Sekolah</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{manifest.source_tenant?.name || 'Sekolah'}</span>
                </div>

                {/* Badge Mode Paket */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Tipe Berkas Cadangan</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    bundleMode === 'FULL'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                      : bundleMode === 'DATABASE_ONLY'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                  }`}>
                    {bundleMode === 'FULL' 
                      ? 'Paket Lengkap (DB + Media)' 
                      : bundleMode === 'DATABASE_ONLY' 
                        ? 'Hanya Basis Data' 
                        : 'Hanya Berkas Media'}
                  </span>
                </div>

                {/* Statistik Manifest */}
                <div className="grid grid-cols-3 gap-2 py-1 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Siswa</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{manifest.stats?.total_students ?? '-'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Guru</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{manifest.stats?.total_teachers ?? '-'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Berkas Media</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{manifest.stats?.total_media_files ?? '-'}</span>
                  </div>
                </div>

                {/* Opsi Pemulihan Jika Paket adalah FULL */}
                {bundleMode === 'FULL' && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Komponen yang Ingin Dipulihkan
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('FULL')}
                        disabled={loadingImport}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          restoreMode === 'FULL' || restoreMode === 'AUTO'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span className="text-[10px] leading-tight">Semua (Full)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('DATABASE_ONLY')}
                        disabled={loadingImport}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          restoreMode === 'DATABASE_ONLY'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span className="text-[10px] leading-tight">Database Saja</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('MEDIA_ONLY')}
                        disabled={loadingImport}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          restoreMode === 'MEDIA_ONLY'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Image className="w-3.5 h-3.5" />
                        <span className="text-[10px] leading-tight">Media Saja</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Info Interconnection Guarantee */}
                <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    {bundleMode === 'DATABASE_ONLY' || restoreMode === 'DATABASE_ONLY'
                      ? 'Hanya memulihkan data tabel relasional. Tautan berkas media di database otomatis tersambung ke penyimpanan MinIO.'
                      : bundleMode === 'MEDIA_ONLY' || restoreMode === 'MEDIA_ONLY'
                        ? 'Hanya memulihkan berkas media fisik ke MinIO. Seluruh tabel database tetap aman dan tersambung otomatis.'
                        : 'Memulihkan basis data relasional dan seluruh berkas media fisik secara terpadu.'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Integritas paket terverifikasi</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Progress Bar Jika Sedang Restore */}
        {loadingImport && (
          <div className="space-y-2 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {restoreMessage}
              </span>
              <span>{importProgress}%</span>
            </div>
            <div className="w-full h-2 bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Button & Danger Link */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onImport}
          disabled={!importFile || !manifest || loadingImport || isInspecting}
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingImport ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memulihkan Sistem...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>
                {bundleMode === 'FULL' && restoreMode === 'DATABASE_ONLY'
                  ? 'Mulai Pemulihan Basis Data Saja'
                  : bundleMode === 'FULL' && restoreMode === 'MEDIA_ONLY'
                    ? 'Mulai Pemulihan Berkas Media Saja'
                    : 'Mulai Pemulihan Data'}
              </span>
            </>
          )}
        </Button>

        {onManualPurge && (
          <div className="text-center">
            <button
              type="button"
              onClick={onManualPurge}
              disabled={loadingImport}
              className="text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Kosongkan data sekolah ini (Reset bersih)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

ImportSection.displayName = 'ImportSection';
