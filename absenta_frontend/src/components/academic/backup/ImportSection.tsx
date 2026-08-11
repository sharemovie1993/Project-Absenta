import React from 'react';
import { 
  UploadCloud, 
  AlertTriangle, 
  FileJson, 
  Loader2, 
  RefreshCw, 
  Info,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Button, Badge } from '../../ui';

interface BackupStats {
  master: {
    sekolah: number;
    tahunPelajaran: number;
    semester: number;
    jurusan: number;
    mapel: number;
    kelas: number;
  };
  users: {
    guru: number;
    siswa: number;
    orangTua: number;
    user: number;
  };
  academic: {
    jadwalKBM: number;
    absenSiswa: number;
    absenGuru: number;
    absenGerbang: number;
  };
  modules: {
    suratDigital: number;
    pelanggaranPrestasi: number;
    bkKonseling: number;
    sarprasAsset: number;
    koperasi: number;
  };
  total: number;
  tableCount: number;
}

interface ImportSectionProps {
  importFile: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isReadingFile: boolean;
  loadingImport: boolean;
  processingStage: 'idle' | 'uploading' | 'processing' | 'done';
  importProgress: number;
  previewStats: BackupStats | null;
  clearExisting?: boolean;
  onToggleClearExisting?: (val: boolean) => void;
  onManualPurge?: () => void;
  onImport: () => void;
}

