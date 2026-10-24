import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';
import { HubStatusStrip } from '@/components/ui/hub';
import type { WalasDashboardData } from '../types';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const SiswaView = lazy(() =>
  import('@/components/academic/siswa/SiswaView').then((m) => ({ default: m.SiswaView }))
);

export interface WalasSiswaTabProps {
  kelasId?: string;
  kelasNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  data?: WalasDashboardData;
}

/**
 * WalasSiswaTab - Mode Fokus Penuh ke Data Siswa Rombel
 * Menampilkan Mini Analytic Card 1-baris langsung di bawah navigasi, diikuti filter & direktori data siswa.
 */
export const WalasSiswaTab: React.FC<WalasSiswaTabProps> = React.memo(({
  kelasId,
  kelasNama,
  tahunPelajaranId,
  semesterId,
  data,
}) => {
  const kelasInfo = data?.kelasInfo;

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {/* Mini Analytic Card 1 Baris (Shopee-Grade Hairline Divider) */}
      <HubStatusStrip
        items={[
          {
            id: 'total',
            title: `${kelasInfo?.totalSiswa || 0} Siswa`,
            subtitle: 'Terdaftar',
          },
          {
            id: 'laki',
            title: `${kelasInfo?.totalLaki || 0} L`,
            subtitle: 'Laki-laki',
            className: 'text-indigo-600 dark:text-indigo-400',
          },
          {
            id: 'perempuan',
            title: `${kelasInfo?.totalPerempuan || 0} P`,
            subtitle: 'Perempuan',
            className: 'text-pink-600 dark:text-pink-400',
          },
          {
            id: 'status',
            title: '100% Aktif',
            subtitle: 'Status Rombel',
            className: 'text-emerald-600 dark:text-emerald-400',
          },
        ]}
      />

      <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
        <SiswaView
          hideLayout
          hideHeaderStats
          hideScopeBanner
          kelasId={kelasId}
          kelasNama={kelasNama}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
        />
      </Suspense>
    </div>
  );
});

WalasSiswaTab.displayName = 'WalasSiswaTab';
