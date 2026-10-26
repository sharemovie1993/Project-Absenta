import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui/Loader';

const TracerStudyPage = lazy(() =>
  import('@/pages/hubin/TracerStudyPage').then((m) => ({ default: m.TracerStudyPage }))
);

export const BkkTracerTab: React.FC = React.memo(() => {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-3" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            Memuat modul tracer study alumni...
          </p>
        </div>
      }
    >
      <TracerStudyPage hideLayout={true} />
    </Suspense>
  );
});

BkkTracerTab.displayName = 'BkkTracerTab';
