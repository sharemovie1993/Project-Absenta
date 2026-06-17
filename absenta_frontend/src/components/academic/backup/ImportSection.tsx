import React from 'react';
import { 
  UploadCloud, 
  AlertTriangle, 
  FileJson, 
  Loader2, 
  RefreshCw, 
  Info,
  ArrowRight
} from 'lucide-react';
import { Button, Badge } from '../../ui';

interface BackupStats {
  master: {
    sekolah: number;
    tahunPelajaran: number;
    semester: number;
    jurusan: number;
    mapel: number;
    jenisKegiatan: number;
    strukturOrganisasi: number;
  };
  users: {
    guru: number;
    siswa: number;
  };
  academic: {
    kelas: number;
    waliKelas: number;
    guruMapel: number;
    kelasMapel: number;
    siswaAkademik: number;
  };
  operational: {
    jadwalTemplate: number;
    guruStruktur: number;
    siswaStruktur: number;
    pelanggaran: number;
    supervisi: number;
  };
  total: number;
}

interface ImportSectionProps {
  importFile: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isReadingFile: boolean;
  loadingImport: boolean;
  processingStage: 'idle' | 'uploading' | 'processing' | 'done';
  importProgress: number;
  previewStats: BackupStats | null;
  onImport: () => void;
}

export const ImportSection: React.FC<ImportSectionProps> = ({
  importFile,
  onFileChange,
  isReadingFile,
  loadingImport,
  processingStage,
  importProgress,
  previewStats,
  onImport
}) => {
  return (
    <div className="flex flex-col h-full space-y-6 p-6 lg:p-10">
      <div className="flex-1 space-y-8">
        {/* Warning Alert */}
        <div className="flex items-start gap-4 p-5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
          <div className="w-10 h-10 bg-white dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0 shadow-sm border border-amber-100 dark:border-amber-800">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <h5 className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-tight leading-none">Peringatan Pemulihan</h5>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-500/80 font-medium leading-relaxed">
              Record yang sudah ada akan dilewati (skip) untuk mencegah duplikasi. Pastikan integritas file terjamin.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Dropzone */}
          <div className={`group relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-500 ease-out cursor-pointer ${importFile ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-orange-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}>
            <input
              type="file"
              accept=".json"
              onChange={onFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="relative z-0">
              {importFile ? (
                <div className="text-emerald-600 dark:text-emerald-400 flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-white dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4 shadow-xl border border-emerald-100 dark:border-emerald-800">
                    <FileJson size={40} />
                  </div>
                  <span className="font-black text-sm tracking-tight">{importFile.name}</span>
                  <span className="text-[9px] uppercase font-black tracking-[0.2em] mt-2 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-full">File Terverifikasi</span>
                </div>
              ) : (
                <div className="text-slate-400 flex flex-col items-center group-hover:text-orange-500 transition-all duration-300">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 group-hover:scale-110 transition-all shadow-inner border border-slate-100 dark:border-slate-800">
                    <UploadCloud size={40} />
                  </div>
                  <span className="font-black text-sm text-slate-700 dark:text-slate-200 tracking-tight">Klik atau Tarik File Cadangan</span>
                  <span className="text-[10px] mt-2 uppercase font-bold tracking-widest opacity-60">Format .JSON Database Absenta</span>
                </div>
              )}
            </div>
          </div>

          {/* Loading / Progress States */}
          {isReadingFile && (
            <div className="flex items-center justify-center gap-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              Menganalisis Konten Cadangan...
            </div>
          )}

          {loadingImport && (
            <div className="space-y-4 py-4 px-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Pemulihan</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    {processingStage === 'uploading' ? <UploadCloud size={14} className="text-blue-500" /> : <RefreshCw size={14} className="animate-spin text-orange-500" />}
                    {processingStage === 'uploading' ? 'Mengunggah Data...' :
                      processingStage === 'processing' ? 'Sinkronisasi Record...' :
                        'Membersihkan Cache...'}
                  </span>
                </div>
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{importProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-4 overflow-hidden shadow-inner p-1">
                <div
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-out shadow-lg shadow-orange-500/20"
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Preview Stats */}
          {previewStats && !loadingImport && (
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-6 space-y-6 border border-slate-100 dark:border-slate-800/60 shadow-inner animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Info size={12} className="text-blue-500" /> Hasil Analisis File
                </h4>
                <Badge variant="info" className="font-black text-[10px] px-3 py-1">{previewStats.total} Record</Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-2">
                  <p className="font-black text-[9px] text-slate-400 uppercase tracking-[0.2em]">Struktur</p>
                  {[
                    { label: 'Sekolah', val: previewStats.master.sekolah },
                    { label: 'Mapel', val: previewStats.master.mapel },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <span className="text-slate-600 dark:text-slate-400 font-bold text-[10px]">{item.label}</span>
                      <span className="font-black text-slate-900 dark:text-slate-100 text-[10px]">{item.val}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="font-black text-[9px] text-slate-400 uppercase tracking-[0.2em]">Pengguna</p>
                  {[
                    { label: 'Guru', val: previewStats.users.guru },
                    { label: 'Siswa', val: previewStats.users.siswa },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <span className="text-slate-600 dark:text-slate-400 font-bold text-[10px]">{item.label}</span>
                      <span className="font-black text-slate-900 dark:text-slate-100 text-[10px]">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <Button
          onClick={onImport}
          disabled={loadingImport || !previewStats}
          className="w-full h-16 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.1em] text-xs shadow-2xl shadow-orange-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loadingImport ? (
            <>
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Memproses Pemulihan...
            </>
          ) : (
            <>
              Eksekusi Pemulihan Data <ArrowRight className="ml-3 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
