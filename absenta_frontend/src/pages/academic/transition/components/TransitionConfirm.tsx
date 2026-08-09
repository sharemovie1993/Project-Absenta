import React, { useState } from 'react';
import { Checkbox, Button, Alert, AlertDescription, SectionCard } from '../../../../components/ui';
import { AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

interface Props {
  onExecute: () => void;
  loading?: boolean;
}

const TransitionConfirm: React.FC<Props> = React.memo(({ onExecute, loading }) => {
  const [confirmed1, setConfirmed1] = useState<boolean>(false);
  const [confirmed2, setConfirmed2] = useState<boolean>(false);

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="animate-in slide-in-from-top-4 duration-500">
        <Alert variant="destructive" className="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 rounded-xl p-6 border-dashed">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
               <AlertTriangle size={24} />
            </div>
            <div>
               <h4 className="text-sm font-black text-rose-900 dark:text-rose-400 uppercase tracking-tight mb-1">Tindakan Kritis Terdeteksi</h4>
               <AlertDescription className="text-[12px] font-bold text-rose-800 dark:text-rose-300/80 leading-relaxed uppercase tracking-tight">
                 Proses kenaikan kelas adalah tindakan masal yang bersifat permanen. Pastikan Anda telah meninjau seluruh daftar siswa dan pemetaan kelas dengan seksama.
               </AlertDescription>
            </div>
          </div>
        </Alert>
      </div>

      <SectionCard 
        fullWidth
        className="relative overflow-hidden space-y-6 bg-white dark:bg-slate-900 shadow-xl"
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner">
            <ShieldCheck size={24} />
          </div>
          <div>
             <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Protokol Keamanan Akhir</h3>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Verifikasi integritas data sebelum eksekusi</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div 
            className={`flex items-start gap-4 p-5 rounded-xl transition-all duration-300 cursor-pointer border-2 ${
              confirmed1 
                ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' 
                : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-300'
            }`} 
            onClick={() => setConfirmed1(!confirmed1)}
          >
            <Checkbox 
              checked={confirmed1} 
              onCheckedChange={(v: boolean) => setConfirmed1(v)} 
              className="mt-1 w-5 h-5 rounded-md border-2 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" 
            />
            <div className={`text-[11px] leading-relaxed font-black uppercase tracking-tight transition-colors ${confirmed1 ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-500'}`}>
              Saya mengonfirmasi bahwa seluruh pemetaan kelas (Asal ke Tujuan) sudah benar sesuai dengan kebijakan kurikulum sekolah yang berlaku.
            </div>
          </div>

          <div 
            className={`flex items-start gap-4 p-5 rounded-xl transition-all duration-300 cursor-pointer border-2 ${
              confirmed2 
                ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' 
                : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-300'
            }`} 
            onClick={() => setConfirmed2(!confirmed2)}
          >
            <Checkbox 
              checked={confirmed2} 
              onCheckedChange={(v: boolean) => setConfirmed2(v)} 
              className="mt-1 w-5 h-5 rounded-md border-2 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" 
            />
            <div className={`text-[11px] leading-relaxed font-black uppercase tracking-tight transition-colors ${confirmed2 ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-500'}`}>
              Saya memahami sepenuhnya bahwa data siswa yang dipindahkan ke tahun ajaran baru tidak dapat dibatalkan melalui sistem secara otomatis.
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-col items-center gap-6 pt-4 animate-in fade-in zoom-in duration-1000">
        <Button 
          onClick={onExecute} 
          disabled={!confirmed1 || !confirmed2 || !!loading}
          className={`h-16 w-full rounded-xl font-black text-xs uppercase tracking-[0.2em] gap-4 shadow-2xl transition-all duration-500 hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:grayscale ${
            confirmed1 && confirmed2 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/40' 
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              Memproses Transisi...
            </div>
          ) : (
             <>
               Jalankan Kenaikan Kelas
               <ShieldCheck className="w-6 h-6" />
             </>
          )}
        </Button>
        <div className="flex flex-col items-center gap-1">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic opacity-60">Final Authorization Required</p>
           <div className="h-1 w-12 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
      </div>
    </div>
  );
});

export default TransitionConfirm;
