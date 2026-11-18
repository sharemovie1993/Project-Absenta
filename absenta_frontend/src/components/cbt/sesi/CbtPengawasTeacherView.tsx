import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Eye,
  CheckCircle2,
  AlertCircle,
  Play,
  Printer,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  RefreshCw,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import { CbtProctorMonitoringView, parseSessionLabel } from './CbtProctorMonitoringView';
import { CbtDaftarHadirPrintModal } from '../jadwal/CbtDaftarHadirPrintModal';
import { CbtBeritaAcaraPrintModal } from '../jadwal/CbtBeritaAcaraPrintModal';
import { CbtDenahModal } from '../jadwal/CbtDenahModal';
import { formatLocalTimeFromISO } from '@/utils/attendance/time';
import { cn } from '@/lib/utils';

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
  initialJadwalId,
  myPengawasData = [],
  isLoading = false,
  onRefresh,
}) => {
  // ── 1. VIEW MODE: 'JADWAL' (Pra-Ujian) vs 'MONITORING' (Sesi Aktif / Meja Live) ──
  const [viewMode, setViewMode] = useState<'JADWAL' | 'MONITORING'>('JADWAL');
  const [selectedJadwalId, setSelectedJadwalId] = useState<string>(initialJadwalId || '');

  // ── 2. FILTER & SEARCH ──
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'COMPLETED'>('ALL');

  // ── 3. MODAL STATE (Cetak Daftar Hadir, Berita Acara, Denah) ──
  const [selectedJadwalForDaftarHadir, setSelectedJadwalForDaftarHadir] = useState<CbtJadwalUjian | null>(null);
  const [selectedJadwalForBeritaAcara, setSelectedJadwalForBeritaAcara] = useState<CbtJadwalUjian | null>(null);
  const [selectedJadwalForDenah, setSelectedJadwalForDenah] = useState<CbtJadwalUjian | null>(null);

  // Jika initialJadwalId disediakan dan belum ada selectedJadwalId
  React.useEffect(() => {
    if (initialJadwalId && !selectedJadwalId) {
      setSelectedJadwalId(initialJadwalId);
    }
  }, [initialJadwalId, selectedJadwalId]);

  // Urutkan jadwal secara kronologis (tanggal mulai asc, lalu nomor ruang)
  const sortedSchedules = useMemo(() => {
    return [...myPengawasData].sort((a, b) => {
      const timeA = new Date(a.tanggal_mulai).getTime() || 0;
      const timeB = new Date(b.tanggal_mulai).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      const infoA = parseSessionLabel(a);
      const infoB = parseSessionLabel(b);
      return infoA.roomCode.localeCompare(infoB.roomCode);
    });
  }, [myPengawasData]);

  // Deteksi Sesi Aktif saat ini (status ACTIVE atau waktu saat ini berada di dalam rentang)
  const now = new Date();
  const activeSchedules = useMemo(() => {
    return sortedSchedules.filter((j) => {
      if (j.status === 'ACTIVE') return true;
      const start = new Date(j.tanggal_mulai);
      const end = new Date(j.tanggal_selesai);
      return start <= now && now <= end && j.status !== 'COMPLETED' && j.status !== 'ARCHIVED';
    });
  }, [sortedSchedules, now]);

  const liveActiveSession = activeSchedules[0] || null;

  // Klasifikasi KPI
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    sortedSchedules.forEach((j) => {
      const jDateStr = (j.tanggal_mulai || '').slice(0, 10);
      if (j.status === 'COMPLETED' || j.status === 'ARCHIVED') {
        completedCount++;
      } else if (jDateStr === todayStr) {
        todayCount++;
      } else if (new Date(j.tanggal_mulai) > now) {
        upcomingCount++;
      }
    });

    return {
      total: sortedSchedules.length,
      today: todayCount,
      upcoming: upcomingCount,
      completed: completedCount,
      active: activeSchedules.length,
    };
  }, [sortedSchedules, activeSchedules, now]);

  // Filter List Jadwal
  const filteredSchedules = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return sortedSchedules.filter((j) => {
      const info = parseSessionLabel(j);
      const jDateStr = (j.tanggal_mulai || '').slice(0, 10);
      const isToday = jDateStr === todayStr;
      const isCompleted = j.status === 'COMPLETED' || j.status === 'ARCHIVED';
      const isUpcoming = !isCompleted && new Date(j.tanggal_mulai) > now && !isToday;

      // Filter Tab
      if (timeFilter === 'TODAY' && !isToday) return false;
      if (timeFilter === 'UPCOMING' && !isUpcoming) return false;
      if (timeFilter === 'COMPLETED' && !isCompleted) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (j.nama_sesi || '').toLowerCase().includes(q);
        const matchRoom = info.roomCode.toLowerCase().includes(q);
        const matchMapel = info.mapel.toLowerCase().includes(q);
        const matchRombel = info.rombel.toLowerCase().includes(q);
        const matchBank = (j.BankSoal?.judul || '').toLowerCase().includes(q);
        if (!matchTitle && !matchRoom && !matchMapel && !matchRombel && !matchBank) {
          return false;
        }
      }

      return true;
    });
  }, [sortedSchedules, timeFilter, searchQuery, now]);

  // Handler Masuk Meja Pengawas Live
  const handleEnterMonitoring = (jadwalId: string) => {
    setSelectedJadwalId(jadwalId);
    setViewMode('MONITORING');
  };

  // Helper Format Tanggal & Jam
  const formatScheduleDateTime = (mulaiIso: string, selesaiIso: string) => {
    try {
      const d = new Date(mulaiIso);
      const dateText = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
      const timeStart = formatLocalTimeFromISO(mulaiIso);
      const timeEnd = formatLocalTimeFromISO(selesaiIso);
      return { dateText, timeText: `${timeStart} - ${timeEnd} WIB` };
    } catch {
      return { dateText: mulaiIso, timeText: '' };
    }
  };

  // Jika sedang membuka layar Meja Monitoring Live
  if (viewMode === 'MONITORING') {
    const activeTargetJadwal =
      sortedSchedules.find((j) => j.id === selectedJadwalId) || sortedSchedules[0];
    const targetInfo = parseSessionLabel(activeTargetJadwal);

    return (
      <div className="space-y-4 pb-20 sm:pb-8">
        {/* Navigation Bar Kembali ke Jadwal */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('JADWAL')}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0 shadow-xs"
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Jadwal Pengawasan</span>
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                  Layar Pengawas Live
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {targetInfo.roomCode} • {targetInfo.mapel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total {sortedSchedules.length} Sesi Terploting
            </span>
          </div>
        </div>

        {/* Console Meja Monitoring */}
        <CbtProctorMonitoringView
          initialJadwalId={selectedJadwalId || sortedSchedules[0]?.id}
          guruId={guruId}
          myPengawasData={myPengawasData}
          onBack={() => setViewMode('JADWAL')}
        />
      </div>
    );
  }

  // ── VIEW JADWAL PENGAWASAN (FASE PRA-UJIAN AKTIF) ──
  return (
    <div className="space-y-5 pb-20 sm:pb-8">
      {/* ── 1. HEADER & FLIGHT DECK PENGAWAS ── */}
      <div className="relative overflow-hidden p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-900/50 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <Eye size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Pusat Tugas Pengawas & Proktor CBT
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  PRA-UJIAN & JADWAL
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Pantau jadwal pengawasan ruang ujian, cetak kelengkapan administrasi presensi & berita acara, serta masuki meja monitoring live saat sesi aktif dimulai.
              </p>
            </div>
          </div>

          {/* Quick Switch to Live Meja Pengawas */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer active:scale-95"
                title="Segarkan Data"
              >
                <RefreshCw size={15} className={cn(isLoading && 'animate-spin text-emerald-400')} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const target = liveActiveSession?.id || sortedSchedules[0]?.id;
                if (target) handleEnterMonitoring(target);
              }}
              disabled={sortedSchedules.length === 0}
              className={cn(
                'px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md',
                liveActiveSession
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/30 ring-2 ring-emerald-400/50 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              )}
            >
              <Play size={14} className="fill-white" />
              <span>Buka Meja Monitoring Live</span>
              {liveActiveSession && (
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              )}
            </button>
          </div>
        </div>

        {/* KPI Mini Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Penugasan</p>
              <p className="text-base font-black text-white">{stats.total} Sesi</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Jadwal Hari Ini</p>
              <p className="text-base font-black text-amber-300">{stats.today} Sesi</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Mendatang (Pra-Ujian)</p>
              <p className="text-base font-black text-emerald-300">{stats.upcoming} Sesi</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Selesai Terlaksana</p>
              <p className="text-base font-black text-teal-300">{stats.completed} Sesi</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. LIVE ACTIVE SESSION BANNER (JIKA ADA SESI AKTIF DETIK INI) ── */}
      {liveActiveSession && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border-2 border-emerald-400/80 dark:border-emerald-600/80 shadow-md shadow-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30 relative">
              <Play size={20} className="fill-white" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                  Sesi Ujian Sedang Berlangsung Sekarang
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-600 text-white animate-pulse">
                  LIVE
                </span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                {parseSessionLabel(liveActiveSession).roomCode} • {parseSessionLabel(liveActiveSession).mapel} (
                {liveActiveSession.durasi_menit} Menit)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleEnterMonitoring(liveActiveSession.id)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <span>Masuk Meja Pengawas</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── 3. TOOLBAR FILTER & SEARCH ── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pills Filter Waktu */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setTimeFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
              timeFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Semua ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('TODAY')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
              timeFilter === 'TODAY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Hari Ini ({stats.today})
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('UPCOMING')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
              timeFilter === 'UPCOMING'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Pra-Ujian / Mendatang ({stats.upcoming})
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('COMPLETED')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
              timeFilter === 'COMPLETED'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Selesai ({stats.completed})
          </button>
        </div>

        {/* Input Search */}
        <div className="relative min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ruang, mapel, rombel..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ── 4. DAFTAR JADWAL PENGAWASAN (CARDS) ── */}
      {filteredSchedules.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
            <Calendar size={28} />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {myPengawasData.length === 0
              ? 'Belum Ada Jadwal Pengawasan CBT'
              : 'Tidak Ada Jadwal Pengawasan yang Cocok'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md">
            {myPengawasData.length === 0
              ? 'Anda saat ini belum diplotkan sebagai pengawas ruang atau proktor ujian CBT aktif. Jadwal akan tampil otomatis setelah panitia ujian menerbitkan ploting jadwal.'
              : 'Silakan ubah filter waktu atau kata kunci pencarian untuk melihat jadwal pengawasan lainnya.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSchedules.map((item, idx) => {
            const info = parseSessionLabel(item);
            const { dateText, timeText } = formatScheduleDateTime(item.tanggal_mulai, item.tanggal_selesai);
            const cfg = item.setting_keamanan || {};
            const isLive = item.status === 'ACTIVE';
            const isCompleted = item.status === 'COMPLETED' || item.status === 'ARCHIVED';

            // Deteksi peran guru ini di jadwal ini
            let myRoleLabel = 'Pengawas Ruang';
            if (cfg.proktor_id === guruId) {
              myRoleLabel = 'Proktor CBT';
            } else if (cfg.pengawas_1_id === guruId) {
              myRoleLabel = 'Pengawas 1';
            } else if (cfg.pengawas_2_id === guruId) {
              myRoleLabel = 'Pengawas 2';
            }

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md',
                  isLive
                    ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                    : 'border-slate-200/90 dark:border-slate-800'
                )}
              >
                {/* Header Card: Tanggal, Waktu, Ruang, Status */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs',
                        isLive
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20 animate-pulse'
                          : isCompleted
                          ? 'bg-teal-600 text-white'
                          : 'bg-indigo-600 text-white shadow-indigo-600/20'
                      )}
                    >
                      {info.roomCode}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {dateText}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Clock size={12} className="text-indigo-500" />
                          <span>{timeText || `${item.durasi_menit} Menit`}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {cfg.nama_sesi_waktu || item.nama_sesi}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge & Role Badge */}
                  <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                      PERAN: {myRoleLabel}
                    </span>

                    {isLive ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white flex items-center gap-1.5 animate-pulse shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>SEDANG BERLANGSUNG</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>SELESAI</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        PRA-UJIAN (SIAP)
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Card: Mata Pelajaran, Rombel, Tim Pengawas */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Kolom 1: Mapel & Bank Soal */}
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Mata Pelajaran</p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">
                      {info.mapel}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {item.BankSoal?.judul || 'Naskah Ujian Standar'}
                    </p>
                    {item.BankSoal?.jumlah_soal && (
                      <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {item.BankSoal.jumlah_soal} Butir Soal • {item.durasi_menit} Menit
                      </span>
                    )}
                  </div>

                  {/* Kolom 2: Rombel Peserta & Ruang */}
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Rombel & Peserta</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {info.rombel ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
                          {info.rombel}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Seluruh Peserta Ruang</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                      <Users size={12} className="text-slate-400" />
                      <span>{item._count?.Peserta ?? 0} Peserta Terdaftar</span>
                    </p>
                  </div>

                  {/* Kolom 3: Tim Pengawas di Ruang Ini */}
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tim Pengawas Ruang</p>
                    <div className="mt-1 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400 text-[11px]">Pengawas 1:</span>
                        <span className="font-bold truncate max-w-[150px]">
                          {cfg.pengawas_1_nama || '-'}
                        </span>
                      </div>
                      {cfg.pengawas_2_nama && (
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                          <span className="text-slate-400 text-[11px]">Pengawas 2:</span>
                          <span className="font-bold truncate max-w-[150px]">
                            {cfg.pengawas_2_nama}
                          </span>
                        </div>
                      )}
                      {cfg.proktor_nama && (
                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                          <span className="text-slate-400 text-[11px]">Proktor:</span>
                          <span className="font-bold truncate max-w-[150px]">
                            {cfg.proktor_nama}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons: Pra-Ujian & Live */}
                <div className="px-4 py-3 sm:px-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                  {/* Tombol Cetak Dokumen Pra-Ujian */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedJadwalForDaftarHadir(item)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <Printer size={13} className="text-indigo-500" />
                      <span>Daftar Hadir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedJadwalForBeritaAcara(item)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <FileText size={13} className="text-emerald-500" />
                      <span>Berita Acara</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedJadwalForDenah(item)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <MapPin size={13} className="text-amber-500" />
                      <span>Denah Ruang</span>
                    </button>
                  </div>

                  {/* Tombol Masuk Meja Pengawas Live */}
                  <button
                    type="button"
                    onClick={() => handleEnterMonitoring(item.id)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs',
                      isLive
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                    )}
                  >
                    <span>Masuk Meja Pengawas</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. MODAL PRINT DOKUMEN PRA-UJIAN ── */}
      {selectedJadwalForDaftarHadir && (
        <CbtDaftarHadirPrintModal
          isOpen={Boolean(selectedJadwalForDaftarHadir)}
          onClose={() => setSelectedJadwalForDaftarHadir(null)}
          jadwal={selectedJadwalForDaftarHadir}
          eventName={selectedJadwalForDaftarHadir.nama_sesi}
        />
      )}

      {selectedJadwalForBeritaAcara && (
        <CbtBeritaAcaraPrintModal
          isOpen={Boolean(selectedJadwalForBeritaAcara)}
          onClose={() => setSelectedJadwalForBeritaAcara(null)}
          jadwal={selectedJadwalForBeritaAcara}
          eventName={selectedJadwalForBeritaAcara.nama_sesi}
        />
      )}

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
