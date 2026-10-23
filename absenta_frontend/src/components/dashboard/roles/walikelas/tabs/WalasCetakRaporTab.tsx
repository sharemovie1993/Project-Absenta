import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const CetakRaporView = lazy(() =>
  import('@/components/rapor/cetak-rapor/CetakRaporView').then((m) => ({ default: m.CetakRaporView }))
);

export interface WalasCetakRaporTabProps {
  kelasId?: string;
  kelasNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const WalasCetakRaporTab: React.FC<WalasCetakRaporTabProps> = React.memo(({
  kelasId,
  kelasNama,
  tahunPelajaranId,
  semesterId,
}) => {
  return (
    <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
      <CetakRaporView
        hideLayout
        kelasId={kelasId}
        kelasNama={kelasNama}
        tahunPelajaranId={tahunPelajaranId}
        semesterId={semesterId}
        defaultTab="wali_kelas"
      />
    </Suspense>
  );
});

WalasCetakRaporTab.displayName = 'WalasCetakRaporTab';
