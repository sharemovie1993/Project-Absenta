import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const SarprasInventoryPage = lazy(() => import('@/pages/sarpras/SarprasInventoryPage'));

export const ToolmanAlatTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat inventaris alat & perkakas lab...
          </p>
        </div>
      }
    >
      <SarprasInventoryPage hideLayout={true} />
    </Suspense>
  );
});

ToolmanAlatTab.displayName = 'ToolmanAlatTab';
