import React from 'react';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { TefaSection } from './components/TefaSection';

export const TefaPage: React.FC = () => {
  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Teaching Factory (TEFA)"
      description="Model pembelajaran berbasis produksi/jasa yang mengadopsi standar dan prosedur kerja industri nyata."
    >
      <AcademicPageLayout 
        title="Teaching Factory (TEFA)" 
        description="Kelola project pesanan industri dan kegiatan pembelajaran berbasis produksi sekolah"
        hardeningModuleKey="hubin_tefa"
        instruction={{
          title: "Panduan Teaching Factory (TEFA)",
          items: [
            { text: "Catat setiap order/project masuk dari mitra industri rekanan." },
            { text: "Tentukan nilai kontrak, target selesai, dan status pengerjaan project secara transparan." },
            { text: "Gunakan data TEFA untuk mengukur kompetensi keahlian produktif siswa dalam mensimulasikan alur kerja industri." }
          ]
        }}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Teaching Factory (TEFA)', path: '/hubin/tefa' }
        ]}
      >
        <TefaSection />
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default TefaPage;
