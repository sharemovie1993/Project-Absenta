import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { loadPersistedRoomMappings } from '@/components/cbt/jadwal/cbtOrchestratorHelper';
import {
  PlayCircle,
  RotateCcw,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  CalendarClock,
  DoorOpen,
  Lock,
  Info,
  FileQuestion,
  KeyRound,
  RefreshCw,
  ChevronRight,
  Hourglass,
  Ban,
  Trophy,
  Award,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtStudentExamItem } from '@/types/cbt.types';
import { useCbtOperationMode } from '@/components/cbt/cbtModeHelper';
import { getTimezone, getTimezoneLabel } from '@/utils/attendance/time';
import { Modal } from '@/components/ui';
import { CbtDenahModal } from '@/components/cbt/jadwal/CbtDenahModal';

type FilterKey = 'aktif' | 'mendatang' | 'riwayat' | 'semua';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'aktif', label: 'Berlangsung' },
  { key: 'mendatang', label: 'Jadwal' },
  { key: 'riwayat', label: 'Riwayat' },
  { key: 'semua', label: 'Semua' },
];

const formatExamDateIndo = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const tz = getTimezone();
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: tz,
  });
};

const formatExamTimeRange = (startIso?: string | null, endIso?: string | null) => {
  if (!startIso) return '-';
  const s = new Date(startIso);
  if (Number.isNaN(s.getTime())) return '-';
  const tz = getTimezone();
  const startTime = s.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });
  const tzLabel = getTimezoneLabel(tz);
  if (!endIso) return `${startTime} ${tzLabel}`;
  const e = new Date(endIso);
  if (Number.isNaN(e.getTime())) return `${startTime} ${tzLabel}`;
  const endTime = e.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });
  return `${startTime} – ${endTime} ${tzLabel}`;
};

const resolveSesiLabel = (item: CbtStudentExamItem) => {
  if (item.nama_sesi_waktu) return item.nama_sesi_waktu;
  const match = item.nama_sesi.match(/Sesi\s*\d+/i);
  if (match) return match[0];
  const d = new Date(item.tanggal_mulai);
  if (!Number.isNaN(d.getTime())) {
    const tz = getTimezone();
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).formatToParts(d);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? d.getHours());
    if (hour < 9) return 'Sesi 1';
    if (hour < 11) return 'Sesi 2';
    if (hour < 13) return 'Sesi 3';
    if (hour < 15) return 'Sesi 4';
  }
  return 'Sesi 1';
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const tz = getTimezone();
  return d.toLocaleString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });
};

const formatTimeOnly = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const tz = getTimezone();
  return `${d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  })} ${getTimezoneLabel(tz)}`;
};

const formatScore = (val: number) => {
  const rounded1 = Math.round(val * 10) / 10;
  return Number.isInteger(rounded1) ? String(rounded1) : rounded1.toFixed(1);
};

const getPredikatMeta = (score: number) => {
  const rounded = Math.round(score);
  if (rounded >= 85) {
    return {
      label: 'Sangat Baik',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      scoreClass: 'text-emerald-600 dark:text-emerald-400',
      boxClass: 'bg-emerald-50/70 border-emerald-200/80 dark:bg-emerald-950/25 dark:border-emerald-900/60',
    };
  }
  if (rounded >= 70) {
    return {
      label: 'Tuntas',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
      scoreClass: 'text-sky-600 dark:text-sky-400',
      boxClass: 'bg-sky-50/70 border-sky-200/80 dark:bg-sky-950/25 dark:border-sky-900/60',
    };
  }
  return {
    label: 'Perlu Penguatan',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    scoreClass: 'text-amber-600 dark:text-amber-400',
    boxClass: 'bg-amber-50/70 border-amber-200/80 dark:bg-amber-950/25 dark:border-amber-900/60',
  };
};

/** Ujian yang masih bisa dikerjakan / dilanjutkan oleh siswa */
const isActionable = (item: CbtStudentExamItem) =>
  (item.status_jadwal === 'ACTIVE' || item.status_jadwal === 'PAUSED') &&
  item.status_peserta !== 'FINISHED' &&
  item.status_peserta !== 'DISQUALIFIED';

/** Ujian resmi yang sudah terbit namun belum dibuka pengawas */
const isUpcoming = (item: CbtStudentExamItem) =>
  item.status_jadwal === 'DRAFT' &&
  item.status_peserta !== 'FINISHED' &&
  item.status_peserta !== 'DISQUALIFIED';

