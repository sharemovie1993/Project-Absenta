import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, ClipboardList, Clock, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../ui';
import { kesiswaanApi } from '../../../../api/kesiswaan.api';
import { piketApi } from '../../../../api/piket.api';
import { TimelineItem } from './StaffKbmAbsenTab';
import { StaffWeeklyScheduleWidget } from '../../widgets/StaffWeeklyScheduleWidget';

interface StaffBerandaTabProps {
  guruId?: string;
  guruNama?: string;
  waliKelasNama?: string;
  waliKelasId?: string;
  isWaliKelas?: boolean;
  timelineItems?: TimelineItem[];
  onNavigateTab: (tabId: string) => void;
}

export const StaffBerandaTab: React.FC<StaffBerandaTabProps> = ({
  guruId,
  guruNama,
  waliKelasNama,
  waliKelasId,
  isWaliKelas = false,
  timelineItems = [],
  onNavigateTab,
}) => {
  // Query Rekap Kehadiran Siswa Rombel Walas (jika Wali Kelas)
  const { data: classPresenceRes, isLoading: loadingPresence } = useQuery({
    queryKey: ['attendance-today-me-class-beranda', waliKelasId],
    queryFn: () => kesiswaanApi.getRekapHarianSiswa({ kelas_id: waliKelasId! }).catch(() => ({ success: true, data: [] })),
    enabled: !!isWaliKelas && !!waliKelasId,
    staleTime: 60000,
  });

  const presenceList = (classPresenceRes?.data as any[]) || [];

  // Query Surat Izin Menunggu Validasi (Piket / Walas)
  const { data: permitsRes } = useQuery({
    queryKey: ['dashboard-daily-permits-beranda'],
    queryFn: () => piketApi.getDailyPermits().catch(() => ({ success: true, data: [] })),
    staleTime: 60000,
  });

  const permitsList = (permitsRes?.data as any[]) || [];
  const pendingPermitsCount = permitsList.filter((p: any) => p.status === 'PENDING' || p.status === 'MENUNGGU_VALIDASI').length;

  // 1. Kalkulasi Jam Mengajar Hari Ini
  const totalJp = timelineItems.length;
  const totalMinutes = useMemo(() => {
    let minutes = 0;
    timelineItems.forEach((item) => {
      if (item.jam_mulai && item.jam_selesai) {
        const [h1, m1] = item.jam_mulai.split(':').map(Number);
        const [h2, m2] = item.jam_selesai.split(':').map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (diff > 0) minutes += diff;
        }
      }
    });
    return minutes > 0 ? minutes : totalJp * 45;
  }, [timelineItems, totalJp]);

  // Active / Next KBM Session — use server-provided is_overdue flag
  const activeKbm = useMemo(() => {
    // Only show as active if: genuinely LIVE session OR session berlangsung and NOT overdue
    return timelineItems.find(i => i.isLive && !i.is_overdue);
  }, [timelineItems]);

  const nextKbm = useMemo(() => {
    return timelineItems.find(i => !i.isFinished && !i.is_overdue && (!i.session || i.session.status !== 'SELESAI'));
  }, [timelineItems]);

  // 2. Kalkulasi Rombel Walas Stats
  const walasStats = useMemo(() => {
    if (!isWaliKelas || presenceList.length === 0) {
      return { total: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0 };
    }
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    presenceList.forEach((p: any) => {
      const st = String(p.status || '').toUpperCase();
      if (st === 'HADIR' || st === 'TERLAMBAT') hadir++;
      else if (st === 'SAKIT') sakit++;
      else if (st === 'IZIN' || st === 'DISPEN') izin++;
      else if (st === 'ALPA') alpa++;
    });

    return {
      total: presenceList.length,
      hadir,
      sakit,
      izin,
      alpa,
    };
  }, [isWaliKelas, presenceList]);

  return (
    <motion.div
      key="tab-ringkasan-real"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* 3 SUMMARY STAT CARDS (REAL DATA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Stat 1: Jam Mengajar Hari Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Jam Mengajar Hari Ini
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {totalJp} JP <span className="text-xs font-bold text-slate-400">({totalMinutes} Menit)</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {activeKbm ? `Aktif: ${activeKbm.kelas_nama}` : nextKbm ? `Berikutnya: ${nextKbm.jam_mulai} WIB` : 'Semua KBM Selesai'}
            </p>
          </div>
        </div>

        {/* Stat 2: Rombel Binaan Walas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Rombel Binaan Walas
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {waliKelasNama || (isWaliKelas ? 'Kelas Binaan' : 'Bukan Walas')} 
              {walasStats.total > 0 && <span className="text-xs font-bold text-slate-400"> ({walasStats.total} Siswa)</span>}
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
              {isWaliKelas 
                ? (loadingPresence ? 'Memuat presensi...' : `${walasStats.hadir} Hadir, ${walasStats.sakit} Sakit, ${walasStats.alpa} Alpa`)
                : 'Bukan Guru Wali Kelas'}
            </p>
          </div>
        </div>

        {/* Stat 3: Surat Izin Menunggu */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ClipboardList size={22} />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Surat Izin Menunggu
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {pendingPermitsCount} Pengajuan
            </div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {pendingPermitsCount > 0 ? 'Butuh Validasi Wali Kelas / Piket' : 'Tidak Ada Antrean Validasi'}
            </p>
          </div>
        </div>
      </div>

      {/* DYNAMIC KBM SESSION CARD (REAL DATA BANNER) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {activeKbm ? (
          <>
            <div className="space-y-1.5 min-w-0">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 uppercase tracking-wider animate-pulse flex items-center gap-1.5 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                KBM Berlangsung Live
              </span>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                {activeKbm.kelas_nama} — {activeKbm.kegiatan}
              </h3>
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>{activeKbm.jamLabel ? `${activeKbm.jamLabel} • ` : ''}{activeKbm.jam_mulai} - {activeKbm.jam_selesai} WIB</span>
              </p>
            </div>

            <Button
              onClick={() => onNavigateTab('jadwal')}
              className="w-full sm:w-auto h-11 px-6 rounded-2xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white border-none shrink-0 cursor-pointer shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>Buka Input Presensi KBM</span>
              <ArrowRight size={15} />
            </Button>
          </>
        ) : nextKbm ? (
          <>
            <div className="space-y-1.5 min-w-0">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/40 uppercase tracking-wider w-fit">
                KBM Berikutnya Hari Ini
              </span>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                {nextKbm.kelas_nama} — {nextKbm.kegiatan}
              </h3>
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Clock size={13} />
                <span>{nextKbm.jamLabel ? `${nextKbm.jamLabel} • ` : ''}Jadwal Pukul {nextKbm.jam_mulai} - {nextKbm.jam_selesai} WIB</span>
              </p>
            </div>

            <Button
              onClick={() => onNavigateTab('jadwal')}
              className="w-full sm:w-auto h-11 px-6 rounded-2xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-white border-none shrink-0 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <span>Lihat Sesi KBM</span>
              <ArrowRight size={15} />
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5 min-w-0">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider w-fit flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Semua Sesi KBM Selesai</span>
              </span>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                Seluruh Kegiatan KBM Hari Ini Telah Tuntas
              </h3>
              <p className="text-xs font-medium text-slate-400">
                Terima kasih atas dedikasi dan pengabdian Anda mengajar hari ini.
              </p>
            </div>

            <Button
              onClick={() => onNavigateTab('profil')}
              className="w-full sm:w-auto h-11 px-6 rounded-2xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-white border-none shrink-0 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <span>Buka Profil Guru</span>
              <ArrowRight size={15} />
            </Button>
          </>
        )}
      </div>

      {/* ── JADWAL GURU 1 MINGGU (DUAL VIEW: AGENDA & MATRIX GRID) ─────────── */}
      <StaffWeeklyScheduleWidget
        onNavigateToKbm={() => onNavigateTab('jadwal')}
      />
    </motion.div>
  );
};
