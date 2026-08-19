import React, { useMemo, useState, useCallback, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, ClipboardList, Clock, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Scan, Zap, ShieldCheck, Loader } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '../../../ui';
import { kesiswaanApi } from '../../../../api/kesiswaan.api';
import { piketApi, piketQueryKeys, type IzinKeluarSiswa } from '../../../../api/piket.api';
import { kurikulumApi } from '../../../../api/kurikulum.api';
import { getRekapBulananGuruMe } from '../../../../api/attendance/rekap.api';
import { TimelineItem } from './StaffKbmAbsenTab';
import { StaffWeeklyScheduleWidget } from '../../widgets/StaffWeeklyScheduleWidget';
import { BebanMengajarWidget } from '../widgets/BebanMengajarWidget';
import { PengajuanIzinGuruModal } from '../profil/PengajuanIzinGuruModal';
import { useGerbangAttendanceData } from '../../../../hooks/attendance/useGerbangAttendanceData';
import { useTenant } from '../../../../hooks/useTenant';
import { toLocalDate } from '../../../../utils/attendance/time';

// Lazy load GateInputModule
const GateInputModule = lazy(() => import('../../../../pages/attendance/ops/components/GateInputModule').then(m => ({ default: m.GateInputModule })));

interface StaffBerandaTabProps {
  guruId?: string;
  guruNama?: string;
  waliKelasNama?: string;
  waliKelasId?: string;
  isWaliKelas?: boolean;
  hasGerbangDuty?: boolean;
  isPureGerbang?: boolean;
  isPendidik?: boolean;
  timelineItems?: TimelineItem[];
  onNavigateTab: (tabId: string) => void;
}

