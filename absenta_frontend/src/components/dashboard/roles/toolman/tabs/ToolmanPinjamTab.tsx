import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const SarprasLoansPage = lazy(() => import('@/pages/sarpras/SarprasLoansPage'));

export const ToolmanPinjamTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat sirkulasi peminjaman alat lab...
          </p>
        </div>
      }
    >
      <SarprasLoansPage hideLayout={true} />
    </Suspense>
  );
});

ToolmanPinjamTab.displayName = 'ToolmanPinjamTab';
