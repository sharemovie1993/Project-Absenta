import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

const JenisPelanggaranPage = lazy(() =>
  import('@/pages/kesiswaan/JenisPelanggaranPage').then((m) => ({ default: m.default }))
);

export const KesiswaanTatibTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse p-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <JenisPelanggaranPage hideLayout={true} />
    </Suspense>
  );
});
