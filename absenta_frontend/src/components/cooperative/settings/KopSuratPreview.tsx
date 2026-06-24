import React, { useMemo } from 'react';
import { FileText, CheckCircle } from 'lucide-react';
import { SectionCard } from '../../ui';

interface KopSuratPreviewProps {
  cooperativeName: string;
  cooperativeLegalNo: string;
  effectiveLogoUrl: string;
}

export const KopSuratPreview = React.memo<KopSuratPreviewProps>(({
  cooperativeName,
  cooperativeLegalNo,
  effectiveLogoUrl
}) => {
  const currentDateStr = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  return (
    <SectionCard className="p-6 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md flex flex-col justify-between min-h-[350px] animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-sky-50 dark:bg-sky-955/50 text-sky-600 dark:text-sky-400 rounded-xl">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Pratinjau Kop Laporan</h3>
            <p className="text-xs text-slate-400">Live preview tampilan Kop saat mengekspor data ke Excel</p>
          </div>
        </div>

        {/* Excel Preview Container */}
        <div className="p-5 border border-slate-200/60 dark:border-slate-800/80 rounded-xl bg-slate-50 dark:bg-slate-950/50 font-mono text-[11px] space-y-3 shadow-inner">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800/60 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Excel Sheet View</span>
            <span>Row 1 - 4</span>
          </div>
          
          <div className="flex gap-4 items-start border-b border-dashed border-slate-200 dark:border-slate-800/60 pb-3">
            <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 dark:border-slate-850 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-sm">
              <img 
                src={effectiveLogoUrl} 
                alt="Logo Preview" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex gap-2">
                <span className="w-5 text-slate-400 select-none text-[9px]">R1:</span>
                <span className="text-indigo-650 dark:text-indigo-455 font-black uppercase truncate text-[11px] block">
                  {cooperativeName.trim() || 'KOPERASI SEKOLAH ABSENTA'}
                </span>
              </div>

              <div className="flex gap-2">
                <span className="w-5 text-slate-400 select-none text-[9px]">R2:</span>
                <span className="text-slate-600 dark:text-slate-350 font-bold truncate text-[9px] block">
                  {cooperativeLegalNo.trim() ? `Badan Hukum: ${cooperativeLegalNo.trim()}` : '(Nomor Badan Hukum Belum Diisi)'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex gap-2">
              <span className="w-5 text-slate-400 select-none text-[9px]">R3:</span>
              <span className="text-slate-655 dark:text-slate-455 font-semibold truncate text-[9px]">
                LAPORAN REKAPITULASI DATA KEANGGOTAAN & TABUNGAN
              </span>
            </div>

            <div className="flex gap-2">
              <span className="w-5 text-slate-400 select-none text-[9px]">R4:</span>
              <span className="text-slate-400 italic truncate text-[9px]">
                Dicetak Pada: {currentDateStr}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-505 shrink-0" />
        <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400 font-medium">
          Pembaruan profil koperasi disimpan secara <strong>real-time</strong> di database. Ketika diubah, seluruh file Excel/PDF yang diunduh otomatis menggunakan data terbaru ini.
        </p>
      </div>
    </SectionCard>
  );
});

KopSuratPreview.displayName = 'KopSuratPreview';
