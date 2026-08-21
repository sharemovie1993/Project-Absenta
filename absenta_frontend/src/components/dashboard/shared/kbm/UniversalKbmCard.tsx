import React, { useMemo } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getJadwalKegiatan } from '@/api/attendance/jadwalKegiatan.api';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { 
  getSessionStatusMeta, 
  getTeacherStatusMeta, 
  type SessionStatusMeta, 
  type TeacherStatusMeta 
} from '@/utils/kbm-normalizer';

export type KbmCardMode = 'GURU' | 'SISWA' | 'PETUGAS' | 'MONITORING';

export interface UniversalKbmCardProps {
  mode: KbmCardMode;
  item: any;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  
  // Role Action Callbacks
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
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  
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
    || item.session?.instruksi_tugas 
    || item.permohonan_izin?.instruksi_tugas 
    || item.tugas 
    || null;

  const taskText = classSpecificTask || generalTask || '';
  const taskFileUrl = item.file_tugas_url || item.session?.file_tugas_url || item.permohonan_izin?.file_tugas_url || item.attachment_url || '';
  const hasTask = Boolean(taskText && taskText.trim().length > 0);

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

  const rawTeacherStatus = item.guru_status 
    || item.status?.teacherStatus 
    || item._summary?.teacherStatus 
    || item.session?.guru_status 
    || item.AbsenGuru?.[0]?.status
    || (item.session?.waktu_tap ? (item.session?.is_terlambat ? 'TERLAMBAT' : 'HADIR') : (isLive ? 'HADIR' : 'BELUM_TAP'));

  const teacherMeta: TeacherStatusMeta = getTeacherStatusMeta(rawTeacherStatus);
  const isTeacherExcused = teacherMeta.key === 'IZIN' || teacherMeta.key === 'SAKIT' || teacherMeta.key === 'DINAS_LUAR' || teacherMeta.key === 'PENUGASAN' || teacherMeta.key === 'INVAL';
  const isTeacherAlreadyPresent = isLive || rawTeacherStatus === 'HADIR' || rawTeacherStatus === 'TEPAT_WAKTU' || rawTeacherStatus === 'TERLAMBAT' || teacherMeta.key === 'HADIR';
  const needsReminder = isReadyToOpen && !isLive && !isFinished && !isOverdue && !isTeacherExcused && !isTeacherAlreadyPresent;
  const canChangeStatus = (isReadyToOpen || isOverdue || isTeacherExcused) && !isFinished && !isLive;
  const isTeacherPresent = isTeacherAlreadyPresent;

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

  const kelasNama = item.kelas_nama 
    || item.Kelas?.nama_kelas 
    || item.kelas 
    || '';

  const guruNama = item.guru_nama 
    || item.Guru?.nama_guru 
    || item.nama_guru 
    || item.guru 
    || 'Guru Pengampu';

  const jamMulai = item.jam_mulai 
    || (item.waktu_mulai ? (typeof item.waktu_mulai === 'string' && item.waktu_mulai.includes('T') ? item.waktu_mulai.split('T')[1].substring(0, 5) : item.waktu_mulai) : '') 
    || (item.waktu && item.waktu.includes('-') ? item.waktu.split('-')[0].trim() : '-');

  const jamSelesai = item.jam_selesai 
    || (item.waktu_selesai ? (typeof item.waktu_selesai === 'string' && item.waktu_selesai.includes('T') ? item.waktu_selesai.split('T')[1].substring(0, 5) : item.waktu_selesai) : '') 
    || (item.waktu && item.waktu.includes('-') ? item.waktu.split('-')[1].replace('WIB', '').trim() : '');

  const jamLabel = item.jamLabel || item.jam_label || (item.JamPelajaran?.nama_jam) || null;

  // 🏛️ Prediksi Batas Aman Hadir — Real-Time, update tiap menit
  // Hanya aktif untuk kartu mode GURU yang belum dimulai / siap dibuka
  const isGuroPrediksiActive = mode === 'GURU' && (isReadyToOpen || isUpcoming);

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

