import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const PenempatanPklPage = lazy(() =>
  import('@/pages/hubin/PenempatanPklPage').then((m) => ({ default: m.default }))
);

export const HubinPenempatanTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <PenempatanPklPage hideLayout={true} />
    </Suspense>
  );
});

HubinPenempatanTab.displayName = 'HubinPenempatanTab';
