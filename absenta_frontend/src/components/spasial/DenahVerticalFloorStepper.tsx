import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import type { DenahSpasial } from '../../types/spasial.types';

interface DenahVerticalFloorStepperProps {
  currentLantai: number;
  currentDenahId: string;
  currentGedung?: string | null;
  denahList?: DenahSpasial[];
  onSelectDenah?: (denah: DenahSpasial) => void;
  isLightMode?: boolean;
}

export const DenahVerticalFloorStepper: React.FC<DenahVerticalFloorStepperProps> = React.memo(({
  currentLantai = 1,
  currentDenahId,
  currentGedung,
  denahList = [],
  onSelectDenah,
  isLightMode = false,
}) => {
  // Susun daftar denah unik berdasarkan Lantai (diurutkan DESC: Lantai tertinggi di atas, Lantai dasar di bawah)
  const sortedFloors = useMemo(() => {
    if (!denahList || denahList.length <= 1) return [];

    const mapByLantai = new Map<number, DenahSpasial>();
    denahList.forEach((d) => {
      if (!mapByLantai.has(d.lantai)) {
        mapByLantai.set(d.lantai, d);
      } else if (d.gedung && currentGedung && d.gedung === currentGedung) {
        mapByLantai.set(d.lantai, d);
      }
    });

    return Array.from(mapByLantai.values()).sort((a, b) => b.lantai - a.lantai);
  }, [denahList, currentGedung]);

  // Jika sekolah hanya memiliki 1 denah/lantai, tampilkan badge ringkas penunjuk lantai
  if (sortedFloors.length <= 1) {
    return (
      <div className="absolute right-3 top-16 sm:top-20 z-30 select-none pointer-events-auto">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border shadow-lg backdrop-blur-md text-[11px] font-black ${
            isLightMode
              ? 'bg-white/95 border-slate-200/90 text-slate-800'
              : 'bg-slate-900/90 border-slate-700/70 text-white'
          }`}
          title={`Anda sedang melihat denah Lantai ${currentLantai}`}
        >
          <Layers className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span>Lt {currentLantai}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-3 top-16 sm:top-20 z-30 select-none pointer-events-auto animate-in fade-in duration-200">
      <div
        className={`flex flex-col items-center p-1 rounded-2xl border shadow-xl backdrop-blur-md ${
          isLightMode
            ? 'bg-white/95 border-slate-200/90 text-slate-800'
            : 'bg-slate-900/95 border-slate-700/80 text-white'
        }`}
      >
        {/* Header Label Stepper */}
        <div className="text-[9px] font-black uppercase text-slate-400 py-0.5 px-1 tracking-wider text-center">
          Lt
        </div>

        {/* Daftar Tombol Lantai (Urutan Vertikal: Lantai 3 -> 2 -> 1) */}
        <div className="flex flex-col items-center gap-1">
          {sortedFloors.map((floor) => {
            const isActive = floor.id === currentDenahId || floor.lantai === currentLantai;
            const floorLabel = floor.lantai > 0 ? `${floor.lantai}F` : floor.lantai === 0 ? 'GF' : `B${Math.abs(floor.lantai)}`;

            return (
              <button
                key={floor.id}
                type="button"
                onClick={() => onSelectDenah?.(floor)}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/40 scale-105 border border-white/30'
                    : isLightMode
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={`Pindah ke Denah ${floor.nama_denah} (Lantai ${floor.lantai})`}
              >
                {floorLabel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

DenahVerticalFloorStepper.displayName = 'DenahVerticalFloorStepper';
