import React, { useMemo, useState, useCallback, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, ClipboardList, Clock, ArrowRight, CheckCircle2, ShieldCheck, Loader } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { piketApi } from '../../../../api/piket.api';
import { kurikulumApi } from '../../../../api/kurikulum.api';
import { getRekapBulananGuruMe } from '../../../../api/attendance/rekap.api';
import { TimelineItem } from './StaffKbmAbsenTab';
import { StaffWeeklyScheduleWidget } from '../../widgets/StaffWeeklyScheduleWidget';
import { BebanMengajarWidget } from '../widgets/BebanMengajarWidget';
import { PengajuanIzinGuruModal } from '../profil/PengajuanIzinGuruModal';
import { useGerbangAttendanceData } from '../../../../hooks/attendance/useGerbangAttendanceData';
import { useTenant } from '../../../../hooks/useTenant';
import { toLocalDate } from '../../../../utils/attendance/time';

// Subkomponen High-Density Beranda
import { TeacherDailyStatusStrip } from '../beranda/TeacherDailyStatusStrip';
import { TeacherOpsMicroGrid } from '../beranda/TeacherOpsMicroGrid';
import { DirectKbmFeed } from '../beranda/DirectKbmFeed';

// Lazy load GateInputModule untuk satpam
const GateInputModule = lazy(() => import('../../../../pages/attendance/ops/components/GateInputModule').then(m => ({ default: m.GateInputModule })));

interface StaffBerandaTabProps {
  guruId?: string;
  guruNama?: string;
  waliKelasNama?: string;
  waliKelasId?: string;
  isWaliKelas?: boolean;
  isPembimbingPkl?: boolean;
  isKaprog?: boolean;
  kaprogJurusan?: { id?: string; nama?: string; singkatan?: string } | null;
  hasGerbangDuty?: boolean;
  isPureGerbang?: boolean;
  isPendidik?: boolean;
  timelineItems?: TimelineItem[];
  onNavigateTab: (tabId: string) => void;
  onOpenAttendance?: (sesi: any) => void;
  onOpenJournal?: (sesi: any) => void;
}

