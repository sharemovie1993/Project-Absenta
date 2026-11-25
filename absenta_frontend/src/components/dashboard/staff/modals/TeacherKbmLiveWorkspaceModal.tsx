import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Layers, 
  Search, 
  Sparkles, 
  Users, 
  X, 
  AlertTriangle, 
  CheckCheck, 
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Check,
  Camera,
  QrCode
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { getPresensiTerpaduSesi } from '@/api/attendanceGerbang.api';
import { requestWithFallback, formatErrorMessage } from '@/api/apiUtils';
import { CatatanAbsensiModal } from '@/components/attendance/modals/CatatanAbsensiModal';
import { SesiScanningModal } from '@/components/attendance/sesi/SesiScanningModal';
import { useTeacherSesiScanner } from '@/hooks/attendance/useTeacherSesiScanner';
import { 
  formatLocalDateTime, 
  getVirtualDate, 
  getTimezone, 
  formatLocalTimeFromISO,
  toLocalDate 
} from '@/utils/attendance/time';
import type { TimelineItem } from '../tabs/StaffKbmAbsenTab';
import type { SesiAttendanceRecord } from '@/components/attendance/sesi/SesiAttendanceList';

export interface TeacherKbmLiveWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineItem: TimelineItem | null;
  guruId?: string;
  guruNama?: string;
  onOpenPhotoModal?: (item: TimelineItem) => void;
  onOpenJournalModal?: (item: TimelineItem) => void;
  onOpenBahanAjar?: (item: TimelineItem) => void;
  onSessionFinished?: () => void;
}

