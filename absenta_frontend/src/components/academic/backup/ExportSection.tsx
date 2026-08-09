import React from 'react';
import { 
  Download, 
  Database, 
  ShieldCheck, 
  FileCheck, 
  History, 
  Check, 
  Loader2 
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
    { label: 'Data Master Sekolah', icon: Database },
    { label: 'Basis Data Pengguna', icon: ShieldCheck },
    { label: 'Kelas & Jadwal', icon: FileCheck },
    { label: 'Struktur Organisasi', icon: History }
  ];

  return (
    <div className="flex flex-col h-full space-y-6 p-6 lg:p-10">
      <div className="flex-1 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cakupan Data Cadangan</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-850 shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-slate-800 group-hover:scale-110 group-hover:rotate-3 transition-all">
                  <item.icon size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Terverifikasi</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/20 flex items-start gap-4">
          <div className="w-8 h-8 bg-white dark:bg-blue-950 rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
             <Check size={16} />
          </div>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 font-medium leading-relaxed">
            Sistem akan mengemas seluruh database ke dalam format JSON yang terkompresi. Data ini dapat dipulihkan kapan saja melalui modul Restore.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
        <Button
          onClick={onExport}
          disabled={loading}
          className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.1em] text-xs shadow-2xl shadow-blue-500/30 active:scale-[0.98] transition-all"
        >
          {loading ? (
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <Download className="mr-3 h-5 w-5" />
          )}
          {loading ? 'Menyiapkan Arsip...' : 'Unduh Cadangan Full (.json)'}
        </Button>
        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           Keamanan Data Prioritas Utama
        </p>
      </div>
    </div>
  );
});
