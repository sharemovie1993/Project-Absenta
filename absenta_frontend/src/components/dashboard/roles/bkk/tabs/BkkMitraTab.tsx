import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const MitraIndustriPage = lazy(() =>
  import('@/pages/hubin/MitraIndustriPage').then((m) => ({ default: m.MitraIndustriPage }))
);

export const BkkMitraTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat mitra DU/DI rekrutmen...
          </p>
        </div>
      }
    >
      <MitraIndustriPage hideLayout={true} />
    </Suspense>
  );
});

BkkMitraTab.displayName = 'BkkMitraTab';
