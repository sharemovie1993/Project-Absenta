import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const SarprasMaintenancePage = lazy(() => import('@/pages/sarpras/SarprasMaintenancePage'));

export const ToolmanServisTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat modul servis & pemeliharaan alat...
          </p>
        </div>
      }
    >
      <SarprasMaintenancePage hideLayout={true} />
    </Suspense>
  );
});

ToolmanServisTab.displayName = 'ToolmanServisTab';
