import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, 
  LogIn, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  ShieldCheck,
  FileText,
  RefreshCw,
  Calendar,
  AlertTriangle,
  BadgeAlert
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { piketApi, type IzinKeluarSiswa } from '@/api/piket.api';
import { useSocket } from '@/hooks/useSocket';
import type { StudentGatePermit } from '../types';

interface SatpamIzinKeluarTabProps {
  permits?: StudentGatePermit[];
  onPermitChange?: () => void;
}

export const SatpamIzinKeluarTab: React.FC<SatpamIzinKeluarTabProps> = ({
  permits: initialPermits,
  onPermitChange,
}) => {
  const [permits, setPermits] = useState<StudentGatePermit[]>(initialPermits || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DISETUJUI' | 'DI_LUAR' | 'KEMBALI'>('ALL');

  const { isConnected, subscribe, unsubscribe } = useSocket();

  // Fetch real permits from backend
  const fetchPermits = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await piketApi.getDailyPermits({ date: today });

      if (res?.success && Array.isArray(res.data)) {
        const formatted: StudentGatePermit[] = res.data.map((item: IzinKeluarSiswa) => {
          const keluarDate = item.jam_keluar ? new Date(item.jam_keluar) : null;
          const kembaliDate = item.jam_kembali ? new Date(item.jam_kembali) : null;

          return {
            id: item.id,
            siswa_id: item.siswa_akademik_id,
            nama_siswa: item.SiswaAkademik?.siswa?.nama_siswa || 'Siswa',
            kelas: item.SiswaAkademik?.kelas?.nama_kelas || '-',
            alasan: item.alasan || 'Izin Keluar Lingkungan Sekolah',
            jam_keluar_rencana: keluarDate ? keluarDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
            jam_kembali_rencana: kembaliDate ? kembaliDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
            jam_keluar_aktual: keluarDate ? keluarDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : undefined,
            jam_kembali_aktual: item.status === 'KEMBALI' && kembaliDate ? kembaliDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : undefined,
            guru_piket_nama: item.GuruPiket?.nama_guru || 'Guru Piket',
            status: (item.status as any) || 'DISETUJUI',
          };
        });

        setPermits(formatted);
      }
    } catch {
      if (initialPermits && initialPermits.length > 0) {
        setPermits(initialPermits);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialPermits]);

  useEffect(() => {
    fetchPermits();
  }, [fetchPermits]);

  // Real-time socket sync
  useEffect(() => {
    if (!isConnected) return;
    const handleUpdate = () => {
      fetchPermits();
      onPermitChange?.();
    };

    subscribe('gerbang_tap_update', handleUpdate);
    subscribe('attendance_update', handleUpdate);

    return () => {
      unsubscribe('gerbang_tap_update', handleUpdate);
      unsubscribe('attendance_update', handleUpdate);
    };
  }, [isConnected, fetchPermits, onPermitChange, subscribe, unsubscribe]);

  // Handler: Verifikasi Siswa Melewati Gerbang Keluar
  const handleConfirmExit = async (permit: StudentGatePermit) => {
    setIsProcessingId(permit.id);
    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    try {
      // Optimistic update
      setPermits((prev) =>
        prev.map((p) => (p.id === permit.id ? { ...p, status: 'DI_LUAR', jam_keluar_aktual: jamStr } : p))
      );

      toast.success(`Siswa ${permit.nama_siswa} terverifikasi keluar gerbang (${jamStr} WIB).`, {
        icon: '🚪',
      });
      onPermitChange?.();
    } catch {
      toast.error('Gagal memverifikasi izin keluar.');
    } finally {
      setIsProcessingId(null);
    }
  };

  // Handler: Konfirmasi Siswa Kembali ke Sekolah
  const handleConfirmReturn = async (permit: StudentGatePermit) => {
    setIsProcessingId(permit.id);
    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    try {
      // Call backend markReturned
      await piketApi.markReturned(permit.id);

      setPermits((prev) =>
        prev.map((p) => (p.id === permit.id ? { ...p, status: 'KEMBALI', jam_kembali_aktual: jamStr } : p))
      );

      toast.success(`Siswa ${permit.nama_siswa} telah kembali ke area sekolah (${jamStr} WIB).`, {
        icon: '🏫',
      });
      onPermitChange?.();
    } catch {
      toast.error('Gagal mencatat konfirmasi siswa kembali.');
    } finally {
      setIsProcessingId(null);
    }
  };

  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.nama_siswa.toLowerCase().includes(q) ||
        p.kelas.toLowerCase().includes(q) ||
        p.alasan.toLowerCase().includes(q) ||
        p.guru_piket_nama.toLowerCase().includes(q);

      const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [permits, searchQuery, filterStatus]);

  const activeOutsideCount = useMemo(() => {
    return permits.filter((p) => p.status === 'DI_LUAR' || p.status === 'DISETUJUI').length;
  }, [permits]);

  return (
    <div className="space-y-4">
      {/* ── TOP STATS & ACTIONS BAR ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
            <LogOut size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Validasi Izin Keluar Gerbang Siswa
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                {activeOutsideCount} Siswa di Luar / Izin
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sinkronisasi tiket surat izin piket dengan pos penjagaan gerbang utama
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchPermits}
            disabled={isLoading}
            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold gap-1.5"
          >
            <RefreshCw size={13} className={cn(isLoading && 'animate-spin text-indigo-600')} />
            <span>Segarkan Tiket</span>
          </Button>
        </div>
      </div>

      {/* ── SEARCH & FILTER STRIP ───────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa izin, rombel/kelas, alasan..."
            aria-label="Cari tiket izin keluar"
            className="pl-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          {(['ALL', 'DISETUJUI', 'DI_LUAR', 'KEMBALI'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                filterStatus === st
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              {st === 'ALL'
                ? 'Semua'
                : st === 'DISETUJUI'
                ? 'Menunggu Keluar'
                : st === 'DI_LUAR'
                ? 'Sedang di Luar'
                : 'Sudah Kembali'}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST PERMIT TICKETS ──────────────────────────────── */}
      <div className="space-y-3">
        {filteredPermits.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <ShieldCheck size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak Ada Izin Keluar Hari Ini</p>
            <p className="text-xs text-slate-500">Tiket izin siswa yang disetujui Guru Piket akan otomatis muncul di pos gerbang.</p>
          </div>
        ) : (
          filteredPermits.map((permit) => {
            const isDiLuar = permit.status === 'DI_LUAR';
            const isKembali = permit.status === 'KEMBALI';
            const isDisetujui = permit.status === 'DISETUJUI';

            return (
              <div
                key={permit.id}
                className={cn(
                  "bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                  isDiLuar
                    ? "border-amber-200/80 dark:border-amber-900/40 bg-amber-50/10"
                    : isKembali
                    ? "border-slate-200/80 dark:border-slate-800 opacity-75"
                    : "border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/10"
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5",
                    isDiLuar
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                      : isKembali
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                  )}>
                    {permit.nama_siswa.charAt(0)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {permit.nama_siswa}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {permit.kelas}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        isDiLuar
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                          : isKembali
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      )}>
                        {isDiLuar ? 'Sedang di Luar' : isKembali ? 'Sudah Kembali' : 'Izin Disetujui'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      <span className="text-slate-400 font-normal">Alasan:</span> {permit.alasan}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1 font-medium">
                        <User size={12} className="text-slate-400" />
                        Disetujui: <span className="text-slate-700 dark:text-slate-200">{permit.guru_piket_nama}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock size={12} className="text-slate-400" />
                        Rencana: {permit.jam_keluar_rencana} - {permit.jam_kembali_rencana} WIB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="text-left sm:text-right font-mono text-[11px] text-slate-500 space-y-0.5">
                    {permit.jam_keluar_aktual && (
                      <p className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <LogOut size={12} className="text-amber-500" />
                        Keluar: <span className="font-bold">{permit.jam_keluar_aktual} WIB</span>
                      </p>
                    )}
                    {permit.jam_kembali_aktual && (
                      <p className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <LogIn size={12} />
                        Kembali: <span className="font-bold">{permit.jam_kembali_aktual} WIB</span>
                      </p>
                    )}
                  </div>

                  {/* Actions for Security Officers */}
                  {isDisetujui && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isProcessingId === permit.id}
                      onClick={() => handleConfirmExit(permit)}
                      className="h-9 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                      {isProcessingId === permit.id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <LogOut size={13} />
                      )}
                      <span>Verifikasi Keluar</span>
                    </Button>
                  )}

                  {isDiLuar && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isProcessingId === permit.id}
                      onClick={() => handleConfirmReturn(permit)}
                      className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                      {isProcessingId === permit.id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <LogIn size={13} />
                      )}
                      <span>Konfirmasi Kembali</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
