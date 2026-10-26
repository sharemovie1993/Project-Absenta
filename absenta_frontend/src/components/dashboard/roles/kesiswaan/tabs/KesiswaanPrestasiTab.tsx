import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const PrestasiView = lazy(() =>
  import('@/components/kesiswaan/prestasi').then((m) => ({ default: m.PrestasiView }))
);

export const KesiswaanPrestasiTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <PrestasiView hideLayout={true} />
    </Suspense>
  );
});
