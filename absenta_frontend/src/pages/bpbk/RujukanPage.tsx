import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { RujukanSection } from './components/RujukanSection';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { useCapabilities } from '../../hooks/useCapabilities';

export default React.memo(function RujukanPage() {
  const { isBpbk, isAdmin, can } = useCapabilities();
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Rujukan Kasus BK"
      description="Catat dan pantau penanganan kasus siswa yang didelegasikan/dirujuk ke pihak eksternal seperti ahli medis, psikolog, psikiater, atau lembaga terkait."
    >
      <AcademicPageLayout
        title="Rujukan Kasus BK"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
          { label: 'Rujukan Kasus', path: '/bpbk/rujukan' }
        ]}
        hardeningModuleKey="bpbk_rujukan"
        instruction={{
          title: "Panduan Rujukan Kasus",
          description: "Halaman ini mencatat kasus yang dirujuk ke pihak eksternal seperti psikolog, psikiater, kepolisian, atau lembaga sosial.",
          items: [
            { text: "Klik 'Tambah Rujukan' untuk mencatat penyerahan kasus siswa ke lembaga luar." },
            { text: "Dokumentasikan progres dan surat rekomendasi untuk memastikan kelancaran penanganan rujukan." }
          ]
        }}
      >
        <div className="w-full min-w-0">
          <RujukanSection />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
