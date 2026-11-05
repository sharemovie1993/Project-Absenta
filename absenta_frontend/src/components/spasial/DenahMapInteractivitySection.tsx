import React from 'react';
import {
  Lock,
  Unlock,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { DenahMapGuideConfig } from '../../types/spasial.types';

interface DenahMapInteractivitySectionProps {
  config: DenahMapGuideConfig;
  onUpdateConfig: (updated: Partial<DenahMapGuideConfig>) => void;
}

export const DenahMapInteractivitySection: React.FC<DenahMapInteractivitySectionProps> = ({
  config,
  onUpdateConfig,
}) => {
  // Micro pan steps
  const handleMicroPan = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const step = 0.0003;
    let newLat = config.lat;
    let newLng = config.lng;

    if (dir === 'UP') newLat += step;
    if (dir === 'DOWN') newLat -= step;
    if (dir === 'LEFT') newLng -= step;
    if (dir === 'RIGHT') newLng += step;

    onUpdateConfig({
      lat: Number(newLat.toFixed(6)),
      lng: Number(newLng.toFixed(6)),
    });
  };

  return (
    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/70">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
          Interaksi Peta:
        </span>
        <button
          type="button"
          onClick={() => {
            const newLocked = !config.is_locked;
            onUpdateConfig({ is_locked: newLocked });
            if (newLocked) {
              toast.success('Peta dikunci. Sekarang Anda bebas menggeser kotak ruangan!');
            } else {
              toast('Peta dibuka kunci. Silakan geser / zoom peta untuk menyelaraskan bangunan.', {
                icon: '🔓',
              });
            }
          }}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
            config.is_locked
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {config.is_locked ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Terkunci (Susun Ruang)</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>Buka Kunci (Geser Peta)</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
        {config.is_locked
          ? '✅ Posisi peta terkunci tetap. Geser kotak ruangan di atas foto atap gedung sekolah.'
          : '⚠️ Peta aktif. Geser / perbesar peta sampai letak gedung sekolah pas di canvas.'}
      </p>

      {/* Fine Tuning Micro Pan & Zoom */}
      {!config.is_locked && (
        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <Move className="w-3 h-3" />
            <span>Geser Halus:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleMicroPan('LEFT')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Geser Kiri"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMicroPan('UP')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Geser Atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMicroPan('DOWN')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Geser Bawah"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMicroPan('RIGHT')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Geser Kanan"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={() => onUpdateConfig({ zoom: Math.max(12, config.zoom - 1) })}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Perkecil Peta"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ zoom: Math.min(20, config.zoom + 1) })}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Perbesar Peta"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