export const StaffBerandaTab: React.FC<StaffBerandaTabProps> = ({
  guruId,
  guruNama,
  waliKelasNama,
  waliKelasId,
  isWaliKelas = false,
  hasGerbangDuty = false,
  isPureGerbang = false,
  isPendidik = true,
  timelineItems = [],
  onNavigateTab,
}) => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [showIzinModal, setShowIzinModal] = React.useState(false);

  // Status apakah guru merupakan pendidik pengajar aktif
  const isActualTeachingStaff = isPendidik && !isPureGerbang && !hasGerbangDuty;

  const today = toLocalDate();
  const { miniStats, refreshStats, fetchNotPresent } = useGerbangAttendanceData({
    tenantId,
    tanggal: today,
    enabled: !isActualTeachingStaff
  });

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

  // Query Beban Mengajar Guru (KBM JP & Ekuivalensi Tugas Tambahan)
  const { data: bebanGuruRes, isLoading: loadingBeban } = useQuery({
    queryKey: ['kurikulum-beban-guru-all'],
    queryFn: () => kurikulumApi.getBebanMengajar().catch(() => ({ success: true, data: [] })),
    enabled: isActualTeachingStaff,
    staleTime: 5 * 60 * 1000,
  });

  const teacherBeban = useMemo(() => {
    const list = Array.isArray(bebanGuruRes?.data)
      ? bebanGuruRes.data
      : Array.isArray(bebanGuruRes)
      ? bebanGuruRes
      : [];
    if (!list.length) return null;
    return list.find((b: any) =>
      (guruId && b.id === guruId) ||
      (guruNama && b.nama_guru?.toLowerCase().trim() === guruNama.toLowerCase().trim())
    );
  }, [bebanGuruRes, guruId, guruNama]);

  // Query Rekap Kehadiran Guru Bulan Berjalan (Hadir, Terlambat, Dinas Luar, Izin)
  const { data: rekapGuruRes, isLoading: loadingRekap } = useQuery({
    queryKey: ['attendance-rekap-guru-me-bulanan'],
    queryFn: () => getRekapBulananGuruMe().catch(() => ({ success: true, data: null })),
    staleTime: 5 * 60 * 1000,
  });

  const rekapStats = rekapGuruRes?.data?.statistik || {
    HADIR: 0,
    TERLAMBAT: 0,
    IZIN: 0,
    SAKIT: 0,
    ALPA: 0,
    DISPEN: 0,
  };

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
      {/* 2 SUMMARY STAT CARDS (1 BARIS 2 KOLOM) - KHUSUS GURU PENGAJAR */}
      {isActualTeachingStaff && (
        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {/* Stat 1 for Teachers: Sesi Mengajar Hari Ini */}
          <div 
            onClick={() => onNavigateTab('jadwal')}
            className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 cursor-pointer hover:border-blue-500/40 transition-all group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen size={20} className="sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                Sesi Hari Ini
              </span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {totalJp} Sesi <span className="text-[10px] sm:text-xs font-bold text-slate-400">({totalMinutes} Mnt)</span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {activeKbm ? `Live: ${activeKbm.kelas_nama}` : nextKbm ? `${nextKbm.jam_mulai} WIB` : 'Semua Selesai'}
              </p>
            </div>
          </div>

          {/* Stat 2: Ajuan Izin Menunggu */}
          <div 
            onClick={() => onNavigateTab(isWaliKelas ? 'binaan' : 'kelola')}
            className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 cursor-pointer hover:border-amber-500/40 transition-all group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ClipboardList size={20} className="sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                Ajuan Izin
              </span>
              <div className="text-base sm:text-2xl font-black text-amber-600 dark:text-amber-400 leading-tight">
                {pendingPermitsCount} Pengajuan
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {pendingPermitsCount > 0 ? 'Menunggu Validasi' : 'Tidak Ada Antrean'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC KBM SESSION CARD (REAL DATA BANNER) - STRICTLY ONLY FOR TEACHERS WITH PENDIDIK PTK */}
      {isActualTeachingStaff && (
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
      )}

      {/* ── MATRIKS JADWAL GURU 1 MINGGU (STRICTLY ONLY FOR TEACHERS WITH PENDIDIK PTK) ──────────── */}
      {isActualTeachingStaff && (
        <StaffWeeklyScheduleWidget
          guruId={guruId}
          guruNama={guruNama}
        />
      )}

      {/* BEBAN JAM MENGAJAR & REKAP BULANAN GURU WIDGET (STRICTLY ONLY FOR TEACHERS WITH PENDIDIK PTK) */}
      {isActualTeachingStaff && (
        <BebanMengajarWidget
          currentJp={teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0}
          kbmJp={teacherBeban?.current_jp ?? 0}
          ekuivalenJp={teacherBeban?.ekuivalen_position_jp ?? 0}
          targetJp={teacherBeban?.max_jp ?? 24}
          teacherName={guruNama}
          positions={teacherBeban?.positions || []}
          hadirBulanIni={rekapStats.HADIR || 0}
          terlambatBulanIni={rekapStats.TERLAMBAT || 0}
          dinasLuarBulanIni={rekapStats.DISPEN || 0}
          izinBulanIni={(rekapStats.IZIN || 0) + (rekapStats.SAKIT || 0)}
          isLoading={loadingBeban || loadingRekap}
          onOpenAjukanIzin={() => setShowIzinModal(true)}
        />
      )}

      {/* ⚡ TERMINAL SCANNER PRESENSI GERBANG MASUK/PULANG (LANGSUNG DI BERANDA PETUGAS) */}
      {!isActualTeachingStaff && (
        <div className="space-y-4">
          <Suspense fallback={
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-3">
              <Loader className="animate-spin text-rose-600" size={36} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Menyiapkan Scanner Presensi Gerbang...</p>
            </div>
          }>
            <GateInputModule
              miniStats={miniStats}
              refreshStats={async () => {
                await refreshStats();
                await fetchNotPresent();
              }}
            />
          </Suspense>
        </div>
      )}

      {/* REKAP KEHADIRAN PRIBADI PETUGAS / TENDIK (KHUSUS NON-PENDIDIK & PETUGAS GERBANG) */}
      {!isActualTeachingStaff && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Rekap Kehadiran Presensi Petugas Bulan Ini
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pencatatan kehadiran dinas dan ketepatan waktu bertugas
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowIzinModal(true)}
              className="h-8.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border-none transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Ajukan Izin / Dinas</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Hadir</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{rekapStats.HADIR || 0}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Terlambat</span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-300">{rekapStats.TERLAMBAT || 0}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Dinas Luar</span>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300">{rekapStats.DISPEN || 0}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Izin / Sakit</span>
              <span className="text-xl font-black text-purple-700 dark:text-purple-300">{(rekapStats.IZIN || 0) + (rekapStats.SAKIT || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGAJUAN IZIN / DINAS */}
      <PengajuanIzinGuruModal
        isOpen={showIzinModal}
        onClose={() => setShowIzinModal(false)}
        teacherName={guruNama}
      />
    </motion.div>
  );
};
