import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { SesiCard } from '../../../../components/attendance/sesi/SesiCard';
import { SesiAttendanceList, type SesiAttendanceRecord, type SesiDetail } from '../../../../components/attendance/sesi/SesiAttendanceList';
import { formatLocalTimeFromISO } from '../../../../utils/attendance/time';
import { getTeacherStatusMeta } from '../../../../utils/kbm-normalizer';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSesiAbsenSiswa } from '../../../../api/attendanceGerbang.api';
import { formatDate } from '@/utils/date.utils';
import { cn } from '../../../../lib/utils';

export const SesiExpandedContent: React.FC<{ sesiId: string; sesi: SesiDetail; isReportMode?: boolean }> = React.memo(({ sesiId, sesi, isReportMode }) => {
  const { data: presensiRes, isLoading } = useQuery({
    queryKey: ['sesi-detail-attendance', sesiId],
    queryFn: () => getSesiAbsenSiswa(sesiId),
    enabled: !!sesiId,
    refetchInterval: 15000,
  });

  const records: SesiAttendanceRecord[] = useMemo(() => {
    const raw = presensiRes?.data || presensiRes;
    return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  }, [presensiRes]);

  if (isLoading && records.length === 0) {
    return (
      <div className="py-8 text-center space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-bold">Memuat daftar presensi kelas...</p>
      </div>
    );
  }

  return <SesiAttendanceList records={records} sesi={sesi} isReportMode={isReportMode} />;
});

interface Props {
  activeSessionsList: Array<Record<string, unknown>>;
  expanded: Record<string, boolean>;
  toggleExpand: (id: string) => void;
  handleFinishSesi: (id: string) => void;
  handleDeleteSesi: (id: string) => void;
  handleOpenScan: (id: string) => void;
  handleOpenJournal: (session: Record<string, unknown>) => void;
  handleOpenPhotoGuruModal: (session: Record<string, unknown>) => void;
  setPreviewPhotoData: (data: { photoUrl: string; guruNama: string; kelasNama: string; mapelNama: string; timestamp: string } | null) => void;
  getMapelLabel: (id?: string) => string;
  getGuruLabel: (id?: string) => string;
  getKelasLabel: (id?: string) => string;
  isPetugasSiswa: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  isReadOnlyExecutive: boolean;
  can: (perm: string) => boolean;
}

