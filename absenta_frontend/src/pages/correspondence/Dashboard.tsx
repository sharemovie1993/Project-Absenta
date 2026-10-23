import React, { Suspense } from 'react';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { TataUsahaDashboard } from '@/components/dashboard/roles/TataUsahaDashboard';
import { Loader } from '@/components/ui';

export default function CorrespondenceDashboard() {
  return (
    <InfraErrorBoundary>
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4">
        <Suspense
          fallback={
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader />
              <p className="text-xs font-medium">Memuat Command Center Tata Usaha...</p>
            </div>
          }
        >
          <TataUsahaDashboard />
        </Suspense>
      </div>
    </InfraErrorBoundary>
  );
}
