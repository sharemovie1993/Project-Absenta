import React from 'react';
import { 
  Download, 
  Database, 
  ShieldCheck, 
  FileCheck, 
  History, 
  CheckCircle2, 
  Loader2,
  Lock,
  Sparkles
} from 'lucide-react';
import { Button } from '../../ui';

interface ExportSectionProps {
  onExport: () => void;
  loading: boolean;
}

export const ExportSection: React.FC<ExportSectionProps> = React.memo(({
  onExport,
  loading
}) => {
  const features = [
    { 
      label: 'Data Master Sekolah', 
      desc: 'Sekolah, TP, Semester, Jurusan, Mapel', 
      icon: Database,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    },
    { 
      label: 'Basis Data Pengguna', 
      desc: 'Guru, Siswa, Orang Tua, User', 
      icon: ShieldCheck,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    },
    { 
      label: 'Kelas & Jadwal', 
      desc: 'Kelas, Wali Kelas, Jadwal KBM', 
      icon: FileCheck,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20'
    },
    { 
      label: 'Struktur & Operasional', 
      desc: 'Organisasi, Presensi, Pelanggaran', 
      icon: History,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    }
  ];

  return (
    <div className="flex flex-col h-full justify-between space-y-6 p-6 lg:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Cakupan Data Cadangan
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {features.map((item, i) => {
              const Icon = item.icon;
              return (
                <div 
                  key={i} 
                  className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-200 shadow-sm hover:shadow-md group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {item.label}
                    </h5>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/30 flex items-start gap-3 text-xs">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h6 className="font-black text-slate-900 dark:text-slate-100 text-xs">
              Format Cadangan Terenkripsi
            </h6>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Sistem akan mengemas seluruh skema & record database ke dalam file `.json` terkompresi. Berkas ini dapat dipulihkan kapan saja melalui modul Restore.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          onClick={onExport}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black uppercase tracking-wider text-xs shadow-xl shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer"
        >
          {loading ? (
            <Loader2 className="mr-2.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2.5 h-4 w-4" />
          )}
          {loading ? 'MENYIAPKAN ARSIP...' : 'UNDUH CADANGAN FULL (.JSON)'}
        </Button>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>Keamanan & Integritas Data Prioritas Utama</span>
        </div>
      </div>
    </div>
  );
});

ExportSection.displayName = 'ExportSection';