/** Ujian yang sudah selesai, diskualifikasi, atau ditutup */
const isHistory = (item: CbtStudentExamItem) =>
  item.status_peserta === 'FINISHED' ||
  item.status_peserta === 'DISQUALIFIED' ||
  item.status_jadwal === 'COMPLETED';

interface StatusMeta {
  label: string;
  className: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const getStatusMeta = (item: CbtStudentExamItem): StatusMeta => {
  if (item.status_peserta === 'FINISHED') {
    return {
      label: 'Selesai Dikerjakan',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      icon: CheckCircle2,
    };
  }
  if (item.status_peserta === 'DISQUALIFIED') {
    return {
      label: 'Didiskualifikasi',
      className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
      icon: XCircle,
    };
  }
  if (item.status_jadwal === 'PAUSED') {
    return {
      label: 'Dijeda Pengawas',
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
      icon: PauseCircle,
    };
  }
  if (item.status_jadwal === 'ACTIVE') {
    if (item.status_peserta === 'IN_PROGRESS') {
      return {
        label: 'Sedang Dikerjakan',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
        icon: Hourglass,
      };
    }
    return {
      label: 'Ujian Dibuka',
      className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
      icon: PlayCircle,
    };
  }
  if (item.status_jadwal === 'DRAFT') {
    return {
      label: 'Jadwal Resmi Diterbitkan',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
      icon: CalendarClock,
    };
  }
  return {
    label: 'Tidak Mengikuti',
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    icon: Ban,
  };
};

export const SiswaCbtTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';
  const studentProfile = user?.siswa_profile || (user as any)?.siswa || null;
  const studentKelasName =
    studentProfile?.Kelas?.nama_kelas ||
    studentProfile?.kelas?.nama_kelas ||
    (user as any)?.kelas_nama ||
    (user as any)?.nama_kelas ||
    '';
  const studentKelasId = studentProfile?.kelas_id || (user as any)?.kelas_id || '';

  const { activeEvent } = useCbtOperationMode();

  const studentTingkat = useMemo(() => {
    const rawTingkat = studentProfile?.Kelas?.tingkat || studentProfile?.kelas?.tingkat;
    if (rawTingkat) return Number(rawTingkat);
    const m = (studentKelasName || '').match(/^(X{1,3}|IX|IV|V?I{0,3}|\d+)/i);
    if (m) {
      const roman = m[1].toUpperCase();
      if (roman === 'X' || roman === '10') return 10;
      if (roman === 'XI' || roman === '11') return 11;
      if (roman === 'XII' || roman === '12') return 12;
      if (roman === 'XIII' || roman === '13') return 13;
    }
    return null;
  }, [studentProfile, studentKelasName]);

  const isStudentOutsideTargetEvent = useMemo(() => {
    if (!activeEvent || !activeEvent.target_tingkat || activeEvent.target_tingkat.length === 0) return false;
    if (!studentTingkat) return false;
    return !activeEvent.target_tingkat.includes(studentTingkat);
  }, [activeEvent, studentTingkat]);

  const persistedRooms = useMemo(() => loadPersistedRoomMappings(tenantId), [tenantId]);

  const resolveRoomInfo = useCallback(
    (item: CbtStudentExamItem) => {
      const rawSlot = item.ruang_ujian?.trim();
      const rawNama = item.ruang_ujian_nama?.trim();

      const isMulti =
        !rawSlot ||
        rawSlot.toLowerCase().includes('multi') ||
        rawSlot.toLowerCase() === 'ruang kelas' ||
        Boolean(rawNama && rawNama.toLowerCase().includes('multi'));

      // 1. Jika ruang_ujian pada jadwal adalah kode ruang spesifik (misal: R.12, R.01, dsb)
      if (!isMulti && (rawSlot || rawNama)) {
        const slot = rawSlot || rawNama!;
        return {
          code: slot,
          display: slot,
        };
      }

      // 2. Cek apakah ada mapping spesifik di room_mappings / kelas_room_map / persistedRooms
      const itemMap = (item as any)?.room_mappings || (item as any)?.kelas_room_map;
      if (studentKelasId && itemMap?.[studentKelasId]?.slot_ruang) {
        const slot = itemMap[studentKelasId].slot_ruang;
        return {
          code: slot,
          display: slot,
        };
      }

      if (studentKelasId && persistedRooms?.[studentKelasId]) {
        const p = persistedRooms[studentKelasId];
        const slot = p.slot_ruang || p.nama_ruang;
        return {
          code: slot,
          display: slot,
        };
      }

      // 3. Jika belum diplot khusus, gunakan nama kelas siswa
      if (studentKelasName) {
        return {
          code: studentKelasName,
          display: studentKelasName,
        };
      }

      // 4. Fallback aman
      return {
        code: 'R.01',
        display: 'R.01',
      };
    },
    [studentKelasId, studentKelasName, persistedRooms]
  );

