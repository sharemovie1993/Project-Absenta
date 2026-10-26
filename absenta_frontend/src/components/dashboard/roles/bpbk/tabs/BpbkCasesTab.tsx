import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const CasesPage = lazy(() => import('@/pages/bpbk/CasesPage'));

export const BpbkCasesTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat modul kasus BK...
          </p>
        </div>
      }
    >
      <CasesPage hideLayout={true} />
    </Suspense>
  );
});

BpbkCasesTab.displayName = 'BpbkCasesTab';
