import React from 'react';
import { Camera } from 'lucide-react';
import { Button } from '../ui';
import { format, parseISO, isValid } from 'date-fns';

import { HUBIN_CONFIG } from '../../constants/HubinConstants';

interface PresensiActionColumnProps {
  type: 'IN' | 'OUT';
  label: string;
  scheduleTime: string;
  actualTime?: string;
  isChecked: boolean;
  onAction: () => void;
  isDisabled: boolean;
  isLoading: boolean;
}

export const PresensiActionColumn: React.FC<PresensiActionColumnProps> = React.memo(({
  type,
  label,
  scheduleTime,
  actualTime,
  isChecked,
  onAction,
  isDisabled,
  isLoading
}) => {
  const isIN = type === 'IN';

  // Format actualTime if it's an ISO string
  const displayTime = React.useMemo(() => {
    if (!actualTime) return '--:--:--';
    
    // Check if it's already in HH:mm:ss format
    if (/^\d{2}:\d{2}:\d{2}$/.test(actualTime)) return actualTime;
    
    // Try to parse as ISO
    try {
      const date = parseISO(actualTime);
      if (isValid(date)) {
        return format(date, 'HH:mm:ss');
      }
    } catch (e) {
      // Ignore error
    }
    
    return actualTime;
  }, [actualTime]);
  
  return (
    <div className="flex flex-col items-center py-4 sm:py-6 px-2.5 sm:px-4 space-y-2 sm:space-y-3">
      <div className="flex flex-col items-center space-y-0.5">
        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-600">Jadwal: {scheduleTime}</span>
      </div>
      
      {isChecked ? (
        <div className="flex flex-col items-center space-y-1">
          <div className={`${isIN ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 shadow-xs' : 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 shadow-xs'} px-3.5 py-1.5 rounded-xl border text-base sm:text-lg font-black font-mono tracking-wider`}>
            {displayTime}
          </div>
          <span className={`text-[8px] font-black uppercase tracking-wider ${isIN ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
            BERHASIL
          </span>
        </div>
      ) : (
        <Button
          onClick={onAction}
          disabled={isDisabled || isLoading}
          isLoading={isLoading}
          className={`w-full h-11 sm:h-12 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all duration-300 ${
            !isDisabled 
              ? (isIN 
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-500/20') 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed grayscale'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <div className={`p-1 rounded-md ${!isDisabled ? 'bg-white/10' : 'bg-slate-200 dark:bg-slate-700'}`}>
              <Camera size={14} className={!isDisabled ? 'text-white' : 'text-slate-400'} />
            </div>
            <span>{isIN ? 'Check-In Masuk' : 'Check-Out Pulang'}</span>
          </div>
        </Button>
      )}
    </div>
  );
});
