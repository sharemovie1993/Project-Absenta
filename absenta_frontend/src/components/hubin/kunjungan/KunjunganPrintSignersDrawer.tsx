import React from 'react';
import { SlidersHorizontal, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface KunjunganPrintSignersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeKota: string;
  setActiveKota: (v: string) => void;
  activeTanggal: string;
  setActiveTanggal: (v: string) => void;
  activeMitraNama: string;
  setActiveMitraNama: (v: string) => void;
  activePembimbingNama: string;
  setActivePembimbingNama: (v: string) => void;
  activeHubinNama: string;
  setActiveHubinNama: (v: string) => void;
  activeHubinNip: string;
  setActiveHubinNip: (v: string) => void;
  onReset: () => void;
}

export const KunjunganPrintSignersDrawer: React.FC<KunjunganPrintSignersDrawerProps> = React.memo(({
  isOpen,
  onClose,
  activeKota,
  setActiveKota,
  activeTanggal,
  setActiveTanggal,
  activeMitraNama,
  setActiveMitraNama,
  activePembimbingNama,
  setActivePembimbingNama,
  activeHubinNama,
  setActiveHubinNama,
  activeHubinNip,
  setActiveHubinNip,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 shrink-0 animate-in fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-indigo-600" /> Kustomisasi Penandatangan
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-2.5 text-xs">
        <div>
          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Titimangsa (Kota &amp; Tgl)</label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              value={activeKota}
              onChange={(e) => setActiveKota(e.target.value)}
              className="p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
              placeholder="Kota"
            />
            <input
              type="text"
              value={activeTanggal}
              onChange={(e) => setActiveTanggal(e.target.value)}
              className="p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
              placeholder="Tanggal"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Pembimbing Industri (DU/DI)</label>
          <input
            type="text"
            value={activeMitraNama}
            onChange={(e) => setActiveMitraNama(e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Guru Pembimbing PKL</label>
          <input
            type="text"
            value={activePembimbingNama}
            onChange={(e) => setActivePembimbingNama(e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-0.5">Waka Hubin / Pengesah</label>
          <input
            type="text"
            value={activeHubinNama}
            onChange={(e) => setActiveHubinNama(e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
          />
          <input
            type="text"
            value={activeHubinNip}
            onChange={(e) => setActiveHubinNip(e.target.value)}
            placeholder="NIP"
            className="w-full p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 mt-1"
          />
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onReset}
          className="w-full text-xs font-bold rounded-xl mt-2 gap-1.5 text-slate-600 dark:text-slate-300"
        >
          <RotateCcw size={13} />
          Reset Struktur Otomatis
        </Button>
      </div>
    </div>
  );
});

KunjunganPrintSignersDrawer.displayName = 'KunjunganPrintSignersDrawer';
