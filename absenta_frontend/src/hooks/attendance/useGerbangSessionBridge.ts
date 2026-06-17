import { useState, useMemo } from 'react';
import { getGerbangSessions } from '../../api/attendanceGerbang.api';
import { canShowCreateSessionCard } from '../../utils/attendanceUiSelectors';

interface Params {
  absensiMode: any;
  user: any;
  isPetugasSiswa: boolean;
}

export function useGerbangSessionBridge({ absensiMode, user, isPetugasSiswa }: Params) {
  const [sessionsDate, setSessionsDate] = useState<string>('');
  const [sessionsList, setSessionsList] = useState<any[]>([]);

  const reloadSessionsSesi = async () => {
    try {
      const res = await getGerbangSessions({});
      setSessionsList(res.data?.sessions || []);
      setSessionsDate(res.data?.date || '');
    } catch {
      setSessionsList([]);
      setSessionsDate('');
    }
  };

  const canCreateSession = useMemo(() => canShowCreateSessionCard({
    absensiMode: absensiMode || null,
    petugasSiswaActive: isPetugasSiswa,
    role: user?.role?.name,
  }), [absensiMode, isPetugasSiswa, user?.role?.name]);

  return { sessionsList, sessionsDate, reloadSessionsSesi, canCreateSession };
}
