import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Clock, 
  Building, 
  Phone, 
  CheckCircle2, 
  LogOut, 
  CreditCard,
  User,
  Filter,
  RefreshCw,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { getSecurityLogs, recordGuestAccess, updateSecurityLog } from '@/api/attendanceGerbang.api';
import { GuestAccessModal } from '@/components/attendance/gerbang/GuestAccessModal';
import { useSocket } from '@/hooks/useSocket';
import type { GuestLogRecord } from '../types';

interface SatpamBukuTamuTabProps {
  guestLogs?: GuestLogRecord[];
  onGuestChange?: () => void;
}

export const SatpamBukuTamuTab: React.FC<SatpamBukuTamuTabProps> = ({
  guestLogs: initialLogs,
  onGuestChange,
}) => {
  const [logs, setLogs] = useState<GuestLogRecord[]>(initialLogs || []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BERKUNJUNG' | 'SELESAI'>('ALL');
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

  const { isConnected, subscribe, unsubscribe } = useSocket();

  // Fetch real security logs from backend
  const fetchGuestLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await getSecurityLogs({
        startDate: today,
        tipe_orang: 'SEMUA',
        limit: 100,
      });

      if (res?.success && Array.isArray(res.data)) {
        // Filter and format guest / visitor logs
        const formatted: GuestLogRecord[] = res.data
          .filter((item) => ['TAMU', 'ORANG_TUA', 'ALUMNI', 'KHUSUS'].includes(item.tipe_orang) || item.nama_tamu)
          .map((item) => {
            const isKeluar = item.arah === 'KELUAR';
            const timeStr = new Date(item.waktu_akses || item.created_at).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return {
              id: item.id,
              nama_tamu: item.nama_tamu || item.nama_snapshot || 'Pengunjung',
              instansi: item.instansi_tamu || item.kategori_buku || '-',
              keperluan: item.keperluan_tamu || item.catatan || 'Kunjungan Sekolah',
              menemui: item.pejabat_dituju || 'Pihak Sekolah',
              no_telepon: item.kontak_tamu || '-',
              nomor_kartu_tamu: item.token_input || `V-${item.id.slice(-4).toUpperCase()}`,
              jam_masuk: isKeluar ? '-' : timeStr,
              jam_keluar: isKeluar ? timeStr : undefined,
              status: isKeluar ? 'SELESAI' : 'BERKUNJUNG',
            };
          });

        setLogs(formatted);
      }
    } catch {
      // Fallback to initialLogs if network error
      if (initialLogs && initialLogs.length > 0) {
        setLogs(initialLogs);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialLogs]);

  useEffect(() => {
    fetchGuestLogs();
  }, [fetchGuestLogs]);

  // Real-time socket sync
  useEffect(() => {
    if (!isConnected) return;
    const handleUpdate = () => {
      fetchGuestLogs();
      onGuestChange?.();
    };

    subscribe('gerbang_tap_update', handleUpdate);
    subscribe('attendance_update', handleUpdate);

    return () => {
      unsubscribe('gerbang_tap_update', handleUpdate);
      unsubscribe('attendance_update', handleUpdate);
    };
  }, [isConnected, fetchGuestLogs, onGuestChange, subscribe, unsubscribe]);

  // Checkout guest handler
  const handleCheckout = async (record: GuestLogRecord) => {
    setIsCheckingOut(record.id);
    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    try {
      // Record exit log to backend
      await recordGuestAccess({
        tipe_orang: 'TAMU',
        nama_tamu: record.nama_tamu,
        instansi_tamu: record.instansi,
        keperluan_tamu: record.keperluan,
        kontak_tamu: record.no_telepon,
        pejabat_dituju: record.menemui,
        arah: 'KELUAR',
        token_input: record.nomor_kartu_tamu,
        catatan: `Selesai kunjungan pada pukul ${jamStr} WIB`,
      });

      // Update local state optimistically
      setLogs((prev) =>
        prev.map((l) => (l.id === record.id ? { ...l, status: 'SELESAI', jam_keluar: jamStr } : l))
      );

      toast.success(`Tamu ${record.nama_tamu} berhasil checkout (${jamStr} WIB).`);
      onGuestChange?.();
    } catch {
      toast.error('Gagal memproses checkout tamu.');
    } finally {
      setIsCheckingOut(null);
    }
  };

  // Filter & Search
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        log.nama_tamu.toLowerCase().includes(q) ||
        (log.instansi && log.instansi.toLowerCase().includes(q)) ||
        log.keperluan.toLowerCase().includes(q) ||
        log.menemui.toLowerCase().includes(q) ||
        (log.nomor_kartu_tamu && log.nomor_kartu_tamu.toLowerCase().includes(q));

      const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, filterStatus]);

  const activeVisitorsCount = useMemo(() => {
    return logs.filter((l) => l.status === 'BERKUNJUNG').length;
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* ── TOP STATS & ACTIONS BAR ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Buku Tamu Digital & Tamu Sekolah
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                {activeVisitorsCount} Aktif di Sekolah
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pencatatan identitas, instansi, keperluan, dan waktu keluar-masuk pihak luar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchGuestLogs}
            disabled={isLoading}
            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold gap-1.5"
          >
            <RefreshCw size={13} className={cn(isLoading && 'animate-spin text-purple-600')} />
            <span>Segarkan</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsGuestModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm dark:shadow-lg dark:shadow-purple-950/40 text-xs font-bold gap-1.5"
          >
            <Plus size={15} />
            <span>Catat Tamu Masuk</span>
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
            placeholder="Cari nama tamu, instansi, pihak yang ditemui..."
            aria-label="Cari buku tamu"
            className="pl-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          {(['ALL', 'BERKUNJUNG', 'SELESAI'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                filterStatus === st
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              {st === 'ALL' ? 'Semua' : st === 'BERKUNJUNG' ? 'Berkunjung (Aktif)' : 'Selesai'}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST GUEST CARDS ────────────────────────────────── */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <UserCheck size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Tamu Hari Ini</p>
            <p className="text-xs text-slate-500">Gunakan tombol &quot;Catat Tamu Masuk&quot; di atas untuk meregistrasi tamu baru.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isBerkunjung = log.status === 'BERKUNJUNG';
            return (
              <div
                key={log.id}
                className={cn(
                  "bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                  isBerkunjung
                    ? "border-purple-200/80 dark:border-purple-900/40 bg-purple-50/10"
                    : "border-slate-200/80 dark:border-slate-800 opacity-80"
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5",
                    isBerkunjung
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                    {log.nama_tamu.charAt(0)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {log.nama_tamu}
                      </h4>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        isBerkunjung
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {isBerkunjung ? 'Sedang Berkunjung' : 'Selesai'}
                      </span>
                      {log.nomor_kartu_tamu && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          ID: {log.nomor_kartu_tamu}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Building size={13} className="text-slate-400" />
                        {log.instansi || '-'}
                      </span>
                      {log.no_telepon && log.no_telepon !== '-' && (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone size={12} className="text-slate-400" />
                          {log.no_telepon}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium pt-1">
                      <span className="text-slate-400 font-normal">Keperluan:</span> {log.keperluan} • <span className="text-slate-400 font-normal">Menemui:</span> <span className="font-semibold text-slate-900 dark:text-slate-100">{log.menemui}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="text-left sm:text-right font-mono text-[11px] text-slate-500 space-y-0.5">
                    <p className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Clock size={12} className="text-purple-500" />
                      Masuk: <span className="font-bold">{log.jam_masuk} WIB</span>
                    </p>
                    {log.jam_keluar && (
                      <p className="flex items-center gap-1 text-slate-400">
                        <LogOut size={12} />
                        Keluar: <span>{log.jam_keluar} WIB</span>
                      </p>
                    )}
                  </div>

                  {isBerkunjung && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isCheckingOut === log.id}
                      onClick={() => handleCheckout(log)}
                      className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                      {isCheckingOut === log.id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <LogOut size={13} />
                      )}
                      <span>Checkout Keluar</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL TAMU MASUK ─────────────────────────────────── */}
      <GuestAccessModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSuccess={async (guest) => {
          const guestName = guest?.nama_tamu || guest?.nama || guest?.nama_snapshot || 'Tamu';
          toast.success(`Tamu ${guestName} berhasil dicatat.`);
          await fetchGuestLogs();
          onGuestChange?.();
        }}
      />
    </div>
  );
};
