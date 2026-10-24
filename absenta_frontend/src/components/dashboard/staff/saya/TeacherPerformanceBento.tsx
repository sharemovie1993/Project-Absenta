import React, { useMemo } from 'react';
import { Target, Clock, Award, CheckCircle2 } from 'lucide-react';
import { HubCard, HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';

interface TeacherPerformanceBentoProps {
  kehadiranPersen?: number;
  totalHadir?: number;
  totalIzin?: number;
  totalTerlambatMenit?: number;
  avgTapTime?: string;
  currentJp?: number;
  targetJp?: number;
  jurnalPersen?: number;
  onOpenKehadiranDetail?: () => void;
  onOpenBebanDetail?: () => void;
  className?: string;
}

export const TeacherPerformanceBento: React.FC<TeacherPerformanceBentoProps> = React.memo(({
  kehadiranPersen = 100,
  totalHadir = 22,
  totalIzin = 0,
  totalTerlambatMenit = 0,
  avgTapTime = '06:48 WIB',
  currentJp = 24,
  targetJp = 24,
  jurnalPersen = 100,
  onOpenKehadiranDetail,
  onOpenBebanDetail,
  className,
}) => {
  const cells: HubBentoCell[] = useMemo(() => [
    {
      id: 'perf-kehadiran',
      title: 'Kehadiran',
      value: `${kehadiranPersen}%`,
      subtext: `${totalHadir} Hadir • ${totalIzin} Izin`,
      icon: Target,
      iconColorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
      showChevron: true,
      onClick: onOpenKehadiranDetail,
    },
    {
      id: 'perf-disiplin',
      title: 'Disiplin Waktu',
      value: `${totalTerlambatMenit} Menit`,
      subtext: `Rata-rata Tap ${avgTapTime}`,
      icon: Clock,
      iconColorClass: totalTerlambatMenit === 0 ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/50' : 'text-amber-500 bg-amber-50 dark:bg-amber-950/50',
    },
    {
      id: 'perf-beban',
      title: 'Beban Mengajar',
      value: (
        <span>
          {currentJp}
          <span className="text-xs font-normal text-slate-400">/{targetJp} JP</span>
        </span>
      ),
      subtext: currentJp >= targetJp ? 'Memenuhi Syarat Sertifikasi' : 'Kurang Jam Mengajar',
      icon: Award,
      iconColorClass: currentJp >= targetJp ? 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' : 'text-amber-500 bg-amber-50 dark:bg-amber-950/50',
      showChevron: true,
      onClick: onOpenBebanDetail,
    },
    {
      id: 'perf-jurnal',
      title: 'Jurnal Ajar',
      value: `${jurnalPersen}%`,
      subtext: jurnalPersen === 100 ? 'Dokumentasi Lengkap' : 'Ada Sesi Belum Diisi',
      icon: CheckCircle2,
      iconColorClass: jurnalPersen === 100 ? 'text-teal-500 bg-teal-50 dark:bg-teal-950/50' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/50',
    },
  ], [kehadiranPersen, totalHadir, totalIzin, totalTerlambatMenit, avgTapTime, currentJp, targetJp, jurnalPersen, onOpenKehadiranDetail, onOpenBebanDetail]);

  return (
    <HubCard
      title="Performa & Kehadiran Saya"
      subtitle="(Bulan Ini)"
      actionLabel="Detail"
      onAction={onOpenKehadiranDetail}
      className={className}
      noPadding
    >
      <HubBentoGrid cells={cells} columns={2} />
    </HubCard>
  );
});

TeacherPerformanceBento.displayName = 'TeacherPerformanceBento';
