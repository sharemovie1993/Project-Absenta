import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyJadwalKBM } from '../api/attendance/jadwalKBM.api';
import { useAuthStore } from '../store/authStore';
import { useSocket } from './useSocket';
import { toLocalDate } from '../utils/attendance/time';

/**
 * useStaffTimeline
 * Menangani logika tampilan lini masa staf dengan mengambil data yang sudah di-merge dari backend.
 */
export const useStaffTimeline = (guruId?: string) => {
  const { token } = useAuthStore();
  const { subscribe, unsubscribe } = useSocket();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock update untuk indikator isLive secara visual (opsional, karena backend sudah memberikan is_live)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Kita gunakan endpoint tunggal yang sudah melakukan merging di backend
  const { data: timelineRes, isLoading, refetch } = useQuery({
    queryKey: ['staff-timeline-me', toLocalDate()],
    queryFn: () => getMyJadwalKBM({ tanggal: toLocalDate() }),
    enabled: !!token && !!guruId,
  });

  const timelineItems = useMemo(() => {
    const rawData = timelineRes?.data || [];
    
    return rawData.map((item: any) => {
      // Normalisasi status kehadiran guru
      const absenRecord = item.session?.AbsenGuru?.[0] || null;
      const isGuruHadir = item.attendance_status === 'HADIR' || !!item.waktu_tap || !!absenRecord?.waktu_tap;
      
      let teacherStatus = 'BELUM_HADIR';
      if (isGuruHadir) {
        teacherStatus = absenRecord?.is_terlambat ? 'TERLAMBAT' : 'TEPAT_WAKTU';
      } else if (item.is_finished) {
        teacherStatus = 'ALPA';
      }
      
      return {
        id: item.id,
        jam_mulai: item.jam_mulai,
        jam_selesai: item.jam_selesai,
        kelas_nama: item.Kelas?.nama_kelas || item.kelas_nama || '-',
        kelas_id: item.kelas_id,
        mapel_id: item.mapel_id,
        kegiatan: item.Mapel?.nama_mapel || item.kegiatan || item.jenis_kegiatan || 'Kegiatan',
        kegiatan_raw: item.jenis_kegiatan,
        isLive: item.is_live,
        isFinished: item.is_finished,
        session: item.session,
        isGuruHadir,
        teacherStatus,
        myAbsenRecord: absenRecord,
        isAdHoc: !!item.is_adhoc,
        isPiket: !!item.is_piket,
        posPiket: item.pos_piket,
        catatan: item.catatan
      };
    });
  }, [timelineRes]);

  // Sockets untuk update real-time
  useEffect(() => {
    if (!guruId) return;
    const handleSesiChange = () => {
      refetch();
    };
    subscribe(`sesi:created:${guruId}`, handleSesiChange);
    subscribe(`sesi:updated:${guruId}`, handleSesiChange);
    return () => {
      unsubscribe(`sesi:created:${guruId}`, handleSesiChange);
      unsubscribe(`sesi:updated:${guruId}`, handleSesiChange);
    };
  }, [guruId, subscribe, unsubscribe, refetch]);

  return {
    timelineItems,
    isLoading,
    currentTime,
    impact: {
      totalStudents: timelineItems.reduce((acc: number, curr: any) => acc + (curr.session?._summary?.total || 0), 0),
      totalSessions: timelineItems.length,
      attendanceRate: (() => {
        const total = timelineItems.reduce((acc: number, curr: any) => acc + (curr.session?._summary?.total || 0), 0);
        if (total === 0) return 0;
        const hadir = timelineItems.reduce((acc: number, curr: any) => acc + ((curr.session?._summary?.HADIR || 0) + (curr.session?._summary?.TERLAMBAT || 0)), 0);
        return Math.round((hadir / total) * 100);
      })()
    }
  };
};
