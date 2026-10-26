import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const InputNilaiPklPage = lazy(() =>
  import('@/pages/hubin/InputNilaiPklPage').then((m) => ({ default: m.InputNilaiPklPage }))
);

export const HubinNilaiTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <InputNilaiPklPage hideLayout={true} />
    </Suspense>
  );
});

HubinNilaiTab.displayName = 'HubinNilaiTab';
