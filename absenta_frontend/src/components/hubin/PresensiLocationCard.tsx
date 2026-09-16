import React from 'react';
import { Map as MapIcon, RefreshCw } from 'lucide-react';

interface PresensiLocationCardProps {
  mitraName: string;
  distanceInfo: {
    distance: number | null;
    inRange: boolean;
    radius?: number;
  };
  location: { lat: number; lng: number } | null;
  onRefresh?: () => void;
}
const formatDistance = (meters: number | null) => {
  if (meters === null) return 'No Mitra GPS';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} KM`;
  }
  return `${Math.round(meters)} M`;
};

export const PresensiLocationCard: React.FC<PresensiLocationCardProps> = React.memo(({ 
  mitraName, 
  distanceInfo, 
  location,
  onRefresh
}) => {
  return (
    <div className="w-full px-4 py-3 flex flex-col items-center space-y-1">
      <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest">
        <MapIcon size={11} className="text-indigo-500" />
        <span>Lokasi Presensi</span>
      </div>
      <h3 className="text-sm font-black uppercase tracking-tight text-center text-slate-800 dark:text-white">
        {mitraName || 'Belum Ditempatkan'}
      </h3>
      
      <div className="flex items-center gap-3 sm:gap-4 pt-1">
        <div 
          role="button"
          tabIndex={0}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95 ${distanceInfo.inRange ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400'}`}
          onClick={onRefresh}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRefresh?.();
            }
          }}
          title="Klik untuk memperbarui GPS"
        >
          <span className="text-[8px] font-black uppercase tracking-wider">Jarak:</span>
          <span className="text-[9px] font-black">
            {location ? (distanceInfo.inRange ? 'OK' : formatDistance(distanceInfo.distance)) : 'Mencari...'}
          </span>
          {location ? (
            <div className={`w-1.5 h-1.5 rounded-full ${distanceInfo.inRange ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
          ) : (
            <RefreshCw size={9} className="animate-spin text-slate-500" />
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-slate-400">
          <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400">Skema:</span>
          <span className="uppercase">PKL INDUSTRI</span>
        </div>
      </div>
    </div>
  );
});