export const SessionTimelineList: React.FC<Props> = React.memo(({
  activeSessionsList,
  expanded,
  toggleExpand,
  handleFinishSesi,
  handleDeleteSesi,
  handleOpenScan,
  handleOpenJournal,
  handleOpenPhotoGuruModal,
  setPreviewPhotoData,
  getMapelLabel,
  getGuruLabel,
  getKelasLabel,
  isPetugasSiswa,
  isAdmin,
  isStudent,
  isReadOnlyExecutive,
  can
}) => {
  const queryClient = useQueryClient();

  const handlePhotoClick = useCallback((item: Record<string, unknown>) => {
    const pUrl = (item.foto_kegiatan || item.foto_masuk) as string;
    if (pUrl) {
      setPreviewPhotoData({
        photoUrl: pUrl,
        guruNama: (item.guru_nama as string) || getGuruLabel(item.guru_id as string),
        kelasNama: (item.kelas_nama as string) || getKelasLabel(item.kelas_id as string),
        mapelNama: (item.mapel_nama as string) || getMapelLabel(item.mapel_id as string),
        timestamp: `${formatLocalTimeFromISO(item.waktu_mulai as string) || ''} - ${formatLocalTimeFromISO(item.waktu_selesai as string) || ''} WIB`,
      });
      queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance'] });
    }
  }, [getGuruLabel, getKelasLabel, getMapelLabel, setPreviewPhotoData, queryClient]);

  const renderedList = useMemo(() => {
    return (activeSessionsList ?? [])?.map((session, idx) => {
      const isFin = String(session.status || '').toUpperCase() === 'SELESAI';
      const isLiv = !isFin && Boolean(session.isLive);
      const isOvd = !isFin && !isLiv && Boolean(session.isOverdue);
      const isRdy = !isFin && !isLiv && !isOvd && Boolean(session.isReadyToOpen);

      const isSessionOverdue = Boolean(
        session.isOverdue ||
        session.is_overdue ||
        (session.status !== 'SELESAI' && session.waktu_selesai && new Date(session.waktu_selesai as string).getTime() < Date.now())
      );
      const isSessionFinished = session.status === 'SELESAI';
      const isReportOnly = isReadOnlyExecutive || isSessionFinished || (isPetugasSiswa && isSessionOverdue);

      const rawStatus = (session.guru_status || 'BELUM_HADIR') as string;
      const teacherMeta = getTeacherStatusMeta(rawStatus);

      return (
        <motion.div 
          key={session.id as string}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.05 }}
          className="relative pl-5 sm:pl-10"
        >
          <div className={cn(
            "absolute left-[3px] sm:left-[11px] top-4 w-2.5 h-2.5 rounded-full z-10",
            isLiv
              ? "bg-emerald-500 ring-4 ring-emerald-500/25 animate-pulse"
              : isRdy
              ? "bg-amber-500 ring-4 ring-amber-500/25 animate-pulse"
              : isOvd
              ? "bg-rose-500 ring-4 ring-rose-500/20"
              : isFin
              ? "bg-slate-400 ring-2 ring-slate-300 dark:ring-slate-700"
              : "bg-blue-600 ring-4 ring-blue-500/20"
          )}></div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all">
            <SesiCard
              sesi={session as unknown as SesiDetail}
              isExpanded={Boolean(expanded[session.id as string])}
              counts={(session.summary as Record<string, number>) || {}}
              guruStatusText={teacherMeta.label}
              guruStatusVariant={teacherMeta.badgePropsVariant}
              canFinish={String(session.status) !== 'SELESAI' && !isSessionOverdue}
              onToggleExpand={() => toggleExpand(session.id as string)}
              onFinish={() => handleFinishSesi(session.id as string)}
              onDelete={() => handleDeleteSesi(session.id as string)}
              onScan={() => handleOpenScan(session.id as string)}
              isGuru={isPetugasSiswa}
              jenisBadgeVariant="secondary"
              Icon={BookOpen}
              iconClass="w-4 h-4"
              mapelLabel={getMapelLabel}
              guruLabel={getGuruLabel}
              waktuMulaiText={formatLocalTimeFromISO(session.waktu_mulai as string) || ''}
              waktuSelesaiText={formatLocalTimeFromISO(session.waktu_selesai as string) || ''}
              showScanGuru={!isReadOnlyExecutive && !isSessionOverdue}
              showScanSiswa={!isReadOnlyExecutive && !isSessionOverdue}
              canManage={!isReportOnly && (isAdmin || can('attendance.sessions.update') || (isStudent && isPetugasSiswa))}
              onOpenJournal={() => handleOpenJournal(session)}
              onOpenPhotoModal={() => handleOpenPhotoGuruModal(session)}
              onViewPhoto={handlePhotoClick}
              hideKelas={false}
            />
            
            <AnimatePresence>
              {expanded[session.id as string] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800"
                >
                  <div className="p-8">
                    <SesiExpandedContent 
                      sesiId={session.id as string} 
                      sesi={session as unknown as SesiDetail} 
                      isReportMode={Boolean(isReportOnly || isSessionOverdue)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      );
    });
  }, [
    activeSessionsList,
    expanded,
    toggleExpand,
    handleFinishSesi,
    handleDeleteSesi,
    handleOpenScan,
    handleOpenJournal,
    handleOpenPhotoGuruModal,
    handlePhotoClick,
    getMapelLabel,
    getGuruLabel,
    isPetugasSiswa,
    isAdmin,
    isStudent,
    isReadOnlyExecutive,
    can
  ]);

  return (
    <div className="space-y-2 sm:space-y-6">
      <div className="absolute left-2 sm:left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500/40 via-indigo-500/20 to-transparent"></div>
      <div className="grid grid-cols-1 gap-2 sm:gap-4">
        {renderedList}
      </div>
    </div>
  );
});

export default SessionTimelineList;