  const [filter, setFilter] = useState<FilterKey>('aktif');
  const [selectedDetailItem, setSelectedDetailItem] = useState<CbtStudentExamItem | null>(null);
  const [denahModalOpen, setDenahModalOpen] = useState(false);
  const [denahHighlightRoom, setDenahHighlightRoom] = useState<string | null>(null);
  const [denahHighlightLabel, setDenahHighlightLabel] = useState<string>('Ruang Ujian Anda');
  const [denahEventName, setDenahEventName] = useState<string>('Ujian CBT');
  const didAutoSelectTab = useRef(false);

  const handleOpenDenah = (item: CbtStudentExamItem) => {
    const roomInfo = resolveRoomInfo(item);
    setDenahHighlightRoom(roomInfo.code);
    setDenahHighlightLabel(`Ruang Anda: ${roomInfo.display}`);
    setDenahEventName(item.nama_sesi || 'Ujian CBT');
    setDenahModalOpen(true);
  };

  const {
    data: exams = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: cbtQueryKeys.myExams(),
    queryFn: cbtApi.getMyExams,
    staleTime: 15000,
    refetchInterval: 30000, // pantau ujian yang baru diaktifkan pengawas
    refetchOnWindowFocus: true,
  });

  const counts = useMemo(
    () => ({
      aktif: exams.filter(isActionable).length,
      mendatang: exams.filter(isUpcoming).length,
      riwayat: exams.filter(isHistory).length,
      semua: exams.length,
    }),
    [exams]
  );

  // Otomatis tampilkan tab Mendatang atau Riwayat jika tidak ada ujian aktif
  useEffect(() => {
    if (!isLoading && !didAutoSelectTab.current && exams.length > 0) {
      didAutoSelectTab.current = true;
      if (counts.aktif === 0) {
        if (counts.mendatang > 0) {
          setFilter('mendatang');
        } else if (counts.riwayat > 0) {
          setFilter('riwayat');
        }
      }
    }
  }, [isLoading, exams.length, counts.aktif, counts.mendatang, counts.riwayat]);

  const filtered = useMemo(() => {
    let list = exams;
    if (filter === 'aktif') list = exams.filter(isActionable);
    else if (filter === 'mendatang') list = exams.filter(isUpcoming);
    else if (filter === 'riwayat') list = exams.filter(isHistory);

    // Urutkan jadwal mendatang secara kronologis terdekat (Senin Sesi 1 duluan)
    if (filter === 'mendatang') {
      return [...list].sort(
        (a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime()
      );
    }
    // Urutkan riwayat secara terbalik (terbaru selesai di atas)
    if (filter === 'riwayat') {
      return [...list].sort(
        (a, b) => new Date(b.tanggal_selesai).getTime() - new Date(a.tanggal_selesai).getTime()
      );
    }
    return list;
  }, [exams, filter]);

  const finishedCount = useMemo(
    () => exams.filter((e) => e.status_peserta === 'FINISHED').length,
    [exams]
  );

  const finishedWithScore = useMemo(() => exams.filter((e) => e.hasil), [exams]);

  const avgScore = useMemo(() => {
    if (finishedWithScore.length === 0) return null;
    const sum = finishedWithScore.reduce((acc, e) => acc + (e.hasil?.nilai_akhir || 0), 0);
    return Math.round((sum / finishedWithScore.length) * 10) / 10;
  }, [finishedWithScore]);

  const highestScore = useMemo(() => {
    if (finishedWithScore.length === 0) return null;
    const max = Math.max(...finishedWithScore.map((e) => e.hasil?.nilai_akhir || 0));
    return Math.round(max * 10) / 10;
  }, [finishedWithScore]);

  const goToExamRoom = () => navigate('/cbt/ruang-ujian');

  return (
    <div className="space-y-3">
      {/* 0. Banner Edukatif Jika Siswa Berada di Luar Tingkat Sasaran Event Aktif */}
      {isStudentOutsideTargetEvent && activeEvent && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800 text-slate-800 dark:text-slate-200 shadow-2xs flex items-start gap-3">
          <div className="p-2 rounded-xl bg-sky-500 text-white shrink-0 shadow-xs">
            <Info size={18} />
          </div>
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sky-950 dark:text-sky-200 text-xs sm:text-sm">
                Informasi Event: {activeEvent.nama_event}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                Tingkat Sasaran: {activeEvent.target_tingkat.join(', ')}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Saat ini sekolah sedang menggelar event ujian terpusat khusus siswa <strong>Tingkat {activeEvent.target_tingkat.join(' & ')}</strong>. Kelas Anda ({studentKelasName || `Tingkat ${studentTingkat}`}) tidak dijadwalkan pada event ini. Anda dapat mempelajari modul KBM harian atau memeriksa riwayat nilai ujian di bawah.
            </p>
          </div>
        </div>
      )}

      {/* 1-Row Compact Stats Strip */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        {/* Stat 1: Berlangsung */}
        <button
          type="button"
          onClick={() => setFilter('aktif')}
          className={cn(
            'p-1.5 sm:p-2 text-center rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center min-w-0 border',
            filter === 'aktif'
              ? 'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300 shadow-2xs'
              : 'bg-slate-50/70 dark:bg-slate-800/40 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          )}
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate w-full">
            Aktif
          </span>
          <span className="text-base sm:text-lg font-black text-violet-600 dark:text-violet-400 leading-tight">
            {counts.aktif}
          </span>
        </button>

        {/* Stat 2: Jadwal */}
        <button
          type="button"
          onClick={() => setFilter('mendatang')}
          className={cn(
            'p-1.5 sm:p-2 text-center rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center min-w-0 border',
            filter === 'mendatang'
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'bg-slate-50/70 dark:bg-slate-800/40 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          )}
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate w-full">
            Jadwal
          </span>
          <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 leading-tight">
            {counts.mendatang}
          </span>
        </button>

        {/* Stat 3: Selesai */}
        <button
          type="button"
          onClick={() => setFilter('riwayat')}
          className={cn(
            'p-1.5 sm:p-2 text-center rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center min-w-0 border',
            filter === 'riwayat'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-2xs'
              : 'bg-slate-50/70 dark:bg-slate-800/40 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          )}
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate w-full">
            Selesai
          </span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
            {finishedCount}
          </span>
        </button>

        {/* Stat 4: Rata-Rata */}
        <div className="p-1.5 sm:p-2 text-center rounded-xl flex flex-col items-center justify-center min-w-0 bg-slate-50/70 dark:bg-slate-800/40 border border-transparent">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate w-full">
            Rata-Rata
          </span>
          <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 leading-tight">
            {avgScore !== null ? formatScore(avgScore) : '-'}
          </span>
        </div>
      </div>

      {/* Daftar Ujian Card Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs">
        {/* Tab Switcher & Quick Actions */}
        <div className="p-2 sm:p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {/* 1-Word Tabs (No-Scrollbar & Anti-Truncate) */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto no-scrollbar flex-nowrap flex-1 min-w-0">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                  filter === f.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <span>{f.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-black',
                    filter === f.key
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                      : 'bg-slate-200/90 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  )}
                >
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Action: Token & Refresh */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={goToExamRoom}
              title="Masukkan Token Ujian"
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <KeyRound size={13} className="shrink-0" />
              <span className="hidden sm:inline">Token</span>
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Segarkan daftar ujian"
              aria-label="Segarkan daftar ujian"
              className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
            >
              <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-600">Gagal memuat daftar ujian.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Coba Lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FileQuestion size={22} />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {filter === 'aktif'
                ? 'Tidak ada ujian yang sedang berlangsung'
                : filter === 'mendatang'
                ? 'Belum ada jadwal ujian mendatang'
                : 'Belum ada riwayat ujian'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {filter === 'aktif'
                ? 'Ujian akan muncul di sini saat pengawas mengaktifkan sesi untuk kelasmu. Kamu juga bisa melihat jadwal ujian di tab Jadwal Mendatang.'
                : filter === 'mendatang'
                ? 'Jadwal ujian resmi yang diterbitkan oleh kurikulum/panitia akan muncul di sini lengkap dengan alokasi ruang fisik.'
                : 'Ujian yang sudah selesai dikerjakan atau ditutup oleh pengawas akan tercatat lengkap beserta nilainya di sini.'}
            </p>
            {filter === 'aktif' && counts.mendatang > 0 && (
              <button
                type="button"
                onClick={() => setFilter('mendatang')}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Lihat {counts.mendatang} Jadwal Ujian Mendatang
                <ChevronRight size={13} />
              </button>
            )}
            {filter === 'aktif' && counts.mendatang === 0 && counts.riwayat > 0 && (
              <button
                type="button"
                onClick={() => setFilter('riwayat')}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-bold cursor-pointer transition-colors"
              >
                Lihat {counts.riwayat} Riwayat Ujian &amp; Nilai
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        ) : (
          <ul className="p-3 sm:p-4 space-y-3 bg-slate-50/70 dark:bg-slate-950/40">
            {filtered.map((item) => {
              const meta = getStatusMeta(item);
              const StatusIcon = meta.icon;
              const actionable = isActionable(item);
              const isPaused = item.status_jadwal === 'PAUSED';
              const isResume = item.status_peserta === 'IN_PROGRESS';
              const isFinished = item.status_peserta === 'FINISHED';
              const predikat = item.hasil ? getPredikatMeta(item.hasil.nilai_akhir) : null;
              const accuracyPct =
                item.hasil && item.total_soal > 0
                  ? Math.round((item.hasil.jumlah_benar / item.total_soal) * 100)
                  : null;
              const pelanggaranCount = item.pelanggaran_count ?? 0;
              const jumlahTerjawab =
                item.jumlah_terjawab && item.jumlah_terjawab > 0
                  ? item.jumlah_terjawab
                  : item.hasil
                  ? item.hasil.jumlah_benar + item.hasil.jumlah_salah
                  : 0;

              if (item.status_jadwal === 'DRAFT') {
                const subjectName = item.mapel && item.mapel !== '-' ? item.mapel : item.nama_sesi;
                return (
                  <li
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all space-y-2"
                  >
                    {/* Header: Mapel & Status Hari H */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                            {subjectName}
                          </h4>
                          {(item.kolaborasi_badge || item.is_kolaborasi) && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {item.kolaborasi_badge || 'Kolaborasi'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{resolveSesiLabel(item)}</span>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleOpenDenah(item)}
                            className="inline-flex items-center gap-1 font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer group"
                            title="Buka Denah Posisi Ruangan"
                          >
                            <DoorOpen size={11} className="text-violet-500 shrink-0" />
                            <span>Ruang: {resolveRoomInfo(item).display}</span>
                            <MapPin size={9} className="text-violet-500 animate-pulse" />
                          </button>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                        <Lock size={10} className="text-slate-400" />
                        <span>Hari H</span>
                      </span>
                    </div>

                    {/* Metadata Waktu & Durasi */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
                          <CalendarDays size={12} className="text-slate-400 shrink-0" />
                          <span>{formatExamDateIndo(item.tanggal_mulai)}</span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span>{formatExamTimeRange(item.tanggal_mulai, item.tanggal_selesai)}</span>
                        </span>
                        <span>•</span>
                        <span>{item.durasi_menit} mnt</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDetailItem(item)}
                        className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5 cursor-pointer ml-auto"
                      >
                        <span>Detail Sesi</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </li>
                );
              }

              // ── KARTU 1: SESI UJIAN AKTIF / SEDANG BERLANGSUNG (FOKUS: MAPEL & WAKTU PENGERJAAN - ZERO NOISE) ──
              if (actionable) {
                const subjectName = item.mapel && item.mapel !== '-' ? item.mapel : item.nama_sesi;
                const timeRange = formatExamTimeRange(item.tanggal_mulai, item.tanggal_selesai);

                return (
                  <li
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-violet-200/90 dark:border-violet-900/80 shadow-[0_4px_16px_rgba(124,58,237,0.08)] hover:shadow-lg transition-all space-y-3.5 relative overflow-hidden"
                  >
                    {/* Pita Aksen Estetik */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600" />

                    {/* Baris Atas: Status Live & Ruangan */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>{isResume ? 'SEDANG DIKERJAKAN' : isPaused ? 'DIJEDA PENGAWAS' : 'UJIAN DIBUKA'}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenDenah(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-200/80 dark:border-indigo-800 transition-all cursor-pointer active:scale-95 group"
                          title="Buka Denah Ruangan Ujian"
                        >
                          <DoorOpen size={11} className="text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                          <span>Ruang: {resolveRoomInfo(item).display}</span>
                          <MapPin size={10} className="text-indigo-500 animate-pulse ml-0.5" />
                        </button>
                      </div>

                      {item.nama_sesi && item.nama_sesi !== subjectName && (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                          {resolveSesiLabel(item)}
                        </span>
                      )}
                    </div>

                    {/* Hero Title: Mata Pelajaran (Fokus Utama Siswa) */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
                          {item.unit_nama ? 'Kuis / Ujian Unit' : 'Mata Pelajaran'}
                        </span>
                        {(item.kolaborasi_badge || item.is_kolaborasi) && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {item.kolaborasi_badge || 'Kolaborasi'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {subjectName}
                      </h4>
                    </div>

                    {/* Hero Box: Waktu & Durasi Pengerjaan (Fokus Kedua Siswa) */}
                    <div className="p-3 rounded-xl bg-violet-50/70 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-2 text-violet-950 dark:text-violet-200 font-semibold">
                        <Clock size={15} className="text-violet-600 dark:text-violet-400 shrink-0" />
                        <span>
                          Waktu: <strong className="font-black text-slate-900 dark:text-white">{timeRange}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-violet-600 text-white font-black text-xs shadow-2xs">
                          Durasi: {item.durasi_menit} Menit
                        </span>
                        {item.total_soal > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs border border-violet-200/60 dark:border-violet-900/60">
                            {item.total_soal} Soal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tombol Utama: Kerjakan Ujian (Fokus Aksi) */}
                    <button
                      type="button"
                      onClick={goToExamRoom}
                      disabled={isPaused}
                      className={cn(
                        'w-full py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98',
                        isPaused
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                          : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/30 hover:shadow-violet-600/50'
                      )}
                    >
                      {isPaused ? <PauseCircle size={16} /> : isResume ? <RotateCcw size={16} /> : <PlayCircle size={16} />}
                      <span>{isPaused ? 'Menunggu Pengawas' : isResume ? 'Lanjutkan Ujian' : 'Kerjakan Ujian'}</span>
                    </button>
                  </li>
                );
              }

              // ── KARTU 2: SESI RIWAYAT / SELESAI / LAINNYA (SHOPEE-GRADE CLEAN & HIGH DENSITY) ──
              const subjectName = item.mapel && item.mapel !== '-' ? item.mapel : item.nama_sesi;

              return (
                <li
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
                >
                  {/* Baris 1: Nama Mapel (Kiri) & Badge Status (Kanan) */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                          {subjectName}
                        </h4>
                        {(item.kolaborasi_badge || item.is_kolaborasi) && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {item.kolaborasi_badge || 'Kolaborasi'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                        {item.nama_sesi && item.nama_sesi !== subjectName && (
                          <span className="truncate max-w-[180px] sm:max-w-none font-medium">{item.nama_sesi}</span>
                        )}
                        {item.nama_sesi && item.nama_sesi !== subjectName && <span>•</span>}
                        <button
                          type="button"
                          onClick={() => handleOpenDenah(item)}
                          className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer group"
                          title="Buka Denah Ruangan Ujian"
                        >
                          <DoorOpen size={11} className="text-indigo-500 shrink-0" />
                          <span>Ruang: {resolveRoomInfo(item).display}</span>
                          <MapPin size={9} className="text-indigo-500 animate-pulse" />
                        </button>
                      </div>
                    </div>

                    {/* Status Badge Ringkas */}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 border shadow-2xs',
                        meta.className
                      )}
                    >
                      <StatusIcon size={11} />
                      <span>{meta.label}</span>
                    </span>
                  </div>

                  {/* Baris 2: Metadata Ringkas 1 Baris Bersih (Tanggal • Waktu Pengerjaan • Soal • Peringatan) */}
                  <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
                      <CalendarDays size={12} className="text-slate-400 shrink-0" />
                      <span>{formatExamDateIndo(item.tanggal_mulai)}</span>
                    </span>

                    <span>•</span>

                    {/* Info Waktu Pelaksanaan / Pengerjaan */}
                    {item.waktu_mulai && item.waktu_selesai ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} className="text-slate-400 shrink-0" />
                        <span>
                          {formatTimeOnly(item.waktu_mulai)}–{formatTimeOnly(item.waktu_selesai)}
                          {item.durasi_pengerjaan_menit ? ` (${item.durasi_pengerjaan_menit} mnt)` : ''}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} className="text-slate-400 shrink-0" />
                        <span>{item.durasi_menit} mnt</span>
                      </span>
                    )}

                    <span>•</span>

                    <span>
                      {isFinished && item.total_soal > 0
                        ? `${jumlahTerjawab}/${item.total_soal} Soal`
                        : `${item.total_soal} Soal`}
                    </span>

                    {/* Peringatan Keamanan: HANYA jika ada pelanggaran > 0 (Zero-Noise jika tertib) */}
                    {isFinished && pelanggaranCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
                          <ShieldAlert size={10} />
                          <span>{pelanggaranCount}x Peringatan</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Baris 3 (Footer): Hasil Nilai atau Status Menunggu Rilis (Menyatu Ramping) */}
                  {isFinished && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                      {item.hasil && predikat ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-lg sm:text-xl font-black leading-none', predikat.scoreClass)}>
                              {formatScore(item.hasil.nilai_akhir)}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border', predikat.badgeClass)}>
                              {predikat.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                            <span className="text-emerald-600 dark:text-emerald-400">{item.hasil.jumlah_benar} Benar</span>
                            <span>•</span>
                            <span className="text-rose-600 dark:text-rose-400">{item.hasil.jumlah_salah} Salah</span>
                            {accuracyPct !== null && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400">Akurasi {accuracyPct}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                            <Clock size={11} />
                            <span>Nilai menunggu rilis guru</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => setSelectedDetailItem(item)}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Detail Sesi</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal Detail Sesi Ujian (On-Demand Zero-Noise) */}
      {selectedDetailItem && (
        <Modal
          isOpen={Boolean(selectedDetailItem)}
          onClose={() => setSelectedDetailItem(null)}
          title="Rincian Sesi Ujian"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Nama Sesi Resmi
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {selectedDetailItem.nama_sesi}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 block">Mata Pelajaran</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {selectedDetailItem.mapel}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 block">Ruang Ujian</span>
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="font-bold text-violet-700 dark:text-violet-300 text-xs">
                    {resolveRoomInfo(selectedDetailItem).display}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedDetailItem;
                      setSelectedDetailItem(null);
                      handleOpenDenah(item);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold shadow-2xs cursor-pointer transition-colors"
                    title="Buka Denah Spasial Kampus"
                  >
                    <MapPin size={10} />
                    <span>Buka Denah</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 block">Hari &amp; Tanggal</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {formatExamDateIndo(selectedDetailItem.tanggal_mulai)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 block">Waktu / Sesi</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {resolveSesiLabel(selectedDetailItem)} ({formatExamTimeRange(selectedDetailItem.tanggal_mulai, selectedDetailItem.tanggal_selesai)})
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 block">Alokasi Waktu</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {selectedDetailItem.durasi_menit} Menit
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 block">Jumlah Soal</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {selectedDetailItem.total_soal} Butir
                </span>
              </div>
            </div>

            {selectedDetailItem.guru && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Guru Pengampu:</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedDetailItem.guru}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-[11px]">
              <Lock size={14} className="shrink-0 mt-0.5" />
              <span>
                Sesi ujian ini dijadwalkan secara resmi oleh panitia sekolah dan akan dibuka oleh guru pengawas ruangan saat jam ujian dimulai di Hari H.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Denah Spasial Kampus (Interaktif dengan Highlight & Efek Berdenyut) */}
      <CbtDenahModal
        isOpen={denahModalOpen}
        onClose={() => setDenahModalOpen(false)}
        eventName={denahEventName}
        highlightRoomCode={denahHighlightRoom}
        highlightLabel={denahHighlightLabel}
        isReadOnly={true}
      />
    </div>
  );
};

export default SiswaCbtTab;
