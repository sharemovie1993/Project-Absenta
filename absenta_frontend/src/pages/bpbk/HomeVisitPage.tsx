import React, { useMemo } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { HomeVisitSection } from './components/HomeVisitSection';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { useCapabilities } from '../../hooks/useCapabilities';
import { formatDate } from '../../utils/layoutUtils';

export default React.memo(function HomeVisitPage() {
  const { isBpbk, isAdmin, can } = useCapabilities();

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
    { label: 'Home Visit', path: '/bpbk/homevisit' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Home Visit"
      description="Dokumentasikan hasil kunjungan rumah guru BK ke kediaman orang tua siswa, lengkap dengan laporan hasil kunjungan dan foto dokumentasi."
    >
      <AcademicPageLayout
        title="Kunjungan Rumah (Home Visit)"
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="bpbk_home_visit"
        instruction={{
          title: "Panduan Home Visit",
          description: "Halaman ini digunakan untuk mendokumentasikan hasil kunjungan rumah guru BK ke kediaman orang tua siswa.",
          items: [
            { text: "Klik 'Catat Home Visit' untuk mendokumentasikan detail kegiatan kunjungan rumah." },
            { text: "Unggah dokumen pendukung atau foto dokumentasi jika diperlukan pada catatan laporan." }
          ]
        }}
      >
        <div className="w-full min-w-0">
          <HomeVisitSection />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