    // 1. Hitung deadline jadwal resmi (JadwalKBM.jam_mulai)
    const [schH, schM] = jamMulai.split(':').map(Number);
    const scheduledMinutes = schH * 60 + schM;

    // 2. Cek JadwalKegiatan hari ini — apakah ada yang selesai melewati jam jadwal?
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
        const days: string[] = Array.isArray(k.hari) ? k.hari : (k.hari || '').split(',').map((s: string) => s.trim().toUpperCase());
        if (!days.includes(todayStr)) return false;
        if (!k.waktu_selesai) return false;
        const [endH, endM] = k.waktu_selesai.split(':').map(Number);
        return (endH * 60 + endM) > scheduledMinutes;
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

    if (matchingKegiatan.length > 0) {
      const top = matchingKegiatan[0];
      const [endH, endM] = top.waktu_selesai.split(':').map(Number);
      deadlineMinutes = endH * 60 + endM;
      deadlineStr = top.waktu_selesai;
      kegiatanNama = top.nama;
    }

    // 4. Bandingkan waktu sekarang vs deadline
    const currentMinutes = nowTick.getHours() * 60 + nowTick.getMinutes();
    const lateMinutes = currentMinutes - deadlineMinutes;

    return {
      status: lateMinutes > 0 ? 'TERLAMBAT' : 'AMAN',
      menit: lateMinutes > 0 ? lateMinutes : 0,
      deadline: deadlineStr,
      kegiatanNama,
    };
  }, [nowTick, kegiatanData, jamMulai, isGuroPrediksiActive]);

  const hadirVal = item.summary?.hadir 
    ?? item._summary?.hadir 
    ?? item._summary?.HADIR 
    ?? (item.counts?.HADIR ?? item.counts?.hadir ?? 0);

  const totalVal = item.summary?.total 
    ?? item._summary?.total 
    ?? (item.counts?.TOTAL ?? item.counts?.total ?? 0);

  const hasJournal = Boolean(item.ProgresMateri || item.progres_materi || item.session?.ProgresMateri);
  const fotoKegiatanUrl = item.foto_kegiatan || item.foto_masuk || item.session?.foto_kegiatan || item.session?.foto_masuk || item.AbsenGuru?.[0]?.foto_masuk || null;
  const isOtomatis = Boolean(item.is_otomatis ?? (item.id && String(item.id).startsWith('sched_')));

  const handleClick = (e: React.MouseEvent) => {
    if (onSelectSession) {
      onSelectSession(item);
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

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-xs hover:shadow-md transition-all overflow-hidden select-none group/card",
        cardColorBlockStyle,
        className
      )}
    >
      {/* ── CARD MAIN CLICKABLE AREA ── */}
      <div 
        onClick={handleClick}
        className={cn(
          "p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2.5 transition-colors cursor-pointer",
          onToggleExpand || onSelectSession ? "hover:bg-black/5 dark:hover:bg-white/5" : ""
        )}
      >
        {/* ── ZONA 1: STATUS & TIME BAR ── */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            {/* Session Status Badge - High Contrast */}
            {isLive ? (
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
            )}

            {/* Teacher Status Badge - High Contrast */}
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

            {/* Slot Jam ke-X Badge */}
            {jamLabel && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider font-mono flex items-center gap-1 shrink-0">
                <Layers size={10} className="text-indigo-600 dark:text-indigo-400" />
                <span>{jamLabel}</span>
              </span>
            )}

            {/* Clock Time Range */}
            {jamMulai && (
              <span className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0">
                <Clock size={11} className="text-slate-400" />
                <span>{jamMulai}{jamSelesai ? ` - ${jamSelesai}` : ''} WIB</span>
              </span>
            )}

            {/* 🏛️ Prediksi Batas Aman Real-Time */}
            {prediksiRealtime && (
              prediksiRealtime.status === 'TERLAMBAT' ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-[10px] font-bold shrink-0"
                  title={`Sudah melewati batas aman hadir${prediksiRealtime.kegiatanNama ? ` (${prediksiRealtime.kegiatanNama})` : ''}`}
                >
                  🔴 Terlambat {prediksiRealtime.menit} m
                </span>
              ) : prediksiRealtime.kegiatanNama ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold shrink-0"
                  title={`Kegiatan ${prediksiRealtime.kegiatanNama} berlangsung — batas aman hadir s.d ${prediksiRealtime.deadline} WIB`}
                >
                  ⚠️ Aman ≤ {prediksiRealtime.deadline}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold shrink-0"
                  title={`Masuk tepat waktu sebelum ${prediksiRealtime.deadline} WIB`}
                >
                  ✅ Aman ≤ {prediksiRealtime.deadline}
                </span>
              )
            )}

            {/* Jadwal Resmi Badge */}
            {isOtomatis && mode === 'PETUGAS' && (
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                <Sparkles size={10} className="text-amber-600 dark:text-amber-400" />
                Jadwal Resmi
              </span>
            )}
          </div>

          {/* Right Header: Presensi Count or Test Alert */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Header Action: Buka Bahan Ajar Digital */}
            {onOpenBahanAjar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBahanAjar(item);
                }}
                title="Buka Bahan Ajar Digital & Panduan KBM"
                className="h-7 sm:h-auto sm:px-2.5 sm:py-1 rounded-xl text-xs font-black bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow-xs"
              >
                <BookOpen size={12} className="text-indigo-600 dark:text-indigo-400" />
                <span>Bahan Ajar</span>
              </button>
            )}

            {mode === 'GURU' && onTestAlert && (
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

            {/* Expand / Collapse Icon */}
            {onToggleExpand && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover/card:text-slate-900 dark:group-hover/card:text-white group-hover/card:bg-slate-200 dark:group-hover/card:bg-slate-700 transition-colors shrink-0">
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            )}
          </div>
        </div>

        {/* ── ZONA 2: CORE SUBJECT, CLASS, & TEACHER (NAMA GURU DI ATAS) ── */}
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {!hideKelas && kelasNama && kelasNama !== '-' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-black text-[11px] sm:text-xs font-mono border border-blue-300 dark:border-blue-800 shrink-0">
                {kelasNama}
              </span>
            )}
            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight tracking-tight truncate">
              {mapelNama}
            </h4>
          </div>

          {/* Nama Guru diletakkan di ATAS (untuk Siswa, Petugas, & Monitoring) */}
          {mode !== 'GURU' && (
            <div className="flex items-center justify-between gap-2 pt-0.5 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 min-w-0 truncate">
                <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">Guru:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{guruNama}</span>
              </div>

              {hasTask && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTaskModalOpen(true);
                  }}
                  title="Lihat petunjuk/tugas yang dititipkan guru"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
                >
                  <BookOpen size={11} className="text-blue-600 dark:text-blue-400" />
                  <span>📝 Tugas Guru</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── ZONA 3: FOOTER KHUSUS SESUAI POV (DIVIDER BAWAH) ── */}
        {/* 1. POV SISWA: Khusus Status Presensi Diri Sendiri */}
        {mode === 'SISWA' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Presensi Saya:</span>
              {studentStatus ? (
                <span className={cn(
                  "px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider shadow-xs",
                  studentStatus === 'HADIR' || studentStatus === 'TEPAT_WAKTU' 
                    ? "bg-emerald-600 text-white"
                    : studentStatus === 'TERLAMBAT'
                    ? "bg-amber-500 text-white"
                    : studentStatus === 'IZIN' || studentStatus === 'SAKIT'
                    ? "bg-blue-600 text-white"
                    : "bg-rose-600 text-white"
                )}>
                  {studentStatus === 'HADIR' ? 'Hadir' : studentStatus === 'TERLAMBAT' ? 'Terlambat' : studentStatus === 'IZIN' ? 'Izin' : studentStatus === 'SAKIT' ? 'Sakit' : 'Alpa'}
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
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onFinish(); }}
                  title="Selesaikan Sesi"
                >
                  <CheckCircle2 size={14} />
                </button>
              )}
              {onOpenPhotoModal && !isFinished && !isOverdue && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPhotoModal(item);
                  }}
                  title="Ambil foto Bapak/Ibu Guru yang sedang mengajar di depan kelas"
                  className={cn(
                    "h-8 px-3 rounded-xl text-xs font-black border flex items-center gap-1.5 cursor-pointer transition-all",
                    isTeacherPresent
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black border-transparent shadow-xs shadow-amber-500/30 animate-pulse"
                  )}
                >
                  <Camera size={13} />
                  <span>{isTeacherPresent ? "Foto Guru ✓" : "Foto Guru"}</span>
                </Button>
              )}
              {isTeacherPresent && fotoKegiatanUrl && onViewPhoto && (
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
                  <Camera size={13} className="text-emerald-500" />
                  <span>Foto Kelas</span>
                </Button>
              )}
              {onOpenScanModal && (
                <Button
                  type="button"
                  size="sm"
                  disabled={isOverdue || isFinished}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenScanModal(item.id);
                  }}
                  title={isOverdue ? "Sesi KBM telah terlewat (Scan RFID terkunci)" : isFinished ? "Sesi KBM telah selesai" : "Buka Terminal Scan Kartu RFID / QR Siswa"}
                  className={cn(
                    "h-8 px-3 rounded-xl text-xs font-black border flex items-center gap-1.5 cursor-pointer transition-all",
                    isOverdue || isFinished
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-xs shadow-emerald-600/30"
                  )}
                >
                  <QrCode size={13} />
                  <span>Scan RFID / QR</span>
                </Button>
              )}
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

        {/* 3. POV GURU: Tombol Aksi Guru di Kiri & Rincian Hadir Siswa di Kanan (Sejajar) */}
        {mode === 'GURU' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Mulai KBM (Foto) Button */}
              {isReadyToOpen && !isLive && !isFinished && !isOverdue && onOpenPhotoModal && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPhotoModal(item);
                  }}
                  className="h-8 px-3.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white border-none flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-900/20"
                >
                  <Camera size={13} />
                  <span>Mulai KBM</span>
                </Button>
              )}

              {/* Lihat Foto Bukti Kelas Button */}
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
                  <Camera size={13} className="text-emerald-500" />
                  <span>Foto Kelas</span>
                </Button>
              )}

              {/* Buka Bahan Ajar Button */}
              {onOpenBahanAjar && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBahanAjar(item);
                  }}
                  title="Buka Bahan Ajar Digital & Panduan KBM"
                  className="h-8 px-2.5 rounded-xl text-xs font-black bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                >
                  <BookOpen size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Bahan Ajar</span>
                </Button>
              )}

              {/* Isi Jurnal Button */}
              {(isLive || isFinished) && !isOverdue && onOpenJournalModal && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenJournalModal(item);
                  }}
                  className="h-8 px-3.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white border-none flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-900/20"
                >
                  <FileText size={13} />
                  <span>Jurnal</span>
                </Button>
              )}

              {hasJournal && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <BookOpen size={11} /> Jurnal Terisi
                </span>
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
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <BookOpen size={11} /> Jurnal Terisi
                </span>
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

      {/* ── MODAL INSTRUKSI TUGAS GURU ── */}
      {isTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            e.stopPropagation();
            setIsTaskModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 p-5 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Instruksi Tugas dari Guru</h4>
                  <p className="text-[11px] text-slate-400 font-medium">{guruNama} • {mapelNama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Badges Info */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {classSpecificTask ? (
                <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                  📌 Tugas Khusus Kelas {kelasNama}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                  🌐 Tugas Bersama / Global
                </span>
              )}

              {item.guru_inval_nama && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                  👥 Guru Inval: {item.guru_inval_nama}
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-950 dark:text-blue-200 leading-relaxed font-medium whitespace-pre-wrap">
              {taskText}
            </div>

            {taskFileUrl && (
              <a
                href={taskFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold text-xs border border-slate-200 dark:border-slate-700 hover:underline w-full justify-center"
              >
                <FileText size={14} />
                <span>Unduh Lembar Kerja / Modul Tugas</span>
              </a>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

UniversalKbmCardComponent.displayName = 'UniversalKbmCard';
export const UniversalKbmCard = React.memo(UniversalKbmCardComponent);
