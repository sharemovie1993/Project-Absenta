import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSesiAbsensiList, getSesiAbsenSiswa, sendKbmReminderApi, updateAbsenGuru } from '../../../api/attendanceGerbang.api';
import { normalizeFromSesiAbsensi, KbmItem, getKbmStatusKey } from '../../../utils/kbm-normalizer';
import { toLocalDate, formatLocalTimeFromISO, getTimezoneLabel } from '../../../utils/attendance/time';
import { useSocket } from '../../../hooks/useSocket';
import { Button } from '../../ui';
import Card from '../../ui/Card';
import { Modal, ModalFooter } from '../../ui/Modal';
import { BookOpen, Lock, ShieldAlert, ArrowRight, AlertTriangle, CheckCircle2, Sparkles, Activity, HeartPulse, Clock, UserCheck, MessageSquare, Send, UserX } from 'lucide-react';
import { JurnalKbmModal } from '../../kurikulum/JurnalKbmModal';
import { useAuthStore } from '../../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

import { dropdownApi } from '../../../api/dropdown.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import { guruApi } from '../../../api/academic.api';
import { cn } from '../../../lib/utils';

// Import refactored subcomponents
import { KbmStatCards } from './kbm/KbmStatCards';
import { KbmFilters } from './kbm/KbmFilters';
import { KbmSessionTable } from './kbm/KbmSessionTable';
import { KbmSessionCard } from './kbm/KbmSessionCard';
import { KbmDetailModal } from './kbm/KbmDetailModal';

export interface MonitoringKbmWidgetProps {
  /**
   * Mode eksekutif analitik + spotlight masalah (default: true).
   */
  isExecutive?: boolean;
}

