import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';

const AnggotaKegiatanEskulPage = lazy(
  () => import('@/pages/attendance/AnggotaKegiatanEskulPage')
);

export const EkskulAnggotaTab: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex justify-center items-center">
          <Loader />
        </div>
      }
    >
      <AnggotaKegiatanEskulPage hideLayout={true} />
    </Suspense>
  );
};
