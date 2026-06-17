import { useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';
import { siswaApi, guruApi } from '../api/academic.api';
import { getUserNotifications, getUserNotificationPreferences, getNotificationServiceStatus } from '../api/notifications.api';
import { LogService } from '../utils/LogService';
import { getAttendanceFeed, getStatistikHarian, getSesiAbsensiList, getSesiAbsenSiswa, getNotPresentStudents, getSesiSummary } from '../api/attendanceGerbang.api';
import type { NotificationStatsResponse, AttendanceFeedItem } from '../types/notification';

interface UseNotificationsOptions {
  pollIntervalMs?: number;
  wsUrl?: string; // Deprecated, handled by SocketContext
  storageKey?: string; // key untuk localStorage unread tracking
}

export function useNotifications(options?: UseNotificationsOptions) {
  const pollIntervalMs = options?.pollIntervalMs ?? 60000;
  const storageKey = options?.storageKey ?? 'notifications_read_ids';
  const { user, isTokenValid, refreshAccessToken, can, tenantMode } = useAuth();
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();
  const userScopedPrefsKey = `notif_prefs_${user?.id || 'anon'}`;

  const [recent, setRecent] = useState<NotificationStatsResponse['data']['recentNotifications']>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean>(true);
  const studentKelasIdRef = useRef<string>('');
  const studentIdRef = useRef<string>('');
  const guruIdRef = useRef<string>('');
  const [prefs, setPrefs] = useState<{ enabledTypes: Record<string, boolean>; digestFrequency: 'NONE' | 'DAILY' | 'WEEKLY' }>(() => {
    try {
      const raw = localStorage.getItem(userScopedPrefsKey);
      const json = raw ? JSON.parse(raw) : null;
      const enabledTypes = json?.enabledTypes || { ATTENDANCE: true };
      const digestFrequency = json?.digestFrequency || 'NONE';
      return { enabledTypes, digestFrequency };
    } catch {
      return { enabledTypes: { ATTENDANCE: true }, digestFrequency: 'NONE' };
    }
  });
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const isTokenValidRef = useRef(isTokenValid);
  const refreshAccessTokenRef = useRef(refreshAccessToken);
  useEffect(() => {
    isTokenValidRef.current = isTokenValid;
  }, [isTokenValid]);
  useEffect(() => {
    refreshAccessTokenRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  });

  const unreadCount = useMemo(() => {
    return recent.filter((n) => !readIds.has(n.id)).length;
  }, [recent, readIds]);

  const saveReadIds = (ids: string[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
      setReadIds(new Set(ids));
    } catch (err) {
      console.warn('Failed to persist read IDs:', err);
    }
  };

  const markAsReadLocal = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(Array.from(next));
  };

  const markAllAsReadLocal = () => {
    const next = new Set(readIds);
    recent.forEach((n) => next.add(n.id));
    saveReadIds(Array.from(next));
  };

  const isUnread = (id: string) => {
    return !readIds.has(id);
  };

  const normalizeAttendance = (n: AttendanceFeedItem): NotificationStatsResponse['data']['recentNotifications'][number] => {
    const subject = n.title || n.message || 'Notifikasi Absensi';
    const createdAt = n.created_at || n.timestamp || new Date().toISOString();
    const id = String(n.id || `${createdAt}-${subject}`);
    return {
      id,
      type: 'ATTENDANCE',
      recipient: n.recipient || 'self',
      subject,
      message: n.message || subject,
      status: 'SENT',
      created_at: createdAt,
    };
  };

  const inFlightRef = useRef(false);
  const attendanceForbiddenRef = useRef(false);
  const load = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      if (!serviceAvailable) {
        setRecent([]);
        setLoading(false);
        inFlightRef.current = false;
        return;
      }
      setLoading(true);
      setError(null);
      const res = await getUserNotifications();
      if (res.success) {
        const base = res.data.recentNotifications || [];
        const actualRoleName = user?.role?.name || '';
        const isPlatform = user?.tenant_id === 'system' || actualRoleName.startsWith('PLATFORM_') || actualRoleName === 'SUPERADMIN';
        const canAttendanceFeed = !isPlatform && !attendanceForbiddenRef.current && can('attendance.reports.view');
        const dNow = new Date();
        const today = `${dNow.getFullYear()}-${String(dNow.getMonth()+1).padStart(2,'0')}-${String(dNow.getDate()).padStart(2,'0')}`;
        const studentKelasId = studentKelasIdRef.current;
        const guruId = guruIdRef.current;
        const studentId = studentIdRef.current;
        let attendance: any[] = [];
        if (canAttendanceFeed) {
          try {
            const af = await getAttendanceFeed(
              studentKelasId || guruId || studentId
                ? { tanggal: today, ...(studentKelasId ? { kelas_id: studentKelasId } : {}), ...(guruId ? { guru_id: guruId } : {}), ...(studentId ? { siswa_id: studentId } : {}) }
                : { tanggal: today }
            );
            attendance = Array.isArray(af.data) ? af.data : [];
          } catch (e: any) {
            if (e?.response?.status === 403) {
              attendanceForbiddenRef.current = true;
            }
            attendance = [];
          }
        }
        let normalized = attendance.map(normalizeAttendance);
        if (!prefsRef.current.enabledTypes['ATTENDANCE']) {
          normalized = [];
        }
        if (prefs.digestFrequency === 'DAILY') {
          const digestId = `digest-${today}`;
          const counts = attendance.reduce(
            (acc, n) => {
              const c = n.counts || {};
              acc.HADIR += Number(c.HADIR || 0);
              acc.TERLAMBAT += Number(c.TERLAMBAT || 0);
              acc.IZIN += Number(c.IZIN || 0);
              acc.SAKIT += Number(c.SAKIT || 0);
              acc.ALPA += Number(c.ALPA || 0);
              return acc;
            },
            { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 }
          );
          if (canAttendanceFeed && !counts.HADIR && !counts.TERLAMBAT && !counts.IZIN && !counts.SAKIT && !counts.ALPA) {
            try {
              const s = await getStatistikHarian({ tanggal: today });
              const arr = Array.isArray(s.data) ? s.data : [];
              arr.forEach((x: any) => {
                counts.HADIR += Number(x.HADIR || 0);
                counts.TERLAMBAT += Number(x.TERLAMBAT || 0);
                counts.IZIN += Number(x.IZIN || 0);
                counts.SAKIT += Number(x.SAKIT || 0);
                counts.ALPA += Number(x.ALPA || 0);
              });
            } catch {}
          }
          const digestSubject = `Digest Absensi Harian • H:${counts.HADIR} T:${counts.TERLAMBAT} I:${counts.IZIN} S:${counts.SAKIT} A:${counts.ALPA}`;
          const digestItem = { id: digestId, type: 'ATTENDANCE', recipient: 'self', subject: digestSubject, status: 'SENT', created_at: new Date().toISOString() } as NotificationStatsResponse['data']['recentNotifications'][number];
          normalized = [digestItem, ...normalized];
        } else if (prefs.digestFrequency === 'WEEKLY') {
          const now = new Date();
          const day = now.getDay();
          const diff = (day === 0 ? 6 : day - 1);
          const start = new Date(now);
          start.setDate(now.getDate() - diff);
          const dates: string[] = [];
          for (let i = 0; i <= diff; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
          }
          let weeklyCounts = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
          if (canAttendanceFeed) try {
            const results = await Promise.all(
              dates.map((tgl) =>
                getAttendanceFeed(
                  studentKelasId || guruId || studentId
                    ? { tanggal: tgl, ...(studentKelasId ? { kelas_id: studentKelasId } : {}), ...(guruId ? { guru_id: guruId } : {}), ...(studentId ? { siswa_id: studentId } : {}) }
                    : { tanggal: tgl }
                )
              )
            );
            results.forEach((r) => {
              const arr = Array.isArray(r.data) ? r.data : [];
              arr.forEach((n: any) => {
                const c = n.counts || {};
                weeklyCounts.HADIR += Number(c.HADIR || 0);
                weeklyCounts.TERLAMBAT += Number(c.TERLAMBAT || 0);
                weeklyCounts.IZIN += Number(c.IZIN || 0);
                weeklyCounts.SAKIT += Number(c.SAKIT || 0);
                weeklyCounts.ALPA += Number(c.ALPA || 0);
              });
            });
          } catch {}
          if (!weeklyCounts.HADIR && !weeklyCounts.TERLAMBAT && !weeklyCounts.IZIN && !weeklyCounts.SAKIT && !weeklyCounts.ALPA) {
            try {
              const results = await Promise.all(dates.map((tgl) => getStatistikHarian({ tanggal: tgl })));
              results.forEach((s) => {
                const arr = Array.isArray(s.data) ? s.data : [];
                arr.forEach((x: any) => {
                  weeklyCounts.HADIR += Number(x.HADIR || 0);
                  weeklyCounts.TERLAMBAT += Number(x.TERLAMBAT || 0);
                  weeklyCounts.IZIN += Number(x.IZIN || 0);
                  weeklyCounts.SAKIT += Number(x.SAKIT || 0);
                  weeklyCounts.ALPA += Number(x.ALPA || 0);
                });
              });
            } catch {}
          }
          const weekLabel = `${dates[0]}–${dates[dates.length - 1]}`;
          const digestId = `digest-week-${weekLabel}`;
          const digestSubject = `Digest Absensi Mingguan (${weekLabel}) • H:${weeklyCounts.HADIR} T:${weeklyCounts.TERLAMBAT} I:${weeklyCounts.IZIN} S:${weeklyCounts.SAKIT} A:${weeklyCounts.ALPA}`;
          const digestItem = { id: digestId, type: 'ATTENDANCE', recipient: 'self', subject: digestSubject, status: 'SENT', created_at: new Date().toISOString() } as NotificationStatsResponse['data']['recentNotifications'][number];
          normalized = [digestItem, ...normalized];
        }
        if (canAttendanceFeed && guruId && tenantMode && (tenantMode as any) !== 'SIMPLE') {
          try {
            const sesiRes = await getSesiAbsensiList({ tanggal: today });
            const sesi = Array.isArray(sesiRes.data) ? sesiRes.data : [];
            const selesai = sesi.filter((s: any) => String(s.guru_id || s.Guru?.id || '') === guruId && String(s.status || '').toUpperCase() === 'SELESAI');
            for (const s of selesai) {
              try {
                let agg = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
                try {
                  const sum = await getSesiSummary(String(s.id));
                  agg = sum.data || agg;
                } catch {
                  const det = await getSesiAbsenSiswa(String(s.id));
                  const list = Array.isArray(det.data) ? det.data : [];
                  agg = list.reduce((acc: any, it: any) => {
                    const st = String(it.status || '').toUpperCase();
                    if (st === 'HADIR') acc.HADIR += 1;
                    else if (st === 'TERLAMBAT') acc.TERLAMBAT += 1;
                    else if (st === 'IZIN') acc.IZIN += 1;
                    else if (st === 'SAKIT') acc.SAKIT += 1;
                    else acc.ALPA += 1;
                    return acc;
                  }, { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 });
                }
                const subj = `Ringkasan Sesi • H:${agg.HADIR} T:${agg.TERLAMBAT} I:${agg.IZIN} S:${agg.SAKIT} A:${agg.ALPA}`;
                const item = { id: `sesi-${s.id}-${today}`, type: 'ATTENDANCE', recipient: 'self', subject: subj, status: 'SENT', created_at: new Date().toISOString() } as NotificationStatsResponse['data']['recentNotifications'][number];
                normalized = [item, ...normalized];
              } catch {}
            }
          } catch {}
          try {
            const pCodes = user?.position_codes || [];
            const hasPrivilegedAssignment = pCodes.some((code: string) => 
              ['WALIKELAS', 'PETUGAS_KELAS', 'GERBANG', 'KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN'].includes(code)
            );
            const isTenantAdmin = user?.role?.name === 'ADMIN';
            if ((hasPrivilegedAssignment || isTenantAdmin) && tenantMode && (tenantMode as any) !== 'SIMPLE') {
              const np = await getNotPresentStudents({ tanggal: today, kelas_id: studentKelasId || undefined });
              const arr = Array.isArray(np.data) ? np.data : [];
              const thresholdUnTap = Number((prefsRef.current as any)?.thresholds?.no_tap ?? 5);
              if (arr.length >= thresholdUnTap) {
                const item = { id: `alert-belumtap-${today}`, type: 'ATTENDANCE', recipient: 'self', subject: `Peringatan • Belum Tap: ${arr.length}`, status: 'SENT', created_at: new Date().toISOString() } as NotificationStatsResponse['data']['recentNotifications'][number];
                normalized = [item, ...normalized];
              }
            }

            const stat = await getStatistikHarian({ tanggal: today });
            const stArr = Array.isArray(stat.data) ? stat.data : [];
            const totalLate = stArr.reduce((sum: number, x: any) => sum + Number(x.TERLAMBAT || 0), 0);
            const thresholdLate = Number((prefsRef.current as any)?.thresholds?.late ?? 5);
            if (totalLate >= thresholdLate) {
              const item = { id: `alert-terlambat-${today}`, type: 'ATTENDANCE', recipient: 'self', subject: `Peringatan • Terlambat: ${totalLate}`, status: 'SENT', created_at: new Date().toISOString() } as NotificationStatsResponse['data']['recentNotifications'][number];
              normalized = [item, ...normalized];
            }
          } catch (e: any) {
            if (e?.response?.status === 403) {
              attendanceForbiddenRef.current = true;
            }
          }
        }
        // merge and dedupe by id
        const map = new Map<string, NotificationStatsResponse['data']['recentNotifications'][number]>();
        [...normalized, ...base].forEach((item) => {
          if (!map.has(item.id)) map.set(item.id, item);
        });
        setRecent(Array.from(map.values()).slice(0, 50));
      }
    } catch (err: any) {
      LogService.error('useNotifications load error:', err, 'useNotifications');
      setError('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    const roleName = user?.role?.name || '';
    if (roleName && roleName !== 'SUPERADMIN') {
      setServiceAvailable(true);
      return () => {
        mounted = false;
      };
    }
    (async () => {
      try {
        const status = await getNotificationServiceStatus({ headers: { 'X-Skip-403-Redirect': 'true' } });
        if (mounted) setServiceAvailable(!!status?.success);
      } catch {
        if (mounted) setServiceAvailable(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.role?.name]);

  useEffect(() => {
    let mounted = true;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const stopPolling = () => {
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
    };

    const computePollMs = () => {
      const base = Math.max(15000, pollIntervalMs);
      if (isConnected) return Math.max(base, 300000);
      return base;
    };

    const schedulePoll = () => {
      stopPolling();
      const ms = computePollMs();
      pollTimer = setTimeout(async () => {
        if (cancelled) return;
        await load();
        if (cancelled) return;
        schedulePoll();
      }, ms);
    };

    async function resolveStudentKelas() {
      if (attendanceForbiddenRef.current || !can('attendance.reports.view')) return;
      const roleName = user?.role?.name || '';
      const uid = user?.id || '';
      if (roleName === 'SISWA' && uid) {
        try {
          const res = await siswaApi.getAll({ limit: 1, ...( { user_id: uid } as any ) });
          const siswaItem: any = res.data?.[0] || null;
          const kid = siswaItem?.kelas_id || '';
          const sid = siswaItem?.id || '';
          studentKelasIdRef.current = kid;
          studentIdRef.current = sid;
        } catch {}
      }
      if (roleName === 'GURU' && uid) {
        try {
          const res = await guruApi.getAll({ limit: 1, ...( { user_id: uid } as any ) });
          const guruItem: any = res.data?.[0] || null;
          const gid = guruItem?.id || '';
          guruIdRef.current = gid;
        } catch {}
      }
    }
    resolveStudentKelas();
    (async () => {
      try {
        const p = await getUserNotificationPreferences();
        const next = p?.data || prefsRef.current;
        localStorage.setItem(userScopedPrefsKey, JSON.stringify(next));
        if (mounted) setPrefs(next);
      } catch {}
    })();
    // initial fetch
    (async () => {
      await load();
      if (!cancelled) schedulePoll();
    })();

    return () => {
      stopPolling();
      cancelled = true;
      mounted = false;
    };
  }, [pollIntervalMs, user?.role?.name, user?.id, isConnected, tenantMode]);

  // socket.io attendance real-time via SocketContext
  useEffect(() => {
    if (!isConnected) return;
    if (attendanceForbiddenRef.current) return;
    if (!can('attendance.reports.view')) return;

    const handleAttendanceFeed = (data: any[]) => {
      const normalized = (Array.isArray(data) ? data : []).map(normalizeAttendance);
      setRecent((prev) => {
        const map = new Map<string, NotificationStatsResponse['data']['recentNotifications'][number]>();
        normalized.forEach((n) => map.set(n.id, n));
        prev.forEach((p) => {
          if (!map.has(p.id)) map.set(p.id, p);
        });
        return Array.from(map.values()).slice(0, 50);
      });
    };

    const handleSesiSummary = (payload: { sesi_id: string; guru_id: string; tanggal: string; counts: { HADIR: number; TERLAMBAT: number; IZIN: number; SAKIT: number; ALPA: number } }) => {
      if (payload && (payload.guru_id === guruIdRef.current)) {
        const subj = `Ringkasan Sesi • H:${payload.counts.HADIR} T:${payload.counts.TERLAMBAT} I:${payload.counts.IZIN} S:${payload.counts.SAKIT} A:${payload.counts.ALPA}`;
        const item = { id: `sesi-${payload.sesi_id}-${payload.tanggal}`, type: 'ATTENDANCE', recipient: 'self', subject: subj, status: 'SENT', created_at: new Date().toISOString() } as NotificationStatsResponse['data']['recentNotifications'][number];
        setRecent((prev) => [item, ...prev].slice(0, 50));
      }
    };

    subscribe('attendance_feed_update', handleAttendanceFeed);
    subscribe('sesi_summary_update', handleSesiSummary);

    // Initial Emit
    const today = new Date().toISOString().slice(0, 10);
    const params: any = { tanggal: today };
    const studentKelasId = studentKelasIdRef.current;
    const guruId = guruIdRef.current;
    const studentId = studentIdRef.current;
    if (studentKelasId) params.kelas_id = studentKelasId;
    if (guruId) params.guru_id = guruId;
    if (studentId) params.siswa_id = studentId;
    emit('attendance_feed_subscribe', params);

    return () => {
      unsubscribe('attendance_feed_update', handleAttendanceFeed);
      unsubscribe('sesi_summary_update', handleSesiSummary);
    };
  }, [isConnected, subscribe, unsubscribe, emit, user?.role?.name]);

  return {
    recent,
    loading,
    error,
    unreadCount,
    markAsReadLocal,
    markAllAsReadLocal,
    isUnread,
    reload: load,
  };
}
