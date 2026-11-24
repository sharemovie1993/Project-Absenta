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
  Calendar,
  CalendarDays,
  CalendarClock,
  DoorOpen,
  Lock,
  Info,
  FileQuestion,
  KeyRound,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Hourglass,
  Ban,
  Trophy,
  Award,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  BookOpen,
  MapPin,
  History,
} from 'lucide-react';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';
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

interface DayTheme {
  borderLeft: string;
  headerExpanded: string;
  iconBg: string;
  iconColor: string;
  badge: string;
}

const DAY_THEMES: Record<string, DayTheme> = {
  senin: {
    borderLeft: 'border-l-[5px] border-l-blue-500 dark:border-l-blue-400',
    headerExpanded: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  selasa: {
    borderLeft: 'border-l-[5px] border-l-emerald-500 dark:border-l-emerald-400',
    headerExpanded: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  rabu: {
    borderLeft: 'border-l-[5px] border-l-amber-500 dark:border-l-amber-400',
    headerExpanded: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  kamis: {
    borderLeft: 'border-l-[5px] border-l-purple-500 dark:border-l-purple-400',
    headerExpanded: 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800/60',
    iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  jumat: {
    borderLeft: 'border-l-[5px] border-l-teal-500 dark:border-l-teal-400',
    headerExpanded: 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200/80 dark:border-teal-800/60',
    iconBg: 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400',
    iconColor: 'text-teal-600 dark:text-teal-400',
    badge: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
  sabtu: {
    borderLeft: 'border-l-[5px] border-l-rose-500 dark:border-l-rose-400',
    headerExpanded: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-800/60',
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  minggu: {
    borderLeft: 'border-l-[5px] border-l-orange-500 dark:border-l-orange-400',
    headerExpanded: 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200/80 dark:border-orange-800/60',
    iconBg: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
};

const getDayTheme = (dayName: string): DayTheme => {
  const clean = (dayName || '').toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('senin')) return DAY_THEMES.senin;
  if (clean.includes('selasa')) return DAY_THEMES.selasa;
  if (clean.includes('rabu')) return DAY_THEMES.rabu;
  if (clean.includes('kamis')) return DAY_THEMES.kamis;
  if (clean.includes('jumat')) return DAY_THEMES.jumat;
  if (clean.includes('sabtu')) return DAY_THEMES.sabtu;
  if (clean.includes('minggu')) return DAY_THEMES.minggu;
  return DAY_THEMES.senin;
};

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

const ProctorAvatar: React.FC<{ nama: string; foto?: string | null; size?: 'sm' | 'md' }> = ({
  nama,
  foto,
  size = 'sm',
}) => {
  const [imgError, setImgError] = useState(false);
  const resolvedFoto = useMemo(() => (foto ? resolveProfilePhotoUrl(foto) : ''), [foto]);
  const sizeCls = size === 'md' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs';
  const initials = (nama || 'P')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  if (resolvedFoto && !imgError) {
    return (
      <img
        src={resolvedFoto}
        alt={nama}
        onError={() => setImgError(true)}
        className={cn(
          sizeCls,
          'rounded-full object-cover border border-indigo-200 dark:border-indigo-700 shrink-0 bg-slate-100 dark:bg-slate-800'
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeCls,
        'rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center border border-indigo-200 dark:border-indigo-700 shrink-0'
      )}
    >
      {initials || <UserCheck size={12} />}
    </div>
  );
};

const ProctorInfoStrip: React.FC<{ item: CbtStudentExamItem; variant?: 'compact' | 'detail' }> = ({
  item,
  variant = 'compact',
}) => {
  const proctors =
    item.pengawas_list && item.pengawas_list.length > 0
      ? item.pengawas_list
      : item.pengawas_nama
      ? [{ nama: item.pengawas_nama, foto: item.pengawas_foto }]
      : [];

  if (proctors.length === 0) return null;

  if (variant === 'detail') {
    return (
      <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
          Pengawas Ruang Ujian
        </span>
        <div className="flex flex-wrap gap-2.5">
          {proctors.map((p, idx) => (
            <div key={p.id || idx} className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/70">
              <ProctorAvatar nama={p.nama} foto={p.foto} size="md" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{p.nama}</p>
                {p.nip && <p className="text-[10px] font-mono text-slate-500">{p.nip}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap px-2.5 py-1.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
      <div className="flex -space-x-1.5 shrink-0">
        {proctors.map((p, idx) => (
          <ProctorAvatar key={p.id || idx} nama={p.nama} foto={p.foto} size="sm" />
        ))}
      </div>
      <div className="min-w-0 flex items-center gap-1 text-[11px]">
        <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Pengawas:</span>
        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
          {proctors.map((p) => p.nama).join(' • ')}
        </span>
      </div>
    </div>
  );
};

const ProctorPhotoColumn: React.FC<{ item: CbtStudentExamItem }> = ({ item }) => {
  const proctors =
    item.pengawas_list && item.pengawas_list.length > 0
      ? item.pengawas_list
      : item.pengawas_nama
      ? [{ nama: item.pengawas_nama, foto: item.pengawas_foto }]
      : [];

  const primary = proctors[0];
  const [imgError, setImgError] = useState(false);
  const resolvedFoto = useMemo(
    () => (primary?.foto ? resolveProfilePhotoUrl(primary.foto) : ''),
    [primary?.foto]
  );

  if (!primary) return null;

  const initials = (primary.nama || 'P')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="shrink-0 flex flex-col items-center">
      <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden border-2 border-indigo-100 dark:border-indigo-900/70 bg-gradient-to-br from-indigo-50 to-slate-100 dark:from-indigo-950/60 dark:to-slate-900 shadow-xs">
        {resolvedFoto && !imgError ? (
          <img
            src={resolvedFoto}
            alt={primary.nama}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-300">
            {initials || <UserCheck size={24} />}
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-center bg-slate-900/70 text-white backdrop-blur-2xs">
          Pengawas
        </span>
      </div>
    </div>
  );
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
  const [expandedHistoryMap, setExpandedHistoryMap] = useState<Record<string, boolean>>({});
  const didAutoSelectTab = useRef(false);

  const toggleHistoryExpanded = (id: string) => {
    setExpandedHistoryMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    staleTime: 30000,
    // Polling dengan interval 45 detik untuk menghindari thundering herd pada 1,400+ siswa
    refetchInterval: 45000,
    // Cegah mobile wake-up stampede saat siswa HP mengunci/membuka layar
    refetchOnWindowFocus: false,
  });

  // ── PARENT-CHILD STRUCTURE UNTUK RIWAYAT UJIAN (BEST PRACTICE KURIKULUM MERDEKA) ──
  const structuredHistory = useMemo(() => {
    const historyList = exams.filter(isHistory);
    // Seluruh sesi perbaikan, remedial, maupun susulan diperlakukan sebagai child dari sesi induknya
    const isChildItem = (item: CbtStudentExamItem) =>
      Boolean(item.is_remedial) ||
      Boolean(item.is_susulan) ||
      Boolean(item.parent_jadwal_id) ||
      (item.nama_sesi || '').toUpperCase().includes('[REMEDIAL') ||
      (item.nama_sesi || '').toUpperCase().includes('SUSULAN');

    const parents: (CbtStudentExamItem & { children: CbtStudentExamItem[] })[] = [];
    const childrenToAttach: CbtStudentExamItem[] = [];

    historyList.forEach((item) => {
      if (isChildItem(item)) {
        childrenToAttach.push(item);
      } else {
        parents.push({ ...item, children: [] });
      }
    });

    const orphanedChildren: (CbtStudentExamItem & { children: CbtStudentExamItem[] })[] = [];

    childrenToAttach.forEach((child) => {
      let parentMatch = child.parent_jadwal_id
        ? parents.find((p) => p.id === child.parent_jadwal_id)
        : null;

      if (!parentMatch) {
        parentMatch = parents.find(
          (p) =>
            (p.mapel && child.mapel && p.mapel.trim().toUpperCase() === child.mapel.trim().toUpperCase()) ||
            (p.mapel_induk && child.mapel_induk && p.mapel_induk.trim().toUpperCase() === child.mapel_induk.trim().toUpperCase()) ||
            (p.kode_mapel && child.kode_mapel && p.kode_mapel === child.kode_mapel)
        ) || null;
      }

      if (parentMatch) {
        parentMatch.children.push(child);
      } else {
        orphanedChildren.push({ ...child, children: [] });
      }
    });

    const combined = [...parents, ...orphanedChildren];

    return combined.sort((a, b) => {
      const timeA = new Date(b.waktu_selesai || b.tanggal_selesai).getTime();
      const timeB = new Date(a.waktu_selesai || a.tanggal_selesai).getTime();
      return timeA - timeB;
    });
  }, [exams]);

  const getEffectiveScore = useCallback(
    (item: CbtStudentExamItem & { children?: CbtStudentExamItem[] }) => {
      if (!item.children || item.children.length === 0) {
        return item.hasil?.nilai_akhir ?? null;
      }
      const validChildren = item.children.filter((c) => c.hasil?.nilai_akhir != null);
      if (validChildren.length === 0) {
        return item.hasil?.nilai_akhir ?? null;
      }
      const latestChild = validChildren[validChildren.length - 1];
      return latestChild.hasil?.nilai_akhir ?? item.hasil?.nilai_akhir ?? null;
    },
    []
  );

  const counts = useMemo(
    () => ({
      aktif: exams.filter(isActionable).length,
      mendatang: exams.filter(isUpcoming).length,
      riwayat: structuredHistory.length,
      semua: exams.length,
    }),
    [exams, structuredHistory.length]
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
    let list: (CbtStudentExamItem & { children?: CbtStudentExamItem[] })[] = exams;
    if (filter === 'aktif') list = exams.filter(isActionable);
    else if (filter === 'mendatang') list = exams.filter(isUpcoming);
    else if (filter === 'riwayat') return structuredHistory;

    // Urutkan jadwal mendatang secara kronologis terdekat (Senin Sesi 1 duluan)
    if (filter === 'mendatang') {
      return [...list].sort(
        (a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime()
      );
    }
    return list;
  }, [exams, filter, structuredHistory]);

  // ── PENGELOMPOKAN JADWAL PER HARI UNTUK SISWA (STANDAR DESAIN PENGAWAS) ──
  const groupedStudentDays = useMemo(() => {
    const dayMap = new Map<string, {
      dateFormatted: string;
      isToday: boolean;
      sessions: CbtStudentExamItem[];
    }>();

    filtered.forEach((item) => {
      const rawDate = item.tanggal_mulai ? new Date(item.tanggal_mulai) : new Date();
      const dateKey = !isNaN(rawDate.getTime())
        ? rawDate.toISOString().split('T')[0]
        : '9999-99-99';

      const isToday = !isNaN(rawDate.getTime())
        ? new Date().toDateString() === rawDate.toDateString()
        : false;

      const dateFormatted = formatExamDateIndo(item.tanggal_mulai);

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          dateFormatted,
          isToday,
          sessions: [],
        });
      }
      dayMap.get(dateKey)!.sessions.push(item);
    });

    const result: {
      dateKey: string;
      dayName: string;
      dateFormatted: string;
      isToday: boolean;
      sessions: CbtStudentExamItem[];
    }[] = [];

    dayMap.forEach((val, dateKey) => {
      val.sessions.sort((a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime());

      // Dedup guard di UI: cegah duplikasi sesi pada slot waktu dan mapel yang sama
      const uniqueSessions: CbtStudentExamItem[] = [];
      const seenSlots = new Set<string>();

      val.sessions.forEach((sess) => {
        const slotKey = `${resolveSesiLabel(sess)}__${sess.mapel_induk || sess.mapel}`;
        if (!seenSlots.has(slotKey)) {
          seenSlots.add(slotKey);
          uniqueSessions.push(sess);
        }
      });

      result.push({
        dateKey,
        dayName: val.dateFormatted.split(',')[0] || val.dateFormatted,
        dateFormatted: val.dateFormatted,
        isToday: val.isToday,
        sessions: uniqueSessions,
      });
    });

    result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return result;
  }, [filtered]);

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (groupedStudentDays.length > 0) {
      setExpandedDays((prev) => {
        const next = { ...prev };
        groupedStudentDays.forEach((d) => {
          if (next[d.dateKey] === undefined) {
            next[d.dateKey] = true;
          }
        });
        return next;
      });
    }
  }, [groupedStudentDays]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const isAllExpanded = useMemo(() => {
    if (groupedStudentDays.length === 0) return false;
    return groupedStudentDays.every((d) => expandedDays[d.dateKey] !== false);
  }, [groupedStudentDays, expandedDays]);

  const handleToggleExpandAll = () => {
    const targetState = !isAllExpanded;
    const newDays: Record<string, boolean> = {};
    groupedStudentDays.forEach((d) => {
      newDays[d.dateKey] = targetState;
    });
    setExpandedDays(newDays);
  };

  const finishedCount = useMemo(
    () => structuredHistory.length,
    [structuredHistory]
  );

  const avgScore = useMemo(() => {
    const scores: number[] = [];
    structuredHistory.forEach((item) => {
      const score = getEffectiveScore(item);
      if (score !== null) scores.push(score);
    });
    if (scores.length === 0) return null;
    const sum = scores.reduce((acc, e) => acc + e, 0);
    return Math.round((sum / scores.length) * 10) / 10;
  }, [structuredHistory, getEffectiveScore]);

  const highestScore = useMemo(() => {
    const scores: number[] = [];
    structuredHistory.forEach((item) => {
      const score = getEffectiveScore(item);
      if (score !== null) scores.push(score);
    });
    if (scores.length === 0) return null;
    const max = Math.max(...scores);
    return Math.round(max * 10) / 10;
  }, [structuredHistory, getEffectiveScore]);

  const goToExamRoom = useCallback(
    (item?: CbtStudentExamItem) => {
      const url = item?.id
        ? `/cbt/ruang-ujian?jadwal_id=${encodeURIComponent(item.id)}${item.token_ujian ? `&token=${encodeURIComponent(item.token_ujian)}` : ''}`
        : '/cbt/ruang-ujian';
      window.location.assign(url);
    },
    []
  );

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
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
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
        ) : (filter === 'mendatang' || filter === 'semua') ? (
          <div className="space-y-3 p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-950/40">
            {/* Top Subheader with Total Days & Expand All Button */}
            <div className="flex items-center justify-between pb-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold flex items-center gap-1.5">
                <CalendarDays size={14} className="text-violet-500" />
                <span>
                  Jadwal Ujian Terbagi Dalam{' '}
                  <strong className="text-violet-600 dark:text-violet-400 font-black">
                    {groupedStudentDays.length} Hari
                  </strong>{' '}
                  (Total {filtered.length} Sesi)
                </span>
              </span>
              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs transition-all"
              >
                <ChevronsUpDown size={13} className="text-slate-400" />
                <span>{isAllExpanded ? 'Tutup Semua' : 'Buka Semua'}</span>
              </button>
            </div>

            {/* List Grouped Days */}
            {groupedStudentDays.map((day) => {
              const isDayExpanded = expandedDays[day.dateKey] !== false;
              const theme = getDayTheme(day.dayName);

              return (
                <div
                  key={day.dateKey}
                  className={cn(
                    "rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs transition-all",
                    theme.borderLeft
                  )}
                >
                  {/* ── LEVEL 1: HARI (ACCORDION TOGGLE) ── */}
                  <div
                    onClick={() => toggleDay(day.dateKey)}
                    className={cn(
                      'px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b',
                      day.isToday
                        ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 hover:bg-amber-500/15'
                        : isDayExpanded
                        ? theme.headerExpanded
                        : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn("p-1.5 rounded-lg shrink-0", day.isToday ? 'bg-amber-500/15 text-amber-600' : theme.iconBg)}>
                        <Calendar
                          size={16}
                          className={day.isToday ? 'text-amber-600' : theme.iconColor}
                        />
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                        {day.dateFormatted}
                      </h4>
                      {day.isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white animate-pulse">
                          HARI INI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("px-2.5 py-0.5 rounded-lg text-xs font-bold border", theme.badge)}>
                        {day.sessions.length} Sesi Ujian
                      </span>
                      <div className="text-slate-400">
                        {isDayExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* ── LEVEL 2: DAFTAR SESI DALAM HARI ── */}
                  {isDayExpanded && (
                    <div className="p-2.5 sm:p-3 space-y-2 bg-slate-50/40 dark:bg-slate-900/40">
                      {day.sessions.map((item) => {
                        const timeRange = formatExamTimeRange(item.tanggal_mulai, item.tanggal_selesai);
                        const subjectName = item.mapel && item.mapel !== '-' ? item.mapel : item.nama_sesi;
                        const roomInfo = resolveRoomInfo(item);
                        const sessionLabel = resolveSesiLabel(item);
                        const actionable = isActionable(item);
                        const isPaused = item.status_jadwal === 'PAUSED';
                        const isResume = item.status_peserta === 'IN_PROGRESS';

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-stretch gap-3.5 sm:gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-all shadow-2xs"
                          >
                            {/* Kolom 1: Foto Pengawas */}
                            <ProctorPhotoColumn item={item} />

                            {/* Kolom 2: Data Sesi & Aksi */}
                            <div className="min-w-0 flex-1 flex flex-col justify-between gap-2.5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                    {sessionLabel}
                                  </span>

                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                    <Clock size={13} className="text-slate-400" />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{timeRange}</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDenah(item);
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-all group"
                                    title="Buka Denah Ruang Ujian"
                                  >
                                    <DoorOpen size={12} className="text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                                    <span>Ruang {roomInfo.display}</span>
                                    <MapPin size={10} className="text-amber-500 animate-pulse ml-0.5" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                                    {subjectName}
                                  </span>
                                  {(item.kolaborasi_badge || item.is_kolaborasi) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                      {item.kolaborasi_badge || 'Kolaborasi'}
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    • {item.durasi_menit} mnt
                                  </span>
                                </div>

                                {(item.pengawas_nama || (item.pengawas_list && item.pengawas_list.length > 0)) && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                    <UserCheck size={13} className="text-indigo-500 shrink-0" />
                                    <span className="text-slate-500 dark:text-slate-400">Pengawas:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                      {item.pengawas_list && item.pengawas_list.length > 0
                                        ? item.pengawas_list.map((p) => p.nama).join(' • ')
                                        : item.pengawas_nama}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Baris Aksi */}
                              <div className="flex items-center justify-end gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/70">
                                {actionable ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goToExamRoom(item);
                                    }}
                                    disabled={isPaused}
                                    className="px-4 py-1.5 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                  >
                                    {isPaused ? <PauseCircle size={14} /> : isResume ? <RotateCcw size={14} /> : <PlayCircle size={14} />}
                                    <span>{isPaused ? 'Menunggu' : isResume ? 'Lanjutkan' : 'Kerjakan Ujian'}</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                      <Lock size={10} className="text-slate-400" />
                                      <span>Hari H</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenDenah(item);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1 cursor-pointer transition-all"
                                      title="Denah Lokasi Ruangan"
                                    >
                                      <MapPin size={12} className="text-indigo-500" />
                                      <span>Denah Ruang</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDetailItem(item);
                                      }}
                                      className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                                      title="Detail Sesi Ujian"
                                    >
                                      <span>Detail</span>
                                      <ChevronRight size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="p-3 sm:p-4 space-y-3 bg-slate-50/70 dark:bg-slate-950/40">
            {filtered.map((item) => {
              const meta = getStatusMeta(item);
              const actionable = isActionable(item);
              const isPaused = item.status_jadwal === 'PAUSED';
              const isResume = item.status_peserta === 'IN_PROGRESS';
              const isFinished = item.status_peserta === 'FINISHED';

              const hasRemedialChild = Boolean(item.children && item.children.length > 0);
              const latestRemedialChild = hasRemedialChild
                ? item.children!.find((c) => c.hasil?.nilai_akhir != null) || item.children![item.children!.length - 1]
                : null;
              const isChildFinished = Boolean(latestRemedialChild?.status_peserta === 'FINISHED' || latestRemedialChild?.hasil);
              const isSusulanChild = Boolean(latestRemedialChild?.is_susulan || latestRemedialChild?.tipe_peserta === 'SUSULAN');

              const effectiveScore = hasRemedialChild && latestRemedialChild?.hasil
                ? latestRemedialChild.hasil.nilai_akhir
                : item.hasil?.nilai_akhir ?? null;
              const displayScore = effectiveScore ?? item.hasil?.nilai_akhir ?? null;
              const predikat = displayScore !== null ? getPredikatMeta(displayScore) : (item.hasil ? getPredikatMeta(item.hasil.nilai_akhir) : null);
              const isRemedialTuntas = Boolean(
                hasRemedialChild &&
                latestRemedialChild?.hasil &&
                latestRemedialChild.hasil.nilai_akhir >= (latestRemedialChild.kktp_threshold || 75)
              );

              // Resolusi Status Badge: Jika sesi utama tidak hadir tapi sudah selesai susulan/remedial
              const resolvedMeta = (hasRemedialChild && isChildFinished)
                ? {
                    label: isSusulanChild ? 'Selesai (Susulan)' : 'Selesai Dikerjakan',
                    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
                    icon: CheckCircle2,
                  }
                : meta;
              const StatusIcon = resolvedMeta.icon;

              // Metadata waktu & peringatan: prioritaskan sesi yang menghasilkan nilai aktif
              const activeWaktuMulai = (hasRemedialChild && isChildFinished && latestRemedialChild?.waktu_mulai)
                ? latestRemedialChild.waktu_mulai
                : item.waktu_mulai || latestRemedialChild?.waktu_mulai;
              const activeWaktuSelesai = (hasRemedialChild && isChildFinished && latestRemedialChild?.waktu_selesai)
                ? latestRemedialChild.waktu_selesai
                : item.waktu_selesai || latestRemedialChild?.waktu_selesai;
              const activeDurasi = (hasRemedialChild && isChildFinished && latestRemedialChild?.durasi_pengerjaan_menit)
                ? latestRemedialChild.durasi_pengerjaan_menit
                : item.durasi_pengerjaan_menit || latestRemedialChild?.durasi_pengerjaan_menit;

              const accuracyPct =
                (hasRemedialChild && latestRemedialChild?.hasil && (latestRemedialChild.total_soal > 0 || latestRemedialChild.hasil.jumlah_benar + latestRemedialChild.hasil.jumlah_salah > 0))
                  ? Math.round((latestRemedialChild.hasil.jumlah_benar / (latestRemedialChild.total_soal || (latestRemedialChild.hasil.jumlah_benar + latestRemedialChild.hasil.jumlah_salah))) * 100)
                  : item.hasil && item.total_soal > 0
                  ? Math.round((item.hasil.jumlah_benar / item.total_soal) * 100)
                  : null;
              const pelanggaranCount = (hasRemedialChild && isChildFinished && latestRemedialChild)
                ? latestRemedialChild.pelanggaran_count ?? 0
                : item.pelanggaran_count ?? 0;
              const totalSoalDisplay = latestRemedialChild?.total_soal || item.total_soal;
              const jumlahTerjawab =
                item.jumlah_terjawab && item.jumlah_terjawab > 0
                  ? item.jumlah_terjawab
                  : latestRemedialChild?.hasil
                  ? latestRemedialChild.hasil.jumlah_benar + latestRemedialChild.hasil.jumlah_salah
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDenah(item);
                            }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailItem(item);
                        }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDenah(item);
                          }}
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

                    {/* Info Pengawas & Foto Pengawas */}
                    <ProctorInfoStrip item={item} />

                    {/* Tombol Utama: Kerjakan Ujian (Fokus Aksi) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToExamRoom(item);
                      }}
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
                        resolvedMeta.className
                      )}
                    >
                      <StatusIcon size={11} />
                      <span>{resolvedMeta.label}</span>
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
                    {activeWaktuMulai && activeWaktuSelesai ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} className="text-slate-400 shrink-0" />
                        <span>
                          {formatTimeOnly(activeWaktuMulai)}–{formatTimeOnly(activeWaktuSelesai)}
                          {activeDurasi ? ` (${activeDurasi} mnt)` : ''}
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
                      {(isFinished || isChildFinished) && totalSoalDisplay > 0
                        ? `${jumlahTerjawab}/${totalSoalDisplay} Soal`
                        : `${item.total_soal} Soal`}
                    </span>

                    {/* Peringatan Keamanan: HANYA jika ada pelanggaran > 0 (Zero-Noise jika tertib) */}
                    {(isFinished || isChildFinished) && pelanggaranCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
                          <ShieldAlert size={10} />
                          <span>{pelanggaranCount}x Peringatan</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Info Pengawas & Foto Pengawas */}
                  <ProctorInfoStrip item={item} />

                  {/* Baris 3 (Footer): Status Selesai & Penyerahan Lembar Jawaban (Sesuai SOP: Nilai Mentah Disembunyikan) */}
                  {(isFinished || isChildFinished) && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between w-full flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span className="text-[11px]">
                          Jawaban tersimpan aman • Nilai resmi diolah guru &amp; tercantum di e-Rapor
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailItem(item);
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer ml-auto"
                      >
                        <span>Detail Sesi</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}

                  {/* Sub-Accordion Child: Riwayat Sesi (Sesi Utama vs Susulan / Remedial) */}
                  {hasRemedialChild && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHistoryExpanded(item.id);
                        }}
                        className="w-full flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-1.5">
                          <History size={13} className="text-indigo-500" />
                          <span>
                            {isSusulanChild
                              ? 'Rincian Sesi Ujian (Sesi Utama & Susulan)'
                              : item.children!.length > 1
                              ? `Rincian Sesi & Remedial (${item.children!.length + 1} Sesi)`
                              : 'Rincian Sesi & Remedial'}
                          </span>
                        </span>
                        <ChevronDown
                          size={14}
                          className={cn("transition-transform duration-200 text-slate-400", expandedHistoryMap[item.id] && "rotate-180")}
                        />
                      </button>

                      {expandedHistoryMap[item.id] && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 text-xs">
                          {/* 1. Sesi Induk (Sesi Utama / Reguler) */}
                          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  Sesi Utama (Ujian Reguler)
                                </span>
                                {item.status_peserta !== 'FINISHED' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Tidak Mengikuti (Sakit/Izin)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-3.5">
                                {formatExamDateIndo(item.tanggal_mulai)} • {item.waktu_mulai ? `${formatTimeOnly(item.waktu_mulai)}–${item.waktu_selesai ? formatTimeOnly(item.waktu_selesai) : ''}` : `${item.durasi_menit} mnt`} • Ruang: {resolveRoomInfo(item).display}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border",
                                item.status_peserta === 'FINISHED'
                                  ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900"
                              )}>
                                {item.status_peserta === 'FINISHED' ? 'Tersimpan' : 'Tidak Hadir'}
                              </span>
                            </div>
                          </div>

                          {/* 2. Sesi Anak (Susulan / Remedial) */}
                          {item.children!.map((child, cIdx) => {
                            const childScore = child.hasil?.nilai_akhir ?? null;
                            const childKktp = child.kktp_threshold || 75;
                            const isLulus = childScore !== null && childScore >= childKktp;
                            const isChildSusulan = Boolean(child.is_susulan || child.tipe_peserta === 'SUSULAN');
                            const childTitle = isChildSusulan
                              ? 'Sesi Susulan (Ujian Pengganti)'
                              : item.children!.length > 1
                              ? `Sesi Remedial Ke-${cIdx + 1}`
                              : 'Sesi Remedial';

                            return (
                              <div key={child.id} className="flex items-start justify-between gap-2 pt-1">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                      {childTitle}
                                    </span>
                                    <span className={cn(
                                      "text-[9px] font-black px-1.5 py-0.2 rounded",
                                      isChildSusulan
                                        ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                        : isLulus
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                    )}>
                                      {isChildSusulan ? '✨ SUSULAN (MURNI)' : isLulus ? 'TUNTAS KKTP' : 'REMEDIAL'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-3.5">
                                    {formatExamDateIndo(child.tanggal_mulai)} • {child.waktu_mulai ? `${formatTimeOnly(child.waktu_mulai)}–${child.waktu_selesai ? formatTimeOnly(child.waktu_selesai) : ''}` : ''} • {child.ruang_ujian || 'Ruang Remedial & Susulan'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                                    <CheckCircle2 size={10} />
                                    <span>Tersimpan</span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
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

            <ProctorInfoStrip item={selectedDetailItem} variant="detail" />

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
