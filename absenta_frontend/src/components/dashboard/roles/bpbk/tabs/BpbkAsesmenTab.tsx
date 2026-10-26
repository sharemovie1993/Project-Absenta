import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const AsesmenPage = lazy(() => import('@/pages/bpbk/AsesmenPage'));

export const BpbkAsesmenTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat asesmen & angket BK...
          </p>
        </div>
      }
    >
      <AsesmenPage hideLayout={true} />
    </Suspense>
  );
});

BpbkAsesmenTab.displayName = 'BpbkAsesmenTab';
