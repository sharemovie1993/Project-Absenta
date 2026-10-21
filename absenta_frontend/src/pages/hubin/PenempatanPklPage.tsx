import React, { useMemo } from 'react';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { PenempatanPklView, type PenempatanPklViewProps } from '../../components/hubin/penempatan/PenempatanPklView';

const breadcrumbs = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Penempatan PKL', path: '/hubin/penempatan' }
];

const instructionData = {
  title: 'Panduan Penempatan PKL',
  description: 'Kelola plotting penempatan praktek kerja lapangan siswa ke mitra industri.',
  items: [
    { text: 'Pilih siswa dan mitra industri untuk melakukan plotting penempatan baru.' },
    { text: 'Tunjuk guru pembimbing untuk memonitor progres PKL siswa.' },
    { text: 'Input nilai, buat laporan kunjungan, dan lakukan review jurnal siswa secara berkala.' }
  ]
};

export const PenempatanPklSection: React.FC<PenempatanPklViewProps> = React.memo((props) => {
  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Penempatan PKL Siswa"
      description="Optimalkan proses penempatan kerja lapangan. Plotting siswa ke mitra industri secara cerdas, tunjuk guru pembimbing, dan kelola periode PKL dalam satu manajemen terpusat."
    >
      <AcademicPageLayout
        title="Penempatan PKL"
        description="Plotting siswa ke mitra industri dan penunjukkan pembimbing"
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="hubin_penempatan_pkl"
        instruction={instructionData}
      >
        <PenempatanPklView {...props} isModal={false} hideHeaderStats={false} />
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

PenempatanPklSection.displayName = 'PenempatanPklSection';

const PenempatanPklPage = React.memo(() => <PenempatanPklSection />);
PenempatanPklPage.displayName = 'PenempatanPklPage';

export default PenempatanPklPage;

// Re-export View and types for backward compatibility
export { PenempatanPklView };
export type { PenempatanPklViewProps };
export type { 
  SiswaData, 
  MitraData, 
  PembimbingData, 
  SiswaPkl, 
  CreatePenempatanPayload, 
  MutasiPenempatanPayload, 
  PenilaianPayload, 
  KunjunganPayload 
} from './types/penempatan.types';
