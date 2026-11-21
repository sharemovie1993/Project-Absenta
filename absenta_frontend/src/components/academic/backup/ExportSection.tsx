import React from 'react';
import { 
  Download, 
  Database, 
  Clock, 
  Image, 
  Layers,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../ui';
import type { BackupBundleMode } from '@/api/superadmin-backups.api';

interface ExportSectionProps {
  mode: BackupBundleMode;
  setMode: (mode: BackupBundleMode) => void;
  includeAttendance: boolean;
  setIncludeAttendance: (val: boolean) => void;
  onExport: () => void;
  loading: boolean;
}

export const ExportSection: React.FC<ExportSectionProps> = React.memo(({
  mode,
  setMode,
  includeAttendance,
  setIncludeAttendance,
  onExport,
  loading
}) => {
  return (
    <div className="flex flex-col h-full justify-between p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div className="space-y-4 sm:space-y-5">
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Pilih komponen yang ingin dicadangkan ke dalam berkas <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">.absenta</code>. Seluruh opsi dirancang modular dan saling terhubung saat dipulihkan.
        </p>

        {/* 3 Selectable Mode Cards */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
            Pilihan Mode Cadangan
          </label>

          {/* OPSI 1: FULL BACKUP */}
          <div
            onClick={() => !loading && setMode('FULL')}
            className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              mode === 'FULL'
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 shadow-sm'
                : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                mode === 'FULL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">Cadangan Lengkap (Full)</h6>
                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded-full">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Mencakup seluruh basis data relasional (siswa, guru, nilai) dan seluruh berkas fisik MinIO (foto & dokumen).
                </p>
              </div>
            </div>
            <div className="shrink-0 pt-1">
              <input
                type="radio"
                name="backup_mode"
                checked={mode === 'FULL'}
                onChange={() => setMode('FULL')}
                disabled={loading}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* OPSI 2: DATABASE ONLY */}
          <div
            onClick={() => !loading && setMode('DATABASE_ONLY')}
            className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              mode === 'DATABASE_ONLY'
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 shadow-sm'
                : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                mode === 'DATABASE_ONLY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
              }`}>
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">Hanya Basis Data</h6>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Hanya seluruh data teks & angka relasional sekolah tanpa fisik media. Sangat ringan (beberapa MB) dan instan.
                </p>
              </div>
            </div>
            <div className="shrink-0 pt-1">
              <input
                type="radio"
                name="backup_mode"
                checked={mode === 'DATABASE_ONLY'}
                onChange={() => setMode('DATABASE_ONLY')}
                disabled={loading}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* OPSI 3: MEDIA ONLY */}
          <div
            onClick={() => !loading && setMode('MEDIA_ONLY')}
            className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              mode === 'MEDIA_ONLY'
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 shadow-sm'
                : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                mode === 'MEDIA_ONLY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
              }`}>
                <Image className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">Hanya Berkas Media (MinIO)</h6>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Hanya seluruh foto profil siswa/guru, dokumen lampiran, dan berkas surat di Object Storage MinIO.
                </p>
              </div>
            </div>
            <div className="shrink-0 pt-1">
              <input
                type="radio"
                name="backup_mode"
                checked={mode === 'MEDIA_ONLY'}
                onChange={() => setMode('MEDIA_ONLY')}
                disabled={loading}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Riwayat Presensi (Hanya tampil jika mode menyertakan database) */}
        {mode !== 'MEDIA_ONLY' && (
          <div className="space-y-1.5 pt-1">
            <label 
              className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                includeAttendance 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60' 
                  : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  includeAttendance ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200/60 text-slate-400'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">Sertakan Riwayat Presensi & Log</h6>
                  <p className="text-[10px] text-slate-400">Jurnal harian, absensi mapel, log presensi siswa & guru</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeAttendance}
                onChange={(e) => setIncludeAttendance(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="space-y-2 pt-2">
        <Button
          onClick={onExport}
          disabled={loading}
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Mengemas Paket Cadangan...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>
                {mode === 'FULL' 
                  ? 'Unduh Cadangan Lengkap (.absenta)'
                  : mode === 'DATABASE_ONLY'
                    ? 'Unduh Cadangan Basis Data (.absenta)'
                    : 'Unduh Cadangan Berkas Media (.absenta)'}
              </span>
            </>
          )}
        </Button>
        <p className="text-[10px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Integritas data terjamin dengan checksum SHA-256</span>
        </p>
      </div>
    </div>
  );
});

ExportSection.displayName = 'ExportSection';