export const StaffBerandaTab: React.FC<StaffBerandaTabProps> = React.memo(({
  guruId,
  guruNama,
  waliKelasNama,
  waliKelasId,
  isWaliKelas = false,
  isPembimbingPkl = false,
  isKaprog = false,
  kaprogJurusan,
  hasGerbangDuty = false,
  isPureGerbang = false,
  isPendidik = true,
  timelineItems = [],
  onNavigateTab,
  onOpenAttendance,
  onOpenJournal,
}) => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [showIzinModal, setShowIzinModal] = useState(false);

  // Status apakah guru merupakan pendidik pengajar aktif
  const isActualTeachingStaff = isPendidik && !isPureGerbang && !hasGerbangDuty;
  const today = toLocalDate();

  // Presensi Kehadiran Guru Bulan Ini
  const { data: rekapGuruRes, isLoading: loadingRekap } = useQuery({
    queryKey: ['attendance-rekap-guru-me-bulanan'],
    queryFn: () => getRekapBulananGuruMe().catch(() => ({ success: true, data: null })),
    staleTime: 5 * 60 * 1000,
  });

  const rekapStats = rekapGuruRes?.data?.statistik || {
    HADIR: 0,
    TERLAMBAT: 0,
    DISPEN: 0,
    IZIN: 0,
    SAKIT: 0,
    JAM_MASUK: null,
  };

  // Query Beban Mengajar Guru (KBM JP & Ekuivalensi)
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

  // Kalkulasi JP Mengajar Hari Ini
  const { totalJp, totalMinutes } = useMemo(() => {
    let jpCount = 0;
    let minutes = 0;

    timelineItems.forEach(item => {
      const slots = (item.slot_selesai && item.slot_mulai) 
        ? (item.slot_selesai - item.slot_mulai + 1) 
        : 2;
      jpCount += slots;

      if (item.jam_mulai && item.jam_selesai) {
        const [hMulai, mMulai] = item.jam_mulai.split(':').map(Number);
        const [hSelesai, mSelesai] = item.jam_selesai.split(':').map(Number);
        const duration = (hSelesai * 60 + mSelesai) - (hMulai * 60 + mMulai);
        if (duration > 0) minutes += duration;
      }
    });

    return {
      totalJp: jpCount,
      totalMinutes: minutes > 0 ? minutes : jpCount * 45
    };
  }, [timelineItems]);

  // Active & Next KBM Session
  const activeKbm = useMemo(() => {
    return timelineItems.find(i => i.isLive && !i.isFinished);
  }, [timelineItems]);

  const nextKbm = useMemo(() => {
    return timelineItems.find(i => !i.isLive && !i.isFinished);
  }, [timelineItems]);

  const isAllFinished = useMemo(() => {
    return timelineItems.length > 0 && timelineItems.every(i => i.isFinished);
  }, [timelineItems]);

  // Hutang Jurnal KBM (Sesi yang selesai tapi belum ada jurnal)
  const unfilledJournalsCount = useMemo(() => {
    return timelineItems.filter(i => i.isFinished && !i.session?.jurnal_kbm).length;
  }, [timelineItems]);

  // Fallback handler jika modal dihandle langsung oleh komponen
  const handleOpenAttendance = useCallback((item: TimelineItem) => {
    if (onOpenAttendance) {
      onOpenAttendance(item.session || { id: item.id, kelas_nama: item.kelas_nama, kegiatan: item.kegiatan });
    } else {
      navigate('/attendance/ops?tab=sesi');
    }
  }, [onOpenAttendance, navigate]);

  const handleOpenJournal = useCallback((item: TimelineItem) => {
    if (onOpenJournal) {
      onOpenJournal(item);
    } else {
      navigate('/kurikulum/jurnal');
    }
  }, [onOpenJournal, navigate]);

  return (
    <motion.div
      key="tab-ringkasan-kbm-integrated"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="space-y-3 sm:space-y-4 max-w-full"
    >
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 1. DAILY STATUS STRIP (Shopee-Style High Density 34px)             */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isActualTeachingStaff && (
        <TeacherDailyStatusStrip
          activeKbm={activeKbm}
          nextKbm={nextKbm}
          isAllFinished={isAllFinished}
          totalJp={totalJp}
          totalMinutes={totalMinutes}
          guruTapTime={(rekapStats as any)?.JAM_MASUK || null}
          isGuruHadir={Boolean(rekapStats.HADIR > 0 || (rekapStats as any)?.JAM_MASUK)}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 2. OPERATIONAL MICRO-GRID (Shopee "Pesanan Saya" 4 Kolom)           */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isActualTeachingStaff && (
        <TeacherOpsMicroGrid
          totalJp={totalJp}
          totalMinutes={totalMinutes}
          unfilledJournalsCount={unfilledJournalsCount}
          currentJp={teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0}
          targetJp={teacherBeban?.max_jp ?? 24}
          onOpenSchedule={() => {}}
          onOpenJournals={() => {}}
          onOpenBeban={() => onNavigateTab('profil')}
          onOpenRekapMapel={() => onNavigateTab('rekap_mapel')}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 3. DIRECT KBM EXECUTION FEED (Sesi Mengajar Langsung di Layar)     */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isActualTeachingStaff && (
        <DirectKbmFeed
          timelineItems={timelineItems}
          onOpenAttendance={handleOpenAttendance}
          onOpenJournal={handleOpenJournal}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 4. DESKTOP WIDE VIEW (Jadwal Mingguan & Beban Mengajar Luas)       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isActualTeachingStaff && (
        <div className="hidden md:block space-y-4 pt-2">
          <StaffWeeklyScheduleWidget
            guruId={guruId}
            guruNama={guruNama}
          />

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
        </div>
      )}

      {/* 5. TERMINAL SCANNER (Khusus Staf Satpam / Gerbang Non-Guru) */}
      {!isActualTeachingStaff && (
        <div className="space-y-4">
          <Suspense fallback={
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-3">
              <Loader className="animate-spin text-rose-600" size={36} />
            </div>
          }>
            <GateInputModule />
          </Suspense>
        </div>
      )}

      {/* Modal Pengajuan Izin Mandiri Guru */}
      {showIzinModal && (
        <PengajuanIzinGuruModal
          isOpen={showIzinModal}
          onClose={() => setShowIzinModal(false)}
        />
      )}
    </motion.div>
  );
});

StaffBerandaTab.displayName = 'StaffBerandaTab';
