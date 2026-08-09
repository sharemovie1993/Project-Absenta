import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { CasesSection } from './components/CasesSection';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

export default React.memo(function CasesPage() {
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Kasus Bimbingan Konseling"
      description="Catat, pantau, dan tindak lanjuti kasus atau isu klinis siswa secara sistematis dengan filter status komprehensif."
    >
      <AcademicPageLayout
        title="Kasus Bimbingan Konseling (BP/BK)"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
          { label: 'Kasus BK', path: '/bpbk/cases' }
        ]}
        hardeningModuleKey="bpbk_cases"
        instruction={{
          title: "Panduan Kasus BK",
          description: "Halaman ini digunakan untuk mencatat dan melacak isu/kasus klinis siswa secara individual.",
          items: [
            { text: "Klik 'Tambah Kasus' untuk mendaftarkan masalah/isu baru siswa." },
            { text: "Gunakan filter status (Terbuka, Proses, Rujukan, Selesai) untuk menyaring riwayat kasus." }
          ]
        }}
      >
        <div className="w-full min-w-0">
          <CasesSection />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
