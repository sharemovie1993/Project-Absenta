import React from 'react';
import { PrestasiView } from '@/components/kesiswaan/prestasi';
import type { WalasDashboardData } from '../types';

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
      <PrestasiView
        kelasId={kelasId}
        kelasNama={kelasNama}
        hideLayout={true}
      />
    </div>
  );
});

WalasPrestasiTab.displayName = 'WalasPrestasiTab';
