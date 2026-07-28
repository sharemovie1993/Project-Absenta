import React from 'react';
import { Label, Alert, AlertDescription } from '../../../../components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Database, Target, Info, Clock } from 'lucide-react';
import type { TahunPelajaran } from '../../../../types/academic';

export type ScopeMode = 'ALL' | 'SELECTED';

interface Props {
  tahunAktif: TahunPelajaran[];
  tahunBelumAktif: TahunPelajaran[];
  selectedTahunLamaId: string;
  selectedTahunBaruId: string;
  onTahunLamaChange: (val: string) => void;
  onTahunBaruChange: (val: string) => void;
}

const TransitionForm: React.FC<Props> = ({ 
  tahunAktif, 
  tahunBelumAktif, 
  selectedTahunLamaId,
  selectedTahunBaruId,
  onTahunLamaChange,
  onTahunBaruChange,
}) => {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      {/* Info Bar */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Alert className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800 rounded-xl p-5 border-dashed">
          <div className="flex gap-4">
             <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <Info size={20} />
             </div>
             <AlertDescription className="text-[12px] font-bold text-blue-700 dark:text-blue-400 leading-relaxed uppercase tracking-tight">
               Langkah 1: Persiapan Tahun Pelajaran. Pilih periode akademik asal (Sumber) dan periode akademik tujuan (Target) sebelum menentukan cakupan kenaikan kelas.
             </AlertDescription>
          </div>
        </Alert>
      </div>

      {/* Source & Target Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Source Card */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl relative overflow-hidden transition-all duration-300 group flex flex-col justify-between gap-6 shadow-sm hover:shadow-md">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
             <Clock size={80} />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
               <Database size={24} />
            </div>
            <div>
               <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Data Sumber</h3>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Asal Kenaikan Kelas</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-2">
               Tahun Pelajaran Lama <span className="text-rose-500">*</span>
            </Label>
            <SearchableSelect
              value={selectedTahunLamaId}
              onValueChange={onTahunLamaChange}
              options={tahunAktif.map(tp => ({
                value: tp.id,
                label: `${tp.tahun} — AKTIF`
              }))}
              placeholder="Pilih Tahun Asal"
              triggerClassName="h-12 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 font-black text-xs rounded-xl transition-all hover:border-slate-400"
            />
            <div className="flex items-start gap-2 pt-1">
               <Info className="w-3 h-3 text-slate-400 mt-0.5" />
               <p className="text-[10px] text-slate-500 font-medium leading-tight italic">Tahun pelajaran yang sedang berjalan atau akan segera berakhir.</p>
            </div>
          </div>
        </div>

        {/* Target Card */}
        <div className="p-6 bg-blue-50/10 dark:bg-blue-900/5 border border-blue-100 dark:border-blue-900/20 rounded-2xl relative overflow-hidden transition-all duration-300 group flex flex-col justify-between gap-6 shadow-sm hover:shadow-md">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 text-blue-600">
             <Target size={80} />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
              <Target size={24} />
            </div>
            <div>
               <h3 className="text-sm font-black text-blue-700 dark:text-blue-400 uppercase tracking-tight">Data Target</h3>
               <p className="text-[10px] text-blue-500/60 font-black uppercase tracking-widest">Tujuan Kenaikan Kelas</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-black text-blue-400 tracking-widest flex items-center gap-2">
               Tahun Pelajaran Baru <span className="text-rose-500">*</span>
            </Label>
            <SearchableSelect
              value={selectedTahunBaruId}
              onValueChange={onTahunBaruChange}
              options={tahunBelumAktif.map(tp => ({
                value: tp.id,
                label: `${tp.tahun} — PERSIAPAN`
              }))}
              placeholder="Pilih Tahun Tujuan"
              triggerClassName="h-12 border-blue-200 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-300 font-black text-xs rounded-xl transition-all hover:border-blue-400"
            />
            <div className="flex items-start gap-2 pt-1">
               <Info className="w-3 h-3 text-blue-400 mt-0.5" />
               <p className="text-[10px] text-blue-500/80 font-medium leading-tight italic">Tahun pelajaran baru yang sudah disiapkan untuk periode mendatang.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitionForm;
