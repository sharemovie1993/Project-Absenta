import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const SarprasMaintenancePage = lazy(() =>
  import('@/pages/sarpras/SarprasMaintenancePage').then((m) => ({ default: m.default }))
);

export const SarprasPerbaikanTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <SarprasMaintenancePage hideLayout={true} />
    </Suspense>
  );
});
