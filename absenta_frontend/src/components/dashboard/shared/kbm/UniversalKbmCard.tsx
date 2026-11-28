import React, { useMemo, useState, lazy, Suspense, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Layers, 
  User, 
  Users, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Camera, 
  FileText, 
  X, 
  Volume2, 
  QrCode, 
  CheckCircle2, 
  Trash, 
  Eye, 
  Sparkles,
  AlertCircle,
  MessageSquare,
  Send,
  ExternalLink,
  ShieldCheck,
  Laptop,
  Video,
  Link2
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getJadwalKegiatan } from '@/api/attendance/jadwalKegiatan.api';
import { tapSiswaKeSesi } from '@/api/attendanceGerbang.api';
import { Button, PersonPhoto } from '@/components/ui';
import { cn } from '@/lib/utils';
import { 
  getSessionStatusMeta, 
  getTeacherStatusMeta, 
  type SessionStatusMeta, 
  type TeacherStatusMeta 
} from '@/utils/kbm-normalizer';

const VirtualMeetingModal = lazy(() =>
  import('@/components/communication/meeting/VirtualMeetingModal').then((m) => ({ default: m.VirtualMeetingModal }))
);
const BahanAjarReaderModal = lazy(() =>
  import('@/components/kurikulum/bahan-ajar/BahanAjarReaderModal').then((m) => ({ default: m.BahanAjarReaderModal }))
);

export type KbmCardMode = 'GURU' | 'SISWA' | 'PETUGAS' | 'MONITORING';

export interface UniversalKbmCardProps {
  mode: KbmCardMode;
  item: any;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  
  // Role Action Callbacks
  onOpenWorkspace?: (item: any) => void;
  onOpenPhotoModal?: (item: any) => void;
  onOpenJournalModal?: (item: any) => void;
  onOpenBahanAjar?: (item: any) => void;
  onOpenScanModal?: (sesiId: string) => void;
  onSelectSession?: (item: any) => void;
  onTestAlert?: (item: any) => void;
  onFinish?: () => void;
  onDelete?: () => void;
  
  onViewPhoto?: (item: any) => void;
  onSendWaReminder?: (item: any, method: 'GATEWAY' | 'PERSONAL_LINK') => void;
  onChangeStatus?: (item: any) => void;
  
  // Siswa Specific Props
  studentStatus?: string;
  studentWaktuTap?: string | null;
  studentMetode?: string;
  
  // Permissions & Customization
  canManage?: boolean;
  canFinish?: boolean;
  hideKelas?: boolean;
  className?: string;
  expandedContent?: React.ReactNode;
}

