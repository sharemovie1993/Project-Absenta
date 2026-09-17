import React from 'react';
import { 
  UploadCloud, 
  FileArchive, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2,
  Trash2,
  Sparkles,
  School,
  Database,
  Image,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button, Badge } from '../../ui';
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
  onManualPurge?: () => void;
  onImport: () => void;
  onOpenMigrationWizard?: () => void;
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
  onManualPurge,
  onImport,
  onOpenMigrationWizard
}) => {
  return (
    <div className="flex flex-col h-full justify-between space-y-6 p-6 lg:p-8">
      <div className="space-y-6">
        {/* Wizard Guide Banner */}
        {onOpenMigrationWizard && (
          <div className="p-4 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent rounded-2xl border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h6 className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                    Wizard Pemulihan Interaktif
                  </h6>
                  <span className="text-[9px] font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    UniFi Style
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Gunakan wizard langkah-demi-langkah dengan preview visual lengkap
                </p>
              </div>
            </div>
            <Button
              onClick={onOpenMigrationWizard}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl px-4 py-2 shrink-0 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Buka Wizard
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {/* Dropzone */}
          <div className={`group relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 cursor-pointer ${
            importFile 
              ? 'border-emerald-400 bg-emerald-500/5 dark:bg-emerald-950/20' 
              : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-slate-50/80 dark:hover:bg-slate-900/50'
          }`}>
            <input
              type="file"
              accept=".absenta,.zip"
              onChange={onFileChange}
              disabled={loadingImport || isInspecting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            />
            <div className="relative z-0">
              {importFile ? (
                <div className="text-emerald-600 dark:text-emerald-400 flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
                    <FileArchive className="w-7 h-7" />
                  </div>
                  <span className="font-black text-xs text-slate-900 dark:text-slate-100 tracking-tight">{importFile.name}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Berkas .absenta Terpilih
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResetFile();
                      }}
                      className="text-[10px] text-red-500 hover:underline font-bold z-20 cursor-pointer"
                    >
                      Ganti File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner border border-slate-200 dark:border-slate-800">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <span className="font-black text-xs text-slate-800 dark:text-slate-200 tracking-tight">
                    Tarik & Lepaskan Berkas Paket (.absenta)
                  </span>
                  <span className="text-[10px] mt-1 uppercase font-bold tracking-widest text-slate-400">
                    Format Arsip Cadangan Mandiri Absenta
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Inspecting State */}
          {isInspecting && (
            <div className="flex items-center justify-center gap-2.5 py-3 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              Membaca & Memvalidasi Manifest Paket .absenta...
            </div>
          )}

          {/* Loading / Progress States */}
          {loadingImport && (
            <div className="space-y-3 p-5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Pemulihan</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <RefreshCw size={14} className="animate-spin text-emerald-500" />
                    {restoreMessage}
                  </span>
                </div>
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{importProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Inspected Manifest Card */}
          {manifest && !loadingImport && (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 space-y-4 border border-slate-200/80 dark:border-slate-800/80 shadow-inner animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <School size={16} className="text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                      {manifest.source_tenant.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Subdomain: {manifest.source_tenant.subdomain || '-'}
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider shrink-0">
                  Paket Valid
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Siswa</p>
                  <p className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {manifest.stats.total_students || 0}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Guru & Staf</p>
                  <p className="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {manifest.stats.total_teachers || 0}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Record Data</p>
                  <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {manifest.stats.total_db_records || 0}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Berkas Media</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {manifest.stats.total_media_files || 0} File
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1 font-mono gap-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <span className="flex items-center gap-1 font-sans">
                  <Clock size={11} /> Dibuat: {new Date(manifest.created_at).toLocaleString('id-ID')}
                </span>
                <span title={manifest.checksum_sha256}>
                  SHA-256: {manifest.checksum_sha256 ? `${manifest.checksum_sha256.slice(0, 12)}...` : '-'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          onClick={onImport}
          disabled={!manifest || loadingImport || isInspecting}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-black uppercase tracking-wider text-xs shadow-xl shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingImport ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          <span>{loadingImport ? 'SEDANG MEMULIHKAN SISTEM...' : 'PULIHKAN PAKET SISTEM (.ABSENTA)'}</span>
        </Button>

        {onManualPurge && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onManualPurge}
            disabled={loadingImport}
            className="w-full text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} />
            Kosongkan Data Sekolah Ini Secara Bersih (Reset)
          </Button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Sistem Idempotent Aman & Otomatis Skip Duplikasi</span>
        </div>
      </div>
    </div>
  );
});

ImportSection.displayName = 'ImportSection';
