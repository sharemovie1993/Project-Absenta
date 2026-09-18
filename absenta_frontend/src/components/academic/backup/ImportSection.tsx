import React from 'react';
import { 
  UploadCloud, 
  FileArchive, 
  Loader2, 
  CheckCircle2,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Button } from '../../ui';
import type { MigrationManifest } from '@/api/auth.api';

interface ImportSectionProps {
  importFile: File | null;
  manifest: MigrationManifest | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetFile: () => void;
  isInspecting: boolean;
  loadingImport: boolean;
  importProgress: number;
  restoreMessage?: string;
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
  onImport,
  onManualPurge,
}) => {
  return (
    <div className="flex flex-col h-full justify-between p-6 space-y-6">
      <div className="space-y-4">
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Pilih atau tarik berkas paket cadangan <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">.absenta</code> untuk mengembalikan basis data dan media sekolah.
        </p>

        {/* Dropzone */}
        {!importFile ? (
          <div className="group relative border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer">
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
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
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
              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Asal Sekolah</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{manifest.source_tenant?.name || 'Sekolah'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-1.5 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Siswa</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{manifest.stats?.total_students ?? '-'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Guru</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{manifest.stats?.total_teachers ?? '-'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">Media File</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{manifest.stats?.total_media_files ?? '-'}</span>
                  </div>
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
              <span>Mulai Pemulihan Data</span>
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