export const ImportSection: React.FC<ImportSectionProps> = React.memo(({
  importFile,
  onFileChange,
  isReadingFile,
  loadingImport,
  processingStage,
  importProgress,
  previewStats,
  clearExisting = false,
  onToggleClearExisting,
  onManualPurge,
  onImport
}) => {
  return (
    <div className="flex flex-col h-full justify-between space-y-6 p-6 lg:p-8">
      <div className="space-y-6">
        {/* Warning Alert */}
        <div className="flex items-start gap-3.5 p-4 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h5 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
              Peringatan Pemulihan Data
            </h5>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 font-medium leading-relaxed">
              Record yang sudah ada di database akan dilewati (*skip*) untuk mencegah duplikasi. Pastikan integritas file terjamin.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Dropzone */}
          <div className={`group relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 cursor-pointer ${
            importFile 
              ? 'border-emerald-400 bg-emerald-500/5 dark:bg-emerald-950/20' 
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-slate-50/80 dark:hover:bg-slate-900/50'
          }`}>
            <input
              type="file"
              accept=".json"
              onChange={onFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="relative z-0">
              {importFile ? (
                <div className="text-emerald-600 dark:text-emerald-400 flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
                    <FileJson className="w-7 h-7" />
                  </div>
                  <span className="font-black text-xs text-slate-900 dark:text-slate-100 tracking-tight">{importFile.name}</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest mt-2 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> File Terverifikasi
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover:text-amber-500 transition-colors">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner border border-slate-200 dark:border-slate-800">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <span className="font-black text-xs text-slate-800 dark:text-slate-200 tracking-tight">
                    Klik atau Tarik File Cadangan
                  </span>
                  <span className="text-[10px] mt-1 uppercase font-bold tracking-widest text-slate-400">
                    Format .JSON Database Absenta
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Loading / Progress States */}
          {isReadingFile && (
            <div className="flex items-center justify-center gap-2.5 py-3 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              Menganalisis Konten Cadangan...
            </div>
          )}

          {loadingImport && (
            <div className="space-y-3 p-5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Pemulihan</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {processingStage === 'uploading' ? <UploadCloud size={14} className="text-blue-500" /> : <RefreshCw size={14} className="animate-spin text-amber-500" />}
                    {processingStage === 'uploading' ? 'Mengunggah Data...' :
                      processingStage === 'processing' ? 'Sinkronisasi Record...' :
                        'Membersihkan Cache...'}
                  </span>
                </div>
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{importProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Preview Stats */}
          {previewStats && !loadingImport && (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 space-y-4 border border-slate-200/80 dark:border-slate-800/80 shadow-inner animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-blue-500" />
                  <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                    Hasil Analisis File Cadangan
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                    {previewStats.tableCount || 0} Modul/Tabel
                  </Badge>
                  <Badge variant="info" className="font-black text-[10px] px-2.5 py-0.5">
                    {previewStats.total} Record
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Master */}
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <p className="font-black text-[9px] text-blue-500 uppercase tracking-wider">Kelembagaan</p>
                  {[
                    { label: 'Sekolah', val: previewStats.master.sekolah },
                    { label: 'Tahun / Sem', val: previewStats.master.tahunPelajaran + previewStats.master.semester },
                    { label: 'Jurusan', val: previewStats.master.jurusan },
                    { label: 'Mapel & Kelas', val: previewStats.master.mapel + previewStats.master.kelas },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                      <span className="font-black text-slate-800 dark:text-slate-100 ml-1">{item.val}</span>
                    </div>
                  ))}
                </div>

                {/* Users */}
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <p className="font-black text-[9px] text-emerald-500 uppercase tracking-wider">Pengguna</p>
                  {[
                    { label: 'Guru', val: previewStats.users.guru },
                    { label: 'Siswa', val: previewStats.users.siswa },
                    { label: 'Orang Tua', val: previewStats.users.orangTua },
                    { label: 'Akun User', val: previewStats.users.user },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                      <span className="font-black text-slate-800 dark:text-slate-100 ml-1">{item.val}</span>
                    </div>
                  ))}
                </div>

                {/* Academic */}
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <p className="font-black text-[9px] text-violet-500 uppercase tracking-wider">Presensi & KBM</p>
                  {[
                    { label: 'Jadwal KBM', val: previewStats.academic.jadwalKBM },
                    { label: 'Absen Siswa', val: previewStats.academic.absenSiswa },
                    { label: 'Absen Guru', val: previewStats.academic.absenGuru },
                    { label: 'Tap Gerbang', val: previewStats.academic.absenGerbang },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                      <span className="font-black text-slate-800 dark:text-slate-100 ml-1">{item.val}</span>
                    </div>
                  ))}
                </div>

                {/* Modules */}
                <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <p className="font-black text-[9px] text-amber-500 uppercase tracking-wider">Modul Terintegrasi</p>
                  {[
                    { label: 'Surat Digital', val: previewStats.modules.suratDigital },
                    { label: 'Pelanggaran', val: previewStats.modules.pelanggaranPrestasi },
                    { label: 'BK / Kasus', val: previewStats.modules.bkKonseling },
                    { label: 'Sarpras & Coop', val: previewStats.modules.sarprasAsset + previewStats.modules.koperasi },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{item.label}</span>
                      <span className="font-black text-slate-800 dark:text-slate-100 ml-1">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        {/* Toggle Reset Data Trial */}
        {onToggleClearExisting && (
          <label className="flex items-start gap-3 p-3.5 bg-amber-500/5 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 cursor-pointer hover:border-amber-400 transition-colors">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => onToggleClearExisting(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
            />
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                  Kosongkan Data Trial Dev Terlebih Dahulu
                </span>
                <Badge variant="warning" className="text-[9px] font-black uppercase px-1.5 py-0 tracking-wider">
                  Rekomendasi Dev Mirror
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Sistem akan menghapus data lama di Dev sebelum mengimpor agar Dev menjadi 100% cermin Produksi tanpa tersisa data trial & error.
              </p>
            </div>
          </label>
        )}

        {onManualPurge && (
          <button
            type="button"
            onClick={onManualPurge}
            disabled={loadingImport}
            className="w-full py-2.5 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors text-[11px] font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Kosongkan Data Sekolah Manual (Reset Tenant)</span>
          </button>
        )}

        <Button
          onClick={onImport}
          disabled={loadingImport || !importFile}
          className={`w-full h-14 rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl transition-all cursor-pointer ${
            importFile 
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-500/25 active:scale-[0.99]' 
              : 'bg-slate-100 dark:bg-slate-850 text-slate-400 border border-slate-200 dark:border-slate-800 cursor-not-allowed'
          }`}
        >
          {loadingImport ? (
            <Loader2 className="mr-2.5 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2.5 h-4 w-4" />
          )}
          {loadingImport ? 'MEMPROSES PEMULIHAN...' : 'EKSEKUSI PEMULIHAN DATA'}
        </Button>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Verifikasi Skema & Idempotent Guard Aktif</span>
        </div>
      </div>
    </div>
  );
});

ImportSection.displayName = 'ImportSection';
