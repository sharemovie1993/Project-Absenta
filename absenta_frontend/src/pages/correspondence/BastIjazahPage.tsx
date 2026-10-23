import React from 'react';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { BastIjazahView } from '@/components/correspondence/bast-ijazah/BastIjazahView';

export const BastIjazahPage: React.FC = () => {
  return (
    <InfraErrorBoundary>
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Bebas Administrasi & BAST Ijazah / Sertifikat
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Verifikasi clearance 5 pos sekolah, penyerahan resmi blangko ijazah & cap 3 jari, serta buku ekspedisi brankas kelulusan.
          </p>
        </div>
        <BastIjazahView />
      </div>
    </InfraErrorBoundary>
  );
};

export default BastIjazahPage;
