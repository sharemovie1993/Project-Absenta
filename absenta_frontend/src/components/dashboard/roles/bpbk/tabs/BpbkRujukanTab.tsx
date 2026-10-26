import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const RujukanPage = lazy(() => import('@/pages/bpbk/RujukanPage'));

export const BpbkRujukanTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat rujukan kasus...
          </p>
        </div>
      }
    >
      <RujukanPage hideLayout={true} />
    </Suspense>
  );
});

BpbkRujukanTab.displayName = 'BpbkRujukanTab';
