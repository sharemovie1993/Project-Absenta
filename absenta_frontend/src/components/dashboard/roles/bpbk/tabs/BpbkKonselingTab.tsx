import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const KonselingPage = lazy(() => import('@/pages/bpbk/KonselingPage'));

export const BpbkKonselingTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat layanan konseling...
          </p>
        </div>
      }
    >
      <KonselingPage hideLayout={true} />
    </Suspense>
  );
});

BpbkKonselingTab.displayName = 'BpbkKonselingTab';
