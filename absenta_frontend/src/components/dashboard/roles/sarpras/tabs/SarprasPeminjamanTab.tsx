import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const SarprasLoansPage = lazy(() =>
  import('@/pages/sarpras/SarprasLoansPage').then((m) => ({ default: m.default }))
);

export const SarprasPeminjamanTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <SarprasLoansPage hideLayout={true} />
    </Suspense>
  );
});
