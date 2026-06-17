import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarDays, 
  Clock, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle,
  Play, 
  ChevronRight,
  BookOpen,
  Users,
  Loader2
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { cn } from '../../../lib/utils';
import { getVirtualDate } from '../../../utils/attendance/time';

interface TimelineItem {
  id: string;
  jam_mulai: string;
  jam_selesai: string;
  kelas_nama: string;
  kegiatan: string;
  isLive: boolean;
  isFinished: boolean;
  session: any | null;
  isGuruHadir: boolean;
  teacherStatus: string;
  myAbsenRecord: any;
  isAdHoc: boolean;
}

interface StaffScheduleWidgetProps {
  className?: string;
  timelineItems: TimelineItem[];
  isLoading?: boolean;
  processingId?: string | null;
  onAction?: (item: TimelineItem) => void;
  onOpenJournal?: (sesiId: string, initialData?: any) => void;
}

export const StaffScheduleWidget: React.FC<StaffScheduleWidgetProps> = ({
  className,
  timelineItems,
  isLoading,
  processingId,
  onAction,
  onOpenJournal
}) => {
  const activeSession = useMemo(() => timelineItems.find(item => item.isLive), [timelineItems]);
  const isProcessing = (id: string) => processingId === id;

  const formattedDate = useMemo(() => {
    const today = getVirtualDate();
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(today);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm p-4 animate-pulse h-[200px] flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2 animate-spin" />
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sinkronisasi Jadwal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm p-4 space-y-4",
      className
    )}>
      {/* Header Inside Card (Consistent with QuickActionGrid) */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-50 dark:border-slate-700/50 px-1">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-indigo-600 dark:text-indigo-400" />
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Sesi Pengajaran Hari Ini</h3>
            <span className="hidden sm:inline-block text-[10px] font-bold text-gray-400 dark:text-gray-500 border-l border-gray-200 dark:border-slate-700 pl-2">
              {formattedDate}
            </span>
          </div>
        </div>
        {timelineItems.length > 0 && (
          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full border border-indigo-100/50 dark:border-indigo-950/20 uppercase tracking-tight">
            {timelineItems.length} Sesi
          </span>
        )}
      </div>

      {/* Active Spotlight (If any) */}
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => !isProcessing(activeSession.id) && onAction?.(activeSession)}
          className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl p-4 text-white shadow-md relative overflow-hidden cursor-pointer group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Play size={60} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-100 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-80 mr-auto">Sesi Berlangsung</span>

              {/* Live Attendance Status */}
              {activeSession.teacherStatus === 'TEPAT_WAKTU' && (
                <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-400/30 uppercase tracking-tighter">
                  <CheckCircle2 size={10} /> Tepat Waktu
                </span>
              )}
              {activeSession.teacherStatus === 'TERLAMBAT' && (
                <span className="text-[8px] font-black bg-amber-500/20 text-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-400/30 uppercase tracking-tighter">
                  <Clock size={10} /> Terlambat
                </span>
              )}
            </div>
            
            <h3 className="text-sm font-black mb-1 leading-tight">{activeSession.kegiatan}</h3>
            <div className="flex items-center gap-3 text-[11px] opacity-90 mb-3 font-semibold">
              <span className="flex items-center gap-1"><Users size={12} /> {activeSession.kelas_nama}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {activeSession.jam_mulai} - {activeSession.jam_selesai}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="white" 
                className="text-[9px] font-black uppercase h-7 px-3 text-blue-700 bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(activeSession);
                }}
              >
                Dashboard Sesi
              </Button>
              {activeSession.isGuruHadir && onOpenJournal && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-[9px] font-black uppercase h-7 px-3 text-white hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenJournal(activeSession.session?.id, activeSession.session);
                  }}
                >
                  Jurnal KBM
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Timeline List */}
      <div className="space-y-2">
        {timelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center text-gray-400">
              <BookOpen size={18} />
            </div>
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">
              Belum ada sesi pengajaran
            </p>
            <p className="text-[8px] text-gray-400 text-center">Jadwal mengajar Anda hari ini kosong.</p>
          </div>
        ) : (
          timelineItems
            .filter(item => !item.isLive) // Sembunyikan sesi yang sedang berlangsung agar tidak redundan dengan Spotlight
            .map((item, idx) => (
              <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => !isProcessing(item.id) && onAction?.(item)}
              className={cn(
                "group relative bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700/50 shadow-sm transition-all hover:shadow-md cursor-pointer",
                item.isLive && "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900",
                item.isFinished && "opacity-75 grayscale-[0.5]"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Time Segment */}
                <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-gray-50 dark:border-slate-700/50 pr-3">
                  <span className="text-[10px] font-bold text-gray-900 dark:text-white leading-none">{item.jam_mulai}</span>
                  <div className="w-0.5 h-3 bg-gray-100 dark:bg-slate-700 my-0.5" />
                  <span className="text-[9px] font-medium text-gray-400">{item.jam_selesai}</span>
                </div>

                {/* Info Segment */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h5 className="text-[11px] font-bold text-gray-800 dark:text-white truncate">{item.kegiatan}</h5>
                    
                    {/* Teacher Attendance Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isProcessing(item.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <>
                          {item.teacherStatus === 'TEPAT_WAKTU' && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-500/20 uppercase tracking-tighter">
                              <CheckCircle2 size={10} /> Tepat Waktu
                            </div>
                          )}
                          {item.teacherStatus === 'TERLAMBAT' && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-500/20 uppercase tracking-tighter">
                              <Clock size={10} /> Terlambat
                            </div>
                          )}
                          {item.teacherStatus === 'ALPA' && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-100 dark:border-rose-500/20 uppercase tracking-tighter">
                              <AlertCircle size={10} /> Alpa
                            </div>
                          )}
                          {item.isAdHoc && (
                            <Badge variant="outline" className="text-[8px] h-4 border-amber-200 text-amber-600 dark:border-amber-900/50 bg-amber-50/50">Manual</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Users size={12} /> {item.kelas_nama}</span>
                    {item.isFinished ? (
                       <span className={cn(
                         "flex items-center gap-1 font-bold",
                         item.session?.is_auto_closed ? "text-blue-500 dark:text-blue-400" : "text-emerald-500"
                       )}>
                         <CheckCircle size={12} /> 
                         Selesai by {item.session?.is_auto_closed ? 'Sistem' : 'Petugas'}
                       </span>
                    ) : item.isLive ? (
                      <span className="flex items-center gap-1 text-blue-600 font-bold animate-pulse">Berlangsung</span>
                    ) : (
                      <span className="text-gray-400">Belum Mulai</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

