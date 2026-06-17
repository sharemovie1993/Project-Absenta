import React from 'react';
import { 
  ShieldAlert, 
  Phone, 
  Heart,
  TrendingUp,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { cn } from '../../../lib/utils';

interface HomeroomPulseWidgetProps {
  className?: string;
  classNameLabel?: string;
  absentStudents: any[];
  attendancePercentage: number;
  onAction?: () => void;
  onFollowUp?: (student: any) => void;
}

export const HomeroomPulseWidget: React.FC<HomeroomPulseWidgetProps> = ({
  className,
  classNameLabel = 'Kelas Anda',
  absentStudents,
  attendancePercentage,
  onAction,
  onFollowUp
}) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3", className)}>
      {/* Daily Command Hub / Alerts */}
      <CompactSectionCard title="Pusat Kendali Wali Kelas" icon={ShieldAlert} iconColor="rose">
        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 px-1">
          {classNameLabel}
        </div>
        {absentStudents.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 font-medium mb-2">Perlu tindak lanjut ({absentStudents.length}):</p>
            {absentStudents.slice(0, 3).map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-rose-50/50 dark:bg-rose-900/10 rounded-md border border-rose-100 dark:border-rose-900/30">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px] uppercase">{s.nama}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/20" 
                  onClick={() => onFollowUp?.(s)}
                >
                  <Phone size={12} />
                </Button>
              </div>
            ))}
            {absentStudents.length > 3 && (
              <button 
                onClick={onAction}
                className="w-full text-[9px] text-center text-rose-400 hover:text-rose-600 mt-1 font-bold uppercase tracking-tight"
              >
                +{absentStudents.length - 3} Siswa Lainnya
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Heart size={24} className="text-emerald-500 mb-1 fill-current" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Kelas Kondusif</span>
          </div>
        )}
      </CompactSectionCard>

      {/* Class Insight Chart/Metric */}
      <CompactSectionCard title="Performa Kehadiran" icon={Zap} iconColor="amber">
        <div className="flex items-center gap-4 py-1">
          <div className="flex-1">
            <h4 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
              {Math.round(attendancePercentage)}%
            </h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Rate Kehadiran</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center text-amber-600 shadow-sm border border-amber-100/50 dark:border-amber-900/30">
            <TrendingUp size={20} />
          </div>
        </div>
        
        <button 
          onClick={onAction}
          className="mt-4 w-full flex items-center justify-between group"
        >
          <span className="text-[10px] font-black text-gray-400 group-hover:text-amber-600 uppercase tracking-widest transition-colors">Lihat Detail Rekap</span>
          <ChevronRight size={14} className="text-gray-300 group-hover:text-amber-600 transition-colors" />
        </button>
      </CompactSectionCard>
    </div>
  );
};
