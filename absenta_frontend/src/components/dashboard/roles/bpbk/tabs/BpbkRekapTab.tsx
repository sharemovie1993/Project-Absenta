import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const CetakBerkasBkPage = lazy(() =>
  import('@/pages/bpbk/CetakBerkasBkPage').then((m) => ({ default: m.CetakBerkasBkPage }))
);

export const BpbkRekapTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat modul cetak berkas BK...
          </p>
        </div>
      }
    >
      <CetakBerkasBkPage hideLayout={true} />
    </Suspense>
  );
});

BpbkRekapTab.displayName = 'BpbkRekapTab';
