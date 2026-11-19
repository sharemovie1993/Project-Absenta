import React, { Suspense, lazy } from 'react';
import { Loader } from '@/components/ui';
import type { WalasDashboardData } from '../types';

// Code-splitting heavy universal view to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const DapodikIntegrationView = lazy(() =>
  import('@/components/academic/dapodik/DapodikIntegrationView').then((m) => ({ default: m.DapodikIntegrationView }))
);

export interface WalasCekDapodikTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

/**
 * WalasCekDapodikTab - Integrasi & Komparasi Data Siswa Dapodik Khusus Scope Kelas Binaan.
 * Mengikuti Universal Role-Ready View standard (DRY) untuk menghadirkan komparasi data Dapodik
 * terisolasi untuk wali kelas dengan filter perbedaan atribut lengkap.
 */
export const WalasCekDapodikTab: React.FC<WalasCekDapodikTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const effectiveKelasNama = kelasNama || data?.kelasInfo?.nama_kelas;

  return (
    <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
      <DapodikIntegrationView
        hideLayout
        kelasNama={effectiveKelasNama}
        kelasId={kelasId}
        lockKelasScope={true}
        isWalasMode={true}
      />
    </Suspense>
  );
});

WalasCekDapodikTab.displayName = 'WalasCekDapodikTab';
