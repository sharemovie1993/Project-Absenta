import React from 'react';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { DknView } from '@/components/correspondence/dkn/DknView';

export const DknPage: React.FC = () => {
  return (
    <InfraErrorBoundary>
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Daftar Kolektif Nilai (DKN) & Arsip Kelulusan Dinas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Matriks nilai kelulusan berstandar Dinas Pendidikan, penerbitan surat pengantar KCD, dan buku arsip kelulusan permanen.
          </p>
        </div>
        <DknView />
      </div>
    </InfraErrorBoundary>
  );
};

export default DknPage;
