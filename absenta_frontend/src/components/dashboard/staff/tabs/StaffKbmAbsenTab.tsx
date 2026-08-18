import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  BookOpen, Clock, Camera, CheckCircle2, AlertCircle, X, 
  ChevronDown, ChevronUp, PlayCircle, FileText, Users, Sparkles, RefreshCw, LogIn, Volume2, Layers, Eye
} from 'lucide-react';

import { 
  createSesiAbsensi, 
  updateSesiStatus, 
  getPresensiTerpaduSesi, 
  getTrackingHarianGuruMe 
} from '../../../../api/attendanceGerbang.api';

import { toLocalDate, formatLocalDateTime, getVirtualDate } from '../../../../utils/attendance/time';
import { SesiAttendanceList, type SesiAttendanceRecord } from '../../../attendance/sesi/SesiAttendanceList';
import { JurnalKbmModal } from '../../../kurikulum/JurnalKbmModal';
import { BukaSesiFotoModal } from '../modals/BukaSesiFotoModal';
import { PhotoPreviewModal } from '../../../dashboard/shared/kbm/PhotoPreviewModal';
import { Button } from '../../../ui';
import { cn } from '../../../../lib/utils';
import { getTeacherStatusMeta, getSessionStatusMeta } from '../../../../utils/kbm-normalizer';
import { UniversalKbmCard } from '../../../dashboard/shared/kbm/UniversalKbmCard';
import { RekapJurnalPanel } from '../kbm/RekapJurnalPanel';
import { PerangkatAjarPanel } from '../kbm/PerangkatAjarPanel';
import { JadwalInvalPanel } from '../kbm/JadwalInvalPanel';
import { useSessionWindowAlert, getSessionAlertDetails } from '../../../../hooks/attendance/useSessionWindowAlert';
import { 
  playSessionAlarmSound, 
  startFindDeviceAlarm, 
  stopFindDeviceAlarm, 
  triggerVibration, 
  requestNotificationPermission,
  notifySessionReady
} from '../../../../utils/audioUtils';

export interface TimelineItem {
  id: string;
  jam_mulai: string;
  jam_selesai: string;
  slot_mulai?: number;
  slot_selesai?: number;
  jamLabel?: string;
  kelas_nama: string;
  kelas_id: string;
  mapel_id?: string;
  kegiatan: string;
  kegiatan_raw?: string;
  isLive: boolean;
  isFinished: boolean;
  session?: {
    id: string;
    status: 'AKTIF' | 'BERLANGSUNG' | 'SELESAI' | string;
    waktu_mulai?: string;
    waktu_selesai?: string;
    foto_bukti_url?: string;
    AbsenGuru?: Array<{
      status: string;
      waktu_tap?: string;
      is_terlambat?: boolean;
    }>;
    _summary?: {
      total: number;
      HADIR: number;
      TERLAMBAT: number;
      IZIN: number;
      SAKIT: number;
      ALPA: number;
    };
  } | null;
}

interface StaffKbmAbsenTabProps {
  guruId?: string;
  guruNama?: string;
  timelineItems: TimelineItem[];
  isLoadingTimeline?: boolean;
  onRefreshTimeline?: () => void;
}

