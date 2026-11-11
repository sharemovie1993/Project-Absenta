import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const Assets = lazy(() =>
  import('@/pages/cooperative/Assets').then((m) => ({ default: m.default }))
);

export const KoperasiAsetTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <Assets hideLayout={true} />
    </Suspense>
  );
});

KoperasiAsetTab.displayName = 'KoperasiAsetTab';
