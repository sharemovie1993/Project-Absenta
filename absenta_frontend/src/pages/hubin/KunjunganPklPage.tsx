import React from 'react';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { KunjunganPklView } from '../../components/hubin/kunjungan/KunjunganPklView';
import type { UniversalKunjunganPklViewProps } from '../../components/hubin/kunjungan/types';

const breadcrumbs = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Hubin', path: '/hubin' },
  { label: 'Supervisi DU/DI', path: '/hubin/kunjungan' },
];

const instructionData = {
  title: 'Panduan Supervisi & Kunjungan PKL',
  description: 'Dokumentasikan monitoring, observasi lapangan, dan koordinasi dengan mentor DU/DI.',
  items: [
    { text: 'Klik tombol "+ Catat Supervisi Baru" untuk memulai log kunjungan ke tempat magang siswa.' },
    { text: 'Aktifkan GPS perangkat untuk menyematkan koordinat lokasi industri secara otomatis.' },
    { text: 'Unggah foto bukti kunjungan dan isi catatan hasil diskusi dengan pembimbing industri.' },
    { text: 'Gunakan tombol "Cetak Lembar" untuk mencetak lembar supervisi atau berita acara kunjungan resmi.' },
  ],
};

export interface KunjunganPklPageProps extends UniversalKunjunganPklViewProps {
  hideLayout?: boolean;
}

export const KunjunganPklSection: React.FC<KunjunganPklPageProps> = React.memo(({ hideLayout = false, ...props }) => {
  const content = <KunjunganPklView {...props} isModal={false} hideHeaderStats={false} />;

  if (hideLayout) {
    return content;
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Supervisi Kunjungan PKL"
      description="Pusat pencatatan supervisi magang ke mitra industri. Dokumentasikan observasi, foto bukti, dan koordinasi mentor lapangan secara real-time."
    >
      <AcademicPageLayout
        title="Supervisi & Kunjungan Industri DU/DI"
        description="Pencatatan monitoring berkala, geotagging GPS, dan rekap kunjungan siswa PKL"
        breadcrumbs={breadcrumbs}
        instruction={instructionData}
      >
        {content}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

KunjunganPklSection.displayName = 'KunjunganPklSection';
export default KunjunganPklSection;
