import React from 'react';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { MutasiSiswaView } from '@/components/correspondence/mutasi/MutasiSiswaView';

export const MutasiSiswaPage: React.FC = () => {
  return (
    <InfraErrorBoundary>
      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Administrasi Mutasi Siswa & Buku Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Penerbitan surat keterangan pindah sekolah (mutasi keluar), surat diterima (mutasi masuk), dan buku kendali register mutasi akreditasi.
          </p>
        </div>
        <MutasiSiswaView />
      </div>
    </InfraErrorBoundary>
  );
};

export default MutasiSiswaPage;