export const TeacherKbmLiveWorkspaceModal: React.FC<TeacherKbmLiveWorkspaceModalProps> = ({
  isOpen,
  onClose,
  timelineItem,
  guruId,
  guruNama,
  onOpenPhotoModal,
  onOpenJournalModal,
  onOpenBahanAjar,
  onSessionFinished,
}) => {
  const queryClient = useQueryClient();

  const sesi = timelineItem?.session;
  const effectiveSesiId = sesi?.id || (timelineItem?.id && !String(timelineItem.id).startsWith('sched_') ? timelineItem.id : undefined);

  // ── Existing KBM Engine Governance Rules (Identik dengan StaffKbmAbsenTab & SesiAttendanceList) ──
  const isOpenedByPetugas = Boolean(
    timelineItem?.opened_by === 'PETUGAS_KELAS' ||
    sesi?.opened_by === 'PETUGAS_KELAS' ||
    timelineItem?.opened_by_petugas ||
    sesi?.opened_by_petugas ||
    (sesi as any)?.keterangan?.includes('[DIBUKA_PETUGAS_KELAS]')
  );

  const isTeacherPresent = Boolean(
    (['HADIR', 'TEPAT_WAKTU', 'TERLAMBAT'].includes(String(timelineItem?.guru_status || '').toUpperCase())) ||
    timelineItem?.AbsenGuru?.[0]?.waktu_tap ||
    sesi?.AbsenGuru?.[0]?.waktu_tap ||
    (timelineItem?.session?.waktu_tap) ||
    (sesi?.foto_kegiatan && !isOpenedByPetugas && timelineItem?.opened_by !== 'PETUGAS_KELAS' && sesi?.opened_by !== 'PETUGAS_KELAS')
  );
  const isStartedByTeacher = isTeacherPresent;

  const isSessionOpen = Boolean(
    sesi?.status === 'BERLANGSUNG' ||
    timelineItem?.status === 'BERLANGSUNG' ||
    sesi?.foto_kegiatan ||
    isOpenedByPetugas ||
    isTeacherPresent
  );

  const isFinished = Boolean(
    timelineItem?.isFinished ??
    timelineItem?.status?.isFinished ??
    (timelineItem?.status === 'SELESAI' || sesi?.status === 'SELESAI')
  );

  const isOverdue = Boolean(
    timelineItem?.is_overdue ??
    timelineItem?.isOverdue ??
    timelineItem?.status?.isOverdue ??
    timelineItem?._summary?.isOverdue ??
    (timelineItem?.status !== 'SELESAI' && timelineItem?.waktu_selesai && new Date(timelineItem.waktu_selesai).getTime() < Date.now())
  );

  const isReportMode = Boolean(isFinished || isOverdue);
  const canMarkAttendance = (isSessionOpen || isTeacherPresent) && !isReportMode;
  const canOpenJournal = Boolean(isSessionOpen || isTeacherPresent || isReportMode);

  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => setNowTick(new Date()), 30_000);
    return () => clearInterval(t);
  }, [isOpen]);

  const rawJamMulai: string = timelineItem?.jam_mulai || '';
  const canStartSessionNow = useMemo(() => {
    if (isSessionOpen || isTeacherPresent || timelineItem?.isReadyToOpen || timelineItem?.status?.isReadyToOpen) {
      return true;
    }
    if (!rawJamMulai || !rawJamMulai.includes(':')) return true;
    const [h, m] = rawJamMulai.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return true;
    const startMinutes = h * 60 + m;
    const currentMinutes = nowTick.getHours() * 60 + nowTick.getMinutes();
    return currentMinutes >= startMinutes - 15;
  }, [isSessionOpen, isTeacherPresent, timelineItem, rawJamMulai, nowTick]);

  // ── 1. ACTIVE ATTENDANCE QUERY ──
  const { data: presensiRes, isLoading: loadingPresensi, refetch: refetchAttendance } = useQuery({
    queryKey: ['sesi-detail-attendance', effectiveSesiId],
    queryFn: () => getPresensiTerpaduSesi(effectiveSesiId!),
    enabled: Boolean(isOpen && effectiveSesiId),
    refetchInterval: isOpen ? 12000 : false,
  });

  const sesiScanner = useTeacherSesiScanner({
    onSuccess: () => {
      refetchAttendance();
    },
  });

  const rawRecords: SesiAttendanceRecord[] = useMemo(() => {
    const raw = presensiRes?.data || presensiRes;
    return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  }, [presensiRes]);

  // Exclude teacher row from student workspace to keep attendance focused on students
  const studentRecords = useMemo(() => {
    return rawRecords.filter(r => !r.is_guru && (r as any).nisn !== 'GURU' && (r as any)._type !== 'guru');
  }, [rawRecords]);

  // Local optimistic state
  const [localRecords, setLocalRecords] = useState<SesiAttendanceRecord[]>(studentRecords);
  useEffect(() => {
    setLocalRecords(studentRecords);
  }, [studentRecords]);

  // ── 2. SEARCH & FILTERING ──
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELUM_TAP' | 'HADIR' | 'IZIN_SAKIT' | 'ALPA' | 'DISPEN'>('ALL');

  // Note Modal State
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ siswaAkademikId: string; studentName: string; status: 'SAKIT' | 'IZIN' | 'DISPEN' } | null>(null);

  // Finish Confirmation Dialog State
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);

  // ── 3. REAL-TIME COUNTDOWN ──
  const [remainingTimeText, setRemainingTimeText] = useState<string>('');
  const [isTimeOver, setIsTimeOver] = useState(false);

  useEffect(() => {
    if (!isOpen || !timelineItem?.jam_selesai) return;

    const calculateRemaining = () => {
      const now = getVirtualDate();
      const [endH, endM] = timelineItem.jam_selesai.split(':').map(Number);
      const endDate = new Date(now);
      endDate.setHours(endH || 0, endM || 0, 0, 0);

      const diffMs = endDate.getTime() - now.getTime();
      if (diffMs <= 0) {
        setRemainingTimeText('Waktu KBM Selesai');
        setIsTimeOver(true);
      } else {
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) {
          setRemainingTimeText(`${hours}j ${minutes}m tersisa`);
        } else {
          setRemainingTimeText(`${minutes} menit tersisa`);
        }
        setIsTimeOver(false);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 30000);
    return () => clearInterval(interval);
  }, [isOpen, timelineItem?.jam_selesai]);

  // ── 4. STATS COMPUTATION ──
  const stats = useMemo(() => {
    const total = localRecords.length;
    const hadir = localRecords.filter(r => r.status === 'HADIR').length;
    const sakit = localRecords.filter(r => r.status === 'SAKIT').length;
    const izin = localRecords.filter(r => r.status === 'IZIN').length;
    const alpa = localRecords.filter(r => r.status === 'ALPA').length;
    const dispen = localRecords.filter(r => r.status === 'DISPEN' || r.catatan?.includes('DISPENSASI')).length;
    const belum = localRecords.filter(r => !r.status || r.status === 'BELUM_TAP').length;
    const percentHadir = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { total, hadir, sakit, izin, alpa, dispen, belum, percentHadir };
  }, [localRecords]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return localRecords.filter(record => {
      const studentName = record.Siswa?.nama_siswa || (record as any).nama_siswa || (record as any).nama || '';
      const nisn = record.Siswa?.nis || (record as any).nis || '';
      const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) || nisn.includes(searchTerm);
      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'BELUM_TAP') return !record.status || record.status === 'BELUM_TAP';
      if (statusFilter === 'HADIR') return record.status === 'HADIR';
      if (statusFilter === 'IZIN_SAKIT') return record.status === 'IZIN' || record.status === 'SAKIT';
      if (statusFilter === 'ALPA') return record.status === 'ALPA';
      if (statusFilter === 'DISPEN') return record.status === 'DISPEN' || record.catatan?.includes('DISPENSASI');
      return true;
    });
  }, [localRecords, searchTerm, statusFilter]);

  // ── 5. MUTATION: UPDATE INDIVIDUAL ATTENDANCE ──
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ siswaAkademikId, status, catatan, waktu_tap }: { siswaAkademikId: string; status: string; catatan?: string; waktu_tap?: string }) => {
      if (!effectiveSesiId) throw new Error('Sesi belum dibuka');
      return requestWithFallback('post', `/attendance/sesi-absensi/${effectiveSesiId}/tap-siswa`, {
        data: {
          siswa_akademik_id: siswaAkademikId,
          status,
          waktu_tap,
          catatan
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance', effectiveSesiId] });
      queryClient.invalidateQueries({ queryKey: ['staff-timeline-unified'] });
      queryClient.invalidateQueries({ queryKey: ['guru-monitoring-unified'] });
    },
    onError: (err: any) => {
      setLocalRecords(studentRecords);
      const msg = formatErrorMessage(err);
      toast.error('Gagal memperbarui status: ' + msg);
    }
  });

  const handleUpdateStatus = (siswaAkademikId: string, status: string, catatan?: string) => {
    if (!canMarkAttendance) {
      if (!isStartedByTeacher) {
        toast.error('Sesi belum dibuka oleh Guru. Ambil foto Mulai KBM terlebih dahulu.');
      } else {
        toast.error('Sesi KBM telah selesai. Presensi sudah ditutup.');
      }
      return;
    }

    if (['SAKIT', 'IZIN', 'DISPEN'].includes(status) && catatan === undefined) {
      const rec = localRecords.find(r => (r.siswa_akademik_id || r.siswa_id || r.id) === siswaAkademikId);
      const studentName = rec?.Siswa?.nama_siswa || (rec as any)?.nama_siswa || 'Siswa';
      setNoteTarget({ siswaAkademikId, studentName, status: status as any });
      setNoteModalOpen(true);
      return;
    }

    const tenantNowISO = formatLocalDateTime(getVirtualDate());
    const targetRec = localRecords.find(r => (r.siswa_akademik_id || r.siswa_id || r.id) === siswaAkademikId);
    const historicalTap = targetRec?.original_waktu_tap || (targetRec?.status === 'HADIR' ? targetRec?.waktu_tap : null);
    const effectiveTap = status === 'HADIR' ? (historicalTap || tenantNowISO) : null;

    // Optimistic Update
    setLocalRecords(prev =>
      prev.map(r => {
        const rowId = r.siswa_akademik_id || r.siswa_id || r.id;
        if (rowId !== siswaAkademikId) return r;
        return {
          ...r,
          status,
          catatan: catatan !== undefined ? catatan : r.catatan,
          waktu_tap: effectiveTap,
          original_waktu_tap: historicalTap || effectiveTap,
          is_terlambat: false
        };
      })
    );

    updateAttendanceMutation.mutate({
      siswaAkademikId,
      status,
      catatan,
      waktu_tap: effectiveTap || undefined
    });
  };

  const handleNoteSubmit = async (catatan: string) => {
    if (!noteTarget) return;
    const { siswaAkademikId, status } = noteTarget;
    handleUpdateStatus(siswaAkademikId, status, catatan);
  };

  // ── 6. MUTATION: BULK TANDAI SEMUA HADIR (LIGHTNING ATTENDANCE) ──
  const [isBulkPending, setIsBulkPending] = useState(false);

  const handleMarkAllPresent = async () => {
    if (!canMarkAttendance) {
      if (!isStartedByTeacher) {
        toast.error('Sesi belum dibuka oleh Guru. Ambil foto Mulai KBM terlebih dahulu.');
      } else {
        toast.error('Sesi KBM telah selesai. Presensi sudah ditutup.');
      }
      return;
    }

    const uncommittedStudents = localRecords.filter(r => !r.status || r.status === 'BELUM_TAP');
    if (uncommittedStudents.length === 0) {
      toast('Seluruh siswa sudah memiliki status kehadiran', { icon: 'ℹ️' });
      return;
    }

    setIsBulkPending(true);
    const tenantNowISO = formatLocalDateTime(getVirtualDate());

    // Instant Optimistic Update
    setLocalRecords(prev =>
      prev.map(r => {
        if (!r.status || r.status === 'BELUM_TAP') {
          return {
            ...r,
            status: 'HADIR',
            waktu_tap: tenantNowISO,
            original_waktu_tap: tenantNowISO,
            is_terlambat: false
          };
        }
        return r;
      })
    );

    try {
      // Execute in parallel batches of 5 to avoid server socket saturation
      const batchSize = 6;
      for (let i = 0; i < uncommittedStudents.length; i += batchSize) {
        const slice = uncommittedStudents.slice(i, i + batchSize);
        await Promise.all(
          slice.map(s => {
            const sid = s.siswa_akademik_id || s.siswa_id || s.id;
            return requestWithFallback('post', `/attendance/sesi-absensi/${effectiveSesiId}/tap-siswa`, {
              data: {
                siswa_akademik_id: sid,
                status: 'HADIR',
                waktu_tap: tenantNowISO
              }
            });
          })
        );
      }

      toast.success(`⚡ Berhasil! ${uncommittedStudents.length} siswa ditandai Hadir.`);
      queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance', effectiveSesiId] });
      queryClient.invalidateQueries({ queryKey: ['staff-timeline-unified'] });
      queryClient.invalidateQueries({ queryKey: ['guru-monitoring-unified'] });
    } catch (err: any) {
      toast.error('Sebagian presensi gagal disimpan. Silakan periksa kembali.');
      refetchAttendance();
    } finally {
      setIsBulkPending(false);
    }
  };

  // ── 7. MUTATION: SELESAIKAN SESI KBM ──
  const finishSessionMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveSesiId) throw new Error('Sesi tidak valid');
      return requestWithFallback('patch', `/attendance/sesi-absensi/${effectiveSesiId}/status`, {
        data: { status: 'SELESAI' }
      });
    },
    onSuccess: () => {
      toast.success('🎉 Sesi KBM Berhasil Dituntaskan!');
      setIsFinishConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff-timeline-unified'] });
      queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance', effectiveSesiId] });
      queryClient.invalidateQueries({ queryKey: ['guru-monitoring-unified'] });
      if (onSessionFinished) onSessionFinished();
      onClose();
    },
    onError: (err: any) => {
      const msg = formatErrorMessage(err);
      toast.error('Gagal menyelesaikan sesi: ' + msg);
    }
  });

  if (!isOpen || !timelineItem) return null;

  const kelasNama = timelineItem.kelas_nama || (timelineItem as any).kelas || 'Kelas';
  const mapelNama = timelineItem.kegiatan || timelineItem.mapel_nama || (timelineItem as any).mapel || 'Mata Pelajaran';
  const jamKe = timelineItem.jam_label || (timelineItem.slot_index != null ? `Jam ${timelineItem.slot_index}` : '');
  const jamRentang = `${timelineItem.jam_mulai || ''} - ${timelineItem.jam_selesai || ''} WIB`;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md overflow-hidden select-none">
        {/* ── TOP IMMERSIVE HEADER (ZEN WORKSPACE NAVBAR) ── */}
        <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3 shrink-0 text-slate-900 dark:text-white shadow-xs">
          {/* Left: Back & Class Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              title="Tutup Meja Kerja Kelas & Kembali ke Dashboard"
              className="h-9 px-2 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 active:scale-95 cursor-pointer shrink-0"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 text-[11px] sm:text-sm font-black tracking-wide shrink-0">
                {kelasNama}
              </span>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[130px] xs:max-w-[190px] sm:max-w-md">
                  {mapelNama}
                </h2>
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  <span>{jamKe}</span>
                  <span>•</span>
                  <span>{jamRentang}</span>
                  {isOpenedByPetugas && (
                    <>
                      <span>•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        Dibuka Petugas Kelas
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Real-time Countdown & Primary Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Timer Badge */}
            {remainingTimeText && (
              <div className={cn(
                "hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono font-bold",
                isTimeOver
                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
              )}>
                <Clock size={13} className={isTimeOver ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-indigo-600 dark:text-indigo-400"} />
                <span>{remainingTimeText}</span>
              </div>
            )}

            {/* Quick Button: Bahan Ajar */}
            {onOpenBahanAjar && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onOpenBahanAjar(timelineItem)}
                className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Buka Bahan Ajar / Perangkat Pembelajaran"
              >
                <BookOpen size={14} />
                <span className="hidden md:inline">Bahan Ajar</span>
              </Button>
            )}

            {/* Quick Button: Jurnal KBM */}
            {onOpenJournalModal && (
              <Button
                type="button"
                size="sm"
                disabled={!canOpenJournal}
                onClick={() => {
                  if (!canOpenJournal) return;
                  onOpenJournalModal(timelineItem);
                }}
                className={cn(
                  "h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-black flex items-center gap-1 border-none transition-all",
                  !canOpenJournal
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs"
                )}
                title={!canOpenJournal ? "Jurnal KBM aktif setelah sesi dibuka" : "Isi Jurnal KBM Kelas Ini"}
              >
                <FileText size={14} />
                <span>Jurnal</span>
              </Button>
            )}

            {/* Quick Button: Ambil Foto Kehadiran Guru jika Guru Belum Hadir */}
            {!isTeacherPresent && !isReportMode && onOpenPhotoModal && (
              <Button
                type="button"
                size="sm"
                disabled={!canStartSessionNow}
                onClick={() => {
                  if (!canStartSessionNow) return;
                  onOpenPhotoModal(timelineItem);
                }}
                className={cn(
                  "h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all",
                  !canStartSessionNow
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-xs border-none animate-pulse"
                )}
                title={
                  !canStartSessionNow
                    ? `Foto Masuk Guru aktif 15 menit sebelum jam KBM (${rawJamMulai} WIB)`
                    : "Sesi telah aktif. Klik untuk mengambil foto verifikasi kehadiran Guru di kelas"
                }
              >
                <Camera size={14} />
                <span>📸 Foto Masuk Guru</span>
              </Button>
            )}

            {/* Quick Button: Update Foto jika Guru Sudah Hadir */}
            {isTeacherPresent && !isReportMode && onOpenPhotoModal && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenPhotoModal(timelineItem)}
                className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer"
                title="Perbarui foto dokumentasi KBM guru"
              >
                <Camera size={14} className="text-emerald-500" />
                <span>Foto Guru ✓</span>
              </Button>
            )}

            {/* Finish Session Button (hanya jika sesi sedang berlangsung) */}
            {(isSessionOpen || isStartedByTeacher) && !isFinished && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsFinishConfirmOpen(true)}
                className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs border-none"
                title="Selesaikan sesi KBM hari ini"
              >
                <CheckCircle2 size={14} />
                <span className="hidden sm:inline">Selesaikan Sesi</span>
                <span className="sm:hidden">Selesai</span>
              </Button>
            )}
          </div>
        </header>

        {/* ── SUB-HEADER: SUMMARY STRIP & ACTION BAR ── */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-50/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs shrink-0 shadow-2xs">
              <Users size={13} className="text-slate-500 dark:text-slate-400" />
              <span>Total: <strong className="text-slate-900 dark:text-white font-black">{stats.total}</strong></span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 flex items-center gap-1.5 text-xs shrink-0 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span>Hadir: <strong className="text-emerald-950 dark:text-white font-black">{stats.hadir}</strong> ({stats.percentHadir}%)</span>
            </div>

            {stats.belum > 0 && (
              <div className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300 flex items-center gap-1.5 text-xs shrink-0 font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                <span>Belum: <strong className="text-amber-950 dark:text-white font-black">{stats.belum}</strong></span>
              </div>
            )}

            {stats.izin + stats.sakit > 0 && (
              <div className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-300 flex items-center gap-1.5 text-xs shrink-0">
                <span>Izin/Sakit: <strong className="text-blue-950 dark:text-white font-black">{stats.izin + stats.sakit}</strong></span>
              </div>
            )}

            {stats.alpa > 0 && (
              <div className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300 flex items-center gap-1.5 text-xs shrink-0">
                <span>Alpa: <strong className="text-rose-950 dark:text-white font-black">{stats.alpa}</strong></span>
              </div>
            )}
          </div>

          {/* Quick Actions: Scan RFID / QR + Lightning Mark All Present + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!canMarkAttendance || !effectiveSesiId}
              onClick={() => sesiScanner.openScanModal(timelineItem)}
              title={!isSessionOpen && !isTeacherPresent ? "Sesi belum dibuka oleh Guru" : isReportMode ? "Sesi telah selesai" : "Buka Terminal Scan Kartu RFID / QR Siswa"}
              className={cn(
                "w-full sm:w-auto h-9 sm:h-10 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm shadow-indigo-950/20 flex items-center justify-center gap-1.5 border-none cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0",
                (!canMarkAttendance || !effectiveSesiId) && "opacity-40 cursor-not-allowed pointer-events-none"
              )}
            >
              <QrCode size={14} />
              <span>Scan RFID / QR</span>
            </button>

            {stats.belum > 0 && (
              <button
                type="button"
                disabled={isBulkPending || !canMarkAttendance}
                onClick={handleMarkAllPresent}
                title={!isStartedByTeacher ? "Sesi belum dibuka oleh Guru" : isReportMode ? "Sesi telah selesai" : "Tandai semua siswa yang belum absen sebagai HADIR"}
                className={cn(
                  "w-full sm:w-auto h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-sm shadow-emerald-950/20 flex items-center justify-center gap-1.5 border-none cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0",
                  !canMarkAttendance && "opacity-40 cursor-not-allowed pointer-events-none"
                )}
              >
                {isBulkPending ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} className="text-amber-300" />
                )}
                <span>⚡ Tandai Semua Hadir ({stats.belum})</span>
              </button>
            )}

            <div className="relative w-full sm:w-auto sm:min-w-[200px] md:min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama atau NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 sm:h-10 pl-8 pr-3 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 shadow-2xs transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── FILTER PILLS ── */}
        <div className="px-3 sm:px-6 py-2 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { key: 'ALL', label: 'Semua Siswa', count: stats.total },
            { key: 'BELUM_TAP', label: 'Belum Absen', count: stats.belum, highlight: stats.belum > 0 },
            { key: 'HADIR', label: 'Hadir', count: stats.hadir },
            { key: 'IZIN_SAKIT', label: 'Izin / Sakit', count: stats.izin + stats.sakit },
            { key: 'DISPEN', label: 'Dispen', count: stats.dispen },
            { key: 'ALPA', label: 'Alpa', count: stats.alpa },
          ].map(f => {
            const isActive = statusFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key as any)}
                className={cn(
                  "h-7.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border",
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : f.highlight
                    ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 hover:bg-amber-100"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                )}
              >
                <span>{f.label}</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black",
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                )}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── MAIN WORKSPACE CONTENT: ERGONOMIC ATTENDANCE LIST ── */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-6 bg-slate-100/70 dark:bg-slate-950 space-y-2.5 pb-24 sm:pb-8">
          {/* 🛡️ Banner Aturan KBM: Sesi Dibuka Oleh Petugas Kelas / Guru Belum Ambil Foto */}
          {!isTeacherPresent && !isReportMode && (
            <div className="max-w-5xl mx-auto mb-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-amber-950 dark:text-amber-300 text-xs sm:text-sm">
                    {isSessionOpen ? "Sesi KBM Telah Dibuka Oleh Petugas Kelas (Guru Belum Hadir)" : "Sesi KBM Belum Dibuka"}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-amber-800/90 dark:text-amber-200/80 mt-0.5">
                    {!canStartSessionNow
                      ? `Sesi belum dapat dibuka. Tombol Foto Kehadiran Guru akan aktif otomatis 15 menit sebelum jam KBM (${rawJamMulai} WIB).`
                      : isSessionOpen
                      ? "Petugas kelas telah membuka sesi untuk mengabsenkan siswa. Silakan Bapak/Ibu Guru mengambil foto verifikasi di kelas agar kehadiran tercatat sebagai HADIR."
                      : "Presensi siswa terkunci. Sesuai aturan KBM, Guru pengampu wajib membuka sesi (ambil foto Mulai KBM) terlebih dahulu sebelum dapat mengabsenkan siswa."}
                  </p>
                </div>
              </div>
              {onOpenPhotoModal && (
                <button
                  type="button"
                  disabled={!canStartSessionNow}
                  onClick={() => {
                    if (!canStartSessionNow) return;
                    onOpenPhotoModal(timelineItem);
                  }}
                  title={!canStartSessionNow ? `Aktif 15 menit sebelum jam KBM (${rawJamMulai} WIB)` : "Ambil foto kehadiran guru"}
                  className={cn(
                    "w-full sm:w-auto px-4 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shrink-0",
                    !canStartSessionNow
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-70"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-xs active:scale-95"
                  )}
                >
                  <Camera size={15} />
                  <span>📸 Ambil Foto Kehadiran Guru</span>
                </button>
              )}
            </div>
          )}

          {/* 🛡️ Banner Aturan KBM: Sesi Selesai / Mode Rekap Arsip */}
          {isReportMode && (
            <div className="max-w-5xl mx-auto mb-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-slate-700 dark:text-slate-300 shadow-2xs">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={18} />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-200 text-xs sm:text-sm">Mode Rekap Presensi</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sesi KBM ini telah {isFinished ? 'selesai' : 'terlewat'}. Data kehadiran siswa berstatus arsip (hanya lihat).
                </p>
              </div>
            </div>
          )}

          {loadingPresensi && studentRecords.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Memuat Roster Presensi Siswa...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center space-y-2 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 max-w-md mx-auto shadow-2xs">
              <Search className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300">Tidak Ada Siswa Ditemukan</h4>
              <p className="text-xs text-slate-500">
                {searchTerm ? `Pencarian "${searchTerm}" tidak cocok dengan data siswa.` : 'Tidak ada siswa pada filter ini.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-w-5xl mx-auto">
              {filteredStudents.map((record, index) => {
                const studentId = record.siswa_akademik_id || record.siswa_id || record.id || '';
                const namaSiswa = record.Siswa?.nama_siswa || (record as any).nama_siswa || (record as any).nama || 'Siswa';
                const nisn = record.Siswa?.nis || (record as any).nis || (record as any).nisn || '';
                const isLate = Boolean(record.is_terlambat) && record.status === 'HADIR';
                const isPendingThis = updateAttendanceMutation.isPending && updateAttendanceMutation.variables?.siswaAkademikId === studentId;

                const rawTap = record.waktu_tap;
                const tapDisplay = rawTap ? formatLocalTimeFromISO(rawTap) || String(rawTap).slice(11, 16) : null;

                return (
                  <div
                    key={studentId || index}
                    className={cn(
                      "p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs",
                      record.status === 'HADIR'
                        ? "bg-emerald-50/70 border-emerald-300/80 dark:bg-slate-900/90 dark:border-emerald-500/30"
                        : record.status === 'SAKIT'
                        ? "bg-amber-50/70 border-amber-300/80 dark:bg-slate-900/90 dark:border-amber-500/30"
                        : record.status === 'IZIN'
                        ? "bg-blue-50/70 border-blue-300/80 dark:bg-slate-900/90 dark:border-blue-500/30"
                        : record.status === 'ALPA'
                        ? "bg-rose-50/70 border-rose-300/80 dark:bg-slate-900/90 dark:border-rose-500/40"
                        : record.status === 'DISPEN'
                        ? "bg-purple-50/70 border-purple-300/80 dark:bg-slate-900/90 dark:border-purple-500/30"
                        : "bg-white border-slate-200/90 dark:bg-slate-900/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    {/* Student Info Left */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate" title={namaSiswa}>
                            {namaSiswa}
                          </h4>
                          {nisn && (
                            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                              {nisn}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                          {tapDisplay ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Tap: {tapDisplay} WIB
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">Belum tap</span>
                          )}

                          {isLate && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold uppercase text-[9px]">
                              Terlambat
                            </span>
                          )}

                          {record.catatan && (
                            <span className="text-indigo-600 dark:text-indigo-400 italic font-sans truncate max-w-xs">
                              • {record.catatan}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Touch Buttons: 5-Column Grid on Mobile, Flex on Desktop */}
                    <div className="grid grid-cols-5 gap-1 sm:gap-1.5 w-full sm:w-auto sm:flex sm:items-center shrink-0">
                      {/* 1. HADIR */}
                      <button
                        type="button"
                        disabled={isPendingThis || !canMarkAttendance}
                        title={!isStartedByTeacher ? "Sesi belum dibuka oleh Guru" : isReportMode ? "Sesi telah selesai" : "Tandai Hadir"}
                        onClick={() => handleUpdateStatus(studentId, 'HADIR')}
                        className={cn(
                          "h-9 sm:h-8 w-full sm:w-auto sm:min-w-[58px] px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center border active:scale-95",
                          !canMarkAttendance && "opacity-40 cursor-not-allowed hover:border-slate-300 dark:hover:border-slate-700",
                          record.status === 'HADIR'
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs"
                            : "bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200 hover:border-emerald-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-400 dark:border-slate-700 dark:hover:border-emerald-500/50"
                        )}
                      >
                        Hadir
                      </button>

                      {/* 2. SAKIT */}
                      <button
                        type="button"
                        disabled={isPendingThis || !canMarkAttendance}
                        title={!isStartedByTeacher ? "Sesi belum dibuka oleh Guru" : isReportMode ? "Sesi telah selesai" : "Tandai Sakit"}
                        onClick={() => handleUpdateStatus(studentId, 'SAKIT')}
                        className={cn(
                          "h-9 sm:h-8 w-full sm:w-auto sm:min-w-[58px] px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center border active:scale-95",
                          !canMarkAttendance && "opacity-40 cursor-not-allowed hover:border-slate-300 dark:hover:border-slate-700",
                          record.status === 'SAKIT'
                            ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border-amber-500 shadow-xs"
                            : "bg-white hover:bg-amber-50 text-amber-700 border-slate-200 hover:border-amber-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-400 dark:border-slate-700 dark:hover:border-amber-500/50"
                        )}
                      >
                        Sakit
                      </button>

                      {/* 3. IZIN */}
                      <button
                        type="button"
                        disabled={isPendingThis || !canMarkAttendance}
                        title={!isStartedByTeacher ? "Sesi belum dibuka oleh Guru" : isReportMode ? "Sesi telah selesai" : "Tandai Izin"}
                        onClick={() => handleUpdateStatus(studentId, 'IZIN')}
                        className={cn(
                          "h-9 sm:h-8 w-full sm:w-auto sm:min-w-[58px] px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center border active:scale-95",
                          !canMarkAttendance && "opacity-40 cursor-not-allowed hover:border-slate-300 dark:hover:border-slate-700",
                          record.status === 'IZIN'
                            ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-xs"
                            : "bg-white hover:bg-blue-50 text-blue-700 border-slate-200 hover:border-blue-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-400 dark:border-slate-700 dark:hover:border-blue-500/50"
                        )}
                      >
                        Izin
                      </button>

                      {/* 4. DISPEN */}
                      <button
                        type="button"
                        disabled={isPendingThis || !canMarkAttendance}
                        title={!isStartedByTeacher ? "Sesi belum dibuka oleh Guru" : isReportMode ? "Sesi telah selesai" : "Tandai Dispen"}
                        onClick={() => handleUpdateStatus(studentId, 'DISPEN')}
                        className={cn(
                          "h-9 sm:h-8 w-full sm:w-auto sm:min-w-[58px] px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center border active:scale-95",
                          !canMarkAttendance && "opacity-40 cursor-not-allowed hover:border-slate-300 dark:hover:border-slate-700",
                          record.status === 'DISPEN'
                            ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-600 shadow-xs"
                            : "bg-white hover:bg-purple-50 text-purple-700 border-slate-200 hover:border-purple-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-purple-400 dark:border-slate-700 dark:hover:border-purple-500/50"
                        )}
                      >
                        Dispen
                      </button>

                      {/* 5. ALPA */}
                      <button
                        type="button"
                        disabled={isPendingThis || !canMarkAttendance}
                        title={!isStartedByTeacher ? "Sesi belum dibuka oleh Guru" : isReportMode ? "Sesi telah selesai" : "Tandai Alpa"}
                        onClick={() => handleUpdateStatus(studentId, 'ALPA')}
                        className={cn(
                          "h-9 sm:h-8 w-full sm:w-auto sm:min-w-[58px] px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center border active:scale-95",
                          !canMarkAttendance && "opacity-40 cursor-not-allowed hover:border-slate-300 dark:hover:border-slate-700",
                          record.status === 'ALPA'
                            ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-600 shadow-xs"
                            : "bg-white hover:bg-rose-50 text-rose-700 border-slate-200 hover:border-rose-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-rose-400 dark:border-slate-700 dark:hover:border-rose-500/50"
                        )}
                      >
                        Alpa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER BAR: SUMMARY & BOTTOM ACTIONS ── */}
        <footer className="h-12 sm:h-14 px-3 sm:px-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline font-semibold">Tersinkronisasi Otomatis ke Server Absenta SSOT</span>
            <span className="sm:hidden font-semibold text-[11px]">Tersinkronisasi SSOT</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </footer>

        {/* ── MODAL: CATATAN ABSENSI (IZIN/SAKIT/DISPEN) ── */}
        <CatatanAbsensiModal
          isOpen={noteModalOpen}
          onClose={() => { setNoteModalOpen(false); setNoteTarget(null); }}
          studentName={noteTarget?.studentName || 'Siswa'}
          status={noteTarget?.status || 'SAKIT'}
          onSubmit={handleNoteSubmit}
        />

        {/* ── MODAL: CONFIRM FINISH SESSION ── */}
        {isFinishConfirmOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-500/30">
                <CheckCircle2 size={24} />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Selesaikan Sesi KBM Ini?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Anda akan menyelesaikan sesi KBM untuk kelas <strong className="text-slate-900 dark:text-white">{kelasNama}</strong> mata pelajaran <strong className="text-slate-900 dark:text-white">{mapelNama}</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Hadir:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-black">{stats.hadir} Siswa</strong>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Izin / Sakit / Dispen:</span>
                  <strong className="text-blue-600 dark:text-blue-400 font-black">{stats.izin + stats.sakit + stats.dispen} Siswa</strong>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Alpa:</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-black">{stats.alpa} Siswa</strong>
                </div>
                {stats.belum > 0 && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold border-t border-slate-200 dark:border-slate-700/80 pt-1.5">
                    <span>Belum Diabsen:</span>
                    <span>{stats.belum} Siswa</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFinishConfirmOpen(false)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={finishSessionMutation.isPending}
                  onClick={() => finishSessionMutation.mutate()}
                  className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-950/20"
                >
                  {finishSessionMutation.isPending ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCheck size={16} />
                  )}
                  <span>Ya, Selesaikan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {sesiScanner.isOpen && (
          <SesiScanningModal
            isOpen={sesiScanner.isOpen}
            onClose={sesiScanner.closeScanModal}
            scannerInputRef={sesiScanner.scannerInputRef}
            scannerInput={sesiScanner.scannerInput}
            setScannerInput={sesiScanner.setScannerInput}
            scanLoading={sesiScanner.scanLoading}
            onSubmitScan={sesiScanner.submitScan}
            inputModalSesiId={sesiScanner.sesiId}
            sessionAttendanceRecords={studentRecords}
            currentSession={sesiScanner.currentSession}
            kelasLabel={sesiScanner.kelasLabel}
          />
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
};
