import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const MitraIndustriPage = lazy(() =>
  import('@/pages/hubin/MitraIndustriPage').then((m) => ({ default: m.default }))
);

export const HubinMitraTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <MitraIndustriPage hideLayout={true} />
    </Suspense>
  );
});

HubinMitraTab.displayName = 'HubinMitraTab';
