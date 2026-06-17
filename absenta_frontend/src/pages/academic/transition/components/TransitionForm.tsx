import React, { useMemo } from 'react';
import { Button, Label, Badge, SectionCard, Alert, AlertDescription } from '../../../../components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Database, ArrowRight, Target, Info, LayoutGrid, Clock } from 'lucide-react';
import type { TahunPelajaran } from '../../../../types/academic';
import type { TransitionPreviewInput } from '../../../../api/academic/transition.api';

interface Props {
  tahunAktif: TahunPelajaran[];
  tahunBelumAktif: TahunPelajaran[];
  selectedTahunLamaId: string;
  selectedTahunBaruId: string;
  onTahunLamaChange: (val: string) => void;
  onTahunBaruChange: (val: string) => void;
  onNext: () => void;
  loading?: boolean;
}

const TransitionForm: React.FC<Props> = ({ 
  tahunAktif, 
  tahunBelumAktif, 
  selectedTahunLamaId,
  selectedTahunBaruId,
  onTahunLamaChange,
  onTahunBaruChange,
  onNext, 
  loading 
}) => {
  const canProceed = useMemo(() => !!selectedTahunLamaId && !!selectedTahunBaruId, [selectedTahunLamaId, selectedTahunBaruId]);
  
  const selectedLama = useMemo(() => tahunAktif.find(t => t.id === selectedTahunLamaId), [tahunAktif, selectedTahunLamaId]);
  const selectedBaru = useMemo(() => tahunBelumAktif.find(t => t.id === selectedTahunBaruId), [tahunBelumAktif, selectedTahunBaruId]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Alert className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800 rounded-xl p-5 border-dashed">
          <div className="flex gap-4">
             <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <Info size={20} />
             </div>
             <AlertDescription className="text-[12px] font-bold text-blue-700 dark:text-blue-400 leading-relaxed uppercase tracking-tight">
               Pilih periode akademik asal (Sumber) dan periode tujuan (Target). Sistem akan memproses pemindahan data siswa berdasarkan pemetaan kelas yang Anda tentukan pada langkah berikutnya.
             </AlertDescription>
          </div>
        </Alert>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Source Card */}
        <SectionCard 
          fullWidth
          className="relative overflow-hidden transition-all duration-300 group"
        >
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
        </SectionCard>

        {/* Target Card */}
        <SectionCard 
          fullWidth
          className="relative overflow-hidden transition-all duration-300 group border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50/10 dark:bg-blue-900/5"
        >
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
        </SectionCard>
      </div>

      <div className="flex justify-center pt-8 animate-in fade-in zoom-in duration-700">
        <Button
          onClick={onNext}
          disabled={!canProceed || !!loading}
          className="h-14 gap-3 font-black px-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Menyiapkan...' : 'Lanjut ke Pemetaan Kelas'}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default TransitionForm;
