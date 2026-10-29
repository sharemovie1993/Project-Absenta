import React, { useMemo } from 'react';
import { Calendar, Building2, Users, CheckCircle2 } from 'lucide-react';
import { HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';
import type { KunjunganStats } from './types';

interface KunjunganStatsCardsProps {
  stats: KunjunganStats;
}

export const KunjunganStatsCards: React.FC<KunjunganStatsCardsProps> = React.memo(({ stats }) => {
  const cells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'totalKunjungan',
        title: 'Total Kunjungan',
        value: `${stats.totalKunjungan} Sesi`,
        subtext: 'Log observasi',
        icon: Calendar,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
      },
      {
        id: 'mitraDudi',
        title: 'Mitra DU/DI',
        value: `${stats.totalMitraTerkunjungi} Lokasi`,
        subtext: 'Tersupervisi',
        icon: Building2,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
      },
      {
        id: 'siswaTerkunjungi',
        title: 'Siswa Bimbingan',
        value: `${stats.totalSiswaTerkunjungi} Siswa`,
        subtext: 'Telah dipantau',
        icon: Users,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
      },
      {
        id: 'ketercapaian',
        title: 'Ketercapaian',
        value: `${stats.persentaseKunjungan}%`,
        subtext: 'Target supervisi',
        icon: CheckCircle2,
        iconColorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
      },
    ],
    [stats]
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      <HubBentoGrid cells={cells} columns={4} />
    </div>
  );
});

KunjunganStatsCards.displayName = 'KunjunganStatsCards';