const UniversalKbmCardComponent: React.FC<UniversalKbmCardProps> = ({
  mode,
  item,
  isExpanded = false,
  onToggleExpand,
  onOpenWorkspace,
  onOpenPhotoModal,
  onOpenJournalModal,
  onOpenBahanAjar,
  onOpenScanModal,
  onSelectSession,
  onTestAlert,
  onFinish,
  onDelete,
  onViewPhoto,
  onSendWaReminder,
  onChangeStatus,
  studentStatus,
  studentWaktuTap,
  studentMetode,
  canManage = true,
  canFinish = true,
  hideKelas = false,
  className,
  expandedContent,
}) => {
  // 1. Resolve Session Status & Teacher Status via SSOT
  const queryClient = useQueryClient();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isInlineDaringOpen, setIsInlineDaringOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isDaringReaderOpen, setIsDaringReaderOpen] = useState(false);
  const [isRecordingDaringPresence, setIsRecordingDaringPresence] = useState(false);
  const [localDaringAttended, setLocalDaringAttended] = useState(false);

  const pm = item.ProgresMateri || item.progres || item.session?.ProgresMateri || item.session?.progres || null;
  const modePelaksanaan = item.mode_pelaksanaan || pm?.mode_pelaksanaan || item.session?.mode_pelaksanaan || 'TATAP_MUKA';
  const isNonKbmActivity = Boolean(
    item.jadwal_kegiatan_id ||
    item.session?.jadwal_kegiatan_id ||
    (item.jenis_kegiatan && String(item.jenis_kegiatan).toUpperCase() !== 'KBM')
  );
  const isPjjDaring = Boolean(
    !isNonKbmActivity && (
      item.is_pjj_daring ||
      item.session?.is_pjj_daring ||
      modePelaksanaan === 'DARING_LIVE' ||
      modePelaksanaan === 'DARING_TUGAS'
    )
  );
  const perangkatAjarId = item.perangkat_ajar_id || pm?.perangkat_ajar_id || item.session?.perangkat_ajar_id || null;
  const referensiList: Array<{ judul: string; url: string }> = useMemo(() => {
    const rawRefs = item.referensi_json || pm?.referensi_json || item.session?.referensi_json;
    return Array.isArray(rawRefs) ? rawRefs : [];
  }, [item, pm]);
  const meetingRoomId = item.meeting_room_id || pm?.meeting_room_id || item.session?.meeting_room_id || `kbm-sesi-${String(item.session?.id || item.id || 'default').replace(/^sched_/, '')}`;

  const classSpecificTask = React.useMemo(() => {
    const tpk = item.tugas_per_kelas || item.session?.tugas_per_kelas || item.permohonan_izin?.tugas_per_kelas;
    if (!tpk || typeof tpk !== 'object') return null;

    const kId = item.kelas_id || item.Kelas?.id || item.session?.kelas_id || '';
    const kNama = item.kelas_nama || item.Kelas?.nama_kelas || item.session?.kelas_nama || item.kelas || '';

    if (kId && tpk[kId]) return String(tpk[kId]);
    if (kNama && tpk[kNama]) return String(tpk[kNama]);

    const normalized = kNama.trim().toUpperCase();
    for (const [k, v] of Object.entries(tpk)) {
      if (k.trim().toUpperCase() === normalized) {
        return String(v);
      }
    }
    return null;
  }, [item]);

  const generalTask = item.instruksi_tugas 
    || pm?.instruksi_tugas
    || item.session?.instruksi_tugas 
    || item.permohonan_izin?.instruksi_tugas 
    || item.tugas 
    || null;

  const taskText = classSpecificTask || generalTask || '';
  const taskFileUrl = item.file_tugas_url || pm?.file_tugas_url || item.session?.file_tugas_url || item.permohonan_izin?.file_tugas_url || item.attachment_url || '';
  const hasTask = Boolean(
    (taskText && taskText.trim().length > 0) ||
    taskFileUrl ||
    perangkatAjarId ||
    referensiList.length > 0 ||
    isPjjDaring
  );

  const effectiveSesiIdForTap = item.session?.id || item.id;
  const effectiveStudentStatus = localDaringAttended ? 'HADIR' : studentStatus;

  const handleStudentEnterDaringSpace = useCallback(async (openAction?: 'TASK_MODAL' | 'INLINE_TOGGLE' | 'LIVE_MEET' | 'READER') => {
    if (openAction === 'TASK_MODAL') setIsTaskModalOpen(true);
    if (openAction === 'INLINE_TOGGLE') setIsInlineDaringOpen((prev) => !prev);
    if (openAction === 'LIVE_MEET') setIsMeetingModalOpen(true);
    if (openAction === 'READER') setIsDaringReaderOpen(true);

    // Auto-record student attendance when entering active/daring KBM space
    if (
      mode === 'SISWA' &&
      effectiveSesiIdForTap &&
      effectiveStudentStatus !== 'HADIR' &&
      effectiveStudentStatus !== 'TEPAT_WAKTU' &&
      !isRecordingDaringPresence
    ) {
      try {
        setIsRecordingDaringPresence(true);
        await tapSiswaKeSesi(String(effectiveSesiIdForTap), {
          status: 'HADIR',
          catatan: 'Hadir Ruang KBM Daring'
        });
        setLocalDaringAttended(true);
        toast.success('Kehadiran KBM Daring Anda otomatis tercatat! ✅');
        queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-siswa-unified'] });
        queryClient.invalidateQueries({ queryKey: ['rekap-harian-siswa-me'] });
        queryClient.invalidateQueries({ queryKey: ['sesiAbsensiList'] });
      } catch (_) {
        // Silent if session not yet open
      } finally {
        setIsRecordingDaringPresence(false);
      }
    }
  }, [mode, effectiveSesiIdForTap, effectiveStudentStatus, isRecordingDaringPresence, queryClient]);

  const isLive = Boolean(item.isLive ?? item.status?.isLive ?? item.is_live ?? (item.status === 'BERLANGSUNG' || item.session?.status === 'BERLANGSUNG'));
  const isReadyToOpen = Boolean(item.isReadyToOpen ?? item.status?.isReadyToOpen ?? false);
  const isFinished = Boolean(item.isFinished ?? item.status?.isFinished ?? (item.status === 'SELESAI' || item.session?.status === 'SELESAI'));
  const isOverdue = Boolean(
    item.is_overdue ?? 
    item.isOverdue ?? 
    item.status?.isOverdue ?? 
    item._summary?.isOverdue ?? 
    (item.status !== 'SELESAI' && item.waktu_selesai && new Date(item.waktu_selesai).getTime() < Date.now())
  );
  const isUpcoming = Boolean(item.isUpcoming ?? item.status?.isUpcoming ?? (!isLive && !isReadyToOpen && !isFinished && !isOverdue));

  const sessionMeta: SessionStatusMeta = getSessionStatusMeta(
    item.status || { isLive, isReadyToOpen, isFinished, isOverdue, isUpcoming }
  );

  const fotoKegiatanUrl =
    item.foto_kegiatan ||
    item.foto_masuk ||
    item.session?.foto_kegiatan ||
    item.session?.foto_masuk ||
    item.AbsenGuru?.[0]?.foto_bukti ||
    item.AbsenGuru?.[0]?.foto_masuk ||
    item.session?.AbsenGuru?.[0]?.foto_bukti ||
    null;

  const isGuruKegiatanSelfieCard = Boolean(
    item.is_guru_kegiatan_selfie_card || item.session?.is_guru_kegiatan_selfie_card
  );
  const wajibTapTerminalGuru =
    (item.wajib_tap_terminal_kegiatan_guru ?? item.session?.wajib_tap_terminal_kegiatan_guru) !== false;
  const kegiatanWajibGuruBeririsan =
    (item.kegiatan_wajib_guru_beririsan ?? item.session?.kegiatan_wajib_guru_beririsan) !== false;
  const guruHadirKegiatanBeririsan = Boolean(
    item.guru_hadir_kegiatan_beririsan || item.session?.guru_hadir_kegiatan_beririsan
  );
  const guruHadirKegiatanNama =
    item.guru_hadir_kegiatan_nama || item.session?.guru_hadir_kegiatan_nama || null;
  const jabatanKegiatanLabel =
    item.jabatan_kegiatan_label || item.session?.jabatan_kegiatan_label || null;

  const rawTeacherStatus = item.guru_status 
    || item.status?.teacherStatus 
    || item._summary?.teacherStatus 
    || item.session?.guru_status 
    || item.AbsenGuru?.[0]?.status
    || (item.session?.waktu_tap ? (item.session?.is_terlambat ? 'TERLAMBAT' : 'HADIR') : 'BELUM_TAP');

  const teacherMeta: TeacherStatusMeta = getTeacherStatusMeta(rawTeacherStatus);
  const isTeacherExcused = teacherMeta.key === 'IZIN' || teacherMeta.key === 'SAKIT' || teacherMeta.key === 'DINAS_LUAR' || teacherMeta.key === 'PENUGASAN' || teacherMeta.key === 'INVAL';
  const isTeacherAlreadyPresent = Boolean(
    rawTeacherStatus === 'HADIR' || 
    rawTeacherStatus === 'TEPAT_WAKTU' || 
    rawTeacherStatus === 'TERLAMBAT' ||
    item.session?.waktu_tap ||
    item.AbsenGuru?.[0]?.waktu_tap ||
    (fotoKegiatanUrl && !item.opened_by_petugas && !item.session?.opened_by_petugas && item.opened_by !== 'PETUGAS_KELAS' && item.session?.opened_by !== 'PETUGAS_KELAS')
  );
  const needsReminder = isReadyToOpen && !isLive && !isFinished && !isOverdue && !isTeacherExcused && !isTeacherAlreadyPresent;
  const canChangeStatus = (isReadyToOpen || isOverdue || isTeacherExcused) && !isFinished && !isLive;
  const isTeacherPresent = isTeacherAlreadyPresent;
  const isSessionActive = Boolean(
    isLive || 
    item.session?.status === 'BERLANGSUNG' || 
    item.status === 'BERLANGSUNG' || 
    fotoKegiatanUrl || 
    item.opened_by_petugas ||
    item.session?.opened_by_petugas ||
    isTeacherPresent
  );

  // 🛡️ Resolusi Status Pengingat WA & Cooldown Anti-Spam
  const reminderMeta = item.reminder_meta || item._summary?.reminder_meta || item.session?.reminder_meta || null;
  const reminderMinutesAgo = React.useMemo(() => {
    if (!reminderMeta?.last_wa_sent_at) return null;
    const diff = Math.floor((Date.now() - new Date(reminderMeta.last_wa_sent_at).getTime()) / 60000);
    return Math.max(0, diff);
  }, [reminderMeta]);
  const isRemindedRecently = reminderMinutesAgo !== null && reminderMinutesAgo < 10;

  // 2. Resolve Text Fields with robust fallbacks
  const mapelNama = item.mapel_nama 
    || item.Mapel?.nama_mapel 
    || item.Mapel?.nama 
    || item.kegiatan 
    || item.mapel 
    || item.jenis_kegiatan 
    || (typeof item.sesi === 'string' ? item.sesi.replace(/^KBM\s*-\s*/i, '').trim() : '')
    || 'Mata Pelajaran KBM';

  const unitNama = item.unit_nama 
    || item.UnitPengajaran?.nama_unit 
    || item.session?.unit_nama 
    || item.session?.UnitPengajaran?.nama_unit 
    || item._raw?.unit_nama 
    || item._raw?.UnitPengajaran?.nama_unit 
    || null;

  const kelasNama = item.kelas_nama 
    || item.Kelas?.nama_kelas 
    || item.kelas 
    || '';

  const guruPenggantiNama = item.guru_pengganti_nama
    || item.guru_inval_nama
    || item.GuruPelaksana?.nama_guru
    || item.GuruInval?.nama_guru
    || item.permohonan_izin?.guru_inval?.nama_guru
    || item.session?.guru_pengganti_nama
    || null;

  const rawGuruPengampu = item.guru_pengampu_nama
    || item.guru_nama 
    || item.Guru?.nama_guru 
    || item.nama_guru 
    || item.guru 
    || null;

  const hasGuruPengganti = Boolean(
    guruPenggantiNama &&
    rawGuruPengampu &&
    guruPenggantiNama.trim().toLowerCase() !== rawGuruPengampu.trim().toLowerCase() &&
    guruPenggantiNama.trim() !== '-'
  );

  const guruNama = hasGuruPengganti ? guruPenggantiNama : (rawGuruPengampu || 'Guru Pengampu');

  const jamMulai = item.jam_mulai 
    || (item.waktu_mulai ? (typeof item.waktu_mulai === 'string' && item.waktu_mulai.includes('T') ? item.waktu_mulai.split('T')[1].substring(0, 5) : item.waktu_mulai) : '') 
    || (item.waktu && item.waktu.includes('-') ? item.waktu.split('-')[0].trim() : '-');

  const jamSelesai = item.jam_selesai 
    || (item.waktu_selesai ? (typeof item.waktu_selesai === 'string' && item.waktu_selesai.includes('T') ? item.waktu_selesai.split('T')[1].substring(0, 5) : item.waktu_selesai) : '') 
    || (item.waktu && item.waktu.includes('-') ? item.waktu.split('-')[1].replace('WIB', '').trim() : '');

  const jamLabel = item.jamLabel || item.jam_label || (item.JamPelajaran?.nama_jam) || null;

  const isSesiKegiatan = Boolean(
    (item.jenis_kegiatan && String(item.jenis_kegiatan).toUpperCase() !== 'KBM') ||
    item.kegiatan ||
    item.nama_kegiatan
  );
  const kegiatanNamaLabel = item.kegiatan || item.nama_kegiatan || (item.jenis_kegiatan === 'KETARUNAAN' ? 'Ketarunaan' : item.jenis_kegiatan === 'DHUHA' ? 'Dhuha' : item.jenis_kegiatan) || 'Kegiatan';

  // 🏛️ Prediksi Batas Aman Hadir — Real-Time, update tiap menit
  // Hanya aktif untuk kartu KBM mode GURU yang belum dimulai / siap dibuka (bukan kartu selfie kegiatan itu sendiri)
  const isGuroPrediksiActive = mode === 'GURU' && !isGuruKegiatanSelfieCard && (isReadyToOpen || isUpcoming);

  const { data: kegiatanData } = useQuery({
    queryKey: ['jadwal-kegiatan-list', true],
    queryFn: () => getJadwalKegiatan({ aktif: true }).catch(() => null),
    staleTime: 5 * 60 * 1000,
    enabled: isGuroPrediksiActive,
  });

  // Clock state — tick setiap 30 detik agar badge TERLAMBAT X menit tetap akurat
  const [nowTick, setNowTick] = React.useState(() => new Date());
  React.useEffect(() => {
    if (!isGuroPrediksiActive) return;
    const interval = setInterval(() => setNowTick(new Date()), 30_000);
    return () => clearInterval(interval);
  }, [isGuroPrediksiActive]);

  const prediksiRealtime = useMemo(() => {
    if (!isGuroPrediksiActive) return null;
    if (!jamMulai || !jamMulai.includes(':')) return null;

    // 1. Hitung deadline jadwal resmi (JadwalKBM.jam_mulai & jam_selesai)
    const [schH, schM] = jamMulai.split(':').map(Number);
    const scheduledMinutes = schH * 60 + schM;
    let kbmEndMinutes = scheduledMinutes + 45;
    if (jamSelesai && jamSelesai.includes(':')) {
      const [endKbmH, endKbmM] = jamSelesai.split(':').map(Number);
      if (Number.isFinite(endKbmH) && Number.isFinite(endKbmM)) {
        kbmEndMinutes = endKbmH * 60 + endKbmM;
      }
    }

    // 2. Cek JadwalKegiatan hari ini — apakah benar-benar beririsan dengan jam KBM ini?
    const rawList: any[] = Array.isArray(kegiatanData)
      ? kegiatanData
      : (Array.isArray((kegiatanData as any)?.data) ? (kegiatanData as any).data : []);

    const HARI_MAP: Record<number, string> = {
      0: 'MINGGU', 1: 'SENIN', 2: 'SELASA', 3: 'RABU',
      4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU'
    };
    const todayStr = HARI_MAP[nowTick.getDay()];

    const matchingKegiatan = rawList
      .filter((k: any) => {
        if (!k.aktif) return false;
        const kegType = String(k.jenis_kegiatan || '').toUpperCase();
        const kegName = String(k.nama || '');
        // Apel Pulang / Apel Sore tidak mewajibkan guru tap fisik di terminal kegiatan (aware 2 shift, tanpa batasan jam statis)
        if (kegType === 'APEL_SORE' || /pulang|apel\s*sore|apel_sore/i.test(kegName)) return false;
        const days: string[] = Array.isArray(k.hari) ? k.hari : (k.hari || '').split(',').map((s: string) => s.trim().toUpperCase());
        if (!days.includes(todayStr)) return false;
        if (!k.waktu_selesai || !k.waktu_selesai.includes(':')) return false;
        const [endH, endM] = k.waktu_selesai.split(':').map(Number);
        const kegEnd = endH * 60 + endM;
        let kegStart = 0;
        if (k.waktu_mulai && k.waktu_mulai.includes(':')) {
          const [startH, startM] = k.waktu_mulai.split(':').map(Number);
          if (Number.isFinite(startH) && Number.isFinite(startM)) {
            kegStart = startH * 60 + startM;
          }
        }
        return kegEnd > scheduledMinutes && kegStart < kbmEndMinutes;
      })
      .sort((a: any, b: any) => {
        const [aH, aM] = a.waktu_selesai.split(':').map(Number);
        const [bH, bM] = b.waktu_selesai.split(':').map(Number);
        return (bH * 60 + bM) - (aH * 60 + aM);
      });

    // 3. Tentukan deadline efektif
    let deadlineMinutes = scheduledMinutes;
    let deadlineStr = jamMulai;
    let kegiatanNama: string | null = null;
    let kegiatanMulai: string | null = null;

    if (matchingKegiatan.length > 0) {
      const top = matchingKegiatan[0];
      const [endH, endM] = top.waktu_selesai.split(':').map(Number);
      deadlineMinutes = endH * 60 + endM;
      deadlineStr = top.waktu_selesai;
      kegiatanNama = top.nama;
      kegiatanMulai = top.waktu_mulai || null;
    }

    // 4. Bandingkan waktu sekarang vs deadline
    const currentMinutes = nowTick.getHours() * 60 + nowTick.getMinutes();
    const lateMinutes = currentMinutes - deadlineMinutes;

    return {
      status: lateMinutes > 0 ? 'TERLAMBAT' : 'AMAN',
      menit: lateMinutes > 0 ? lateMinutes : 0,
      deadline: deadlineStr,
      kegiatanNama,
      kegiatanMulai,
    };
  }, [nowTick, kegiatanData, jamMulai, jamSelesai, isGuroPrediksiActive]);

  const canStartSessionNow = useMemo(() => {
    if (isSessionActive || isLive || isReadyToOpen) return true;
    if (!jamMulai || !jamMulai.includes(':')) return true;
    const [h, m] = jamMulai.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return true;
    const startMinutes = h * 60 + m;
    const currentMinutes = nowTick.getHours() * 60 + nowTick.getMinutes();
    return currentMinutes >= startMinutes - 15;
  }, [isSessionActive, isLive, isReadyToOpen, jamMulai, nowTick]);

  const hadirVal = item.summary?.hadir 
    ?? item._summary?.hadir 
    ?? item._summary?.HADIR 
    ?? (item.counts?.HADIR ?? item.counts?.hadir ?? 0);

  const totalVal = item.summary?.total 
    ?? item._summary?.total 
    ?? (item.counts?.TOTAL ?? item.counts?.total ?? 0);

  const hasJournal = Boolean(item.ProgresMateri || item.progres_materi || item.session?.ProgresMateri);
  const isOtomatis = Boolean(item.is_otomatis ?? item.is_virtual ?? item.isVirtual ?? (item.id && String(item.id).startsWith('sched_')));

  const handleClick = (e: React.MouseEvent) => {
    if (onSelectSession) {
      onSelectSession(item);
    } else if (mode === 'GURU' && isGuruKegiatanSelfieCard) {
      if (!wajibTapTerminalGuru && !isTeacherPresent && !isFinished && !isOverdue && canStartSessionNow && onOpenPhotoModal) {
        onOpenPhotoModal(item);
      } else if (fotoKegiatanUrl && onViewPhoto) {
        onViewPhoto(item);
      }
    } else if (mode === 'GURU' && (isLive || isTeacherPresent) && onOpenWorkspace) {
      onOpenWorkspace(item);
    } else if (mode === 'GURU' && isReadyToOpen && !isLive && !isFinished && !isOverdue && onOpenPhotoModal) {
      onOpenPhotoModal(item);
    } else if (onToggleExpand) {
      onToggleExpand();
    }
  };

  // Distinct Color Blocking & Container styling per status
  const cardColorBlockStyle = isLive
    ? "border-l-4 border-l-emerald-500 border-emerald-500/40 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-900 shadow-md shadow-emerald-500/10"
    : isReadyToOpen
    ? "border-l-4 border-l-amber-500 border-amber-500/50 dark:border-amber-500/40 bg-gradient-to-br from-amber-500/12 via-amber-500/5 to-white dark:to-slate-900 shadow-md shadow-amber-500/10"
    : isOverdue
    ? "border-l-4 border-l-rose-400 border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 opacity-90"
    : isFinished
    ? "border-l-4 border-l-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70"
    : "border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

  const guruDisplayNama =
    item.guru_pengampu_nama ||
    item.Guru?.nama_guru ||
    item.guru_nama ||
    item.nama_guru ||
    '';
  const guruDisplayFoto =
    item.guru_foto ||
    item.Guru?.foto ||
    item.UnitPengajaran?.Guru?.foto ||
    item.session?.guru_foto ||
    item.session?.Guru?.foto ||
    null;
  const showTeacherPhotoCol = Boolean(guruDisplayNama && guruDisplayNama !== '-' && mode !== 'GURU');
  const showGuruClassCol = Boolean(mode === 'GURU' && !hideKelas && kelasNama && kelasNama !== '-');

  const sessionStatusBadge = isLive ? (
    <span className="px-2 py-0.5 rounded-md sm:rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 flex items-center gap-1 shrink-0 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
      LIVE
    </span>
  ) : isReadyToOpen ? (
    <span className="px-2 py-0.5 rounded-md sm:rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      SIAP DIMULAI
    </span>
  ) : isOverdue ? (
    <span className="px-2 py-0.5 rounded-md sm:rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700 flex items-center gap-1 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
      TERLEWAT
    </span>
  ) : isFinished ? (
    <span className="px-2 py-0.5 rounded-md sm:rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shrink-0">
      SELESAI
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-md sm:rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
      MENDATANG
    </span>
  );

  const teacherStatusBadge = (
    <span className={cn(
      "px-2 py-0.5 rounded-md sm:rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border flex items-center gap-1 shrink-0",
      teacherMeta.key === 'HADIR' ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" :
      teacherMeta.key === 'TERLAMBAT' ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700" :
      teacherMeta.key === 'IZIN' ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700" :
      teacherMeta.key === 'SAKIT' ? "bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-700" :
      teacherMeta.key === 'PENUGASAN' || teacherMeta.key === 'INVAL' ? "bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-700" :
      teacherMeta.key === 'ALPA' ? "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700" :
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", teacherMeta.dotClass)} />
      {teacherMeta.label}
    </span>
  );

  const slotBadge = jamLabel ? (
    <span className="px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider font-mono flex items-center gap-1 shrink-0">
      <Layers size={10} className="text-indigo-600 dark:text-indigo-400" />
      <span>{jamLabel}</span>
    </span>
  ) : null;

  const timeBadge = jamMulai ? (
    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
      <Clock size={11} className="text-slate-400" />
      <span>{jamMulai}{jamSelesai ? ` - ${jamSelesai}` : ''} WIB</span>
    </span>
  ) : null;

  const headerActions = (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
      {onOpenBahanAjar && !isGuruKegiatanSelfieCard && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBahanAjar(item);
          }}
          title="Buka Bahan Ajar Digital & Panduan KBM"
          className="h-7 px-2 sm:px-2.5 sm:py-1 rounded-xl text-[11px] sm:text-xs font-black bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow-xs"
        >
          <BookOpen size={12} className="text-indigo-600 dark:text-indigo-400" />
          <span>Bahan Ajar</span>
        </button>
      )}

      {mode === 'GURU' && onTestAlert && !isGuruKegiatanSelfieCard && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTestAlert(item);
          }}
          title="Uji coba alarm & notifikasi untuk sesi KBM ini"
          className="w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Volume2 size={12} className="text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Uji Alarm</span>
        </button>
      )}

      {onToggleExpand && (
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover/card:text-slate-900 dark:group-hover/card:text-white group-hover/card:bg-slate-200 dark:group-hover/card:bg-slate-700 transition-colors shrink-0">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      )}
    </div>
  );

  const prediksiBadge = mode !== 'SISWA' && prediksiRealtime ? (
    guruHadirKegiatanBeririsan ? (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold shrink-0"
        title={`Kehadiran Anda di ${guruHadirKegiatanNama || prediksiRealtime.kegiatanNama || 'Kegiatan'} sudah tercatat — keterlambatan saat membuka sesi KBM ini diampuni`}
      >
        ✅ Aman • Hadir {guruHadirKegiatanNama || prediksiRealtime.kegiatanNama || 'Kegiatan'}
      </span>
    ) : prediksiRealtime.status === 'TERLAMBAT' ? (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-[10px] font-bold shrink-0"
        title={`Sudah melewati batas aman hadir${prediksiRealtime.kegiatanNama ? ` (${prediksiRealtime.kegiatanNama})` : ''}`}
      >
        🔴 Terlambat {prediksiRealtime.menit} m
      </span>
    ) : prediksiRealtime.kegiatanNama && kegiatanWajibGuruBeririsan ? (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold shrink-0"
        title={`Belum tercatat hadir di ${prediksiRealtime.kegiatanNama} — ${wajibTapTerminalGuru ? 'tap di Terminal Kegiatan' : 'lakukan Selfie Kegiatan'} s.d ${prediksiRealtime.deadline} WIB agar tidak terlambat`}
      >
        ⚠️ Belum {prediksiRealtime.kegiatanNama} (≤ {prediksiRealtime.deadline})
      </span>
    ) : (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold shrink-0"
        title={`Masuk tepat waktu sebelum ${prediksiRealtime.deadline} WIB`}
      >
        ✅ Aman ≤ {prediksiRealtime.deadline}
      </span>
    )
  ) : null;

  const openerBadge = (() => {
    const isOpenedByPetugas = Boolean(
      item?.opened_by === 'PETUGAS_KELAS' ||
      item?.session?.opened_by === 'PETUGAS_KELAS' ||
      item?.opened_by_petugas ||
      item?.session?.opened_by_petugas ||
      (typeof item?.keterangan === 'string' && item.keterangan.includes('[DIBUKA_PETUGAS_KELAS]')) ||
      (typeof item?.session?.keterangan === 'string' && item.session.keterangan.includes('[DIBUKA_PETUGAS_KELAS]'))
    );
    const isOpenedByGuru = Boolean(
      item?.opened_by === 'GURU' ||
      item?.session?.opened_by === 'GURU' ||
      (typeof item?.keterangan === 'string' && item.keterangan.includes('[DIBUKA_GURU]')) ||
      (typeof item?.session?.keterangan === 'string' && item.session.keterangan.includes('[DIBUKA_GURU]')) ||
      (!isOpenedByPetugas && isTeacherPresent)
    );
    const rawOpenerName = item?.opened_by_name || item?.session?.opened_by_name;
    const openerName = rawOpenerName || (
      typeof item?.keterangan === 'string' && item.keterangan.includes('[DIBUKA_PETUGAS_KELAS]')
        ? item.keterangan.replace('[DIBUKA_PETUGAS_KELAS]', '').trim()
        : typeof item?.session?.keterangan === 'string' && item.session.keterangan.includes('[DIBUKA_PETUGAS_KELAS]')
        ? item.session.keterangan.replace('[DIBUKA_PETUGAS_KELAS]', '').trim()
        : null
    );

    if (isOpenedByPetugas) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 text-[10px] font-black shrink-0 shadow-2xs"
          title={`Sesi KBM ini dibuka oleh Petugas Kelas${openerName ? `: ${openerName}` : ''}`}
        >
          <Users size={11} className="text-amber-600 dark:text-amber-400" />
          Dibuka Petugas Kelas{openerName ? ` (${openerName})` : ''}
        </span>
      );
    }
    if (isOpenedByGuru && isSessionActive) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/80 text-[10px] font-black shrink-0 shadow-2xs"
          title={`Sesi KBM ini dibuka oleh Guru Pengampu${openerName ? `: ${openerName}` : ''}`}
        >
          <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
          Dibuka Guru
        </span>
      );
    }
    return null;
  })();

  const ketarunaanBadge = (() => {
    const guruCatatan = item?.AbsenGuru?.[0]?.catatan || item?.guru_catatan || item?.session?.catatan || '';
    const lowerCatatan = typeof guruCatatan === 'string' ? guruCatatan.toLowerCase() : '';
    const isSelfieKegiatan = lowerCatatan.includes('selfie kegiatan');
    if (isSelfieKegiatan) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200 border border-violet-300 dark:border-violet-700 text-[10px] font-bold shrink-0"
          title={`Kehadiran tercatat via Selfie Kegiatan. ${guruCatatan}`}
        >
          <Camera size={10} className="text-violet-600 dark:text-violet-400" />
          Via Selfie Kegiatan
        </span>
      );
    }
    const isSyncedKetarunaan = Boolean(item?.is_synced_ketarunaan) ||
      (lowerCatatan.includes('terminal') && lowerCatatan.includes('ketarunaan')) ||
      (lowerCatatan.includes('ketarunaan') && !isGuruKegiatanSelfieCard);
    if (!isSyncedKetarunaan) return null;
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 text-[10px] font-bold shrink-0"
        title={`Kehadiran tercatat via Terminal Ketarunaan. ${guruCatatan}`}
      >
        <ShieldCheck size={10} className="text-yellow-600 dark:text-yellow-400" />
        Via Terminal Ketarunaan
      </span>
    );
  })();

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-xs hover:shadow-md transition-all overflow-hidden select-none group/card",
        cardColorBlockStyle,
        className
      )}
    >
      {/* ── CARD MAIN CLICKABLE AREA (2 KOLOM: FOTO GURU / LABEL KELAS + DATA SESI) ── */}
      <div 
        onClick={handleClick}
        className={cn(
          "p-3 sm:p-4 flex items-stretch gap-3 sm:gap-4 transition-colors cursor-pointer",
          onToggleExpand || onSelectSession ? "hover:bg-black/5 dark:hover:bg-white/5" : ""
        )}
      >
        {/* KOLOM 1: FOTO GURU (Siswa/Monitoring/Piket) ATAU KARTU KELAS (Guru) */}
        {showTeacherPhotoCol && (
          <div className="shrink-0 flex items-start pt-0.5">
            <PersonPhoto
              name={guruDisplayNama}
              foto={guruDisplayFoto}
              variant="portrait"
              size="sm"
              badgeLabel="Guru"
            />
          </div>
        )}
        {showGuruClassCol && (
          <div className="shrink-0 flex items-start pt-0.5">
            <div className={cn(
              "w-16 h-20 rounded-xl border-2 shadow-xs flex flex-col items-center justify-center px-1.5 text-center relative overflow-hidden",
              isGuruKegiatanSelfieCard
                ? "border-violet-200 dark:border-violet-800/80 bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/70 dark:via-slate-900 dark:to-indigo-950/50"
                : "border-indigo-100 dark:border-indigo-900/70 bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-indigo-950/70 dark:via-slate-900 dark:to-blue-950/50"
            )}>
              <span className={cn(
                "text-[9px] font-extrabold uppercase tracking-widest",
                isGuruKegiatanSelfieCard
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-indigo-500 dark:text-indigo-400"
              )}>
                {isGuruKegiatanSelfieCard ? 'Sesi' : 'Kelas'}
              </span>
              <span className={cn(
                "text-[11px] sm:text-xs font-black leading-tight mt-0.5 break-words",
                isGuruKegiatanSelfieCard
                  ? "text-violet-900 dark:text-violet-100"
                  : "text-indigo-900 dark:text-indigo-100"
              )}>
                {isGuruKegiatanSelfieCard ? 'Kegiatan' : kelasNama}
              </span>
            </div>
          </div>
        )}

        {/* KOLOM 2: DATA SESI & AKSI */}
        <div className="min-w-0 flex-1 flex flex-col gap-1.5 sm:gap-2.5">
        {mode === 'GURU' ? (
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-start justify-between gap-2 min-w-0">
              {/* Informasi Utama Guru: Jam Berapa -> Jam Ke -> Mata Pelajaran */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                  {timeBadge}
                  {slotBadge}
                  {prediksiBadge}
                </div>
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  {!hideKelas && !showGuruClassCol && kelasNama && kelasNama !== '-' && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-black text-[11px] sm:text-xs font-mono border border-blue-300 dark:border-blue-800 shrink-0">
                      {kelasNama}
                    </span>
                  )}
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-tight tracking-tight truncate">
                    {mapelNama}
                  </h4>
                  {isGuruKegiatanSelfieCard && jabatanKegiatanLabel && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200 border border-violet-200 dark:border-violet-800 shrink-0">
                      <ShieldCheck size={10} className="text-violet-600 dark:text-violet-400" />
                      {jabatanKegiatanLabel}
                    </span>
                  )}
                  {unitNama && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shrink-0 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                      Unit: {unitNama}
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile Top-Right: Chevron Expand/Collapse agar sejajar rapi di pojok kanan atas */}
              {onToggleExpand && (
                <div className="sm:hidden w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              )}

              {/* Desktop Kolom Kanan: Status Sesi + Bahan Ajar + Uji Alarm + Chevron */}
              <div className="hidden sm:flex sm:flex-col sm:items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {sessionStatusBadge}
                  {teacherStatusBadge}
                  {openerBadge}
                  {ketarunaanBadge}
                </div>
                {headerActions}
              </div>
            </div>

            {/* Mobile Status Row: Status Sesi rapi 1 baris di bawah Mapel */}
            <div className="flex sm:hidden items-center gap-1.5 flex-wrap">
              {sessionStatusBadge}
              {teacherStatusBadge}
              {openerBadge}
              {ketarunaanBadge}
            </div>
          </div>
        ) : (
          <>
            {/* ── ZONA 1: STATUS & TIME BAR ── */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                {sessionStatusBadge}
                {teacherStatusBadge}
                {slotBadge}
                {timeBadge}
                {prediksiBadge}

                {/* 🏷️ Tipe Sesi Badge (Sesi Virtual vs Sesi Fisik — Khusus Monitoring) */}
                {mode === 'MONITORING' && (isOtomatis ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold shrink-0"
                    title="Sesi Virtual: Slot jadwal template KBM yang belum dibuka kelasnya oleh guru"
                  >
                    📅 Sesi Virtual
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold shrink-0"
                    title="Sesi Fisik: Rekaman sesi KBM riil yang dibuka di aplikasi"
                  >
                    🎯 Sesi Fisik
                  </span>
                ))}

                {openerBadge}
                {ketarunaanBadge}
              </div>

              {headerActions}
            </div>

            {/* ── ZONA 2: CORE SUBJECT, CLASS, & TEACHER (NAMA GURU DI ATAS) ── */}
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                {!hideKelas && kelasNama && kelasNama !== '-' && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-black text-[11px] sm:text-xs font-mono border border-blue-300 dark:border-blue-800 shrink-0">
                    {kelasNama}
                  </span>
                )}
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight tracking-tight truncate">
                  {mapelNama}
                </h4>
                {unitNama && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shrink-0 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Unit: {unitNama}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

          {/* Nama Guru diletakkan di ATAS (untuk Siswa, Petugas, & Monitoring) */}
          {mode !== 'GURU' && (
            <div className="space-y-0.5 pt-0.5 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 min-w-0 truncate">
                  <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                    {hasGuruPengganti ? 'Guru Pengganti:' : 'Guru:'}
                  </span>
                  <span className={cn(
                    "truncate",
                    hasGuruPengganti ? "font-extrabold text-amber-600 dark:text-amber-400" : "font-bold text-slate-800 dark:text-slate-200"
                  )}>
                    {hasGuruPengganti ? guruPenggantiNama : guruNama}
                  </span>
                  {hasGuruPengganti && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                      Pengganti
                    </span>
                  )}
                </div>

                {hasTask && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStudentEnterDaringSpace('INLINE_TOGGLE');
                    }}
                    title={isPjjDaring ? "Buka Ruang KBM Daring Inline (Modul, Tugas, Referensi & Kelas Virtual)" : "Lihat petunjuk/tugas yang dititipkan guru"}
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black border cursor-pointer shadow-xs transition-all active:scale-95 shrink-0",
                      isPjjDaring
                        ? "bg-violet-600 hover:bg-violet-500 text-white border-violet-500 shadow-violet-600/20"
                        : "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    )}
                  >
                    {isPjjDaring ? <Laptop size={11} /> : <BookOpen size={11} className="text-blue-600 dark:text-blue-400" />}
                    <span>{isPjjDaring ? (isInlineDaringOpen ? '🔼 Tutup Ruang Daring' : '💻 Ruang KBM Daring') : (isInlineDaringOpen ? '🔼 Tutup Tugas' : '📝 Tugas Guru')}</span>
                  </button>
                )}
              </div>

              {hasGuruPengganti && rawGuruPengampu && (
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                  <span className="text-slate-400 dark:text-slate-500 font-medium">Pengampu Asli:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{rawGuruPengampu}</span>
                </div>
              )}
            </div>
          )}

        {/* ── ZONA 3: FOOTER KHUSUS SESUAI POV (DIVIDER BAWAH) ── */}
        {/* 1. POV SISWA: Khusus Status Presensi Diri Sendiri */}
        {mode === 'SISWA' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Presensi Saya:</span>
              {effectiveStudentStatus ? (
                <span className={cn(
                  "px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider shadow-xs",
                  effectiveStudentStatus === 'HADIR' || effectiveStudentStatus === 'TEPAT_WAKTU' 
                    ? "bg-emerald-600 text-white"
                    : effectiveStudentStatus === 'TERLAMBAT'
                    ? "bg-amber-500 text-white"
                    : effectiveStudentStatus === 'IZIN' || effectiveStudentStatus === 'SAKIT'
                    ? "bg-blue-600 text-white"
                    : "bg-rose-600 text-white"
                )}>
                  {effectiveStudentStatus === 'HADIR' ? 'Hadir' : effectiveStudentStatus === 'TERLAMBAT' ? 'Terlambat' : effectiveStudentStatus === 'IZIN' ? 'Izin' : effectiveStudentStatus === 'SAKIT' ? 'Sakit' : 'Alpa'}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Belum Tap
                </span>
              )}

              {studentWaktuTap && (
                <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Clock size={12} /> {studentWaktuTap}
                </span>
              )}

              {studentMetode && studentMetode !== '-' && studentMetode !== 'Terjadwal' && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                  {studentMetode}
                </span>
              )}

              {fotoKegiatanUrl && onViewPhoto && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPhoto(item);
                  }}
                  title="Lihat foto bukti kehadiran KBM guru di kelas"
                  className="h-7 px-2 rounded-lg text-[11px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  <Camera size={11} className="text-emerald-500" />
                  <span>Foto Kelas</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 2. POV PETUGAS KELAS: Tombol Aksi di Kiri & Rincian Hadir Siswa di Kanan (Sejajar) */}
        {mode === 'PETUGAS' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            {/* Tombol Aksi Petugas di Kiri */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {canManage && !isFinished && !isOverdue && onDelete && (
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  title="Hapus Sesi"
                >
                  <Trash size={14} />
                </button>
              )}
              {canManage && canFinish && !isFinished && !isOverdue && onFinish && (
                <button
                  type="button"
                  disabled={!isSessionActive}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    !isSessionActive
                      ? "text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60"
                      : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSessionActive) return;
                    onFinish();
                  }}
                  title={!isSessionActive ? "Selesaikan Sesi aktif setelah sesi dibuka" : "Selesaikan Sesi"}
                >
                  <CheckCircle2 size={14} />
                </button>
              )}
              {/* 1. Sesi BELUM DIBUKA: Petugas Kelas membuka sesi (Khusus KBM Reguler; Pembiasaan tidak perlu dibuka dulu) */}
              {!isSesiKegiatan && !isSessionActive && !isFinished && !isOverdue && onOpenPhotoModal && (
                <Button
                  type="button"
                  size="sm"
                  disabled={!canStartSessionNow}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canStartSessionNow) return;
                    onOpenPhotoModal(item);
                  }}
                  title={
                    !canStartSessionNow
                      ? `Tombol Buka Sesi aktif 15 menit sebelum jam mulai (${jamMulai} WIB)`
                      : isSesiKegiatan
                      ? `Buka sesi kegiatan ${kegiatanNamaLabel}`
                      : "Buka sesi kelas (Bisa dengan atau tanpa foto) untuk mulai mengabsenkan siswa"
                  }
                  className={cn(
                    "h-8 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all",
                    !canStartSessionNow
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                      : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white border-none cursor-pointer shadow-md shadow-emerald-950/30 active:scale-95 animate-pulse"
                  )}
                >
                  <Sparkles size={13} className={!canStartSessionNow ? "text-slate-400" : "text-amber-300"} />
                  <span>{isSesiKegiatan ? `🚀 Buka ${kegiatanNamaLabel}` : "🚀 Buka Sesi Kelas"}</span>
                </Button>
              )}

              {/* 2. Sesi SUDAH AKTIF tapi Guru belum hadir: Sediakan tombol jika Guru baru tiba */}
              {isSessionActive && !isTeacherPresent && !isFinished && !isOverdue && onOpenPhotoModal && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPhotoModal(item);
                  }}
                  title={isSesiKegiatan ? `Ambil foto pembina/pendamping ${kegiatanNamaLabel}` : "Bapak/Ibu Guru baru tiba di kelas? Klik untuk mengambil foto verifikasi kehadiran guru"}
                  className="h-8 px-2.5 rounded-xl text-xs font-black bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  <Camera size={13} className="text-amber-600" />
                  <span>{isSesiKegiatan ? "Foto Pembina" : "Foto Guru Hadir"}</span>
                </Button>
              )}

              {/* 3. Sesi SUDAH AKTIF dan Guru SUDAH HADIR */}
              {isSessionActive && isTeacherPresent && !isFinished && !isOverdue && onOpenPhotoModal && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPhotoModal(item);
                  }}
                  title={fotoKegiatanUrl ? "Ambil ulang / perbarui foto bukti KBM" : "Ambil foto bukti kehadiran di kelas"}
                  className="h-8 px-2.5 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={13} className="text-emerald-600" />
                  <span>{fotoKegiatanUrl ? "Foto Ulang" : "Ambil Foto"}</span>
                </Button>
              )}

              {fotoKegiatanUrl && onViewPhoto && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPhoto(item);
                  }}
                  title="Lihat foto bukti KBM yang telah diambil"
                  className="h-8 px-2.5 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  <Eye size={13} className="text-emerald-500" />
                  <span>Lihat Foto</span>
                </Button>
              )}

              {onOpenScanModal && (() => {
                const isScanDisabled = isOverdue || isFinished || (!isSesiKegiatan && !isSessionActive);
                return (
                <Button
                  type="button"
                  size="sm"
                  disabled={isScanDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isScanDisabled) return;
                    onOpenScanModal(item.id);
                  }}
                  title={
                    isOverdue 
                      ? "Sesi telah terlewat (Scan RFID terkunci)" 
                      : isFinished 
                      ? "Sesi telah selesai" 
                      : isScanDisabled
                      ? "Sesi KBM belum dibuka (Klik tombol Buka Sesi Kelas terlebih dahulu)"
                      : "Buka Terminal Scan Kartu RFID / QR Siswa"
                  }
                  className={cn(
                    "h-8 px-3 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all",
                    isScanDisabled
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-xs shadow-emerald-600/30 cursor-pointer"
                  )}
                >
                  <QrCode size={13} />
                  <span>Scan RFID / QR</span>
                </Button>
                );
              })()}
            </div>

            {/* Rincian Hadir Siswa di Paling Kanan */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-extrabold text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 flex items-center gap-1.5">
                <Users size={13} className="text-slate-500" />
                <span>Hadir: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{hadirVal}</strong>/{totalVal} Siswa</span>
              </span>
            </div>
          </div>
        )}

        {/* 3. POV GURU: Peringatan / Info Irisan Kegiatan + Tombol Aksi Guru */}
        {mode === 'GURU' && isGuruKegiatanSelfieCard && !isTeacherPresent && !isFinished && !isOverdue && (
          wajibTapTerminalGuru ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 sm:p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/35 border border-amber-300/80 dark:border-amber-800/70 flex items-start gap-2.5"
            >
              <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs font-medium text-amber-950 dark:text-amber-100 leading-snug">
                <span className="font-black">Wajib Tap di Terminal Kegiatan{jabatanKegiatanLabel ? ` (${jabatanKegiatanLabel})` : ''}:</span>{' '}
                Silakan hadir fisik di lokasi <strong className="font-bold">{kegiatanNamaLabel}</strong> dan lakukan presensi tap melalui{' '}
                <strong className="font-bold">Terminal Unified Kegiatan</strong>.
              </p>
            </div>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 sm:p-3 rounded-xl bg-violet-50/90 dark:bg-violet-950/35 border border-violet-300/80 dark:border-violet-800/70 flex items-start gap-2.5"
            >
              <Camera size={15} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs font-medium text-violet-950 dark:text-violet-100 leading-snug">
                <span className="font-black">Selfie Mandiri Kegiatan{jabatanKegiatanLabel ? ` (${jabatanKegiatanLabel})` : ''}:</span>{' '}
                Ambil foto selfie di lokasi <strong className="font-bold">{kegiatanNamaLabel}</strong> untuk mencatat kehadiran pendampingan dan mengaktifkan pengampunan keterlambatan sesi KBM beririsan.
              </p>
            </div>
          )
        )}

        {mode === 'GURU' && !isGuruKegiatanSelfieCard && !isTeacherPresent && !isFinished && !isOverdue && prediksiRealtime?.kegiatanNama && (kegiatanWajibGuruBeririsan || guruHadirKegiatanBeririsan) && (
          guruHadirKegiatanBeririsan ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/35 border border-emerald-300/80 dark:border-emerald-800/70 flex items-start gap-2.5"
            >
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs font-medium text-emerald-950 dark:text-emerald-100 leading-snug">
                <span className="font-black">Kehadiran Kegiatan Tercatat:</span> Anda sudah tercatat hadir pada{' '}
                <strong className="font-bold">{guruHadirKegiatanNama || prediksiRealtime.kegiatanNama}</strong>. Pengampunan keterlambatan aktif saat Anda membuka sesi KBM ini.
              </p>
            </div>
          ) : wajibTapTerminalGuru ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 sm:p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/35 border border-amber-300/80 dark:border-amber-800/70 flex items-start gap-2.5"
            >
              <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs font-medium text-amber-950 dark:text-amber-100 leading-snug">
                <span className="font-black">Wajib Hadir Fisik di Kegiatan:</span> Jam KBM ini beririsan dengan{' '}
                <strong className="font-bold">{prediksiRealtime.kegiatanNama}</strong> (
                {prediksiRealtime.kegiatanMulai ? `${prediksiRealtime.kegiatanMulai}–` : 's.d. '}
                {prediksiRealtime.deadline} WIB). Silakan hadir fisik dan lakukan presensi melalui{' '}
                <strong className="font-bold">Panitia {prediksiRealtime.kegiatanNama}</strong> di lokasi kegiatan agar tidak dianggap telat saat presensi KBM.
              </p>
            </div>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/35 border border-indigo-300/80 dark:border-indigo-800/70 flex items-start gap-2.5"
            >
              <Camera size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs font-medium text-indigo-950 dark:text-indigo-100 leading-snug">
                <span className="font-black">Selfie Kegiatan Tersedia:</span> Jam KBM ini beririsan dengan{' '}
                <strong className="font-bold">{prediksiRealtime.kegiatanNama}</strong> (
                {prediksiRealtime.kegiatanMulai ? `${prediksiRealtime.kegiatanMulai}–` : 's.d. '}
                {prediksiRealtime.deadline} WIB). Silakan lakukan{' '}
                <strong className="font-bold">Selfie Kegiatan</strong> pada kartu kegiatan di atas agar keterlambatan saat membuka sesi KBM pertama Anda diampuni.
              </p>
            </div>
          )
        )}

        {mode === 'GURU' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Mobile: Bahan Ajar ikut menyatu rapi di baris tombol aksi */}
              {onOpenBahanAjar && !isGuruKegiatanSelfieCard && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBahanAjar(item);
                  }}
                  title="Buka Bahan Ajar Digital & Panduan KBM"
                  className="sm:hidden h-8 px-2.5 rounded-xl text-xs font-black bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Bahan Ajar</span>
                </Button>
              )}
              {/* 1. Guru BELUM HADIR: Tombol Selfie Kegiatan (hanya jika mode Selfie Mandiri) / Foto Masuk Guru / Mulai KBM */}
              {!isTeacherPresent && !isFinished && !isOverdue && onOpenPhotoModal && (!isGuruKegiatanSelfieCard || !wajibTapTerminalGuru) && (
                <Button
                  type="button"
                  size="sm"
                  disabled={!canStartSessionNow}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canStartSessionNow) return;
                    onOpenPhotoModal(item);
                  }}
                  className={cn(
                    "h-8 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all",
                    !canStartSessionNow
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                      : isGuruKegiatanSelfieCard
                      ? "bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-900/20 border-none cursor-pointer active:scale-95"
                      : isSessionActive
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 animate-pulse shadow-sm shadow-amber-950/20 border-none cursor-pointer active:scale-95"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/20 border-none cursor-pointer active:scale-95"
                  )}
                  title={
                    !canStartSessionNow
                      ? `Tombol aktif 15 menit sebelum jam mulai (${jamMulai} WIB)`
                      : isGuruKegiatanSelfieCard
                      ? `Ambil selfie kehadiran di lokasi ${kegiatanNamaLabel} untuk pengampunan telat KBM`
                      : isSessionActive
                      ? "Sesi telah dibuka oleh Petugas Kelas. Klik untuk mengambil foto verifikasi kehadiran Bapak/Ibu Guru"
                      : "Mulai sesi KBM dengan foto bukti kehadiran guru"
                  }
                >
                  <Camera size={13} />
                  <span>
                    {isGuruKegiatanSelfieCard
                      ? "📸 Selfie Kegiatan"
                      : isSessionActive
                      ? "📸 Foto Masuk Guru"
                      : isSesiKegiatan
                      ? "Mulai Sesi"
                      : "Mulai KBM"}
                  </span>
                </Button>
              )}

              {/* 2. Guru SUDAH HADIR: Tombol Ambil Foto / Foto Ulang */}
              {isTeacherPresent && !isFinished && !isOverdue && onOpenPhotoModal && (!isGuruKegiatanSelfieCard || !wajibTapTerminalGuru) && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPhotoModal(item);
                  }}
                  className="h-8 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                  title={fotoKegiatanUrl ? "Ambil ulang / perbarui foto bukti" : "Ambil foto bukti kehadiran"}
                >
                  <Camera size={13} className="text-emerald-500" />
                  <span>{fotoKegiatanUrl ? "Foto Ulang" : "Ambil Foto"}</span>
                </Button>
              )}

              {/* 🎯 MEJA KERJA KELAS (ZEN LIVE WORKSPACE) */}
              {onOpenWorkspace && !isGuruKegiatanSelfieCard && !isFinished && !isOverdue && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenWorkspace(item);
                  }}
                  title="Buka Meja Kerja Kelas (Ruang Fokus Presensi Siswa)"
                  className={cn(
                    "h-8 px-3.5 rounded-xl text-xs font-black border-none flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all",
                    isLive
                      ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/30 animate-pulse"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/30"
                  )}
                >
                  <Sparkles size={13} className="text-amber-300" />
                  <span>🎯 Meja Kerja Kelas</span>
                </Button>
              )}

              {/* 📋 REKAP KELAS (JIKA SESI TELAH SELESAI / TERLEWAT) */}
              {onOpenWorkspace && !isGuruKegiatanSelfieCard && (isFinished || isOverdue) && Boolean(item.session || item.id) && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenWorkspace(item);
                  }}
                  title="Lihat Rekap Presensi Siswa di Meja Kerja Kelas"
                  className="h-8 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  <Users size={13} className="text-slate-500" />
                  <span>Rekap Kelas</span>
                </Button>
              )}

              {/* Lihat Foto Bukti Button */}
              {fotoKegiatanUrl && onViewPhoto && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPhoto(item);
                  }}
                  title="Lihat foto bukti yang telah diambil"
                  className="h-8 px-2.5 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                >
                  <Eye size={13} className="text-emerald-500" />
                  <span>Lihat Foto</span>
                </Button>
              )}

              {/* Scan RFID / QR Siswa Button (Guru POV) */}
              {onOpenScanModal && !isGuruKegiatanSelfieCard && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isOverdue || isFinished || !isSessionActive}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenScanModal(item.id);
                  }}
                  title={
                    isOverdue
                      ? "Sesi KBM telah terlewat (Scan RFID terkunci)"
                      : isFinished
                      ? "Sesi KBM telah selesai"
                      : !isSessionActive
                      ? "Sesi KBM belum dibuka (Buka sesi terlebih dahulu)"
                      : "Buka Terminal Scan Kartu RFID / QR Siswa"
                  }
                  className={cn(
                    "h-8 px-3 rounded-xl text-xs font-black border flex items-center gap-1.5 cursor-pointer transition-all",
                    isOverdue || isFinished || !isSessionActive
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-sm shadow-indigo-900/20 active:scale-95"
                  )}
                >
                  <QrCode size={13} />
                  <span>Scan RFID / QR</span>
                </Button>
              )}

              {/* Isi Jurnal / Ruang KBM Daring Button */}
              {!isGuruKegiatanSelfieCard && (isLive || isFinished || isPjjDaring || isReadyToOpen) && !isOverdue && onOpenJournalModal && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenJournalModal(item);
                  }}
                  className={cn(
                    "h-8 px-3.5 rounded-xl text-xs font-black text-white border-none flex items-center gap-1.5 cursor-pointer shadow-sm",
                    isPjjDaring
                      ? "bg-violet-600 hover:bg-violet-500 shadow-violet-900/20"
                      : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"
                  )}
                >
                  {isPjjDaring ? <Laptop size={13} /> : <FileText size={13} />}
                  <span>{isPjjDaring ? 'Ruang & Jurnal PJJ' : 'Jurnal'}</span>
                </Button>
              )}

              {/* Tombol Kelas Virtual Live WebRTC (Guru POV) */}
              {!isGuruKegiatanSelfieCard && (isPjjDaring || modePelaksanaan === 'DARING_LIVE' || isLive) && !isFinished && !isOverdue && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMeetingModalOpen(true);
                  }}
                  title="Buka Kelas Virtual Live WebRTC (Video, Share Screen & Papan Tulis Interaktif)"
                  className="h-8 px-3 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white border-none flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-900/20"
                >
                  <Video size={13} />
                  <span>🎥 Live Virtual</span>
                </Button>
              )}

              {hasJournal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInlineDaringOpen((prev) => !prev);
                  }}
                  className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen size={11} />
                  <span>{isPjjDaring ? 'Ruang PJJ Terisi' : 'Jurnal Terisi'}</span>
                  {isInlineDaringOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}
            </div>

            {totalVal > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-extrabold text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 flex items-center gap-1.5">
                  <Users size={13} className="text-slate-500" />
                  <span>Hadir: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{hadirVal}</strong>/{totalVal} Siswa</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* 4. POV MONITORING: Status Jurnal, Quick Actions Guru Belum Masuk, & Hadir Siswa */}
        {mode === 'MONITORING' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Bukti KBM Button */}
              {fotoKegiatanUrl && onViewPhoto && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPhoto(item);
                  }}
                  title="Lihat bukti fisik kegiatan KBM di kelas"
                  className="h-7 px-2.5 rounded-lg text-[11px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer border border-slate-300 dark:border-slate-700 shadow-xs"
                >
                  <Camera size={11} className="text-emerald-500" />
                  <span>Bukti KBM</span>
                </Button>
              )}

              {/* Quick Actions untuk Pengingat WA Guru Belum Masuk Kelas */}
              {needsReminder && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isRemindedRecently ? (
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-amber-600 dark:text-amber-400" />
                      <span>Diingatkan ({reminderMeta.last_wa_sent_by} • {reminderMinutesAgo}m lalu)</span>
                    </span>
                  ) : (
                    <>
                      {onSendWaReminder && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendWaReminder(item, 'GATEWAY');
                          }}
                          title="Kirim pengingat WhatsApp otomatis via WA Gateway Sekolah"
                          className="h-7 px-2.5 rounded-lg text-[11px] font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer border-none shadow-xs"
                        >
                          <MessageSquare size={11} />
                          <span>Kirim WA</span>
                        </Button>
                      )}
                      {onSendWaReminder && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendWaReminder(item, 'PERSONAL_LINK');
                          }}
                          title="Buka WhatsApp Personal untuk chat langsung ke guru"
                          className="h-7 px-2.5 rounded-lg text-[11px] font-black bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 cursor-pointer border border-indigo-200 dark:border-indigo-800 shadow-xs"
                        >
                          <Send size={11} />
                          <span>Chat WA</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Action Ubah Status / Penugasan Guru Inval */}
              {canChangeStatus && onChangeStatus && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeStatus(item);
                  }}
                  title={isTeacherExcused ? "Tugaskan Guru Inval / Pengganti" : "Ubah status guru atau tugaskan Guru Inval"}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 cursor-pointer border-none shadow-xs"
                >
                  <User size={11} />
                  <span>{isTeacherExcused ? 'Tugaskan Inval' : 'Ubah Status'}</span>
                </Button>
              )}

              {hasJournal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInlineDaringOpen((prev) => !prev);
                  }}
                  className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen size={11} />
                  <span>{isPjjDaring ? 'Lihat Ruang PJJ' : 'Lihat Jurnal'}</span>
                  {isInlineDaringOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-extrabold text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 flex items-center gap-1.5">
                <Users size={13} className="text-slate-500" />
                <span>Hadir: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{hadirVal}</strong>/{totalVal} Siswa</span>
              </span>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── INLINE RUANG KBM DARING / JURNAL & TUGAS PANEL (MUNCUL LANGSUNG DI DALAM CARD TANPA POPUP) ── */}
      {(isInlineDaringOpen || (mode === 'SISWA' && isPjjDaring && (Boolean(pm?.judul_materi) || Boolean(taskText) || referensiList.length > 0))) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="border-t border-violet-200/80 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 p-3.5 sm:p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-violet-600 text-white font-black text-[10px] flex items-center gap-1">
                <Laptop size={11} />
                <span>{isPjjDaring ? 'Ruang KBM Daring (Inline View)' : 'Rincian Materi & Tugas Sesi'}</span>
              </span>
              {mode === 'SISWA' && (effectiveStudentStatus === 'HADIR' || effectiveStudentStatus === 'TEPAT_WAKTU') && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 font-black text-[10px] border border-emerald-300 dark:border-emerald-800">
                  ✅ Tercatat Hadir
                </span>
              )}
            </div>
            {isInlineDaringOpen && (
              <button
                type="button"
                onClick={() => setIsInlineDaringOpen(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Sembunyikan
              </button>
            )}
          </div>

          {/* 1. Pokok Bahasan / Materi */}
          {pm?.judul_materi && (
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Pokok Bahasan / Materi</span>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">{pm.judul_materi}</p>
              {pm.deskripsi && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{pm.deskripsi}</p>
              )}
            </div>
          )}

          {/* 2. Uraian Tugas */}
          {taskText && (
            <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">📝 Uraian Tugas &amp; Instruksi</span>
              <p className="text-xs text-blue-950 dark:text-blue-200 leading-relaxed font-medium whitespace-pre-wrap">{taskText}</p>
            </div>
          )}

          {/* 3. Referensi Terlampir */}
          {referensiList.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 block">
                🔗 Referensi Belajar Terlampir ({referensiList.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {referensiList.map((refItem, idx) => (
                  <a
                    key={idx}
                    href={refItem.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleStudentEnterDaringSpace()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-violet-50 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 text-[11px] font-bold text-violet-700 dark:text-violet-300 transition-colors"
                  >
                    <Link2 size={11} className="shrink-0" />
                    <span className="truncate max-w-[200px]">{refItem.judul}</span>
                    <ExternalLink size={10} className="shrink-0 opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 4. Baris Tombol Aksi Inline (Modul Digital, Unduh LKPD, Live Virtual WebRTC, & Konfirmasi Hadir Siswa) */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {(perangkatAjarId || item.mapel_id || item.Mapel?.id) && (
              <button
                type="button"
                onClick={() => handleStudentEnterDaringSpace('READER')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <BookOpen size={13} />
                <span>📘 Buka Modul Digital</span>
              </button>
            )}

            {taskFileUrl && (
              <a
                href={taskFileUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleStudentEnterDaringSpace()}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-800 hover:underline flex items-center gap-1.5"
              >
                <FileText size={13} />
                <span>Unduh Berkas / LKPD</span>
              </a>
            )}

            {(isPjjDaring || modePelaksanaan === 'DARING_LIVE' || isLive) && !isFinished && (
              <button
                type="button"
                onClick={() => handleStudentEnterDaringSpace('LIVE_MEET')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Video size={13} />
                <span>🎥 {mode === 'GURU' ? 'Buka Kelas Virtual Live' : 'Gabung Kelas Virtual Live'}</span>
              </button>
            )}

            {mode === 'SISWA' && effectiveStudentStatus !== 'HADIR' && effectiveStudentStatus !== 'TEPAT_WAKTU' && (
              <button
                type="button"
                disabled={isRecordingDaringPresence}
                onClick={() => handleStudentEnterDaringSpace()}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-2xs flex items-center gap-1.5 ml-auto"
              >
                <CheckCircle2 size={13} />
                <span>{isRecordingDaringPresence ? 'Mencatat...' : '✅ Catat Kehadiran Daring Saya'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── ACCORDION EXPANDED CONTENT ── */}
      <AnimatePresence>
        {isExpanded && expandedContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-4 sm:p-5"
          >
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL RUANG KBM DARING & INSTRUKSI TUGAS GURU (KONSOLIDASI SATU KABEL) ── */}
      {isTaskModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            e.stopPropagation();
            setIsTaskModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-bold",
                  isPjjDaring
                    ? "bg-violet-600 text-white"
                    : "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                )}>
                  {isPjjDaring ? <Laptop size={18} /> : <BookOpen size={18} />}
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {isPjjDaring ? 'Ruang KBM Daring & Penugasan (PJJ)' : 'Instruksi Tugas & Materi dari Guru'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">{guruNama} • {mapelNama} {kelasNama ? `(${kelasNama})` : ''}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Badges Status Ruang KBM & Kehadiran */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {isPjjDaring && (
                <span className="px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-200 font-black text-[10px] border border-violet-300 dark:border-violet-800">
                  💻 Mode KBM Daring ({modePelaksanaan === 'DARING_LIVE' ? 'Live Virtual + Modul' : 'Modul & Penugasan'})
                </span>
              )}
              {classSpecificTask ? (
                <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                  📌 Khusus Kelas {kelasNama}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                  🌐 Materi &amp; Tugas Kelas
                </span>
              )}
              {mode === 'SISWA' && (effectiveStudentStatus === 'HADIR' || effectiveStudentStatus === 'TEPAT_WAKTU') && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 font-black text-[10px] border border-emerald-300 dark:border-emerald-800">
                  ✅ Kehadiran Tercatat (HADIR)
                </span>
              )}
              {item.guru_inval_nama && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                  👥 Guru Inval: {item.guru_inval_nama}
                </span>
              )}
            </div>

            {/* Pokok Bahasan / Judul Materi dari Jurnal Guru */}
            {pm?.judul_materi && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Pokok Bahasan / Materi Sesi Ini</span>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">{pm.judul_materi}</p>
                {pm.deskripsi && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{pm.deskripsi}</p>
                )}
              </div>
            )}

            {/* Uraian Tugas */}
            {taskText ? (
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  📝 Uraian Tugas &amp; Instruksi Pembelajaran
                </span>
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-950 dark:text-blue-200 leading-relaxed font-medium whitespace-pre-wrap">
                  {taskText}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                Guru belum menguraikan instruksi tugas tertulis pada sesi ini.
              </div>
            )}

            {/* Modul yang Disematkan (BahanAjarReaderModal & File Link) */}
            {(perangkatAjarId || taskFileUrl || item.mapel_id || item.Mapel?.id) && (
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  📘 Modul &amp; Bahan Ajar Tersemat
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStudentEnterDaringSpace('READER')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-sm transition-all"
                  >
                    <BookOpen size={14} />
                    <span>Buka Modul Belajar Digital</span>
                  </button>
                  {taskFileUrl && (
                    <a
                      href={taskFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleStudentEnterDaringSpace()}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold text-xs border border-slate-200 dark:border-slate-700 hover:underline"
                    >
                      <FileText size={14} />
                      <span>Unduh Berkas / LKPD</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Lampiran Referensi Belajar */}
            {referensiList.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 block">
                  🔗 Lampiran Referensi &amp; Sumber Belajar ({referensiList.length})
                </span>
                <div className="space-y-1.5">
                  {referensiList.map((refItem, idx) => (
                    <a
                      key={idx}
                      href={refItem.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleStudentEnterDaringSpace()}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-violet-50/70 hover:bg-violet-100/80 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800/70 text-xs font-bold text-violet-800 dark:text-violet-200 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Link2 size={13} className="text-violet-600 dark:text-violet-400 shrink-0" />
                        <span className="truncate">{refItem.judul}</span>
                      </span>
                      <ExternalLink size={12} className="shrink-0 opacity-70" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Kelas Virtual Live WebRTC (Native VirtualMeetingModal) */}
            {(isPjjDaring || modePelaksanaan === 'DARING_LIVE' || isLive) && !isFinished && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-violet-500/10 to-indigo-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
                    <Video size={14} className="animate-pulse" />
                    <span>Ruang Tatap Muka Virtual (Live WebRTC)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Dilengkapi Video/Audio, Screen Share &amp; Papan Tulis Interaktif
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStudentEnterDaringSpace('LIVE_MEET')}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Video size={13} />
                  <span>Gabung Kelas Live</span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              {mode === 'SISWA' && effectiveStudentStatus !== 'HADIR' && effectiveStudentStatus !== 'TEPAT_WAKTU' ? (
                <button
                  type="button"
                  disabled={isRecordingDaringPresence}
                  onClick={() => handleStudentEnterDaringSpace()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>{isRecordingDaringPresence ? 'Mencatat...' : 'Konfirmasi Hadir Belajar Daring'}</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  {mode === 'SISWA' ? 'Administrasi kehadiran Anda tercatat otomatis.' : 'Ruang KBM Daring Terpadu Absenta'}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── NATIVE WEBRTC VIRTUAL MEETING MODAL (LAZY LOADED) ── */}
      {isMeetingModalOpen && (
        <Suspense fallback={null}>
          <VirtualMeetingModal
            isOpen={isMeetingModalOpen}
            onClose={() => setIsMeetingModalOpen(false)}
            roomId={meetingRoomId}
            roomTitle={`KBM Daring: ${mapelNama} (${kelasNama || 'Kelas'}) - ${guruNama}`}
          />
        </Suspense>
      )}

      {/* ── BAHAN AJAR DIGITAL READER MODAL (LAZY LOADED) ── */}
      {isDaringReaderOpen && (
        <Suspense fallback={null}>
          <BahanAjarReaderModal
            isOpen={isDaringReaderOpen}
            onClose={() => setIsDaringReaderOpen(false)}
            perangkatId={perangkatAjarId || item.mapel_id || item.Mapel?.id}
            mapelId={item.mapel_id || item.Mapel?.id || item.session?.mapel_id}
            mapelNama={mapelNama}
            kelasNama={kelasNama}
            tingkat={item.tingkat}
            fase={item.fase}
          />
        </Suspense>
      )}
    </div>
  );
};

UniversalKbmCardComponent.displayName = 'UniversalKbmCard';
export const UniversalKbmCard = React.memo(UniversalKbmCardComponent);
