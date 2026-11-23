import React, { useMemo, useState, useEffect } from 'react';
import { Badge, DebouncedSearchInput } from '../../ui';
import { getAttendanceBadgeVariant } from '../../../utils/attendance/attendanceUiSelectors';
import { CatatanAbsensiModal } from '../modals/CatatanAbsensiModal';
import { getTimezone, formatLocalTimeFromISO, getVirtualDate, formatLocalDateTime } from '../../../utils/attendance/time';
import { 
  BookOpen, CheckCircle2, Users, Search, 
  RefreshCw, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPresensiTerpaduSesi } from '../../../api/attendanceGerbang.api';
import { requestWithFallback, formatErrorMessage } from '../../../api/apiUtils';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';


// Strict TypeScript Interfaces for Hardening
export interface SiswaDetail {
  id: string;
  nama_siswa: string;
  nis: string;
  jenis_kelamin?: 'L' | 'P';
}

export interface GuruDetail {
  id: string;
  nama_guru: string;
  nip?: string;
}

export interface SesiAttendanceRecord {
  id: string;
  sesi_absensi_id?: string;
  siswa_akademik_id?: string;
  siswa_id?: string;
  guru_id?: string;
  is_guru?: boolean;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DISPEN' | 'ALPA' | 'BELUM_TAP' | string;
  waktu_tap?: string | null;
  original_waktu_tap?: string | null;
  is_terlambat?: boolean;
  menit_keterlambatan?: number | null;
  asal_gerbang?: boolean;
  catatan?: string | null;
  Siswa?: SiswaDetail;
  Guru?: GuruDetail;
  is_piket_out?: boolean;
  piket_jam_keluar?: string | null;
  piket_log_id?: string | null;
}

export interface SesiDetail {
  id: string;
  status: 'BERLANGSUNG' | 'SELESAI' | string;
  waktu_mulai?: string | Date | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  guru_id?: string;
  nama_guru?: string;
  guru_status?: string;
  foto_kegiatan?: string | null;
  isLive?: boolean;
  waktu_tap_guru?: string | null;
  Guru?: GuruDetail;
  JamPelajaran?: {
    Guru?: GuruDetail;
    guru_id?: string;
    nama_guru?: string;
    jam_mulai?: string;
  };
  ProgresMateri?: {
    judul_materi: string;
    pencapaian_persen: number;
    kegiatan?: string;
  } | null;
}

type Props = {
  records?: SesiAttendanceRecord[];
  sesiId?: string;
  sesi?: SesiDetail;
  isReportMode?: boolean;
};

