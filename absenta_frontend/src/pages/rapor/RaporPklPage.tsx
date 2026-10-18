import React from 'react';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { InputNilaiPklPage } from '../hubin/InputNilaiPklPage';

/**
 * 🎓 Halaman Proxy Nilai PKL Modul Rapor
 * Berfungsi sebagai facade view ke penilaian PKL Hubin untuk guru, wali kelas, dan kurikulum
 * tanpa menduplikasi logika bisnis penilaian PKL (100% DRY Architecture).
 */
export const RaporPklPage: React.FC = React.memo(() => {
  return (
    <InfraErrorBoundary>
      <InputNilaiPklPage layoutMode="rapor" />
    </InfraErrorBoundary>
  );
});

export default RaporPklPage;
