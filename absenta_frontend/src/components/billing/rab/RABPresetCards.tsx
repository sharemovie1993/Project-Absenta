import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface RABPresetCardsProps {
  onApplyPreset: (presetType: 'mandiri' | 'maju' | 'enterprise') => void;
}

export const RABPresetCards: React.FC<RABPresetCardsProps> = React.memo(({ onApplyPreset }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Paket 1: Mandiri Hemat */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-blue-500/50 transition">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
              Hemat & Praktis
            </span>
          </div>
          <h4 className="font-black text-slate-900 dark:text-white text-base">Paket Mandiri Cloud</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Presensi mobile guru & siswa via aplikasi smartphone Android/iOS. Tanpa mesin fisik.
          </p>
          <ul className="text-xs space-y-1.5 pt-2 text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Presensi GPS & Face Recognisi HP</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> WhatsApp Notifikasi Real-time</li>
          </ul>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApplyPreset('mandiri')}
          className="mt-4 w-full text-xs font-bold rounded-xl"
        >
          Pilih Paket Mandiri
        </Button>
      </div>

      {/* Paket 2: Sekolah Maju */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-blue-500 shadow-md flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
          Paling Populer
        </div>
        <div className="space-y-2">
          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block">
            Hybrid Presensi Gerbang
          </span>
          <h4 className="font-black text-slate-900 dark:text-white text-base">Paket Sekolah Maju</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mesin Face Recognition di gerbang sekolah + server lokal + integrasi WhatsApp ke wali murid.
          </p>
          <ul className="text-xs space-y-1.5 pt-2 text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> 1-2 Unit Face Terminal Gerbang</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Server Node Mini PC Lokal</li>
          </ul>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onApplyPreset('maju')}
          className="mt-4 w-full text-xs font-bold rounded-xl shadow-md"
        >
          Pilih Sekolah Maju
        </Button>
      </div>

      {/* Paket 3: Enterprise */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-purple-500/50 transition">
        <div className="space-y-2">
          <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block">
            Skala Besar & Full CBT
          </span>
          <h4 className="font-black text-slate-900 dark:text-white text-base">Paket Enterprise Campus</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Kapasitas ribuan siswa dengan Server Dell PowerEdge dedicated, multi-gate Face Terminal, dan modul CBT Ujian offline.
          </p>
          <ul className="text-xs space-y-1.5 pt-2 text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Server Dell PowerEdge R730/T150</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> 4x Face Terminal Multi-Lane</li>
          </ul>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApplyPreset('enterprise')}
          className="mt-4 w-full text-xs font-bold rounded-xl"
        >
          Pilih Enterprise
        </Button>
      </div>
    </div>
  );
});
