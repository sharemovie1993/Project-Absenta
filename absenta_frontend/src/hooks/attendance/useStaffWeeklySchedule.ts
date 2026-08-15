import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyJadwalKBM, type JadwalKBM } from '../../api/attendance/jadwalKBM.api';
import { WORKDAYS_HARI_KEYS, getDayLabel, type HariKey } from '../../constants/day.constants';

export const mapDayIndexToHariKey = (idx: number): HariKey => {
  switch (idx) {
    case 1: return 'SENIN';
    case 2: return 'SELASA';
    case 3: return 'RABU';
    case 4: return 'KAMIS';
    case 5: return 'JUMAT';
    case 6: return 'SABTU';
    default: return 'SENIN';
  }
};

export interface MergedScheduleBlock {
  id: string;
  kelas_id: string;
  kelas_nama: string;
  mapel_nama: string;
  mapel_kode?: string;
  jenis_kegiatan: string;
  jam_mulai: string;
  jam_selesai: string;
  jpCount: number;
  slot_mulai: number;
  slot_selesai: number;
}

export function useStaffWeeklySchedule() {
  const [viewMode, setViewMode] = useState<'agenda' | 'grid'>('agenda');

  // Compute today's academic day name using existing day.constants
  const todayDayName = useMemo(() => {
    const dayIdx = new Date().getDay();
    return mapDayIndexToHariKey(dayIdx);
  }, []);

  const [selectedDay, setSelectedDay] = useState<HariKey>(todayDayName);

  // Fetch Teacher's full weekly schedule from SSOT endpoint
  const { data: scheduleRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['teacher-weekly-kbm-me'],
    queryFn: () => getMyJadwalKBM({ hari: 'ALL' }),
    staleTime: 5 * 60 * 1000,
  });

  const rawSchedules: JadwalKBM[] = useMemo(() => {
    return Array.isArray(scheduleRes?.data) ? scheduleRes.data : [];
  }, [scheduleRes]);

  // Aggregate and merge consecutive slots into clean course blocks per day
  const groupedData = useMemo(() => {
    const groups: Partial<Record<HariKey, MergedScheduleBlock[]>> = {};
    const jpCounts: Partial<Record<HariKey, number>> = {};

    WORKDAYS_HARI_KEYS.forEach((day) => {
      groups[day] = [];
      jpCounts[day] = 0;
    });

    WORKDAYS_HARI_KEYS.forEach((day) => {
      const daySlots = rawSchedules
        .filter((s) => String(s.hari).toUpperCase() === day)
        .sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0));

      jpCounts[day] = daySlots.length;

      // Merge consecutive matching slots (same class, subject, and activity type)
      const merged: MergedScheduleBlock[] = [];
      let i = 0;
      while (i < daySlots.length) {
        const current = daySlots[i];
        let count = 1;
        let finalEnd = current.jam_selesai;
        let lastSlot = current.slot_index;

        let j = i + 1;
        while (j < daySlots.length) {
          const next = daySlots[j];
          const isConsecutive = next.slot_index === (lastSlot + 1);
          const isSameClass = String(next.kelas_id) === String(current.kelas_id);
          const isSameMapel = String(next.mapel_id) === String(current.mapel_id);
          const isSameJenis = String(next.jenis_kegiatan || '') === String(current.jenis_kegiatan || '');

          if (isConsecutive && isSameClass && isSameMapel && isSameJenis) {
            count++;
            finalEnd = next.jam_selesai;
            lastSlot = next.slot_index;
            j++;
          } else {
            break;
          }
        }

        merged.push({
          id: current.id,
          kelas_id: current.kelas_id,
          kelas_nama: current.Kelas?.nama_kelas || 'Kelas',
          mapel_nama: current.Mapel?.nama_mapel || current.jenis_kegiatan || 'Mata Pelajaran',
          mapel_kode: current.Mapel?.kode_mapel,
          jenis_kegiatan: current.jenis_kegiatan || 'TEORI',
          jam_mulai: current.jam_mulai,
          jam_selesai: finalEnd,
          jpCount: count,
          slot_mulai: current.slot_index,
          slot_selesai: lastSlot,
        });

        i = j;
      }

      groups[day] = merged;
    });

    const totalWeeklyJp = rawSchedules.length;

    return { groups, jpCounts, totalWeeklyJp };
  }, [rawSchedules]);

  const activeDayBlocks = groupedData.groups[selectedDay] || [];
  const activeDayJp = groupedData.jpCounts[selectedDay] || 0;

  return {
    viewMode,
    setViewMode,
    selectedDay,
    setSelectedDay,
    todayDayName,
    rawSchedules,
    groupedBlocks: groupedData.groups,
    dailyJpCounts: groupedData.jpCounts,
    totalWeeklyJp: groupedData.totalWeeklyJp,
    activeDayBlocks,
    activeDayJp,
    isLoading,
    isFetching,
    refetch,
    getDayLabel,
  };
}