export const MonitoringKbmWidget: React.FC<MonitoringKbmWidgetProps> = ({ isExecutive = true }) => {
  const queryClient = useQueryClient();
  const { isConnected, subscribe, unsubscribe } = useSocket();
  const { tenantMode, user } = useAuthStore();
  const [targetDate, setTargetDate] = useState(toLocalDate());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time cache invalidation via Socket.io
  useEffect(() => {
    if (!isConnected) return;

    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kurikulum', 'monitoring-global'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance'] });
    };

    subscribe('attendance_feed_update', handleInvalidate);
    subscribe('sesi_status_update', handleInvalidate);
    subscribe('absen_guru_update', handleInvalidate);
    subscribe('sesi_reminder_updated', handleInvalidate);
    subscribe('session_attendance_update', handleInvalidate);
    subscribe('SESSION_ATTENDANCE_UPDATE', handleInvalidate);
    subscribe('SESI_CREATED', handleInvalidate);
    subscribe('SESI_UPDATED', handleInvalidate);

    return () => {
      unsubscribe('attendance_feed_update', handleInvalidate);
      unsubscribe('sesi_status_update', handleInvalidate);
      unsubscribe('absen_guru_update', handleInvalidate);
      unsubscribe('sesi_reminder_updated', handleInvalidate);
      unsubscribe('session_attendance_update', handleInvalidate);
      unsubscribe('SESSION_ATTENDANCE_UPDATE', handleInvalidate);
      unsubscribe('SESI_CREATED', handleInvalidate);
      unsubscribe('SESI_UPDATED', handleInvalidate);
    };
  }, [isConnected, subscribe, unsubscribe, queryClient]);
  const [searchParams] = useSearchParams();
  const initialTeacherFilter = useMemo(() => {
    const p = searchParams.get('teacher_status') || searchParams.get('filter') || searchParams.get('status_guru');
    if (p) return p.toUpperCase();
    return 'ALL';
  }, [searchParams]);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'FINISHED' | 'UPCOMING' | 'JURNAL'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'TABLE'>('LIST');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('ALL');
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>('ALL');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<string>(initialTeacherFilter);

  useEffect(() => {
    const p = searchParams.get('teacher_status') || searchParams.get('filter') || searchParams.get('status_guru');
    if (p) {
      setTeacherStatusFilter(p.toUpperCase());
    }
  }, [searchParams]);
  const [kelasOptions, setKelasOptions] = useState<any[]>([]);
  const [jurusanOptions, setJurusanOptions] = useState<any[]>([]);
  const [selectedSesi, setSelectedSesi] = useState<any>(null);
  const [expandedSesiId, setExpandedSesiId] = useState<string | null>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);

  // Status Modal State (Inval / Izin / Sakit)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatusSession, setSelectedStatusSession] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<'IZIN' | 'SAKIT' | 'PENUGASAN' | 'ALPA'>('IZIN');
  const [selectedGuruInvalId, setSelectedGuruInvalId] = useState<string>('');
  const [catatanText, setCatatanText] = useState<string>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Fetch Teacher Options for Guru Inval dropdown
  const { data: guruOptionsRes } = useQuery({
    queryKey: ['academic-guru-inval-options'],
    queryFn: () => guruApi.getAll({ limit: 1000 } as any).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const guruList = useMemo(() => {
    const raw = (guruOptionsRes as any)?.data?.data || (guruOptionsRes as any)?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [guruOptionsRes]);

  const handleSendWaReminder = useCallback(async (session: any, method: 'GATEWAY' | 'PERSONAL_LINK') => {
    try {
      const positionCode = user?.position_codes?.[0];
      const rawRole = typeof user?.role === 'object' ? (user?.role as any)?.name : user?.role;
      const userRole = String(positionCode || rawRole || (user as any)?.role_name || 'KURIKULUM').toUpperCase();
      const res = await sendKbmReminderApi(session.id, {
        method,
        senderRole: userRole,
        senderName: user?.full_name || user?.nama || user?.name || undefined,
      });

      if (method === 'PERSONAL_LINK' && res.personal_wa_link) {
        window.open(res.personal_wa_link, '_blank');
        toast.success('Membuka WhatsApp Personal...');
      } else {
        toast.success('Pengingat WhatsApp berhasil dikirim ke guru via Gateway');
      }
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengirim pengingat');
    }
  }, [user, queryClient]);

  const handleOpenStatusModal = useCallback((session: any) => {
    setSelectedStatusSession(session);
    setSelectedStatus('IZIN');
    setSelectedGuruInvalId('');
    setCatatanText('');
    setStatusModalOpen(true);
  }, []);

  const handleSubmitStatus = useCallback(async () => {
    if (!selectedStatusSession) return;
    const guruId = selectedStatusSession.guru_id || selectedStatusSession.Guru?.id;
    if (!guruId) {
      toast.error('Data Guru Pengajar tidak ditemukan pada sesi ini.');
      return;
    }

    setIsSubmittingStatus(true);
    try {
      await updateAbsenGuru(selectedStatusSession.id, guruId, {
        status: selectedStatus,
        guru_inval_id: selectedGuruInvalId || undefined,
        catatan: catatanText || undefined,
      });
      toast.success(`Status KBM ${selectedStatusSession.Kelas?.nama_kelas || ''} berhasil diperbarui.`);
      setStatusModalOpen(false);
      setSelectedStatusSession(null);
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-sesi-absensi-piket'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'kurikulum', 'monitoring-global'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui status');
    } finally {
      setIsSubmittingStatus(false);
    }
  }, [selectedStatusSession, selectedStatus, selectedGuruInvalId, catatanText, queryClient]);

  // 1. Debounced Search Term to prevent lag on keypresses
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const isToday = useMemo(() => targetDate === toLocalDate(), [targetDate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Global Monitoring Stats (Backend Source of Truth)
  const { data: monitoringRes, isLoading: monitoringLoading, error: monitoringError } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'monitoring-global', targetDate],
    queryFn: () => kurikulumApi.getKbmGlobalMonitoring(targetDate),
    refetchInterval: isToday ? 30000 : false,
    staleTime: 30000,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  // 3. Fetch Session List (Unified Source with include_scheduled: true)
  const { data: sesiData, isLoading: sesiLoading, error: sesiError, refetch: refetchSessions } = useQuery({
    queryKey: ['monitoring-sesi-absensi', targetDate],
    queryFn: () => getSesiAbsensiList({ tanggal: targetDate, include_scheduled: true, summary: true, limit: 500 } as any),
    enabled: tenantMode !== 'SIMPLE',
    refetchInterval: isToday && tenantMode !== 'SIMPLE' ? 30000 : false, 
    staleTime: 30000,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const isSubscriptionRequired = useMemo(() => {
    const err1 = (monitoringError as any)?.response?.data || (monitoringError as any)?.data;
    const err2 = (sesiError as any)?.response?.data || (sesiError as any)?.data;
    const reason = String(err1?.reason || err2?.reason || '');
    const code = String(err1?.code || err2?.code || '');
    const status = (monitoringError as any)?.response?.status || (sesiError as any)?.response?.status;
    return reason.includes('SUBSCRIPTION_REQUIRED') || code.includes('SUBSCRIPTION') || status === 402;
  }, [monitoringError, sesiError]);

  const isLoading = (monitoringLoading || sesiLoading) && !isSubscriptionRequired;

  // Satu kabel: semua sesi dinormalisasi lewat kbm-normalizer
  const enrichedSessions: KbmItem[] = useMemo(() => {
    const rawData = sesiData?.data;
    const items = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(sesiData?.items)
      ? sesiData.items
      : [];
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }
    return items.map((s: any) => normalizeFromSesiAbsensi(s));
  }, [sesiData, isSubscriptionRequired]);

  // Komputasi SSOT seluruh 14 metrik siklus KBM & kehadiran guru
  const stats = useMemo(() => {
    let total = enrichedSessions.length;
    let live = 0;
    let withJournal = 0;
    let finished = 0;
    let overdue = 0;
    let upcoming = 0;

    let teacherOnTime = 0;
    let teacherLate = 0;
    let teacherDinasLuar = 0;
    let teacherInval = 0;
    let teacherIzinSakit = 0;
    let teacherPending = 0;
    let teacherNotArrived = 0;
    let teacherAlpa = 0;

    enrichedSessions.forEach((s) => {
      if (s.status.isLive) live++;
      if (s.status.isFinished) finished++;
      if (s.status.isOverdue) overdue++;
      if (s.status.isUpcoming) upcoming++;
      if ((s as any).ProgresMateri?.judul_materi || (s as any)._summary?.hasJournal) withJournal++;

      const tStatus = String(s.status.teacherStatus || '').toUpperCase();
      const isReadyToOpen = Boolean(s.status.isReadyToOpen ?? (s as any)._summary?.isReadyToOpen);

      if (tStatus === 'HADIR' || tStatus === 'TEPAT_WAKTU') {
        teacherOnTime++;
      } else if (tStatus === 'TERLAMBAT') {
        teacherLate++;
      } else if (tStatus === 'DINAS_LUAR' || tStatus === 'PENUGASAN') {
        teacherDinasLuar++;
      } else if (tStatus === 'INVAL' || tStatus === 'DIGANTIKAN') {
        teacherInval++;
      } else if (tStatus === 'IZIN' || tStatus === 'SAKIT') {
        teacherIzinSakit++;
      } else if (tStatus === 'PENDING_IZIN' || tStatus === 'MENUNGGU_VERIFIKASI') {
        teacherPending++;
      } else if (tStatus === 'ALPA' || s.status.isOverdue) {
        teacherAlpa++;
      } else if (isReadyToOpen && !s.status.isLive) {
        teacherNotArrived++;
      }
    });

    if (total === 0 && isSubscriptionRequired) {
      return {
        total: 12, live: 4, withJournal: 10, finished: 8, overdue: 0, upcoming: 0,
        teacherOnTime: 9, teacherLate: 1, teacherDinasLuar: 1, teacherInval: 1,
        teacherIzinSakit: 0, teacherPending: 0, teacherNotArrived: 0, teacherAlpa: 0
      };
    }

    return {
      total,
      live,
      withJournal,
      finished,
      overdue,
      upcoming,
      teacherOnTime,
      teacherLate,
      teacherDinasLuar,
      teacherInval,
      teacherIzinSakit,
      teacherPending,
      teacherNotArrived,
      teacherAlpa,
    };
  }, [enrichedSessions, isSubscriptionRequired]);

  // Dynamic Health Score & Progress Rates
  const healthScore = useMemo(() => {
    if (!stats.total) return 100;
    const penalty = (stats.teacherAlpa * 3) + (stats.teacherLate * 1) + (stats.overdue * 2);
    const rawScore = 100 - Math.round((penalty / (stats.total * 3)) * 100);
    return Math.max(10, Math.min(100, rawScore));
  }, [stats]);

  const journalPct = useMemo(() => {
    return Math.round((stats.withJournal / (stats.total || 1)) * 100);
  }, [stats]);

  useEffect(() => {
    dropdownApi.getKelasForDropdown().then(setKelasOptions).catch(console.error);
    dropdownApi.getJurusanForDropdown().then(setJurusanOptions).catch(console.error);
  }, []);

  const { data: detailAttendance, isLoading: detailLoading } = useQuery({
    queryKey: ['sesi-detail-attendance', selectedSesi?.id],
    queryFn: () => getSesiAbsenSiswa(selectedSesi?.id),
    enabled: !!selectedSesi?.id,
    refetchInterval: !!selectedSesi?.id ? 4000 : false,
  });

  const formatTime = useCallback((iso?: string) => {
    if (!iso) return '--:--';
    const formatted = formatLocalTimeFromISO(iso);
    const tzLabel = getTimezoneLabel();
    return formatted ? `${formatted} ${tzLabel}` : '--:--';
  }, []);

  const processedSessions = useMemo(() => {
    return enrichedSessions.filter((s: any) => {
      const matchSearch = 
        String(s.Mapel?.nama_mapel || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(s.Guru?.nama_guru || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(s.Kelas?.nama_kelas || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchKelas = selectedKelasId === 'ALL' || String(s.kelas_id) === selectedKelasId;
      const matchJurusan = selectedJurusanId === 'ALL' || String(s.Kelas?.jurusan_id) === selectedJurusanId;
      
      const statusMatch = 
        statusFilter === 'ALL' || 
        (statusFilter === 'LIVE'     && s.status.isLive) || 
        (statusFilter === 'FINISHED' && s.status.isFinished) || 
        (statusFilter === 'OVERDUE'  && s.status.isOverdue) ||
        (statusFilter === 'UPCOMING' && s.status.isUpcoming) ||
        (statusFilter === 'JURNAL'   && !!(s as any).ProgresMateri);

      const matchTeacherStatus = 
        teacherStatusFilter === 'ALL' || 
        (teacherStatusFilter === 'BELUM_MASUK'
          ? (s.status.teacherStatus === 'BELUM_MASUK' || s.status.teacherStatus === 'BELUM_TAP' || s.status.teacherStatus === 'BELUM_HADIR' || (s.isReadyToOpen && !s.status.isLive))
          : s.status.teacherStatus === teacherStatusFilter);

      return matchSearch && matchKelas && matchJurusan && matchTeacherStatus && statusMatch;
    });
  }, [enrichedSessions, debouncedSearchTerm, statusFilter, selectedKelasId, selectedJurusanId, teacherStatusFilter]);

  const handleExport = useCallback(() => {
    if (!processedSessions.length) return toast.error('Tidak ada data untuk diekspor');
    
    const headers = ['Waktu', 'Kelas', 'Mapel', 'Guru', 'Status Guru', 'Siswa Hadir', 'Total Siswa', 'Materi Jurnal'];
    const rows = processedSessions.map((s: any) => [
      formatTime(s.waktu_mulai),
      s.Kelas?.nama_kelas || '-',
      s.Mapel?.nama_mapel || '-',
      s.Guru?.nama_guru || '-',
      s._summary?.teacherStatus || '-',
      s._summary?.hadir || 0,
      s._summary?.total || 0,
      s.ProgresMateri?.judul_materi || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `monitoring_kbm_${targetDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedSessions, formatTime, targetDate]);

  const handleCloseDetail = useCallback(() => {
    setSelectedSesi(null);
  }, []);

  const handleResetSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return (
    <div className="space-y-6 relative rounded-2xl overflow-hidden min-h-[300px]">
      {/* 🔮 Transparent Glass Watermark Overlay when Subscription Required */}
      {isSubscriptionRequired && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-2xl flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-900/25 backdrop-blur-[1px]" />
          <div className="absolute inset-0 flex items-center justify-center rotate-[-12deg] select-none opacity-[0.07] dark:opacity-[0.12]">
            <span className="text-7xl font-black uppercase tracking-widest text-indigo-950 dark:text-white whitespace-nowrap">
              ABSENTA PRO • LIVE MONITORING KBM
            </span>
          </div>
          <div className="relative z-10 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-amber-300 dark:border-amber-700/80 px-8 py-5 rounded-3xl shadow-2xl space-y-2 max-w-md pointer-events-auto">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Preview Fitur Live Monitoring KBM
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Tampilan UI di atas adalah modul asli <strong>Monitoring KBM &amp; Absensi Sesi</strong>. Hubungi administrator untuk mengaktifkan lisensi modul ini.
            </p>
          </div>
        </div>
      )}

      {/* ── LEVEL 1: EXECUTIVE KBM DIRECT STAT CARDS ── */}
      {isExecutive ? (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300">
                Monitoring KBM — Live Hari Ini
              </h3>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                Live
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <HeartPulse size={14} className={cn(
                healthScore > 80 ? "text-emerald-500 animate-pulse" :
                healthScore > 50 ? "text-amber-500" : "text-rose-500 animate-bounce"
              )} />
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Kesehatan KBM: <strong className={cn(
                  healthScore > 80 ? "text-emerald-600 dark:text-emerald-400" :
                  healthScore > 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                )}>{healthScore}%</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <Card className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[160px] hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                    Sesi Aktif
                  </span>
                  <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2 leading-none">
                    {stats.live} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Kelas Live</span>
                  </h4>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Activity size={20} className={cn(stats.live > 0 && "animate-pulse")} />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {stats.finished} sesi selesai dari {stats.total} total jadwal hari ini
              </p>
            </Card>

            <Card className={cn(
              "rounded-2xl border shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[160px] hover:shadow-md transition-all",
              stats.teacherNotArrived > 0
                ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60"
                : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800"
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                    Belum Masuk
                  </span>
                  <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2 leading-none">
                    {stats.teacherNotArrived} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Sesi</span>
                  </h4>
                </div>
                <div className={cn(
                  "p-3 rounded-2xl",
                  stats.teacherNotArrived > 0
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                )}>
                  {stats.teacherNotArrived > 0 ? (
                    <Clock size={20} className="animate-pulse" />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {stats.teacherNotArrived > 0
                  ? 'Menunggu guru tap masuk / buka kelas'
                  : 'Semua guru KBM aktif telah masuk kelas'}
              </p>
            </Card>

            <Card className={cn(
              "rounded-2xl border shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[160px] hover:shadow-md transition-all",
              stats.teacherAlpa > 0
                ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/60"
                : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800"
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                    Kelas Kosong
                  </span>
                  <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2 leading-none">
                    {stats.teacherAlpa} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Sesi</span>
                  </h4>
                </div>
                <div className={cn(
                  "p-3 rounded-2xl",
                  stats.teacherAlpa > 0
                    ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                )}>
                  {stats.teacherAlpa > 0 ? (
                    <ShieldAlert size={20} className="animate-bounce" />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {stats.teacherAlpa > 0
                  ? 'Memerlukan penugasan Guru Inval di Meja Piket'
                  : 'Semua kelas terisi guru / tertangani dengan baik'}
              </p>
            </Card>

            <Card className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[160px] hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                    Jurnal Materi
                  </span>
                  <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2 leading-none">
                    {journalPct}% <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Terisi</span>
                  </h4>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <BookOpen size={20} />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {stats.withJournal} jurnal materi KBM mandiri telah diinput guru
              </p>
            </Card>
          </div>

          {/* Action Strip (Catatan Khusus + Tombol Buka Live KBM dalam 1 Baris Elegan) */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">
                Catatan KBM:
              </span>
              {stats.teacherDinasLuar > 0 && (
                <span className="px-2.5 py-1 rounded-lg font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 text-xs">
                  🟣 {stats.teacherDinasLuar} Guru Dinas Luar
                </span>
              )}
              {stats.teacherInval > 0 && (
                <span className="px-2.5 py-1 rounded-lg font-bold bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200/80 dark:border-fuchsia-800/60 text-xs">
                  🟪 {stats.teacherInval} Guru Inval Aktif
                </span>
              )}
              {stats.teacherIzinSakit > 0 && (
                <span className="px-2.5 py-1 rounded-lg font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-xs">
                  🔵 {stats.teacherIzinSakit} Guru Izin Resmi
                </span>
              )}
              {stats.teacherLate > 0 && (
                <span className="px-2.5 py-1 rounded-lg font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 text-xs">
                  🟡 {stats.teacherLate} Guru Terlambat
                </span>
              )}
              {stats.teacherDinasLuar === 0 && stats.teacherInval === 0 && stats.teacherIzinSakit === 0 && stats.teacherLate === 0 && (
                <span className="text-xs text-slate-400 font-medium italic">
                  Semua guru terjadwal hadir normal di kelas
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
              <Link
                to="/dashboard?tab=kelola&subtab=GURU_KBM"
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Meja Piket (Guru Belum Masuk)</span>
                <ArrowRight size={12} />
              </Link>
              <Link
                to="/attendance/monitoring"
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <span>Buka Live KBM Command Center</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Analytic Overview Cards (Level 2) */}
          <KbmStatCards
            stats={stats}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            teacherStatusFilter={teacherStatusFilter}
            setTeacherStatusFilter={setTeacherStatusFilter}
            healthScore={healthScore}
          />

          {/* 2. Controls & Filters Row */}
          <KbmFilters
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedJurusanId={selectedJurusanId}
            setSelectedJurusanId={setSelectedJurusanId}
            selectedKelasId={selectedKelasId}
            setSelectedKelasId={setSelectedKelasId}
            jurusanOptions={jurusanOptions}
            kelasOptions={kelasOptions}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isLoading={isLoading}
            refetchSessions={refetchSessions}
            handleExport={handleExport}
          />

          {/* 3. Session List/Grid/Table */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Sinkronisasi Data...</p>
                </motion.div>
              ) : viewMode === 'TABLE' ? (
                <KbmSessionTable
                  sessions={processedSessions}
                  onSelectSession={setSelectedSesi}
                  formatTime={formatTime}
                />
              ) : processedSessions.length > 0 ? (
                <div className={viewMode === 'GRID' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : "space-y-1.5"}>
                  {processedSessions.map((sesi) => (
                    <KbmSessionCard
                      key={sesi.id}
                      session={sesi}
                      viewMode={viewMode}
                      isExpanded={expandedSesiId === sesi.id}
                      onToggleExpand={() => setExpandedSesiId(expandedSesiId === sesi.id ? null : sesi.id)}
                      formatTime={formatTime}
                      onSendWaReminder={handleSendWaReminder}
                      onChangeStatus={handleOpenStatusModal}
                    />
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-24 text-center bg-white dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-800 shadow-inner"
                >
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/20 rounded-full animate-ping opacity-20" />
                    <div className="relative z-10 w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600">
                      <BookOpen size={32} />
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Data Tidak Ditemukan</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto font-medium">
                    {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : 'Belum ada aktivitas pembelajaran yang tercatat untuk hari ini.'}
                  </p>
                  {searchTerm && (
                    <Button variant="ghost" onClick={handleResetSearch} className="mt-4 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                      Reset Pencarian
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <KbmDetailModal
        selectedSesi={selectedSesi}
        onClose={handleCloseDetail}
        detailLoading={detailLoading}
        detailAttendance={detailAttendance}
        journalModalOpen={journalModalOpen}
        setJournalModalOpen={setJournalModalOpen}
      />

      <JurnalKbmModal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        sesiId={selectedSesi?.id || ''}
        initialData={selectedSesi?.ProgresMateri}
        readOnly={true}
      />

      {/* 🛡️ Modal Penugasan Inval & Status Kehadiran Guru KBM */}
      {statusModalOpen && selectedStatusSession && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => {
            if (!isSubmittingStatus) {
              setStatusModalOpen(false);
              setSelectedStatusSession(null);
            }
          }}
          title="Ubah Status / Penugasan Guru Inval"
          size="md"
        >
          <div className="space-y-4 text-slate-800 dark:text-slate-200">
            {/* Session Information Banner */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {selectedStatusSession.Kelas?.nama_kelas || selectedStatusSession.kelas_nama || 'Kelas'}
                </span>
                <span className="font-mono font-bold text-slate-500">
                  {selectedStatusSession.jam_mulai || '--:--'} - {selectedStatusSession.jam_selesai || '--:--'} WIB
                </span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {selectedStatusSession.Mapel?.nama_mapel || selectedStatusSession.mapel_nama || 'Mata Pelajaran'}
              </p>
              <p className="text-xs text-slate-500">
                Guru Pengampu: <strong className="text-slate-700 dark:text-slate-300">{selectedStatusSession.Guru?.nama_guru || selectedStatusSession.guru_nama || '-'}</strong>
              </p>
            </div>

            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status Keberadaan Guru
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'IZIN', label: 'Izin Resmi' },
                  { id: 'SAKIT', label: 'Sakit' },
                  { id: 'PENUGASAN', label: 'Dinas Luar' },
                  { id: 'ALPA', label: 'Alpa / Mangkir' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStatus(st.id as any)}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer text-center",
                      selectedStatus === st.id
                        ? "bg-amber-500 border-amber-600 text-slate-950 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guru Inval Selector (Optional / Suggested) */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Tugaskan Guru Inval (Pengganti)</span>
                <span className="text-[10px] font-normal text-slate-400">Opsional</span>
              </label>
              <select
                value={selectedGuruInvalId}
                onChange={(e) => setSelectedGuruInvalId(e.target.value)}
                className="w-full text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="">-- Tidak Ada Guru Inval (Kelas Kosong Terbimbing) --</option>
                {guruList.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.nama_guru || g.nama} {g.nip ? `(NIP: ${g.nip})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Catatan Tambahan */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Catatan Petugas / Keterangan
              </label>
              <textarea
                value={catatanText}
                onChange={(e) => setCatatanText(e.target.value)}
                placeholder="Contoh: Izin mendampingi lomba, tugas mandiri telah diupload..."
                rows={2}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusModalOpen(false);
                setSelectedStatusSession(null);
              }}
              disabled={isSubmittingStatus}
              className="text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmitStatus}
              disabled={isSubmittingStatus}
              className="text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 border-none"
            >
              {isSubmittingStatus ? 'Menyimpan...' : 'Simpan Status & Inval'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};
