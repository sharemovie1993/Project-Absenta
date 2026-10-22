import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const UkkView = lazy(() =>
  import('@/components/academic/ukk/UkkView').then((m) => ({ default: m.UkkView }))
);

interface KaprogUkkTabProps {
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  tahunAjaran?: string;
  semesterId?: string;
}

export const KaprogUkkTab: React.FC<KaprogUkkTabProps> = React.memo(({
  jurusanId,
  jurusanNama = 'Kejuruan',
  tahunPelajaranId,
  tahunAjaran,
  semesterId,
}) => {
  return (
    <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
      <UkkView
        hideLayout
        jurusanId={jurusanId}
        jurusanNama={jurusanNama}
        tahunPelajaranId={tahunPelajaranId}
        tahunAjaran={tahunAjaran}
        semesterId={semesterId}
      />
    </Suspense>
  );
});

KaprogUkkTab.displayName = 'KaprogUkkTab';
