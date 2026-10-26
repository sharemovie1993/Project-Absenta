import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const CetakBerkasHubinPage = lazy(() =>
  import('@/pages/hubin/CetakBerkasHubinPage').then((m) => ({ default: m.CetakBerkasHubinPage }))
);

export const BkkRekapTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat dokumen & laporan BKK...
          </p>
        </div>
      }
    >
      <CetakBerkasHubinPage hideLayout={true} />
    </Suspense>
  );
});

BkkRekapTab.displayName = 'BkkRekapTab';
