import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const CetakBerkasSarprasPage = lazy(() =>
  import('@/pages/sarpras/CetakBerkasSarprasPage').then((m) => ({ default: m.CetakBerkasSarprasPage }))
);

export const ToolmanRekapTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat dokumen & kartu alat...
          </p>
        </div>
      }
    >
      <CetakBerkasSarprasPage hideLayout={true} />
    </Suspense>
  );
});

ToolmanRekapTab.displayName = 'ToolmanRekapTab';
