import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const PemanggilanPage = lazy(() => import('@/pages/bpbk/PemanggilanPage'));

export const BpbkPemanggilanTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat pemanggilan orang tua...
          </p>
        </div>
      }
    >
      <PemanggilanPage hideLayout={true} />
    </Suspense>
  );
});

BpbkPemanggilanTab.displayName = 'BpbkPemanggilanTab';
