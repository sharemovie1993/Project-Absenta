import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const BkkPage = lazy(() => import('@/pages/hubin/BkkPage').then(m => ({ default: m.BkkPage })));

export const BkkPelamarTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat data pelamar kerja alumni...
          </p>
        </div>
      }
    >
      <BkkPage hideLayout={true} initialSubTab="pelamar" />
    </Suspense>
  );
});

BkkPelamarTab.displayName = 'BkkPelamarTab';
