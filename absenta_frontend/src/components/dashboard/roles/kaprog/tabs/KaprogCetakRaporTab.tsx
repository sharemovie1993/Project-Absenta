import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const CetakRaporView = lazy(() =>
  import('@/components/rapor/cetak-rapor/CetakRaporView').then((m) => ({ default: m.CetakRaporView }))
);

export interface KaprogCetakRaporTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;
}

export const KaprogCetakRaporTab: React.FC<KaprogCetakRaporTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  tahunAjaran,
  semesterId,
}) => {
  return (
    <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
      <CetakRaporView
        hideLayout
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        tahunPelajaranId={tahunPelajaranId}
        tahunAjaran={tahunAjaran}
        semesterId={semesterId}
        defaultTab="supervisi"
      />
    </Suspense>
  );
});

KaprogCetakRaporTab.displayName = 'KaprogCetakRaporTab';
