import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';
import type { WalasDashboardData } from '../types';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const PrestasiView = lazy(() =>
  import('@/components/kesiswaan/prestasi').then((m) => ({ default: m.PrestasiView }))
);

export interface WalasPrestasiTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

export const WalasPrestasiTab: React.FC<WalasPrestasiTabProps> = React.memo(({
  kelasId,
  kelasNama,
}) => {
  return (
    <div className="w-full max-w-full">
      <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
        <PrestasiView
          kelasId={kelasId}
          kelasNama={kelasNama}
          hideLayout={true}
          hideScopeBanner={true}
        />
      </Suspense>
    </div>
  );
});

WalasPrestasiTab.displayName = 'WalasPrestasiTab';
