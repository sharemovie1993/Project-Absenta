import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Eye,
  DoorOpen,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Play,
  FileText,
} from 'lucide-react';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import { CbtProctorMonitoringView, parseSessionLabel } from './CbtProctorMonitoringView';
import { CbtDenahModal } from '../jadwal/CbtDenahModal';
import { formatLocalTimeFromISO } from '@/utils/attendance/time';
import { cn } from '@/lib/utils';

interface RoomGroup {
  roomCode: string;
  roomName: string;
  sessions: CbtJadwalUjian[];
}

interface DayGroup {
  dateKey: string;
  dayName: string;
  dateFormatted: string;
  isToday: boolean;
  totalSessions: number;
  rooms: RoomGroup[];
}

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

interface CbtPengawasTeacherViewProps {
  guruId?: string;
  guruNama?: string;
  initialJadwalId?: string;
  myPengawasData?: CbtJadwalUjian[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const CbtPengawasTeacherView: React.FC<CbtPengawasTeacherViewProps> = ({
  guruId,
  guruNama,
  initialJadwalId,
  myPengawasData = [],
  isLoading = false,
  onRefresh,
}) => {
  // Active Monitoring Desk state (jika sedang membuka meja kerja pengawas untuk satu sesi)
  const [activeMonitorJadwalId, setActiveMonitorJadwalId] = useState<string | null>(initialJadwalId || null);

  // Sync jika parent mengoper initialJadwalId baru (atau reset ke list saat undefined)
  useEffect(() => {
    setActiveMonitorJadwalId(initialJadwalId || null);
  }, [initialJadwalId]);

  // Modal State Denah Ruang
  const [selectedJadwalForDenah, setSelectedJadwalForDenah] = useState<CbtJadwalUjian | null>(null);

  // Accordion Expand/Collapse State
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});

  // Helper Format Waktu
  const formatScheduleDateTime = (mulaiIso: string, selesaiIso: string) => {
    try {
      const timeStart = formatLocalTimeFromISO(mulaiIso);
      const timeEnd = formatLocalTimeFromISO(selesaiIso);
      return { timeText: `${timeStart} - ${timeEnd} WIB` };
    } catch {
      return { timeText: '' };
    }
  };

  // ── PENGELOMPOKAN LOGIS: HARI -> RUANG -> LIST SESI ──
  const groupedDays: DayGroup[] = useMemo(() => {
    const dayMap = new Map<string, { dateFormatted: string; isToday: boolean; roomsMap: Map<string, RoomGroup> }>();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Urutkan jadwal secara kronologis
    const sorted = [...myPengawasData].sort((a, b) => {
      const timeA = new Date(a.tanggal_mulai).getTime() || 0;
      const timeB = new Date(b.tanggal_mulai).getTime() || 0;
      return timeA - timeB;
    });

    sorted.forEach((j) => {
      const dateKey = (j.tanggal_mulai || '').slice(0, 10) || 'NO_DATE';
      const info = parseSessionLabel(j);
      const roomCode = info.roomCode || 'R.XX';
      const roomName = j.setting_keamanan?.ruang_ujian_nama || 'Kelas';

      if (!dayMap.has(dateKey)) {
        let dateFormatted = dateKey;
        let isToday = false;
        try {
          const d = new Date(j.tanggal_mulai);
          dateFormatted = new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(d);
          isToday = dateKey === todayStr;
        } catch {
          dateFormatted = dateKey;
        }

        dayMap.set(dateKey, {
          dateFormatted,
          isToday,
          roomsMap: new Map<string, RoomGroup>(),
        });
      }

      const dayObj = dayMap.get(dateKey)!;
      if (!dayObj.roomsMap.has(roomCode)) {
        dayObj.roomsMap.set(roomCode, {
          roomCode,
          roomName,
          sessions: [],
        });
      }

      const roomObj = dayObj.roomsMap.get(roomCode)!;
      roomObj.sessions.push(j);
    });

    const result: DayGroup[] = [];
    dayMap.forEach((val, dateKey) => {
      const rooms: RoomGroup[] = Array.from(val.roomsMap.values()).map((r) => {
        r.sessions.sort((a, b) => new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime());
        return r;
      });

      // Urutkan ruang natural (R.01, R.02, dst)
      rooms.sort((a, b) => {
        const numA = parseInt(a.roomCode.replace(/\D/g, ''), 10) || 9999;
        const numB = parseInt(b.roomCode.replace(/\D/g, ''), 10) || 9999;
        if (numA !== numB) return numA - numB;
        return a.roomCode.localeCompare(b.roomCode);
      });

      const totalSessions = rooms.reduce((acc, r) => acc + r.sessions.length, 0);

      result.push({
        dateKey,
        dayName: val.dateFormatted.split(',')[0] || val.dateFormatted,
        dateFormatted: val.dateFormatted,
        isToday: val.isToday,
        totalSessions,
        rooms,
      });
    });

    result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return result;
  }, [myPengawasData]);

