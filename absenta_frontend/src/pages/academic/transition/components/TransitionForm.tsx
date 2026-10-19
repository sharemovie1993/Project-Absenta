import React, { useMemo } from 'react';
import { Label, Alert, AlertDescription, Button } from '../../../../components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Database, Target, Info, Clock, ArrowRight, ShieldAlert, AlertTriangle, PlusCircle, ExternalLink } from 'lucide-react';
import type { TahunPelajaran } from '../../../../types/academic';
import { isChronologicallyAfter, getSuggestedNextTahun, filterFutureAcademicYears } from '../utils';

export type ScopeMode = 'ALL' | 'SELECTED';

interface Props {
  tahunAktif?: TahunPelajaran[];
  tahunBelumAktif?: TahunPelajaran[];
  tahunPelajaran?: TahunPelajaran[];
  selectedTahunLamaId: string;
  selectedTahunBaruId: string;
  onTahunLamaChange?: (val: string) => void;
  onTahunBaruChange?: (val: string) => void;
  onSelectTahunLama?: (val: string) => void;
  onSelectTahunBaru?: (val: string) => void;
  onNext?: () => void;
  loadingYears?: boolean;
  onCreateTapel?: () => void;
}

const TransitionForm: React.FC<Props> = React.memo(({ 
  tahunAktif, 
  tahunBelumAktif, 
  tahunPelajaran = [],
  selectedTahunLamaId,
  selectedTahunBaruId,
  onTahunLamaChange,
  onTahunBaruChange,
  onSelectTahunLama,
  onSelectTahunBaru,
  onNext,
  loadingYears = false,
  onCreateTapel,
}) => {
  const handleTahunLamaChange = onTahunLamaChange || onSelectTahunLama || (() => {});
  const handleTahunBaruChange = onTahunBaruChange || onSelectTahunBaru || (() => {});

  // Object representasi tahun lama & baru
  const selectedLamaObj = useMemo(() => {
    return (tahunPelajaran ?? []).find(t => t.id === selectedTahunLamaId);
  }, [tahunPelajaran, selectedTahunLamaId]);

  const selectedBaruObj = useMemo(() => {
    return (tahunPelajaran ?? []).find(t => t.id === selectedTahunBaruId);
  }, [tahunPelajaran, selectedTahunBaruId]);

  const suggestedNextYear = useMemo(() => {
    return getSuggestedNextTahun(selectedLamaObj?.tahun);
  }, [selectedLamaObj]);

  // Validasi kronologi: Tahun baru HARUS lebih tinggi dari tahun lama
  const isChronological = useMemo(() => {
    if (!selectedLamaObj || !selectedBaruObj) return true;
    return isChronologicallyAfter(selectedLamaObj.tahun, selectedBaruObj.tahun);
  }, [selectedLamaObj, selectedBaruObj]);

  const hasChronologyError = Boolean(selectedLamaObj && selectedBaruObj && !isChronological);

  // Opsi Data Sumber (Tahun Pelajaran Lama / Asal)
  const sourceOptions = useMemo(() => {
    const list = (tahunAktif && tahunAktif.length > 0) ? tahunAktif : tahunPelajaran;
    return (list ?? []).map(tp => ({
      value: tp.id,
      label: `${tp.tahun}${tp.is_active ? ' — AKTIF' : ''}`
    }));
  }, [tahunAktif, tahunPelajaran]);

  // Opsi Data Target (Hanya tahun pelajaran yang lebih baru secara kronologis)
  const targetOptions = useMemo(() => {
    let list = (tahunBelumAktif && tahunBelumAktif.length > 0) ? tahunBelumAktif : tahunPelajaran;
    if (selectedLamaObj?.tahun) {
      // Proteksi Human Error: saring hanya tahun di masa mendatang
      list = filterFutureAcademicYears(selectedLamaObj.tahun, list);
    } else if (selectedTahunLamaId) {
      list = list.filter(t => t.id !== selectedTahunLamaId);
    }
    return (list ?? []).map(tp => ({
      value: tp.id,
      label: `${tp.tahun}${tp.is_active ? ' — AKTIF' : ' — PERSIAPAN'}`
    }));
  }, [tahunBelumAktif, tahunPelajaran, selectedLamaObj, selectedTahunLamaId]);

  const canProceed = Boolean(
    selectedTahunLamaId &&
    selectedTahunBaruId &&
    !hasChronologyError
  );

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
              aria-label="Pilih opsi transisi tahun lama"
              value={selectedTahunLamaId}
              onValueChange={handleTahunLamaChange}
              options={sourceOptions}
              placeholder={loadingYears ? "Memuat tahun pelajaran..." : "Pilih Tahun Asal"}
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
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-black text-blue-400 tracking-widest flex items-center gap-2">
                Tahun Pelajaran Baru <span className="text-rose-500">*</span>
              </Label>
              {onCreateTapel && (
                <button
                  type="button"
                  onClick={onCreateTapel}
                  className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3" />
                  + Buat Tapel Baru
                </button>
              )}
            </div>
            <SearchableSelect
              aria-label="Pilih opsi transisi tahun baru"
              value={selectedTahunBaruId}
              onValueChange={handleTahunBaruChange}
              options={targetOptions}
              placeholder={
                loadingYears 
                  ? "Memuat tahun pelajaran..." 
                  : targetOptions.length === 0 
                  ? "Belum ada tahun pelajaran baru" 
                  : "Pilih Tahun Tujuan"
              }
              triggerClassName={`h-12 border-blue-200 dark:border-blue-800 dark:bg-slate-950 dark:text-slate-300 font-black text-xs rounded-xl transition-all hover:border-blue-400 ${
                hasChronologyError ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-200 dark:ring-rose-950' : ''
              }`}
            />
            
            {/* Proteksi Human Error: Alert Kronologi Salah */}
            {hasChronologyError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-700 dark:text-rose-400 animate-in fade-in duration-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="space-y-0.5 text-[11px] leading-tight font-medium">
                  <p className="font-bold uppercase tracking-tight">Proteksi Human Error Aktif</p>
                  <p>Tahun tujuan ({selectedBaruObj?.tahun}) tidak valid! Kenaikan kelas harus berpindah ke tahun ajaran yang lebih tinggi/mendatang dari tahun berjalan ({selectedLamaObj?.tahun}).</p>
                </div>
              </div>
            )}

            {/* Rekomendasi Jika Belum Ada Tahun Pelajaran Mendatang */}
            {selectedLamaObj && targetOptions.length === 0 && !loadingYears && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2 text-amber-800 dark:text-amber-300 animate-in fade-in duration-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="text-[11px] leading-tight">
                    <p className="font-bold">Belum Ada Tahun Pelajaran Mendatang</p>
                    <p className="text-amber-700 dark:text-amber-400 text-[10px] mt-0.5">
                      Tidak ditemukan Tahun Pelajaran setelah {selectedLamaObj.tahun}. Anda perlu membuat Tahun Pelajaran {suggestedNextYear ? `(misal: ${suggestedNextYear})` : 'baru'} terlebih dahulu.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onCreateTapel || (() => window.open('/academic/tahun-pelajaran', '_blank'))}
                  className="w-full h-8 text-[10px] font-bold gap-1.5 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg justify-center"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Buat Tahun Pelajaran Baru {suggestedNextYear ? `(${suggestedNextYear})` : ''}
                </Button>
              </div>
            )}

            <div className="flex items-start gap-2 pt-1">
               <Info className="w-3 h-3 text-blue-400 mt-0.5" />
               <p className="text-[10px] text-blue-500/80 font-medium leading-tight italic">
                 Hanya menampilkan tahun pelajaran baru yang disiapkan untuk periode mendatang (setelah {selectedLamaObj?.tahun || 'tahun aktif'}).
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button: Next Step */}
      {onNext && (
        <div className="flex items-center justify-end pt-4">
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className="h-14 gap-3 font-black px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            Lanjut ke Cakupan Kenaikan
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
});

TransitionForm.displayName = 'TransitionForm';
export default TransitionForm;
