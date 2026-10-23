import React from 'react';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SuratKeteranganView } from '@/components/correspondence/surat-keterangan/SuratKeteranganView';

export const SuratKeteranganPage: React.FC = () => {
  return (
    <InfraErrorBoundary>
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        <SuratKeteranganView />
      </div>
    </InfraErrorBoundary>
  );
};

export default SuratKeteranganPage;
