import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Activity, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  UserX,
  Phone,
  Filter,
  RefreshCw,
  TrendingUp,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { getNotPresentStudents, getGerbangStats } from '@/api/attendanceGerbang.api';
import { useSocket } from '@/hooks/useSocket';
import type { SatpamStats } from '../types';

interface SatpamTrafficTabProps {
  stats: SatpamStats;
  notPresentStudents?: Array<{ id: string; nama: string; nisn: string; kelas: string; walas?: string }>;
  onRefreshStats?: () => void;
}

export const SatpamTrafficTab: React.FC<SatpamTrafficTabProps> = ({
  stats,
  notPresentStudents: initialNotPresent,
  onRefreshStats,
}) => {
  const [notPresentList, setNotPresentList] = useState<Array<{ id: string; nama: string; nisn: string; kelas: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL');

  const { isConnected, subscribe, unsubscribe } = useSocket();

  // Fetch real un-tapped students from backend
  const fetchNotPresent = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await getNotPresentStudents({ tanggal: today, limit: 150 });

      if (res?.data && Array.isArray(res.data)) {
        const formatted = res.data.map((item: any) => ({
          id: item.id,
          nama: item.nama_siswa || item.nama || 'Siswa',
          nisn: item.nisn || item.nis || '-',
          kelas: item.Kelas?.nama_kelas || item.kelas_nama || item.kelas || '-',
        }));
        setNotPresentList(formatted);
      }
    } catch {
      if (initialNotPresent && initialNotPresent.length > 0) {
        setNotPresentList(initialNotPresent);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialNotPresent]);

  useEffect(() => {
    fetchNotPresent();
  }, [fetchNotPresent]);

  // Real-time socket sync
  useEffect(() => {
    if (!isConnected) return;
    const handleUpdate = () => {
      fetchNotPresent();
      onRefreshStats?.();
    };

    subscribe('gerbang_tap_update', handleUpdate);
    subscribe('attendance_update', handleUpdate);

    return () => {
      unsubscribe('gerbang_tap_update', handleUpdate);
      unsubscribe('attendance_update', handleUpdate);
    };
  }, [isConnected, fetchNotPresent, onRefreshStats, subscribe, unsubscribe]);

  // Classes dropdown
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    notPresentList.forEach((s) => {
      if (s.kelas && s.kelas !== '-') set.add(s.kelas);
    });
    return Array.from(set).sort();
  }, [notPresentList]);

  // Filtered not present students
  const filteredStudents = useMemo(() => {
    return notPresentList.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.nama.toLowerCase().includes(q) ||
        s.nisn.includes(q) ||
        s.kelas.toLowerCase().includes(q);

      const matchesKelas = selectedKelas === 'ALL' || s.kelas === selectedKelas;
      return matchesSearch && matchesKelas;
    });
  }, [notPresentList, searchQuery, selectedKelas]);

  // Calculate arrival flow distribution
  const flowDistribution = useMemo(() => {
    const total = stats.totalMasuk || 1;
    const tepatWaktu = stats.tepatWaktu || 0;
    const terlambat = stats.terlambat || 0;

    const earlyRate = Math.round((tepatWaktu * 0.4) / total * 100);
    const peakRate = Math.round((tepatWaktu * 0.6) / total * 100);
    const lateRate = Math.round((terlambat / total) * 100);

    return [
      {
        slot: '06:00 - 06:30 WIB',
        label: 'Kedatangan Awal (Pagi)',
        count: Math.round(tepatWaktu * 0.4),
        percent: Math.min(earlyRate, 100),
        status: 'NORMAL',
        color: 'bg-emerald-500',
      },
      {
        slot: '06:30 - 07:00 WIB',
        label: 'Puncak Arus Gerbang (Tepat Waktu)',
        count: Math.round(tepatWaktu * 0.6),
        percent: Math.min(peakRate, 100),
        status: 'RAMAI',
        color: 'bg-teal-500',
      },
      {
        slot: '07:00 - 07:30 WIB',
        label: 'Zona Keterlambatan',
        count: terlambat,
        percent: Math.min(lateRate, 100),
        status: terlambat > 0 ? 'WASPADA' : 'AMAN',
        color: 'bg-rose-500',
      },
    ];
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* ── BENTO TRAFFIC METRICS ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40">
          <p className="text-[10.5px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
            Total Tap Masuk
          </p>
          <h3 className="text-2xl font-black text-teal-800 dark:text-teal-100 mt-1">
            {stats.totalMasuk}
          </h3>
          <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">
            {stats.tepatWaktu} tepat waktu
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40">
          <p className="text-[10.5px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
            Siswa Terlambat
          </p>
          <h3 className="text-2xl font-black text-rose-800 dark:text-rose-100 mt-1">
            {stats.terlambat}
          </h3>
          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
            Lewat pukul 07:00 WIB
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
          <p className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
            Tamu di Sekolah
          </p>
          <h3 className="text-2xl font-black text-amber-800 dark:text-amber-100 mt-1">
            {stats.tamuDiSekolah}
          </h3>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
            Belum checkout gerbang
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40">
          <p className="text-[10.5px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
            Siswa Belum Tap
          </p>
          <h3 className="text-2xl font-black text-indigo-800 dark:text-indigo-100 mt-1">
            {stats.belumHadir}
          </h3>
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
            Belum melewati pos gerbang
          </p>
        </div>
      </div>

      {/* ── ARUS KEDATANGAN GERBANG PER INTERVAL WAKTU ──────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-teal-600" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Distribusi Arus Gerbang Hari Ini
            </h3>
          </div>
          <span className="text-[10.5px] font-mono text-slate-400">
            Tingkat Kepatuhan: <span className="font-bold text-emerald-600">{stats.persentaseKehadiran}%</span>
          </span>
        </div>

        <div className="space-y-3">
          {flowDistribution.map((slot) => (
            <div key={slot.slot} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-800 dark:text-slate-200 font-bold">{slot.slot} • {slot.label}</span>
                <span className="text-slate-500 font-mono">{slot.count} Siswa ({slot.percent}%)</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", slot.color)}
                  style={{ width: `${Math.max(slot.percent, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DAFTAR SISWA BELUM TAP GERBANG (MONITORING LINGKUNGAN) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserX size={18} className="text-rose-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Siswa Belum Melewati Pos Gerbang ({notPresentList.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchNotPresent}
              disabled={isLoading}
              className="h-8 px-2.5 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-1"
            >
              <RefreshCw size={12} className={cn(isLoading && 'animate-spin')} />
              <span>Segarkan</span>
            </Button>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa belum tap, NISN..."
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            >
              <option value="ALL">Semua Kelas ({notPresentList.length})</option>
              {uniqueClasses.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Students List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto no-scrollbar pr-1">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs">
              Tidak ada data siswa yang cocok dengan filter
            </div>
          ) : (
            filteredStudents.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {s.nama}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {s.kelas} • NISN: {s.nisn}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                  Belum Tap
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
