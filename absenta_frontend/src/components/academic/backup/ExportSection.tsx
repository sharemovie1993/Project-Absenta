import React from 'react';
import { 
  Download, 
  Database, 
  Clock, 
  Image, 
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../../ui';

interface ExportSectionProps {
  includeAttendance: boolean;
  setIncludeAttendance: (val: boolean) => void;
  includeMedia: boolean;
  setIncludeMedia: (val: boolean) => void;
  onExport: () => void;
  loading: boolean;
}

export const ExportSection: React.FC<ExportSectionProps> = React.memo(({
  includeAttendance,
  setIncludeAttendance,
  includeMedia,
  setIncludeMedia,
  onExport,
  loading
}) => {
  return (
    <div className="flex flex-col h-full justify-between p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div className="space-y-4 sm:space-y-5">
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Kemas seluruh data sekolah Anda ke dalam satu berkas arsip <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">.absenta</code>. Berkas ini dapat disimpan sebagai cadangan aman atau dipulihkan ke server baru kapan saja.
        </p>

        {/* Option Checkboxes */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
            Komponen yang Disertakan
          </label>

          {/* Database Relasional (Wajib) */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">Basis Data Relasional</h6>
                <p className="text-[10px] text-slate-400">Data siswa, guru, kelas, mapel, tahun ajaran, dan struktur</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              Wajib
            </span>
          </div>

          {/* Riwayat Presensi (Opsional) */}
          <label 
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
              includeAttendance 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60' 
                : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 opacity-70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                includeAttendance ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200/60 text-slate-400'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">Riwayat Presensi & Log</h6>
                <p className="text-[10px] text-slate-400">Rekap sesi harian, absensi mata pelajaran, dan jurnal</p>
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

          {/* Berkas Media S3 / MinIO (Opsional) */}
          <label 
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
              includeMedia 
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60' 
                : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 opacity-70'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                includeMedia ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200/60 text-slate-400'
              }`}>
                <Image className="w-4 h-4" />
              </div>
              <div>
                <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200">Berkas Media & Foto (MinIO)</h6>
                <p className="text-[10px] text-slate-400">Foto profil guru/siswa, berkas lampiran, dan surat keluar</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeMedia}
              onChange={(e) => setIncludeMedia(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
          </label>
        </div>
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
              <span>Unduh Paket Cadangan (.absenta)</span>
            </>
          )}
        </Button>
        <p className="text-[10px] text-center text-slate-400 font-medium">
          Checksum SHA-256 otomatis disertakan untuk verifikasi integritas data
        </p>
      </div>
    </div>
  );
});

ExportSection.displayName = 'ExportSection';
