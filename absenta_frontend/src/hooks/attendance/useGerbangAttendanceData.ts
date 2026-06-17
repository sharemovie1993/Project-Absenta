import { useState, useCallback, useEffect } from 'react';
import { getGerbangStats, getNotPresentStudents } from '../../api/attendanceGerbang.api';
import { useSocket } from '../useSocket';

interface Params {
  tenantId?: string | null;
  selectedKelasId?: string;
  tanggal?: string;
  enabled?: boolean;
}

interface MiniStats {
  masuk: number;
  keluar: number;
  total_target?: number;
}

export function useGerbangAttendanceData({ tenantId, selectedKelasId, tanggal, enabled = true }: Params) {
  const [notPresent, setNotPresent] = useState<any[]>([]);
  const [notPresentLoading, setNotPresentLoading] = useState<boolean>(false);
  const [miniStats, setMiniStats] = useState<MiniStats>({ masuk: 0, keluar: 0, total_target: 0 });
  
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();

  const fetchNotPresent = useCallback(async () => {
    setNotPresentLoading(true);
    try {
      if (!enabled) {
        setNotPresent([]);
        return;
      }
      const params: any = { kelas_id: selectedKelasId || undefined, limit: 200, offset: 0 };
      if (tanggal) params.tanggal = tanggal;
      const res = await getNotPresentStudents(params);
      setNotPresent(res.data || []);
    } catch {
      setNotPresent([]);
    } finally {
      setNotPresentLoading(false);
    }
  }, [selectedKelasId, tanggal, enabled]);

  const removePendingStudent = useCallback((siswaId: string) => {
    if (!siswaId) return;
    setNotPresent(prev => prev.filter((s: any) => String(s.id) !== String(siswaId)));
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      if (!enabled) {
        setMiniStats({ masuk: 0, keluar: 0, total_target: 0 });
        return null;
      }
      const statsRes = await getGerbangStats({ kelas_id: selectedKelasId });
      const s = statsRes?.data || null;
      // Prioritize explicit unique counts from backend, fallback to legacy fields
      const masukFromStats = Number((s && (s as any).students_entered) ?? (s && (s as any).total_masuk) ?? 0);
      const keluarFromStats = Number((s && (s as any).students_exited) ?? (s && (s as any).total_keluar) ?? 0);
      const totalTargetFromStats = Number((s as any)?.total_students_target ?? 0);
      
      setMiniStats({ 
        masuk: isNaN(masukFromStats) ? 0 : masukFromStats, 
        keluar: isNaN(keluarFromStats) ? 0 : keluarFromStats,
        total_target: isNaN(totalTargetFromStats) ? 0 : totalTargetFromStats
      });
      return statsRes?.data ?? null;
    } catch {
      return null;
    }
  }, [selectedKelasId, enabled]);

  // Socket Subscription
  useEffect(() => {
    if (!enabled || !isConnected) return;

    // Join room / Subscribe feed
    const params: any = {};
    if (tanggal) params.tanggal = tanggal;
    if (selectedKelasId) params.kelas_id = selectedKelasId;
    emit('attendance_feed_subscribe', params);

    const handleTapUpdate = (payload: any) => {
      refreshStats();
      if (payload?.siswa_id && payload?.arah === 'GERBANG_DATANG') {
        removePendingStudent(payload.siswa_id);
      } else {
        fetchNotPresent();
      }
    };

    subscribe('gerbang_tap_update', handleTapUpdate);

    return () => {
      unsubscribe('gerbang_tap_update', handleTapUpdate);
    };
  }, [isConnected, enabled, tanggal, selectedKelasId, refreshStats, removePendingStudent, fetchNotPresent, subscribe, unsubscribe, emit]);

  return { notPresent, notPresentLoading, fetchNotPresent, miniStats, refreshStats, removePendingStudent };
}
