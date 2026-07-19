import React from 'react';
import { Gauge, Zap } from 'lucide-react';
import type { LighthouseResult } from '../infra.types';
import { RadialProgress } from './RadialProgress';

interface LighthousePanelProps {
  lhResult: LighthouseResult | null;
  isLhAuditing: boolean;
  lhError: string | null;
  onRunLighthouse: () => void;
}

export const LighthousePanel: React.FC<LighthousePanelProps> = ({
  lhResult,
  isLhAuditing,
  lhError,
  onRunLighthouse,
}) => {
  return (
    <div className="flex flex-col flex-1">
      {/* Trigger Button */}
      <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-950/50 flex flex-col gap-2">
        <button
          type="button"
          onClick={onRunLighthouse}
          disabled={isLhAuditing}
          className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-[0.98] disabled:opacity-50"
        >
          {isLhAuditing ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sedang Menganalisis Lighthouse... (Butuh ~15 detik)
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4" /> Jalankan Analisis Kinerja Lighthouse
            </span>
          )}
        </button>
        {lhError && (
          <p className="text-[10px] text-rose-400 font-bold font-sans">⚠️ {lhError}</p>
        )}
      </div>

      {/* Lighthouse Results Content */}
      {lhResult ? (
        <div className="flex-1">
          {/* 4 Radial Scores */}
          <div className="p-5 bg-slate-950/20 border-b border-slate-900/60">
            <div className="flex justify-between items-center gap-2">
              <RadialProgress score={lhResult.performance} label="Performa" />
              <RadialProgress score={lhResult.accessibility} label="Aksesbilitas" />
              <RadialProgress score={lhResult.bestPractices} label="Praktik Baik" />
              <RadialProgress score={lhResult.seo} label="SEO" />
            </div>
          </div>

          {/* Core Web Vitals Metrics */}
          <div className="px-5 py-4 border-b border-slate-900/60 bg-slate-900/10">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans mb-3">
              ⏱️ Metrik Inti Browser (Core Web Vitals):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/40 border border-slate-900/85 p-2.5 rounded-xl space-y-1">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">LCP (Paint)</span>
                <span className="text-xs font-black text-white block font-mono">{lhResult.metrics.lcp}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-900/85 p-2.5 rounded-xl space-y-1">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">CLS (Shift)</span>
                <span className="text-xs font-black text-white block font-mono">{lhResult.metrics.cls}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-900/85 p-2.5 rounded-xl space-y-1">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">TBT (Blocking)</span>
                <span className="text-xs font-black text-white block font-mono">{lhResult.metrics.tbt}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-900/85 p-2.5 rounded-xl space-y-1">
                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block">Speed Index</span>
                <span className="text-xs font-black text-white block font-mono">{lhResult.metrics.speedIndex}</span>
              </div>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="p-5 space-y-3">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans">
              📋 Saran Perbaikan Diagnostik ({lhResult.suggestions.length} Temuan):
            </div>
            
            {lhResult.suggestions.length === 0 ? (
              <div className="p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/10 text-center text-xs font-semibold text-emerald-400 font-sans">
                🎉 Sempurna! Tidak ada masalah penting yang terdeteksi oleh Lighthouse.
              </div>
            ) : (
              <div className="space-y-2">
                {lhResult.suggestions.map((sug, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-900 bg-slate-900/10 space-y-1 hover:border-slate-800 transition-all text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex text-[7.5px] font-black px-1.5 py-0.5 rounded bg-indigo-950/50 text-indigo-400 border border-indigo-900/40 uppercase tracking-wider">
                        {sug.category}
                      </span>
                      {sug.displayValue && (
                        <span className="text-[8.5px] font-mono font-bold text-rose-400">{sug.displayValue}</span>
                      )}
                    </div>
                    <h4 className="text-[11px] font-bold text-slate-200">{sug.title}</h4>
                    <p className="text-[9.5px] text-slate-400 font-medium font-sans leading-relaxed">{sug.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="p-4 rounded-full bg-slate-900/40 border border-slate-800 text-slate-500">
            <Zap className="h-6 w-6 animate-pulse text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-300">Belum Ada Laporan Lighthouse</h4>
            <p className="text-[10px] text-slate-500 max-w-xs font-medium font-sans leading-relaxed">
              Klik tombol di atas untuk menjalankan audit kecepatan, aksesibilitas, dan SEO langsung dari browser Chrome headless.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