// Memoized Sub-Component for High-Performance Rendering (Fase 2)
const SesiAttendanceRow = React.memo(({
  record,
  sesi,
  isReportMode,
  isStartedByTeacher = true,
  isPending,
  onUpdateStatus
}: {
  record: SesiAttendanceRecord;
  sesi?: SesiDetail;
  isReportMode: boolean;
  isStartedByTeacher?: boolean;
  isPending: boolean;
  onUpdateStatus: (siswaAkademikId: string, status: string) => void;
}) => {
  const studentId = record.siswa_akademik_id || record.siswa_id || record.id || '';
  const isGuru = record.is_guru === true || (record as any).nisn === 'GURU' || (record as any)._type === 'guru';
  
  const rawGuruName = record.Guru?.nama_guru || (record as any).nama_guru || (isGuru ? sesi?.nama_guru : null);
  const rawSiswaName = record.Siswa?.nama_siswa || (record as any).nama_siswa || (record as any).nama;
  const nameDisplay = isGuru ? (rawGuruName || 'Guru Pengajar Sesi') : (rawSiswaName || studentId);
  const isPiketOut = record.is_piket_out || record.catatan?.includes('IZIN SEMENTARA PIKET') || record.catatan?.includes('IZIN SEMENTARA');
  const rawWaktuTap = record.waktu_tap || (record as any).waktu || (record as any).waktu_masuk || (record as any).created_at;

  const formatWaktuTapDisplay = (raw: string | null | undefined) => {
    if (!raw) return '--:--';
    const str = String(raw).trim();
    if (!str || str === '-' || str === 'null' || str === 'undefined') return '--:--';

    // 1. Handle ISO timestamp with T or Z strictly using tenant timezone
    if (str.includes('T') || str.includes('Z')) {
      const formatted = formatLocalTimeFromISO(str);
      if (formatted) return formatted;
    }

    // 2. Extract HH:mm from time portion only (prevent matching YYYY-MM-DD date parts)
    const timePortion = str.includes('T') ? str.split('T')[1] : str;
    const match = timePortion.match(/(\d{1,2})[:.](\d{2})/);
    if (match) {
      const hh = match[1].padStart(2, '0');
      const mm = match[2].padStart(2, '0');
      return `${hh}:${mm}`;
    }

    return str;
  };

  // Dynamic fallback calculation for late minutes if waktu_tap and schedule start exist
  const lateMinutes = useMemo(() => {
    if (record.menit_keterlambatan && Number(record.menit_keterlambatan) > 0) {
      return Number(record.menit_keterlambatan);
    }
    if (rawWaktuTap) {
      // 1. Try from sesi.waktu_mulai
      if (sesi?.waktu_mulai) {
        const tTap = new Date(rawWaktuTap);
        const tStart = new Date(sesi.waktu_mulai);
        if (!isNaN(tTap.getTime()) && !isNaN(tStart.getTime()) && tTap.getTime() > tStart.getTime()) {
          return Math.max(1, Math.floor((tTap.getTime() - tStart.getTime()) / (60 * 1000)));
        }
      }
      // 2. Try parsing HH:mm from rawWaktuTap vs sesi.jam_mulai
      const strTap = formatWaktuTapDisplay(rawWaktuTap);
      const strStart = sesi?.jam_mulai || (sesi as any)?.JamPelajaran?.jam_mulai || (sesi as any)?.start_time || '';
      if (strTap.includes(':') && strStart.includes(':')) {
        const [h1, m1] = strTap.split(':').map(Number);
        const [h2, m2] = strStart.split(':').map(Number);
        const min1 = h1 * 60 + m1;
        const min2 = h2 * 60 + m2;
        if (min1 > min2) {
          return min1 - min2;
        }
      }
    }
    return Number(record.menit_keterlambatan) || 0;
  }, [record.menit_keterlambatan, rawWaktuTap, sesi?.waktu_mulai, sesi?.jam_mulai, (sesi as any)?.JamPelajaran?.jam_mulai]);

  const isLate = (Boolean(record.is_terlambat) || lateMinutes > 0 || record.status === 'TERLAMBAT') && (record.status === 'HADIR' || record.status === 'TERLAMBAT');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-2.5 hover:bg-gray-50/60 dark:hover:bg-gray-900/40 transition-colors group",
        isGuru && "bg-indigo-50/30 dark:bg-indigo-950/20 border-l-2 border-indigo-500"
      )}
    >
      {/* ── 1. KIRI: NAMA SISWA / GURU & SUBLINE TAP / TELAT ── */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-[13px] group-hover:text-indigo-600 truncate max-w-full" title={nameDisplay}>
            {nameDisplay}
          </p>
          {isGuru && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200 border border-indigo-300/60">
              👨‍🏫 Guru / Pembina
            </span>
          )}
          {record.catatan?.includes('PULANG AWAL') && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50">
              🟧 Pulang Awal
            </span>
          )}
          {isPiketOut && record.status !== 'HADIR' && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300/80 animate-pulse">
              🟨 Izin Piket {record.piket_jam_keluar ? `(${record.piket_jam_keluar})` : ''}
            </span>
          )}
        </div>

        {/* Subline: Waktu Tap + Keterangan Terlambat / Catatan */}
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 flex-wrap">
          <span className="font-mono font-medium">
            {rawWaktuTap ? `Tap: ${formatWaktuTapDisplay(rawWaktuTap)} WIB` : 'Belum tap'}
          </span>
          {isLate && (
            <span className="px-1.5 py-0.2 text-[8px] font-black bg-rose-50 text-rose-600 rounded uppercase tracking-wider border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60">
              TELAT {lateMinutes > 0 ? `${lateMinutes}m` : ''}
            </span>
          )}
          {(record.status === 'DISPEN' || record.catatan?.includes('DISPENSASI')) && (
            <span className="px-1.5 py-0.2 text-[7.5px] font-black bg-purple-50 text-purple-600 rounded uppercase tracking-tighter border border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50">
              DISPEN
            </span>
          )}
          {record.catatan && !record.catatan.includes('PULANG AWAL') && !record.catatan.includes('DISPENSASI') && (
            <span className="text-indigo-500 font-bold italic truncate max-w-xs">
              • {record.catatan}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. KANAN: TINDAKAN KEHADIRAN (SERAGAM DENGAN MODUL BELUM ABSEN) ── */}
      <div className="shrink-0 flex items-center justify-end">
        {isReportMode ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {record.status === 'HADIR' || record.status === 'TERLAMBAT' ? (
              <span className="h-6.5 sm:h-7.5 px-2.5 rounded-md bg-emerald-600 text-white text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                <CheckCircle2 size={11} className="text-white" />
                <span>Hadir</span>
              </span>
            ) : record.status === 'SAKIT' ? (
              <span className="h-6.5 sm:h-7.5 px-2.5 rounded-md border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider flex items-center">
                Sakit
              </span>
            ) : record.status === 'IZIN' ? (
              <span className="h-6.5 sm:h-7.5 px-2.5 rounded-md border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider flex items-center">
                Izin
              </span>
            ) : record.status === 'DISPEN' ? (
              <span className="h-6.5 sm:h-7.5 px-2.5 rounded-md border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider flex items-center">
                Dispen
              </span>
            ) : record.status === 'ALPA' ? (
              <span className="h-6.5 sm:h-7.5 px-2.5 rounded-md border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider flex items-center">
                Alpa
              </span>
            ) : (
              <span className="h-6.5 sm:h-7.5 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider flex items-center">
                Belum Tap
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
            {isPiketOut && record.status !== 'HADIR' && (
              <button
                disabled={isPending || !isStartedByTeacher}
                onClick={() => {
                  onUpdateStatus(studentId, 'HADIR');
                  toast.success(`Konfirmasi kembali: Status ${record.Siswa?.nama_siswa || 'siswa'} diubah ke HADIR & Piket diselesaikan`);
                }}
                className={cn(
                  "h-6.5 sm:h-7.5 px-2 rounded-md text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1 transition-all",
                  !isStartedByTeacher
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer"
                )}
                title={!isStartedByTeacher ? "Sesi KBM belum dibuka (Ambil Foto Guru terlebih dahulu)" : "Siswa sudah kembali ke kelas — ubah status ke HADIR & selesaikan Izin Piket"}
              >
                <CheckCircle2 size={10} />
                <span>Balik</span>
              </button>
            )}

            {/* 1. HADIR */}
            <button
              type="button"
              disabled={isPending || !isStartedByTeacher}
              title={!isStartedByTeacher ? "Sesi KBM belum dibuka (Ambil Foto Guru terlebih dahulu)" : "Tandai Hadir"}
              onClick={() => onUpdateStatus(studentId, 'HADIR')}
              className={cn(
                "h-6.5 sm:h-7.5 min-w-[36px] sm:min-w-[46px] px-1.5 sm:px-2.5 rounded-md text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0",
                !isStartedByTeacher
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50"
                  : (record.status === 'HADIR' || record.status === 'TERLAMBAT')
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                  : "bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
              )}
            >
              Hadir
            </button>

            {/* 2. SAKIT */}
            <button
              type="button"
              disabled={isPending || !isStartedByTeacher}
              title={!isStartedByTeacher ? "Sesi KBM belum dibuka (Ambil Foto Guru terlebih dahulu)" : "Tandai Sakit"}
              onClick={() => onUpdateStatus(studentId, 'SAKIT')}
              className={cn(
                "h-6.5 sm:h-7.5 min-w-[36px] sm:min-w-[46px] px-1.5 sm:px-2.5 rounded-md text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0",
                !isStartedByTeacher
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50"
                  : record.status === 'SAKIT'
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
                  : "bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
              )}
            >
              Sakit
            </button>

            {/* 3. IZIN */}
            <button
              type="button"
              disabled={isPending || !isStartedByTeacher}
              title={!isStartedByTeacher ? "Sesi KBM belum dibuka (Ambil Foto Guru terlebih dahulu)" : "Tandai Izin"}
              onClick={() => onUpdateStatus(studentId, 'IZIN')}
              className={cn(
                "h-6.5 sm:h-7.5 min-w-[36px] sm:min-w-[46px] px-1.5 sm:px-2.5 rounded-md text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0",
                !isStartedByTeacher
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50"
                  : record.status === 'IZIN'
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                  : "bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
              )}
            >
              Izin
            </button>

            {/* 4. DISPEN */}
            <button
              type="button"
              disabled={isPending || !isStartedByTeacher}
              title={!isStartedByTeacher ? "Sesi KBM belum dibuka (Ambil Foto Guru terlebih dahulu)" : "Tandai Dispen"}
              onClick={() => onUpdateStatus(studentId, 'DISPEN')}
              className={cn(
                "h-6.5 sm:h-7.5 min-w-[36px] sm:min-w-[46px] px-1.5 sm:px-2.5 rounded-md text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0",
                !isStartedByTeacher
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50"
                  : record.status === 'DISPEN'
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                  : "bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
              )}
            >
              Dispen
            </button>

            {/* 5. ALPA */}
            <button
              type="button"
              disabled={isPending || !isStartedByTeacher}
              title={!isStartedByTeacher ? "Sesi KBM belum dibuka (Ambil Foto Guru terlebih dahulu)" : "Tandai Alpa"}
              onClick={() => onUpdateStatus(studentId, 'ALPA')}
              className={cn(
                "h-6.5 sm:h-7.5 min-w-[36px] sm:min-w-[46px] px-1.5 sm:px-2.5 rounded-md text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center shrink-0",
                !isStartedByTeacher
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50"
                  : record.status === 'ALPA'
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
                  : "bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              )}
            >
              Alpa
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

SesiAttendanceRow.displayName = 'SesiAttendanceRow';

export function SesiAttendanceList({ records, sesi, sesiId, isReportMode = false }: Props) {
  const queryClient = useQueryClient();
  const effectiveSesiId = sesiId || sesi?.id;

  const isSessionOpen = Boolean(
    sesi?.status === 'BERLANGSUNG' ||
    (sesi as any)?.status === 'BERLANGSUNG' ||
    sesi?.foto_kegiatan ||
    (sesi as any)?.foto_masuk ||
    (sesi as any)?.opened_by_petugas ||
    (sesi as any)?.absenGuru?.status === 'HADIR' ||
    (sesi as any)?.AbsenGuru?.[0]?.status === 'HADIR' ||
    (sesi?.guru_status && !['BELUM_TAP', 'BELUM_HADIR', 'ALPA', 'MENDATANG'].includes(sesi?.guru_status))
  );

  // Auto-fetch jika records tidak di-passing langsung
  const { data: fetchedRes, isLoading: isFetching } = useQuery({
    queryKey: ['sesi-detail-attendance', effectiveSesiId],
    queryFn: () => getPresensiTerpaduSesi(effectiveSesiId!),
    enabled: Boolean(effectiveSesiId && (!records || !Array.isArray(records))),
    staleTime: 10000,
  });

  const resolvedRecords: SesiAttendanceRecord[] = useMemo(() => {
    if (Array.isArray(records)) return records;
    const raw = fetchedRes?.data || fetchedRes;
    return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  }, [records, fetchedRes]);
  const progres = sesi?.ProgresMateri;
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ siswaAkademikId: string; studentName: string; status: 'SAKIT' | 'IZIN' | 'DISPEN' } | null>(null);

  // Stable & Immutable Teacher injection ensuring row never vanishes during refetch, query invalidation, or toast dismissal
  const preparedRecords = useMemo(() => {
    const safeRecords = Array.isArray(resolvedRecords) ? resolvedRecords : [];
    const hasGuruInRecords = safeRecords.some(r => r.is_guru || Boolean(r.Guru) || Boolean(r.guru_id) || (r as any)._type === 'guru');
    
    // Resolve teacher detail fallback
    const guruDetail: GuruDetail = sesi?.Guru || sesi?.JamPelajaran?.Guru || {
      id: sesi?.guru_id || sesi?.JamPelajaran?.guru_id || 'guru-sesi-default',
      nama_guru: sesi?.nama_guru || sesi?.JamPelajaran?.nama_guru || 'Guru Pengajar Sesi'
    };

    const gId = guruDetail.id || 'guru-sesi-default';

    // Check local storage for persistent status
    let savedGuruData: { status?: string; waktu_tap?: string | null; catatan?: string | null; is_terlambat?: boolean } | null = null;
    try {
      const stored = localStorage.getItem(`absenta_guru_att_${sesi?.id || 'active'}_${gId}`);
      if (stored) savedGuruData = JSON.parse(stored);
    } catch {}

    let baseRecords = safeRecords;

    if (!hasGuruInRecords) {
      const teacherRec: SesiAttendanceRecord = {
        id: `guru-${gId}`,
        guru_id: gId,
        is_guru: true,
        status: savedGuruData?.status || sesi?.guru_status || 'BELUM_TAP',
        waktu_tap: savedGuruData?.waktu_tap !== undefined ? savedGuruData.waktu_tap : (sesi?.waktu_tap_guru ?? null),
        original_waktu_tap: savedGuruData?.waktu_tap !== undefined ? savedGuruData.waktu_tap : (sesi?.waktu_tap_guru ?? null),
        is_terlambat: savedGuruData?.is_terlambat || false,
        Guru: guruDetail,
        catatan: savedGuruData?.catatan !== undefined ? savedGuruData.catatan : null
      };

      baseRecords = [teacherRec, ...safeRecords];
    }

    return baseRecords.map(r => {
      const origTap = r.original_waktu_tap || (r.status === 'HADIR' ? r.waktu_tap : null);
      const isG = r.is_guru || Boolean(r.Guru) || Boolean(r.guru_id) || (r as any)._type === 'guru';
      if (isG) {
        const teacherId = r.guru_id || r.Guru?.id || gId;
        try {
          const stored = localStorage.getItem(`absenta_guru_att_${sesi?.id || 'active'}_${teacherId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            return {
              ...r,
              original_waktu_tap: origTap || parsed.waktu_tap || null,
              status: parsed.status || r.status,
              waktu_tap: parsed.waktu_tap !== undefined ? parsed.waktu_tap : r.waktu_tap,
              is_terlambat: parsed.is_terlambat !== undefined ? parsed.is_terlambat : r.is_terlambat,
              catatan: parsed.catatan !== undefined ? parsed.catatan : r.catatan
            };
          }
        } catch {}
      }
      return {
        ...r,
        original_waktu_tap: origTap
      };
    });
  }, [resolvedRecords, sesi]);

  // Sync state with parent props for robust optimistic updates across all dashboards
  const [localRecords, setLocalRecords] = useState<SesiAttendanceRecord[]>(preparedRecords);
  useEffect(() => {
    setLocalRecords(preparedRecords);
  }, [preparedRecords]);

  // Mutation for updating student OR teacher attendance with advanced React Query Optimistic Updates
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ siswaAkademikId, status, catatan, waktu_tap }: { siswaAkademikId: string, status: string, catatan?: string, waktu_tap?: string }) => {
      const targetRecord = localRecords.find(r => 
        (r.siswa_akademik_id || r.siswa_id || r.guru_id || r.id) === siswaAkademikId
      );
      const isGuruTarget = targetRecord?.is_guru || Boolean(targetRecord?.Guru) || Boolean(targetRecord?.guru_id) || (targetRecord as any)?._type === 'guru';

      if (isGuruTarget) {
        const guruId = targetRecord?.guru_id || targetRecord?.Guru?.id || siswaAkademikId.replace('guru-', '');
        return requestWithFallback('patch', `/attendance/sesi-absensi/${sesi?.id}/absen-guru/${guruId}`, {
          data: {
            status: status,
            waktu_tap: waktu_tap,
            catatan: catatan
          }
        });
      }

      return requestWithFallback('post', `/attendance/sesi-absensi/${sesi?.id}/tap-siswa`, {
        data: {
          siswa_akademik_id: siswaAkademikId,
          status: status,
          waktu_tap: waktu_tap,
          catatan: catatan
        }
      });
    },
    onMutate: async ({ siswaAkademikId, status, waktu_tap }) => {
      if (!sesi?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sesi-detail-attendance', sesi.id] });

      // Snapshot the previous value in query cache
      const previousQueryRes = queryClient.getQueryData<any>(['sesi-detail-attendance', sesi.id]);

      // Optimistically update React Query Cache
      if (previousQueryRes?.data) {
        const optimisticQueryData = previousQueryRes.data.map((rec: SesiAttendanceRecord) => {
          const currentId = rec.siswa_akademik_id || rec.siswa_id || rec.guru_id || rec.id;
          if (currentId !== siswaAkademikId) return rec;

          const historicalTap = rec.original_waktu_tap || (rec.status === 'HADIR' ? rec.waktu_tap : null);
          const effectiveTap = status === 'HADIR' ? (waktu_tap || historicalTap || new Date().toISOString()) : null;

          return { 
            ...rec, 
            status: status, 
            waktu_tap: effectiveTap,
            original_waktu_tap: historicalTap || effectiveTap,
            is_terlambat: status === 'HADIR' ? rec.is_terlambat : false,
            menit_keterlambatan: status === 'HADIR' ? rec.menit_keterlambatan : 0
          };
        });
        queryClient.setQueryData(['sesi-detail-attendance', sesi.id], {
          ...previousQueryRes,
          data: optimisticQueryData
        });
      }

      return { previousQueryRes };
    },
    onSuccess: (_, variables) => {
      toast.success('Status absensi diperbarui', { id: 'status-absensi-toast', duration: 1500 });
      
      // Save persistent teacher attendance ONLY WHEN SERVER ACCEPTS THE TRANSACTION
      const targetRec = localRecords.find(r => (r.siswa_akademik_id || r.siswa_id || r.guru_id || r.id) === variables.siswaAkademikId);
      const isGuruTarget = targetRec?.is_guru || Boolean(targetRec?.Guru) || Boolean(targetRec?.guru_id) || (targetRec as any)?._type === 'guru';
      
      if (isGuruTarget && sesi?.id) {
        const gId = targetRec?.guru_id || targetRec?.Guru?.id || 'guru-sesi';
        const wTap = variables.status === 'BELUM_TAP' ? null : (targetRec?.waktu_tap || new Date().toISOString());
        try {
          localStorage.setItem(`absenta_guru_att_${sesi.id}_${gId}`, JSON.stringify({
            status: variables.status,
            waktu_tap: wTap,
            is_terlambat: targetRec?.is_terlambat || false,
            catatan: variables.catatan !== undefined ? variables.catatan : targetRec?.catatan
          }));
        } catch {}
      }
    },
    onError: (error: any, variables, context) => {
      // Rollback local records state to preparedRecords (preserving Guru row)
      setLocalRecords(preparedRecords);

      // Remove invalid/rejected localStorage entry if transaction was rejected by backend
      if (sesi?.id && variables?.siswaAkademikId) {
        const targetRec = localRecords.find(r => (r.siswa_akademik_id || r.siswa_id || r.guru_id || r.id) === variables.siswaAkademikId);
        const gId = targetRec?.guru_id || targetRec?.Guru?.id || 'guru-sesi';
        try {
          localStorage.removeItem(`absenta_guru_att_${sesi.id}_${gId}`);
        } catch {}
      }

      // Rollback query cache
      if (context?.previousQueryRes && sesi?.id) {
        queryClient.setQueryData(['sesi-detail-attendance', sesi.id], context.previousQueryRes);
      }

      const msg = formatErrorMessage(error);
      toast.error(msg, { id: 'status-absensi-toast', duration: 3000 });
    },
    onSettled: () => {
      // Force synchronization with server
      if (sesi?.id) {
        queryClient.invalidateQueries({ queryKey: ['sesi-detail-attendance', sesi.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['attendance-today-me-class'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-discipline-leaderboard-modal'] });
    }
  });

  const stats = useMemo(() => {
    return {
      total: localRecords.length,
      hadir: localRecords.filter(r => r.status === 'HADIR').length,
      izin: localRecords.filter(r => r.status === 'IZIN').length,
      sakit: localRecords.filter(r => r.status === 'SAKIT').length,
      alpa: localRecords.filter(r => r.status === 'ALPA').length,
      dispen: localRecords.filter(r => r.status === 'DISPEN' || r.catatan?.includes('DISPENSASI')).length,
      terlambat: localRecords.filter(r => r.is_terlambat).length,
      pending_gate: localRecords.filter(r => r.status === 'HADIR' && r.asal_gerbang === false).length,
      belum_tap: localRecords.filter(r => r.status === 'BELUM_TAP' || !r.status).length,
    };
  }, [localRecords]);

  const filteredRecords = useMemo(() => {
    return localRecords.filter(record => {
      const studentName = record.Siswa?.nama_siswa || (record as any).nama_siswa || (record as any).nama || '';
      const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (record.Siswa?.nisn && record.Siswa.nisn.includes(searchTerm));
      
      if (!matchesSearch) return false;
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'HADIR') return record.status === 'HADIR';
      if (filterStatus === 'IZIN') return record.status === 'IZIN' || record.status === 'SAKIT';
      if (filterStatus === 'ALPA') return record.status === 'ALPA';
      if (filterStatus === 'DISPEN') return record.status === 'DISPEN' || record.catatan?.includes('DISPENSASI');
      if (filterStatus === 'BELUM_TAP') return record.status === 'BELUM_TAP' || !record.status;
      return true;
    });
  }, [localRecords, filterStatus, searchTerm]);

  const handleUpdateStatus = (siswaAkademikId: string, status: string, catatan?: string) => {
    if (['SAKIT', 'IZIN', 'DISPEN'].includes(status) && catatan === undefined) {
      const rec = localRecords.find(r => (r.siswa_akademik_id || r.siswa_id || r.guru_id || r.id) === siswaAkademikId);
      const studentName = rec?.Siswa?.nama_siswa || (rec as any)?.nama_siswa || 'Siswa';
      setNoteTarget({ siswaAkademikId, studentName, status: status as any });
      setNoteModalOpen(true);
      return;
    }

    // 1. Instant optimistic update to local state
    const targetRec = localRecords.find(r => (r.siswa_akademik_id || r.siswa_id || r.guru_id || r.id) === siswaAkademikId);
    const tenantNowISO = formatLocalDateTime(getVirtualDate());

    // 🛡️ Original Check-In Timestamp Restoration (Human Error Protection):
    // Jika guru pernah menandai HADIR (misal telat 2 menit), lalu tidak sengaja klik ALPA,
    // lalu kembali klik HADIR, kembalikan jam tap original agar siswa tidak terkena akumulasi telat palsu.
    const historicalTap = targetRec?.original_waktu_tap || (targetRec?.status === 'HADIR' ? targetRec?.waktu_tap : null);
    const effectiveTap = status === 'HADIR' ? (historicalTap || tenantNowISO) : null;

    let isLate = false;
    let lateMinutes = 0;

    if (status === 'HADIR') {
      const jamMulaiStr = sesi?.jam_mulai || (sesi as any)?.JamPelajaran?.jam_mulai;
      if (jamMulaiStr && effectiveTap) {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: getTimezone(),
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).formatToParts(new Date(effectiveTap));
        
        const map: Record<string, string> = {};
        parts.forEach(p => map[p.type] = p.value);
        
        const tapMinutes = parseInt(map.hour || '0', 10) * 60 + parseInt(map.minute || '0', 10);
        const [startH, startM] = jamMulaiStr.split(':').map(Number);
        const startMinutes = (startH || 0) * 60 + (startM || 0);
        
        if (tapMinutes > startMinutes) {
          isLate = true;
          lateMinutes = tapMinutes - startMinutes;
        } else {
          isLate = false;
          lateMinutes = 0;
        }
      }
    } else {
      isLate = false;
      lateMinutes = 0;
    }

    setLocalRecords(prev => 
      prev.map(r => {
        const currentId = r.siswa_akademik_id || r.siswa_id || r.guru_id || r.id;
        if (currentId !== siswaAkademikId) return r;

        return { 
          ...r, 
          status: status, 
          catatan: catatan !== undefined ? catatan : r.catatan,
          is_terlambat: isLate,
          menit_keterlambatan: lateMinutes,
          waktu_tap: effectiveTap,
          original_waktu_tap: historicalTap || effectiveTap
        };
      })
    );

    // 2. Fire mutation
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

  if (isFetching && resolvedRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Memuat rincian presensi sesi KBM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-1">


      {/* 2. Tiny Inline Journal Info */}
      {progres && (
        <div className="bg-indigo-50/20 dark:bg-indigo-900/10 px-3 py-1.5 rounded-lg border border-indigo-100/30 dark:border-indigo-800/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
            <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 truncate">{progres.judul_materi}</p>
          </div>
          <span className="text-[9px] font-black text-indigo-500 shrink-0">{progres.pencapaian_persen}%</span>
        </div>
      )}

      {/* 3. Content Section (List Mode Only) */}
      <div className="space-y-2.5">
        {/* Search & Status Tabs Bar */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <div className="flex-1 max-w-xs">
            <DebouncedSearchInput
              placeholder="Cari siswa di rombel ini..."
              aria-label="Cari Siswa"
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full"
              inputClassName="h-7.5 text-xs rounded-lg"
            />
          </div>
          {/* Status Tabs dengan Badge Count — compact & proporsional */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { key: 'ALL', label: 'All', count: stats.total },
            { key: 'HADIR', label: 'Hadir', count: stats.hadir },
            { key: 'BELUM_TAP', label: 'Belum', count: stats.belum_tap },
            ...(stats.izin + stats.sakit > 0 ? [{ key: 'IZIN', label: 'Izin', count: stats.izin + stats.sakit }] : []),
            ...(stats.dispen > 0 ? [{ key: 'DISPEN', label: 'Dispen', count: stats.dispen }] : []),
            { key: 'ALPA', label: 'Alpa', count: stats.alpa }
          ].map((tab) => {
            const isActive = filterStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-7 rounded-lg text-[10px] font-bold transition-all shrink-0 border",
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "px-1.5 py-0.2 text-[9px] font-extrabold rounded-full",
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

        {/* List Records */}
        {!isSessionOpen && !isReportMode && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-2.5 text-xs mb-2">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-black">Sesi KBM Belum Dibuka:</span> Presensi siswa terkunci sampai sesi dibuka oleh Guru atau Petugas Kelas. Klik tombol <strong>Buka Sesi Kelas</strong> pada kartu sesi untuk mulai mengabsenkan siswa.
            </div>
          </div>
        )}

        {filteredRecords.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400">Tidak ada siswa pada kategori status ini.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-gray-900/60 px-3 sm:px-4 py-2 sm:py-2.5 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-gray-800">
                  <div>Nama Peserta / Siswa</div>
                  <div className="text-right">{isReportMode ? 'Status Kehadiran' : 'Tindakan Kehadiran'}</div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRecords.map((r) => {
                    const rowId = r.siswa_akademik_id || r.siswa_id || r.guru_id || r.id;
                    return (
                      <SesiAttendanceRow 
                        key={r.id || r.siswa_akademik_id || r.guru_id}
                        record={r}
                        sesi={sesi}
                        isReportMode={isReportMode}
                        isStartedByTeacher={isSessionOpen}
                        isPending={
                          updateAttendanceMutation.isPending && 
                          updateAttendanceMutation.variables?.siswaAkademikId === rowId
                        }
                        onUpdateStatus={handleUpdateStatus}
                      />
                    );
                  })}
                  {filteredRecords.length === 0 && (
                    <div className="p-10 text-center space-y-2">
                      <Search className="w-8 h-8 text-gray-200 mx-auto" />
                      <p className="text-gray-400 font-bold italic text-[10px]">Tidak ditemukan.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      <CatatanAbsensiModal
        isOpen={noteModalOpen}
        onClose={() => { setNoteModalOpen(false); setNoteTarget(null); }}
        studentName={noteTarget?.studentName || 'Siswa'}
        status={noteTarget?.status || 'SAKIT'}
        onSubmit={handleNoteSubmit}
      />
    </div>
  );
}