export const StaffKbmAbsenTab: React.FC<StaffKbmAbsenTabProps> = ({
  guruId,
  guruNama,
  timelineItems = [],
  isLoadingTimeline = false,
  onRefreshTimeline,
}) => {
  const queryClient = useQueryClient();
  const today = toLocalDate();

  // Accordion State: Track which schedule item is expanded
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const hasAutoExpandedRef = React.useRef<boolean>(false);

  // Photo Modal State
  const [photoModalOpen, setPhotoModalOpen] = useState<boolean>(false);
  const [targetJadwal, setTargetJadwal] = useState<TimelineItem | null>(null);

  // Jurnal Modal State
  const [journalModalOpen, setJournalModalOpen] = useState<boolean>(false);
  const [targetJournalSesi, setTargetJournalSesi] = useState<{ id: string; progres?: any } | null>(null);

  // Photo Preview Lightbox State
  const [previewPhotoData, setPreviewPhotoData] = useState<{
    photoUrl: string;
    guruNama?: string;
    kelasNama?: string;
    mapelNama?: string;
    timestamp?: string;
  } | null>(null);

  // Satu Kabel: Data timelineItems sudah digabung & diagregasi oleh Server (SesiLifecycleService)
  const mergedTimelineItems = (timelineItems as unknown as TimelineItem[]) || [];

  // Auto-expand on initial load: prefer live session > active session > upcoming session.
  // If all sessions are finished or overdue, DO NOT auto-expand any item.
  useEffect(() => {
    if (mergedTimelineItems.length > 0 && !hasAutoExpandedRef.current) {
      hasAutoExpandedRef.current = true;

      // Priority 1: genuinely LIVE session (server flag, not overdue)
      const liveItem = mergedTimelineItems.find(item => item.isLive && !item.is_overdue);

      // Priority 2: session that is BERLANGSUNG in DB AND not overdue
      const activeItem = !liveItem && mergedTimelineItems.find(item => {
        if (item.is_overdue) return false;
        return item.session && item.session.status !== 'SELESAI';
      });

      // Priority 3: first item that is upcoming (not overdue and not finished)
      const upcomingItem = !liveItem && !activeItem && mergedTimelineItems.find(item =>
        !item.is_overdue && !item.isFinished
      );

      const target = liveItem || activeItem || upcomingItem;
      if (target) {
        setExpandedScheduleId(target.id);
      }
    }
  }, [mergedTimelineItems]);

  // Query: Tracking Kehadiran Tap Gerbang Guru Hari Ini
  const { data: trackingRes } = useQuery({
    queryKey: ['guru-tracking-harian-tab', today, guruId],
    queryFn: () => getTrackingHarianGuruMe({ tanggal: today }),
    enabled: !!guruId,
    staleTime: 60000,
  });
  const trackingData = trackingRes?.data;

  // Active Session Presensi Terpadu Query (Realtime Student List)
  const activeTimelineItem = timelineItems.find(item => item.id === expandedScheduleId);
  const activeSesiId = activeTimelineItem?.session?.id;

  const { data: presensiRes, isLoading: loadingPresensi } = useQuery({
    queryKey: ['sesi-detail-attendance', activeSesiId],
    queryFn: () => getPresensiTerpaduSesi(activeSesiId!),
    enabled: !!activeSesiId,
    refetchInterval: 15000, // 15 detik auto-refresh saat sesi aktif
  });

  const studentRecords: SesiAttendanceRecord[] = presensiRes?.data || [];

  // Mutation: Buka Sesi KBM baru dengan foto
  const openSessionMutation = useMutation({
    mutationFn: async (payload: { jadwal: TimelineItem; fotoDataUrl: string }) => {
      const nowISO = formatLocalDateTime(getVirtualDate());
      const foto = payload.fotoDataUrl;
      const rawJadwalId = (payload.jadwal as any).jadwal_kbm_id || payload.jadwal.id;
      const cleanJadwalId = rawJadwalId ? String(rawJadwalId).replace(/^sched_/, '') : undefined;
      return createSesiAbsensi({
        jadwal_kbm_id: cleanJadwalId,
        kelas_id: payload.jadwal.kelas_id,
        mapel_id: payload.jadwal.mapel_id,
        guru_id: guruId,
        jenis_kegiatan: 'KBM',
        tanggal: today,
        waktu_mulai: nowISO,
        foto_bukti_url: foto,
        foto_kegiatan: foto,
      });
    },
    onSuccess: (_, variables) => {
      const namaKegiatan = variables.jadwal.mapel_nama || (variables.jadwal as any).mapel || variables.jadwal.kegiatan || (variables.jadwal as any).Mapel?.nama_mapel || 'Mata Pelajaran';
      toast.success(`Sesi KBM ${namaKegiatan} berhasil dibuka!`);
      setPhotoModalOpen(false);
      setTargetJadwal(null);
      queryClient.invalidateQueries({ queryKey: ['staff-timeline-unified'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['guru-monitoring-unified'] });
      if (onRefreshTimeline) onRefreshTimeline();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan';
      toast.error('Gagal membuka sesi KBM: ' + msg);
    },
  });

  // Mutation: Tutup Sesi KBM
  const closeSessionMutation = useMutation({
    mutationFn: async (sesiId: string) => {
      return updateSesiStatus(sesiId, 'SELESAI');
    },
    onSuccess: () => {
      toast.success('Sesi KBM telah berhasil ditutup!');
      queryClient.invalidateQueries({ queryKey: ['staff-timeline-unified'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['guru-monitoring-unified'] });
      if (onRefreshTimeline) onRefreshTimeline();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan';
      toast.error('Gagal menutup sesi: ' + msg);
    },
  });

  const handleOpenPhotoModal = (jadwal: TimelineItem) => {
    setTargetJadwal(jadwal);
    setPhotoModalOpen(true);
  };

  const handleConfirmBukaSesi = useCallback((capturedPhotoUrl: string) => {
    if (!targetJadwal) return;
    openSessionMutation.mutate({ jadwal: targetJadwal, fotoDataUrl: capturedPhotoUrl });
  }, [targetJadwal, openSessionMutation]);

  const handleOpenJournalModal = (sesi: { id: string; progres?: any }) => {
    setTargetJournalSesi(sesi);
    setJournalModalOpen(true);
  };

  // 🔔 Automatic Session Window Audio, Vibration & Push Alert (H-15 Menit)
  useSessionWindowAlert({
    schedules: mergedTimelineItems,
    enabled: true,
    roleLabel: 'guru',
    onOpenSession: handleOpenPhotoModal,
  });

  const handleTestAlertForSession = async (targetSession: TimelineItem) => {
    startFindDeviceAlarm();
    await requestNotificationPermission();

    const { title: rawTitle, body, indicatorColor } = getSessionAlertDetails(targetSession as any);
    const title = `[TEST ALARM] ${rawTitle}`;
    const targetUrl = '/dashboard?tab=kbm';

    notifySessionReady(title, body, targetUrl);

    toast((t) => (
      React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm p-1' },
        React.createElement('div', { className: 'space-y-1' },
          React.createElement('p', { className: 'font-black text-white flex items-center gap-2 text-sm' },
            React.createElement('span', { className: `w-2.5 h-2.5 rounded-full ${indicatorColor} animate-ping inline-block` }),
            title
          ),
          React.createElement('p', { className: 'text-xs text-slate-300' }, body)
        ),
        React.createElement('div', { className: 'flex items-center gap-2 self-end sm:self-center shrink-0' },
          React.createElement('button', {
            onClick: () => {
              stopFindDeviceAlarm();
              toast.dismiss(t.id);
            },
            className: 'px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-all'
          }, '🔇 Matikan Alarm'),
          React.createElement('button', {
            onClick: () => {
              stopFindDeviceAlarm();
              toast.dismiss(t.id);
              handleOpenPhotoModal(targetSession);
            },
            className: 'px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all'
          }, '📸 Buka Sesi KBM')
        )
      )
    ), {
      duration: Infinity,
      position: 'top-right',
      style: {
        background: '#090d16',
        border: '1.5px solid rgba(239, 68, 68, 0.6)',
        color: '#f8fafc',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        padding: '12px 16px',
      }
    });
  };

  const handleTestAlertSound = () => {
    if (mergedTimelineItems.length > 0) {
      const candidate = mergedTimelineItems.find(it => !it.isFinished && !it.session?.foto_kegiatan) || mergedTimelineItems[0];
      handleTestAlertForSession(candidate);
    } else {
      const dummySession: TimelineItem = {
        id: 'test-session-1',
        jam_mulai: '08:45',
        jam_selesai: '10:15',
        kelas_nama: 'X AKL 1',
        kegiatan: 'Bahasa Indonesia (KBM)',
      };
      handleTestAlertForSession(dummySession);
    }
  };

  // Internal Sub-tab State (Hanya 3 Sub-tab: Agenda & Jurnal, Perangkat Ajar, Inval)
  const [activeKbmSubTab, setActiveKbmSubTab] = useState<'agenda' | 'perangkat-ajar' | 'inval'>('agenda');

  return (
    <motion.div
      key="tab-kbm-absen-rebuilt"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* 1. SUB-TAB INTERNAL PILL BAR - COLOR BLOCKED */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800/90 w-fit overflow-x-auto max-w-full shadow-inner">
        <button
          type="button"
          onClick={() => setActiveKbmSubTab('agenda')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            activeKbmSubTab === 'agenda'
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <BookOpen size={14} />
          <span>Agenda &amp; Jurnal KBM</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveKbmSubTab('perangkat-ajar')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            activeKbmSubTab === 'perangkat-ajar'
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <Layers size={14} />
          <span>Perangkat Ajar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveKbmSubTab('inval')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
            activeKbmSubTab === 'inval'
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <Users size={14} />
          <span>Jadwal Inval</span>
        </button>
      </div>

      {activeKbmSubTab === 'perangkat-ajar' ? (
        <PerangkatAjarPanel />
      ) : activeKbmSubTab === 'inval' ? (
        <JadwalInvalPanel />
      ) : (
        <>
          {/* 1. TOP STRIP: GURU GATE CHECK-IN TRACKING - COLOR BLOCK TINT */}
          <div className={cn(
            "p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all",
            trackingData?.status === 'HADIR'
              ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-white dark:to-slate-900 border-emerald-500/30 dark:border-emerald-500/40"
              : "bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-white dark:to-slate-900 border-amber-500/30 dark:border-amber-500/40"
          )}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-sm",
                trackingData?.status === 'HADIR' 
                  ? "bg-emerald-500 text-white shadow-emerald-500/30" 
                  : "bg-amber-500 text-slate-950 shadow-amber-500/30 animate-pulse"
              )}>
                <LogIn size={18} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Presensi Gerbang Sekolah Hari Ini
                </span>
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                  {guruNama || trackingData?.nama_guru || 'Pengajar'}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {trackingData?.status === 'HADIR' ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Tap Gerbang {trackingData?.kegiatan?.[0]?.waktu || 'Tercatat'}</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-xs">
                  <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                  <span>Belum Tap Gerbang Hari Ini</span>
                </span>
              )}
            </div>
          </div>

      {/* 2. MAIN ACCORDION SECTION: DAFTAR JADWAL KBM HARI INI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen size={14} />
            </div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span>Jadwal &amp; Sesi KBM Mengajar</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                {timelineItems.length} Sesi
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestAlertSound}
              type="button"
              title="Uji coba suara alarm & aktifkan notifikasi"
              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <Volume2 size={13} className="text-emerald-400" />
              <span>Tes Alarm</span>
            </button>
            {onRefreshTimeline && (
              <button
                onClick={onRefreshTimeline}
                disabled={isLoadingTimeline}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
              >
                <RefreshCw size={11} className={isLoadingTimeline ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            )}
          </div>
        </div>

        {timelineItems.length === 0 ? (
          <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white">Tidak Ada Jadwal Mengajar Hari Ini</h4>
              <p className="text-xs text-slate-400">Anda tidak memiliki jam KBM terdaftar untuk hari ini.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {mergedTimelineItems.map((item) => {
              const isExpanded = expandedScheduleId === item.id;
              const hasSession = Boolean(item.session);
              const sesi = item.session;
              const isLive = item.isLive ?? item.status?.isLive ?? false;
              const isReadyToOpen = (item as any).isReadyToOpen ?? item.status?.isReadyToOpen ?? false;
              const isFinished = item.isFinished ?? item.status?.isFinished ?? (sesi?.status === 'SELESAI');
              const isOverdue = item.is_overdue ?? item.status?.isOverdue ?? false;
              const isStartedByTeacher = Boolean(sesi?.foto_kegiatan || (item.guru_status && item.guru_status !== 'BELUM_TAP' && item.guru_status !== 'BELUM_HADIR' && item.guru_status !== 'ALPA'));

              const canExpand = Boolean(isStartedByTeacher || isFinished || isOverdue);

              return (
                <UniversalKbmCard
                  key={item.id}
                  mode="GURU"
                  item={item}
                  isExpanded={canExpand && isExpanded}
                  onToggleExpand={canExpand ? () => setExpandedScheduleId(isExpanded ? null : item.id) : undefined}
                  onOpenPhotoModal={handleOpenPhotoModal}
                  onViewPhoto={(it) => {
                    const pUrl = it.session?.foto_kegiatan || it.foto_kegiatan || it.session?.foto_bukti_url || (it as any).AbsenGuru?.[0]?.foto_masuk;
                    if (pUrl) {
                      setPreviewPhotoData({
                        photoUrl: pUrl,
                        guruNama: guruNama || it.guru_nama,
                        kelasNama: it.kelas_nama,
                        mapelNama: it.kegiatan || it.mapel_nama,
                        timestamp: `${it.jam_mulai} - ${it.jam_selesai} WIB`,
                      });
                    }
                  }}
                  onOpenJournalModal={() => handleOpenJournalModal({ id: sesi?.id || item.id })}
                  onCloseSession={(sId) => closeSessionMutation.mutate(sId)}
                  onTestAlert={handleTestAlertForSession}
                  expandedContent={canExpand ? (
                    <div className="space-y-4">
                      {/* CASE 0: JADWAL KBM TELAH TERLEWAT (OVERDUE LOCK) */}
                      {isOverdue && !isFinished && (
                        <div className="p-4 sm:p-5 rounded-2xl border border-dashed border-rose-500/30 bg-rose-950/15 text-center space-y-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto bg-rose-500/10 text-rose-400">
                            <AlertCircle size={20} />
                          </div>
                          <div className="space-y-1 max-w-sm mx-auto">
                            <h5 className="text-xs sm:text-sm font-extrabold text-white">
                              Sesi KBM Telah Terlewat &amp; Terkunci
                            </h5>
                            <p className="text-[11px] text-slate-400">
                              Sesi terjadwal pukul {item.jam_mulai} - {item.jam_selesai} WIB dan batas waktu telah berakhir. Hubungi Piket/Kurikulum jika memerlukan koreksi kehadiran.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CASE 2: SESI TELAH DIMULAI GURU ATAU SELESAI (DAFTAR PRESENSI SISWA) */}
                      {(isStartedByTeacher || isFinished || (isOverdue && hasSession)) && (
                        <div className="space-y-3">
                          {/* Header Detail Sesi */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-mono font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                ID Sesi: {sesi?.id}
                              </span>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Presensi Siswa ({studentRecords.length || sesi?._summary?.total || 0} Siswa)
                              </h5>
                            </div>
                          </div>

                          {/* Daftar Presensi Siswa Component */}
                          {loadingPresensi ? (
                            <div className="py-8 text-center space-y-2">
                              <RefreshCw className="animate-spin text-emerald-400 mx-auto" size={20} />
                              <p className="text-xs font-semibold text-slate-400">Memuat Presensi Siswa...</p>
                            </div>
                          ) : (
                            <SesiAttendanceList
                              records={studentRecords}
                              isReportMode={Boolean(isOverdue || isFinished)}
                              sesi={{
                                id: sesi!.id,
                                status: isFinished ? 'SELESAI' : isOverdue ? 'SELESAI' : 'BERLANGSUNG',
                                guru_id: guruId,
                                nama_guru: guruNama,
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── SKAT / SECTION DIVIDER ── */}
      <div className="relative py-2 sm:py-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 dark:bg-slate-900/90 px-3.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1.5">
            <FileText size={12} className="text-blue-500" />
            <span>Arsip &amp; Riwayat Jurnal Mengajar</span>
          </span>
        </div>
      </div>

      {/* ── REKAP JURNAL MENGAJAR PANEL (DI BAWAH JADWAL) ── */}
      <RekapJurnalPanel />
    </>
  )}

      {/* MODAL 1: BUKA SESI FOTO MODAL */}
      {targetJadwal && (
        <BukaSesiFotoModal
          isOpen={photoModalOpen}
          onClose={() => { setPhotoModalOpen(false); setTargetJadwal(null); }}
          onConfirm={handleConfirmBukaSesi}
          kelasNama={targetJadwal.kelas_nama}
          mapelNama={targetJadwal.kegiatan}
          guruNama={guruNama}
          isLoading={openSessionMutation.isPending}
        />
      )}

      {/* MODAL 2: JURNAL KBM MODAL (EXISTING IN PROJECT) */}
      {targetJournalSesi && (
        <JurnalKbmModal
          isOpen={journalModalOpen}
          onClose={() => { setJournalModalOpen(false); setTargetJournalSesi(null); }}
          sesiId={targetJournalSesi.id}
          initialData={targetJournalSesi.progres}
        />
      )}

      {/* MODAL 3: PHOTO PREVIEW MODAL (LIGHTBOX) */}
      {previewPhotoData && (
        <PhotoPreviewModal
          isOpen={Boolean(previewPhotoData)}
          onClose={() => setPreviewPhotoData(null)}
          photoUrl={previewPhotoData.photoUrl}
          guruNama={previewPhotoData.guruNama}
          kelasNama={previewPhotoData.kelasNama}
          mapelNama={previewPhotoData.mapelNama}
          timestamp={previewPhotoData.timestamp}
        />
      )}
    </motion.div>
  );
};
