import React from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import { Clock, Users, BookOpen, AlertCircle, ChevronRight } from 'lucide-react';

interface KbmSessionCardProps {
  session: any;
  viewMode: 'LIST' | 'GRID';
  onSelectSession: (session: any) => void;
  formatTime: (iso?: string) => string;
}

export const KbmSessionCard = React.memo<KbmSessionCardProps>(({
  session: sesi,
  viewMode,
  onSelectSession,
  formatTime
}) => {
  // Support both normalized KbmItem shape and legacy raw properties
  const isLive        = sesi.status?.isLive        ?? sesi.isLive        ?? false;
  const isFinished    = sesi.status?.isFinished    ?? sesi.isFinished    ?? false;
  const isOverdue     = sesi.status?.isOverdue     ?? sesi.isOverdue     ?? false;
  const isUpcoming    = sesi.status?.isUpcoming    ?? sesi.isUpcoming    ?? (!isLive && !isFinished && !isOverdue);
  const teacherStatus = sesi.status?.teacherStatus ?? sesi._summary?.teacherStatus ?? 'BELUM_TAP';

  const kelasNama = sesi.kelas_nama || sesi.Kelas?.nama_kelas || '-';
  const mapelNama = sesi.mapel_nama || sesi.Mapel?.nama_mapel || sesi.kegiatan || sesi.jenis_kegiatan || '-';
  const guruNama  = sesi.guru_nama  || sesi.Guru?.nama_guru  || '-';

  const hadirVal = sesi.summary?.hadir ?? sesi._summary?.hadir ?? 0;
  const totalVal = sesi.summary?.total ?? sesi._summary?.total ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={() => onSelectSession(sesi)}
      className="cursor-pointer"
    >
      <Card 
        noPadding
        className={cn(
          "group relative transition-all duration-200 hover:shadow-md border border-gray-100 dark:border-gray-700 rounded-sm overflow-hidden",
          viewMode === 'GRID' ? "p-3" : "p-0",
          isLive ? 'bg-emerald-50/10 border-emerald-200 ring-1 ring-emerald-100/50' : 
          isFinished ? 'opacity-70 bg-gray-50/30' : 'bg-white dark:bg-gray-800'
        )}
      >
        <div className={cn(
          viewMode === 'GRID' 
            ? "flex flex-col items-stretch" 
            : "flex flex-col md:grid md:grid-cols-[80px_1fr_200px_130px_160px_40px] md:items-center gap-2 md:gap-0"
        )}>
          {/* 1. Header Section (Adaptive) */}
          <div className={cn(
            "flex shrink-0 transition-all",
            viewMode === 'GRID' 
              ? "w-full h-8 flex-row items-center justify-between px-2 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800" 
              : "h-full flex-col items-center justify-center py-2 md:py-3 border-r border-gray-50 dark:border-gray-700/50",
            viewMode === 'LIST' && (isLive ? 'bg-emerald-500 text-white' : 
            isFinished ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 
            isOverdue ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' :
            'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600')
          )}>
            <div className={cn("flex items-center gap-1", viewMode === 'GRID' ? "" : "flex-col")}>
              <Clock size={12} className={viewMode === 'GRID' ? "text-indigo-500" : ""} />
              <div className={cn("flex items-center gap-0.5", viewMode === 'LIST' ? "flex-col" : "flex-row")}>
                <span className={cn("font-black tracking-tighter", viewMode === 'GRID' ? "text-[10px] text-gray-700 dark:text-gray-300" : "text-[9px]")}>
                  {formatTime(sesi.waktu_mulai)}
                </span>
                {sesi.waktu_selesai && (
                  <>
                    <span className={cn("font-bold opacity-60", viewMode === 'GRID' ? "text-[9px] text-gray-500" : "text-[8px]")}>
                      {viewMode === 'LIST' ? '–' : ' – '}
                    </span>
                    <span className={cn("font-black tracking-tighter", viewMode === 'GRID' ? "text-[10px] text-gray-700 dark:text-gray-300" : "text-[9px]")}>
                      {formatTime(sesi.waktu_selesai)}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Teacher Status Dot (Visible in GRID Header) */}
              {viewMode === 'GRID' && (
                 <div className={cn(
                   "flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm",
                   teacherStatus === 'ALPA' ? 'border-rose-200' : ''
                 )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      teacherStatus === 'TEPAT_WAKTU' || teacherStatus === 'HADIR' ? 'bg-emerald-500' :
                      teacherStatus === 'TERLAMBAT' ? 'bg-amber-500' :
                      teacherStatus === 'ALPA' ? 'bg-rose-500' : 
                      teacherStatus === 'BELUM_TAP' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                    )} />
                    <span className={cn(
                      "text-[7px] font-black uppercase tracking-tighter",
                      teacherStatus === 'ALPA' ? 'text-rose-600' : 'text-gray-500'
                    )}>
                      {teacherStatus === 'BELUM_TAP' ? 'BT' : teacherStatus?.charAt(0) || '-'}
                    </span>
                 </div>
              )}
              <Badge 
                variant={isLive ? 'success' : isFinished ? 'secondary' : isOverdue ? 'danger' : 'info'} 
                size="sm" 
                className="text-[6px] font-black px-1 py-0 rounded-sm uppercase tracking-tighter"
              >
                {isLive ? 'LIVE' : isFinished ? 'DONE' : isOverdue ? 'TERLEWAT' : 'SOON'}
              </Badge>
            </div>
          </div>


          {/* 2. Main Info Area */}
          <div className={cn(
            "min-w-0 flex flex-col gap-0.5",
            viewMode === 'LIST' ? "px-4 py-2" : "p-2.5 pb-1"
          )}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest truncate">
                {kelasNama}
              </span>
              <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                <Users size={10} />
                <span>{hadirVal}/{totalVal}</span>
              </div>
            </div>
            <h4 className={cn(
              "font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors leading-tight",
              viewMode === 'GRID' ? "text-[13px] mb-1" : "text-xs"
            )}>
              {mapelNama}
            </h4>
          </div>

          {/* 3. Teacher Profile Section */}
          <div className={cn(
            "flex items-center gap-2 px-3",
            viewMode === 'GRID' ? "mb-2" : "h-full border-l border-gray-50 dark:border-gray-700/30"
          )}>
            <div className="w-6 h-6 rounded-sm bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-[9px] font-black text-indigo-600 border border-indigo-100 dark:border-indigo-800 shadow-sm shrink-0">
              {guruNama.charAt(0) || '-'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[7px] font-black text-gray-400 uppercase leading-none mb-0.5">Guru Pengampu</span>
              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">{guruNama}</span>
            </div>
          </div>

          {/* 4. Teacher Status (LIST only, GRID status is in header) */}
          {viewMode === 'LIST' && (
            <div className="flex items-center gap-1.5 px-4 h-full border-l border-gray-50 dark:border-gray-700/30">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                teacherStatus === 'TEPAT_WAKTU' || teacherStatus === 'HADIR' ? 'bg-emerald-500' :
                teacherStatus === 'TERLAMBAT' ? 'bg-amber-500' :
                teacherStatus === 'ALPA' ? 'bg-rose-500' : 
                teacherStatus === 'BELUM_TAP' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
              )} />
              <span className={cn(
                "uppercase tracking-tighter text-[8px] font-black",
                teacherStatus === 'ALPA' ? 'text-rose-500' : 
                teacherStatus === 'TERLAMBAT' ? 'text-amber-600 dark:text-amber-400' :
                teacherStatus === 'TEPAT_WAKTU' || teacherStatus === 'HADIR' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
              )}>
                {teacherStatus === 'BELUM_TAP' ? 'BELUM TAP' : teacherStatus.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* 5. Journal Status */}
          <div className={cn(
            "flex flex-col items-start px-3 py-1.5",
            viewMode === 'GRID' ? "mt-auto bg-gray-50/30 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800" : "h-full border-l border-gray-50 dark:border-gray-700/30 justify-center"
          )}>
            {sesi.ProgresMateri ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1 min-w-0">
                  <BookOpen size={10} className="text-emerald-500 shrink-0" />
                  <span className="text-[9px] font-bold text-gray-500 truncate italic">
                    {sesi.ProgresMateri.judul_materi || '-'}
                  </span>
                </div>
                <span className="text-[7px] font-black text-emerald-600 uppercase ml-2 shrink-0">OK</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-500/70">
                <AlertCircle size={10} />
                <span className="text-[8px] font-black uppercase tracking-tighter">No Jurnal</span>
              </div>
            )}
          </div>

          {/* 6. Action Icon (LIST only) */}
          {viewMode === 'LIST' && (
            <div className="flex items-center justify-center text-gray-300 group-hover:text-indigo-500 transition-colors h-full border-l border-gray-50 dark:border-gray-700/30">
              <ChevronRight size={16} />
            </div>
          )}
        </div>
        
        {/* Tiny Progress Bar for Live Sessions */}
        {sesi.isLive && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
});

KbmSessionCard.displayName = 'KbmSessionCard';
