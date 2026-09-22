import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldAlert, Clock, ArrowUpRight, ArrowDownLeft, UserCheck, Users, Plus, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { GuestAccessModal } from '../../../../components/attendance/gerbang/GuestAccessModal';
import { getSecurityLogs, getSecurityLogStats, submitTap, LogAksesItem } from '../../../../api/attendanceGerbang.api';
import { useSocket } from '../../../../hooks/useSocket';
import { Link } from 'react-router-dom';

interface AuditModeOpsViewProps {
  reason?: string;
  user?: any;
}

export const AuditModeOpsView: React.FC<AuditModeOpsViewProps> = ({ reason }) => {
  const { isConnected, subscribe, unsubscribe } = useSocket();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const [direction, setDirection] = useState<'GERBANG_DATANG' | 'GERBANG_PULANG'>('GERBANG_DATANG');
  const [isProcessing, setIsProcessing] = useState(false);
  const [todayLogs, setTodayLogs] = useState<LogAksesItem[]>([]);
  const [stats, setStats] = useState({ total: 0, siswa: 0, guru: 0, tamu: 0, masuk: 0, keluar: 0 });
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto focus ke scanner input
  useEffect(() => {
    inputRef.current?.focus();
  }, [isGuestModalOpen]);

  // Fetch initial logs & stats for today
  const loadTodayData = async () => {
    setIsLoadingLogs(true);
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      const [logsRes, statsRes] = await Promise.all([
        getSecurityLogs({ startDate: todayStr, endDate: todayStr, limit: 30 }),
        getSecurityLogStats({ startDate: todayStr, endDate: todayStr }),
      ]);

      if (logsRes?.data) {
        setTodayLogs(logsRes.data);
      }
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.warn('Failed loading audit data:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadTodayData();
  }, []);

  // Real-time socket listener
  useEffect(() => {
    const handleAuditUpdate = (payload: any) => {
      loadTodayData();
    };

    subscribe('gerbang_audit_update', handleAuditUpdate);
    return () => {
      unsubscribe('gerbang_audit_update', handleAuditUpdate);
    };
  }, [subscribe, unsubscribe]);

  // Handle Scan / Submit Tap
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = inputToken.trim();
    if (!token) return;

    setIsProcessing(true);
    try {
      const res = await submitTap({
        siswa_id: token,
        arah: direction,
        device_id: 'WEB_AUDIT_OPS',
        rfid: token,
      });

      if (res?.success) {
        toast.success(`Akses dicatat: ${res?.data?.siswa_info?.nama || res?.data?.guru_info?.nama || token}`, {
          icon: '🔒',
        });
        setInputToken('');
        loadTodayData();
      } else {
        toast.error(res?.message || 'Gagal memproses tap');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memproses tap');
    } finally {
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* ── Top Hero: Banner Audit Keamanan ──────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-purple-200 dark:border-purple-800 bg-white dark:bg-neutral-900">
        <div className="h-2 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600" />
        <div className="p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-2xl shadow-inner shrink-0">
              <ShieldAlert size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 rounded-lg">
                  Mode Audit Keamanan
                </span>
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  Terminal Aktif
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1 leading-tight">
                Catatan Akses Keluar-Masuk Gerbang
              </h1>
              <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-400 font-medium mt-0.5">
                {reason || 'Bukan hari operasional sekolah (Hari Libur / Weekend)'}
              </p>
            </div>
          </div>

          {/* Jam Digital */}
          <div className="flex items-center gap-3 sm:gap-4 bg-purple-50 dark:bg-purple-950/30 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-purple-200 dark:border-purple-800/60 w-full md:w-auto justify-between md:justify-end">
            <div className="text-left md:text-right">
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-900 dark:text-purple-200 tracking-tight">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <button
              onClick={loadTodayData}
              disabled={isLoadingLogs}
              title="Segarkan data"
              className="p-2 rounded-xl bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors shadow-xs shrink-0"
            >
              <RefreshCw size={18} className={isLoadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric Cards Ringkasan ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Total Akses
            </span>
            <div className="p-1.5 sm:p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
              <Shield size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-1 sm:mt-2">
            {stats.total}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 sm:mt-1 truncate">Orang keluar-masuk</div>
        </Card>

        <Card className="p-3 sm:p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Akses Masuk
            </span>
            <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ArrowUpRight size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 sm:mt-2">
            {stats.masuk}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 sm:mt-1 truncate">Siswa, guru & tamu masuk</div>
        </Card>

        <Card className="p-3 sm:p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Akses Keluar
            </span>
            <div className="p-1.5 sm:p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
              <ArrowDownLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 sm:mt-2">
            {stats.keluar}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 sm:mt-1 truncate">Siswa, guru & tamu keluar</div>
        </Card>

        <Card className="p-3 sm:p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Tamu / Pengunjung
            </span>
            <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <UserCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1 sm:mt-2">
            {stats.tamu}
          </div>
          <div className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 sm:mt-1 truncate">Pengunjung non-civitas</div>
        </Card>
      </div>

      {/* ── Scanner & Input Terminal ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 sm:p-6 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                  Terminal Pindai Kartu RFID / Barcode
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                  Tempelkan kartu siswa / guru atau masukkan ID secara manual
                </p>
              </div>

              {/* Direction Toggle */}
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDirection('GERBANG_DATANG')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    direction === 'GERBANG_DATANG'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  <ArrowUpRight size={14} />
                  MASUK
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('GERBANG_PULANG')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    direction === 'GERBANG_PULANG'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  <ArrowDownLeft size={14} />
                  KELUAR
                </button>
              </div>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-3 sm:space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan RFID / ID Siswa / NIP Guru..."
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  disabled={isProcessing}
                  className="w-full pl-3.5 sm:pl-4 pr-20 sm:pr-24 py-3 sm:py-3.5 text-sm sm:text-base font-mono rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50/40 dark:bg-purple-950/20 text-neutral-900 dark:text-white placeholder-neutral-400 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/10 focus:outline-none transition-all"
                />
                <Button
                  type="submit"
                  disabled={isProcessing || !inputToken.trim()}
                  className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 px-3 sm:px-5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs sm:text-sm"
                >
                  {isProcessing ? 'Proses...' : 'Catat'}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span>💡 Scanner HID Keyboard / Barcode Gun memicu Enter otomatis.</span>
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold hover:underline self-start sm:self-auto"
                >
                  <Plus size={14} />
                  Catat Tamu / Pengunjung
                </button>
              </div>
            </form>
          </Card>

          {/* Akses Cepat Tombol Tamu */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/60">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
                <Users size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                  Kunjungan Tamu / Pihak Luar?
                </h4>
                <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                  Catat identitas, keperluan dinas, dan nomor kontak pengunjung.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsGuestModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-2 text-xs w-full sm:w-auto justify-center"
            >
              <Plus size={14} />
              Catat Tamu
            </Button>
          </div>
        </div>

        {/* ── Sidebar Riwayat Cepat ────────────────────────────────────────── */}
        <div className="space-y-4">
          <Card className="p-5 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-purple-600" />
                Akses Terbaru Hari Ini
              </h3>
              <Link
                to="/attendance/log-akses"
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                Semua
                <ExternalLink size={12} />
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {todayLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-400">
                  Belum ada rekaman akses gerbang hari ini.
                </div>
              ) : (
                todayLogs.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`p-1.5 rounded-lg shrink-0 ${
                          item.arah === 'MASUK'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {item.arah === 'MASUK' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-neutral-900 dark:text-white truncate">
                          {item.nama_snapshot || item.nama_tamu || 'Tanpa Nama'}
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 truncate">
                          <span className="font-semibold px-1 rounded-sm bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            {item.tipe_orang}
                          </span>
                          <span>•</span>
                          <span>{item.kelas_snapshot || item.instansi_tamu || item.alasan_non_sekolah || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-neutral-600 dark:text-neutral-300 font-semibold">
                        {new Date(item.waktu_akses).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase ${
                          item.arah === 'MASUK' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {item.arah}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Catat Tamu */}
      <GuestAccessModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSuccess={() => {
          loadTodayData();
        }}
      />
    </div>
  );
};
