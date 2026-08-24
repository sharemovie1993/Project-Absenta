import React from 'react';
import { Button, Label, Alert, AlertDescription } from '../../../../components/ui';
import { Layers, Globe, Filter, Check, Info, ArrowRight, ArrowLeft } from 'lucide-react';
import type { ScopeMode } from './TransitionForm';

interface Props {
  scopeMode: ScopeMode;
  onScopeModeChange: (mode: ScopeMode) => void;
  availableTingkat: number[];
  selectedTingkat: number[];
  onTingkatToggle: (tingkat: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const TransitionScope: React.FC<Props> = React.memo(({
  scopeMode,
  onScopeModeChange,
  availableTingkat,
  selectedTingkat,
  onTingkatToggle,
  onNext,
  onBack,
}) => {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      {/* Info Bar */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Alert className="bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800 rounded-xl p-5 border-dashed">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
              <Info size={20} />
            </div>
            <AlertDescription className="text-[12px] font-bold text-indigo-700 dark:text-indigo-400 leading-relaxed uppercase tracking-tight">
              Tentukan cakupan kenaikan kelas. Anda dapat memproses seluruh tingkat sekaligus (Default) atau memilih tingkat tertentu untuk transisi bertahap.
            </AlertDescription>
          </div>
        </Alert>
      </div>

      {/* Main Scope Selection Box */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Cakupan Kenaikan Kelas</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pilih mode cakupan tingkat yang akan diproses</p>
          </div>
        </div>

        {/* Radio option cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mode ALL */}
          <button
            type="button"
            onClick={() => onScopeModeChange('ALL')}
            className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${
              scopeMode === 'ALL'
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              scopeMode === 'ALL' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Globe size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Semua Tingkat (Default)</p>
                {scopeMode === 'ALL' && (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white rounded-md">Terpilih</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                Memproses kenaikan kelas &amp; kelulusan untuk seluruh tingkat aktif di sekolah secara serentak.
              </p>
            </div>
          </button>

          {/* Mode SELECTED */}
          <button
            type="button"
            onClick={() => onScopeModeChange('SELECTED')}
            className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all ${
              scopeMode === 'SELECTED'
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              scopeMode === 'SELECTED' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Filter size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Pilih Tingkat Spesifik</p>
                {scopeMode === 'SELECTED' && (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white rounded-md">Terpilih</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                Cocok untuk memproses transisi 1 angkatan saja atau pemrosesan transisi bertahap per tingkat.
              </p>
            </div>
          </button>
        </div>

        {/* Checkbox list (jika Mode SELECTED aktif) */}
        {scopeMode === 'SELECTED' && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label className="text-[10px] uppercase font-black text-indigo-500 tracking-widest block">
              Pilih Tingkat yang Akan Diproses <span className="text-rose-500">*</span>
            </Label>
            {availableTingkat.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Memuat tingkat kelas yang aktif...</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {availableTingkat?.map(t => {
                  const isChecked = selectedTingkat.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onTingkatToggle(t)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2.5 border transition-all ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-105'
                          : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                        isChecked ? 'bg-white text-indigo-600' : 'border border-slate-300 dark:border-slate-600'
                      }`}>
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      Tingkat {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12 gap-2 px-6 rounded-xl font-bold text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Persiapan
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="h-14 gap-3 font-black px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95"
        >
          Lanjut ke Pemetaan Kelas
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
});

export default TransitionScope;
