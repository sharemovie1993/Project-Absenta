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

export const PresensiLocationCard: React.FC<PresensiLocationCardProps> = ({ 
  mitraName, 
  distanceInfo, 
  location,
  onRefresh
}) => {
  const formatDistance = (meters: number | null) => {
    if (meters === null) return 'No Mitra GPS';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} KM`;
    }
    return `${Math.round(meters)} M`;
  };

  return (
    <div className="w-full px-8 py-5 flex flex-col items-center space-y-1">
      <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest">
        <MapIcon size={10} /> Lokasi Presensi
      </div>
      <h3 className="text-sm md:text-base font-black uppercase tracking-tight text-center text-slate-800 dark:text-white">
        {mitraName || 'Belum Ditempatkan'}
      </h3>
      
      <div className="h-px w-20 bg-slate-100 dark:bg-slate-800 my-2" />
      
      <div className="flex items-center gap-6">
        <div 
          className={`flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95 ${distanceInfo.inRange ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-500' : 'bg-rose-500/10 border-rose-500/50 text-rose-600 dark:text-rose-500'}`}
          onClick={onRefresh}
          title="Klik untuk memperbarui GPS"
        >
          <span className="text-[8px] font-black uppercase tracking-widest">Jarak:</span>
          <span className="text-[10px] font-black">
            {location ? (distanceInfo.inRange ? 'OK' : formatDistance(distanceInfo.distance)) : 'Mencari...'}
          </span>
          {location ? (
            <div className={`w-1.5 h-1.5 rounded-full ${distanceInfo.inRange ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 animate-pulse'}`} />
          ) : (
            <RefreshCw size={10} className="animate-spin text-slate-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Skema:</span>
          <span className="text-[10px] font-black text-slate-700 dark:text-white uppercase">PKL INDUSTRI</span>
        </div>
      </div>
    </div>
  );
};
