import React, { useMemo } from 'react';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui';
import { Factory } from 'lucide-react';
import { TefaSection } from './components/TefaSection';

export const TefaPage: React.FC = () => {
  // useMemo untuk memastikan data statis di-cache dan tidak di-re-create tiap render
  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Teaching Factory (TEFA)', path: '/hubin/tefa' }
  ], []);

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
        breadcrumbs={breadcrumbs}
      >
        <SectionCard icon={Factory} title="Data Teaching Factory" fullWidth>
          <TefaSection />
        </SectionCard>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default TefaPage;
