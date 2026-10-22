import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';
import type { KelasKehadiranItem } from '../types';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const SiswaView = lazy(() =>
  import('@/components/academic/siswa/SiswaView').then((m) => ({ default: m.SiswaView }))
);

export interface KaprogSiswaTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  kelasList?: KelasKehadiranItem[];
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KaprogSiswaTab: React.FC<KaprogSiswaTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  kelasList,
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
        <SiswaView
          hideLayout
          jurusanId={jurusanId}
          jurusanNama={jurusanNama}
          tahunPelajaranId={tahunPelajaranId}
          semesterId={semesterId}
        />
      </Suspense>
    </div>
  );
});

export default KaprogSiswaTab;
