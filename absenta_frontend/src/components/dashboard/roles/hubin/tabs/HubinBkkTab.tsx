import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const BkkPage = lazy(() =>
  import('@/pages/hubin/BkkPage').then((m) => ({ default: m.default }))
);

export const HubinBkkTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <BkkPage hideLayout={true} />
    </Suspense>
  );
});

HubinBkkTab.displayName = 'HubinBkkTab';
