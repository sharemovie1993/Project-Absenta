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
  RotateCw,
  RotateCcw,
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

  const handleZoomStep = (delta: number) => {
    const nextZoom = Math.min(23.5, Math.max(14, Number((config.zoom + delta).toFixed(1))));
    onUpdateConfig({ zoom: nextZoom });
  };

  const rotation = config.rotation || 0;

  const handleRotateStep = (delta: number) => {
    let nextRot = Math.round((rotation + delta) * 10) / 10;
    if (nextRot > 180) nextRot -= 360;
    if (nextRot < -180) nextRot += 360;
    onUpdateConfig({ rotation: nextRot });
  };

  return (
    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/70 space-y-2.5">
      <div className="flex items-center justify-between">
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
          : '⚠️ Peta aktif. Geser peta atau atur zoom di bawah hingga ukuran gedung pas dengan canvas.'}
      </p>

      {/* Zoom Controls & Slider when Unlocked */}
      {!config.is_locked && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Zoom Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Skala Zoom Peta
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-xs">
                  {config.zoom.toFixed(1)}x
                </span>
                <span className="text-[10px] text-slate-400">(Scroll mouse juga bisa)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleZoomStep(-0.2)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Perkecil Zoom (-0.2)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="15"
                max="23.5"
                step="0.1"
                value={config.zoom}
                onChange={(e) => onUpdateConfig({ zoom: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <button
                type="button"
                onClick={() => handleZoomStep(0.2)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Perbesar Zoom (+0.2)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Zoom Presets up to Super Detail */}
          <div className="grid grid-cols-5 gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => onUpdateConfig({ zoom: 17.5 })}
              className={`py-1 rounded border font-semibold cursor-pointer truncate ${
                config.zoom === 17.5
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="Skala Kawasan & Kompleks Sekolah"
            >
              17.5x
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ zoom: 19.0 })}
              className={`py-1 rounded border font-semibold cursor-pointer truncate ${
                config.zoom === 19.0
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="Skala Blok Gedung"
            >
              19.0x
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ zoom: 20.5 })}
              className={`py-1 rounded border font-semibold cursor-pointer truncate ${
                config.zoom === 20.5
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="Skala Atap Ruang Kelas"
            >
              20.5x
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ zoom: 22.0 })}
              className={`py-1 rounded border font-semibold cursor-pointer truncate ${
                config.zoom === 22.0
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="Skala Detail Sekat Ruang"
            >
              22.0x
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ zoom: 23.0 })}
              className={`py-1 rounded border font-semibold cursor-pointer truncate ${
                config.zoom === 23.0
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="Skala Ultra Maksimal"
            >
              23.0x 🔥
            </button>
          </div>

          {/* Map Rotation / Angle Alignment */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-blue-500" />
                <span>Putar Sudut Gedung</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-xs">
                  {rotation > 0 ? `+${rotation}°` : `${rotation}°`}
                </span>
                {rotation !== 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ rotation: 0 })}
                    className="text-[10px] px-1 py-0.2 text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset 0°
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRotateStep(-5)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer text-[10px] font-bold"
                title="Putar Kiri (-5°)"
              >
                -5°
              </button>
              <button
                type="button"
                onClick={() => handleRotateStep(-1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer text-[10px]"
                title="Putar Kiri Halus (-1°)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={rotation}
                onChange={(e) => onUpdateConfig({ rotation: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <button
                type="button"
                onClick={() => handleRotateStep(1)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer text-[10px]"
                title="Putar Kanan Halus (+1°)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRotateStep(5)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer text-[10px] font-bold"
                title="Putar Kanan (+5°)"
              >
                +5°
              </button>
            </div>

            {/* Quick Angle Presets */}
            <div className="grid grid-cols-5 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => onUpdateConfig({ rotation: -45 })}
                className="py-0.5 rounded border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                -45°
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ rotation: -15 })}
                className="py-0.5 rounded border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                -15°
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ rotation: 0 })}
                className="py-0.5 rounded border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
              >
                0° Tegak
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ rotation: 15 })}
                className="py-0.5 rounded border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                +15°
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ rotation: 45 })}
                className="py-0.5 rounded border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                +45°
              </button>
            </div>
          </div>

          {/* Fine Tuning Micro Pan */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
