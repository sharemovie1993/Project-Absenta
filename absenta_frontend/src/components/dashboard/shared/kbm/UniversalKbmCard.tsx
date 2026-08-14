import React from 'react';
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
  AlertCircle
} from 'lucide-react';
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
  onCloseSession?: (sesiId: string) => void;
  onOpenScanModal?: (sesiId: string) => void;
  onSelectSession?: (item: any) => void;
  onTestAlert?: (item: any) => void;
  onFinish?: () => void;
  onDelete?: () => void;
  
  onViewPhoto?: (item: any) => void;
  
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
  onCloseSession,
  onOpenScanModal,
  onSelectSession,
  onTestAlert,
  onFinish,
  onDelete,
  onViewPhoto,
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
  const isLive = Boolean(item.isLive ?? item.status?.isLive ?? false);
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
  const isTeacherPresent = teacherMeta.isHadir || isLive || rawTeacherStatus === 'HADIR' || rawTeacherStatus === 'TEPAT_WAKTU' || rawTeacherStatus === 'TERLAMBAT';

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
    } else if (onToggleExpand) {
      onToggleExpand();
    }
  };

  // High-contrast border accent & container styling
  const cardAccentBorder = isLive
    ? "border-l-4 border-l-emerald-500 hover:border-emerald-400"
    : isReadyToOpen
    ? "border-l-4 border-l-amber-500 hover:border-amber-400"
    : isOverdue
    ? "border-l-4 border-l-rose-500 hover:border-rose-400"
    : isFinished
    ? "border-l-4 border-l-slate-400 hover:border-slate-500"
    : "border-l-4 border-l-blue-500 hover:border-blue-400";

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all overflow-hidden select-none group/card",
        cardAccentBorder,
        className
      )}
    >
      {/* ── CARD MAIN CLICKABLE AREA ── */}
      <div 
        onClick={handleClick}
        className={cn(
          "p-4 sm:p-5 flex flex-col gap-2.5 transition-colors cursor-pointer",
          onToggleExpand || onSelectSession ? "hover:bg-slate-50/80 dark:hover:bg-slate-800/50" : ""
        )}
      >
        {/* ── ZONA 1: STATUS & TIME BAR ── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Session Status Badge - High Contrast */}
            {isLive ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 flex items-center gap-1 shrink-0 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                LIVE
              </span>
            ) : isReadyToOpen ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                SIAP DIMULAI
              </span>
            ) : isOverdue ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                TERLEWAT
              </span>
            ) : isFinished ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shrink-0">
                SELESAI
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                MENDATANG
              </span>
            )}

            {/* Teacher Status Badge - High Contrast */}
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1 shrink-0",
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
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider font-mono flex items-center gap-1 shrink-0">
                <Layers size={11} className="text-indigo-600 dark:text-indigo-400" />
                <span>{jamLabel}</span>
              </span>
            )}

            {/* Clock Time Range */}
            {jamMulai && (
              <span className="text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                <Clock size={12} className="text-slate-500 dark:text-slate-400" />
                <span>{jamMulai}{jamSelesai ? ` - ${jamSelesai} WIB` : ' WIB'}</span>
              </span>
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
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {mode === 'GURU' && onTestAlert && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTestAlert(item);
                }}
                title="Uji coba alarm & notifikasi untuk sesi KBM ini"
                className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Volume2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">Uji Alarm Sesi</span>
              </button>
            )}

            {/* Expand / Collapse Icon */}
            {onToggleExpand && (
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover/card:text-slate-900 dark:group-hover/card:text-white group-hover/card:bg-slate-200 dark:group-hover/card:bg-slate-700 transition-colors">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            )}
          </div>
        </div>

        {/* ── ZONA 2: CORE SUBJECT, CLASS, & TEACHER (NAMA GURU DI ATAS) ── */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            {!hideKelas && kelasNama && kelasNama !== '-' && (
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-black text-xs font-mono border border-blue-300 dark:border-blue-800 shrink-0">
                {kelasNama}
              </span>
            )}
            <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-snug tracking-tight truncate">
              {mapelNama}
            </h4>
          </div>

          {/* Nama Guru diletakkan di ATAS (untuk Siswa, Petugas, & Monitoring) */}
          {mode !== 'GURU' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center text-[9px] font-black shrink-0">
                {guruNama.charAt(0) || 'G'}
              </div>
              <span className="text-slate-400 dark:text-slate-500 font-medium">Guru:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{guruNama}</span>
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

              {/* Tutup Sesi Button */}
              {isLive && !isFinished && !isOverdue && onCloseSession && (
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseSession(item.session?.id || item.id);
                  }}
                  className="h-8 px-3.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white border-none flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-900/20"
                >
                  <X size={13} />
                  <span>Tutup</span>
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

        {/* 4. POV MONITORING: Status Jurnal di Kiri & Rincian Hadir Siswa di Kanan */}
        {mode === 'MONITORING' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
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
    </div>
  );
};

UniversalKbmCardComponent.displayName = 'UniversalKbmCard';
export const UniversalKbmCard = React.memo(UniversalKbmCardComponent);
