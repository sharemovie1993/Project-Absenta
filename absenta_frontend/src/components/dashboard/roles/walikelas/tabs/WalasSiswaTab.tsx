import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';
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
 * Tanpa judul/keterangan ganda rombel di atasnya, langsung mengarah ke area filter & data siswa.
 */
export const WalasSiswaTab: React.FC<WalasSiswaTabProps> = React.memo(({
  kelasId,
  kelasNama,
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="w-full max-w-full min-w-0">
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
