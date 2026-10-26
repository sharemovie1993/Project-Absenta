import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';

const NilaiEskulPage = lazy(() => import('@/pages/rapor/NilaiEskulPage'));

export const EkskulNilaiTab: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center items-center">
          <Loader />
        </div>
      }
    >
      <NilaiEskulPage hideLayout={true} />
    </Suspense>
  );
};
