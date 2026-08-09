import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { KonselingSection } from './components/KonselingSection';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

export default React.memo(function KonselingPage() {
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Layanan Konseling Siswa"
      description="Kelola aktivitas bimbingan dan konseling langsung dengan siswa secara individual, kelompok, maupun klasikal."
    >
      <AcademicPageLayout
        title="Layanan Konseling Siswa"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
          { label: 'Layanan Konseling', path: '/bpbk/konseling' }
        ]}
        hardeningModuleKey="bpbk_konseling"
        instruction={{
          title: "Panduan Layanan Konseling",
          description: "Halaman ini digunakan untuk mengelola aktivitas bimbingan/konseling langsung dengan siswa.",
          items: [
            { text: "Catat setiap sesi bimbingan konseling baik individu, kelompok, maupun klasikal." },
            { text: "Hasil konseling dapat digunakan sebagai dasar penentuan rekomendasi tindakan berikutnya." }
          ]
        }}
      >
        <div className="w-full min-w-0">
          <KonselingSection />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