  // Default: semua hari & ruang terbuka
  useEffect(() => {
    if (groupedDays.length > 0) {
      setExpandedDays((prev) => {
        const next = { ...prev };
        groupedDays.forEach((d) => {
          if (next[d.dateKey] === undefined) {
            next[d.dateKey] = true;
          }
        });
        return next;
      });

      setExpandedRooms((prev) => {
        const next = { ...prev };
        groupedDays.forEach((d) => {
          d.rooms.forEach((r) => {
            const key = `${d.dateKey}__${r.roomCode}`;
            if (next[key] === undefined) {
              next[key] = true;
            }
          });
        });
        return next;
      });
    }
  }, [groupedDays]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const toggleRoom = (dateKey: string, roomCode: string) => {
    const key = `${dateKey}__${roomCode}`;
    setExpandedRooms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isAllExpanded = useMemo(() => {
    if (groupedDays.length === 0) return false;
    return groupedDays.every((d) => expandedDays[d.dateKey] !== false);
  }, [groupedDays, expandedDays]);

  const handleToggleExpandAll = () => {
    const targetState = !isAllExpanded;
    const newDays: Record<string, boolean> = {};
    const newRooms: Record<string, boolean> = {};

    groupedDays.forEach((d) => {
      newDays[d.dateKey] = targetState;
      d.rooms.forEach((r) => {
        newRooms[`${d.dateKey}__${r.roomCode}`] = targetState;
      });
    });

    setExpandedDays(newDays);
    setExpandedRooms(newRooms);
  };

  const totalHariMengawas = groupedDays.length;
  const totalSesi = myPengawasData.length;

  // JIKA SEDANG MEMBUKA MEJA PENGAWAS (MONITORING / AKTIVASI SESI)
  // Diposisikan setelah seluruh hooks terpanggil secara konsisten agar tidak melanggar Rules of Hooks (React Error #300)
  if (activeMonitorJadwalId) {
    return (
      <CbtProctorMonitoringView
        initialJadwalId={activeMonitorJadwalId}
        guruId={guruId}
        myPengawasData={myPengawasData}
        onBack={() => {
          setActiveMonitorJadwalId(null);
          onRefresh?.();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 pb-20 sm:pb-8">
      {/* ── 1. HEADER RINGKAS & ZERO NOISE: BERAPA HARI SAYA MENGAWAS ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              Jadwal Pengawasan CBT
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Anda bertugas mengawas selama{' '}
              <span className="font-black text-indigo-600 dark:text-indigo-400">
                {totalHariMengawas} Hari
              </span>{' '}
              (Total {totalSesi} Sesi)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw size={14} className={cn(isLoading && 'animate-spin text-indigo-500')} />
            </button>
          )}

          {groupedDays.length > 0 && (
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <ChevronsUpDown size={14} />
              <span>{isAllExpanded ? 'Tutup Semua' : 'Buka Semua'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. DAFTAR JADWAL HARI -> RUANG -> SESI ── */}
      {groupedDays.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-2.5 shadow-xs">
          <Calendar size={32} className="text-slate-400" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Belum Ada Jadwal Pengawasan CBT
          </h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Anda belum diplotkan pada jadwal pengawasan ujian CBT. Jadwal akan muncul otomatis setelah panitia menerbitkan ploting ruang dan pengawas.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {groupedDays.map((day) => {
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
                      {day.totalSessions} Sesi
                    </span>
                    <div className="text-slate-400">
                      {isDayExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                </div>

                {/* ── LEVEL 2 & 3: RUANG & LIST SESI ── */}
                {isDayExpanded && (
                  <div className="p-3 sm:p-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
                    {day.rooms.map((room) => {
                      const roomKey = `${day.dateKey}__${room.roomCode}`;
                      const isRoomExpanded = expandedRooms[roomKey] !== false;

                      return (
                        <div
                          key={roomKey}
                          className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
                        >
                          {/* ── HEADER RUANG UJIAN ── */}
                          <div
                            onClick={() => toggleRoom(day.dateKey, room.roomCode)}
                            className={cn(
                              'px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b',
                              isRoomExpanded
                                ? 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100'
                                : 'bg-slate-50/80 dark:bg-slate-850 border-transparent hover:bg-slate-100/50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-black text-xs flex items-center gap-1.5 shrink-0">
                                <DoorOpen size={13} />
                                <span>Ruang {room.roomCode}</span>
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                • {room.sessions.length} Sesi Terjadwal
                              </span>
                            </div>

                            <div className="text-slate-400">
                              {isRoomExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                          </div>

                          {/* ── LEVEL 3: DAFTAR SESI (HANYA JAM, SESI, KELAS, MAPEL & AKSI DENAH RUANG) ── */}
                          {isRoomExpanded && (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                              {room.sessions.map((item) => {
                                const info = parseSessionLabel(item);
                                const { timeText } = formatScheduleDateTime(item.tanggal_mulai, item.tanggal_selesai);
                                const cfg = item.setting_keamanan || {};

                                // Deteksi nama sesi (misal "Sesi 1", "Sesi 2")
                                const sessionBadge =
                                  cfg.nama_sesi_waktu ||
                                  item.nama_sesi?.match(/Sesi\s*\d+/i)?.[0] ||
                                  'Sesi 1';

                                return (
                                  <div
                                    key={item.id}
                                    className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                  >
                                    {/* Kolom Info: Jam, Sesi, Kelas, Mapel */}
                                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                                      {/* Sesi & Jam */}
                                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                                        {sessionBadge}
                                      </span>

                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Clock size={12} className="text-slate-400" />
                                        <span>{timeText}</span>
                                      </span>

                                      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

                                      {/* Dikelas Mana */}
                                      {info.rombel && (
                                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                          Kelas {info.rombel}
                                        </span>
                                      )}

                                      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

                                      {/* Mapel */}
                                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                                        {info.mapel}
                                      </span>
                                    </div>

                                    {/* Aksi: Denah Ruang & Masuk Meja Pengawas (Aktivasi / Pantau) */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                                      {/* Denah Ruang */}
                                      <button
                                        type="button"
                                        onClick={() => setSelectedJadwalForDenah(item)}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                        title="Lihat Denah Ruang Ujian"
                                      >
                                        <MapPin size={13} className="text-slate-500 dark:text-slate-400" />
                                        <span className="sm:hidden">Denah</span>
                                        <span className="hidden sm:inline">Denah Ruang</span>
                                      </button>

                                      {/* Masuk Meja Pengawas / Aktifkan Sesi */}
                                      <button
                                        type="button"
                                        onClick={() => setActiveMonitorJadwalId(item.id)}
                                        className={cn(
                                          'px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs',
                                          item.status === 'ACTIVE'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                            : item.status === 'COMPLETED'
                                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                                        )}
                                        title={
                                          item.status === 'ACTIVE'
                                            ? 'Sesi sedang berlangsung. Pantau live kehadiran siswa & token.'
                                            : item.status === 'COMPLETED'
                                              ? 'Sesi telah selesai. Tinjau berita acara dan rekap hasil.'
                                              : 'Masuk Meja Pengawas untuk mengaktifkan sesi dan memantau ujian.'
                                        }
                                      >
                                        {item.status === 'ACTIVE' ? (
                                          <>
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                                            </span>
                                            <span>Pantau Sesi (Live)</span>
                                          </>
                                        ) : item.status === 'COMPLETED' ? (
                                          <>
                                            <FileText size={13} />
                                            <span>Berita Acara</span>
                                          </>
                                        ) : (
                                          <>
                                            <Play size={13} className="fill-current" />
                                            <span>Masuk Meja Pengawas</span>
                                          </>
                                        )}
                                      </button>
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. MODAL DENAH RUANG (SATU-SATUNYA MODAL YANG DIPERLUKAN) ── */}
      {selectedJadwalForDenah && (
        <CbtDenahModal
          isOpen={Boolean(selectedJadwalForDenah)}
          onClose={() => setSelectedJadwalForDenah(null)}
          highlightRoomCode={parseSessionLabel(selectedJadwalForDenah).roomCode}
          highlightLabel={`Ruang ${parseSessionLabel(selectedJadwalForDenah).roomCode}`}
          eventName={selectedJadwalForDenah.nama_sesi}
          isReadOnly={true}
        />
      )}
    </div>
  );
};

export default CbtPengawasTeacherView;
