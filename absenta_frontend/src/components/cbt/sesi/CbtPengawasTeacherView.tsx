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
} from 'lucide-react';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import { parseSessionLabel } from './CbtProctorMonitoringView';
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
  myPengawasData = [],
  isLoading = false,
  onRefresh,
}) => {
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
    const todayStr = new Date().toISOString().slice(0, 10);

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

            return (
              <div
                key={day.dateKey}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs transition-all"
              >
                {/* ── LEVEL 1: HARI (ACCORDION TOGGLE) ── */}
                <div
                  onClick={() => toggleDay(day.dateKey)}
                  className={cn(
                    'px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b',
                    day.isToday
                      ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 hover:bg-amber-500/15'
                      : isDayExpanded
                      ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/70'
                      : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Calendar
                      size={17}
                      className={day.isToday ? 'text-amber-600' : 'text-indigo-600 dark:text-indigo-400'}
                    />
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
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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

                                    {/* SATU-SATUNYA AKSI: DENAH RUANG */}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedJadwalForDenah(item)}
                                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 dark:hover:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs self-start sm:self-auto shrink-0"
                                      title="Lihat Denah Ruang Ujian"
                                    >
                                      <MapPin size={13} className="text-indigo-600 dark:text-indigo-400" />
                                      <span>Denah Ruang</span>
                                    </button>
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
