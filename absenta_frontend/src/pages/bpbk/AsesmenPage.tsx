import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { SectionCard } from '../../components/ui';
import { Loader } from '../../components/ui/Loader';

const AsesmenSection = lazy(() => import('./components/AsesmenSection').then(m => ({ default: m.AsesmenSection })));

export default function AsesmenPage() {
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Asesmen & Angket BK"
      description="Kelola data angket pilihan, kuesioner psikologi BK, dan analisis diagnostik untuk pemetaan kebutuhan konseling siswa."
    >
      <AcademicPageLayout
        title="Asesmen & Angket Pilihan BK"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
          { label: 'Asesmen & Angket', path: '/bpbk/asesmen' }
        ]}
        hardeningModuleKey="bpbk_asesmen"
        instruction={{
          title: "Panduan Asesmen & Angket",
          description: "Halaman ini digunakan untuk mengelola data angket pilihan atau kuesioner psikologi BK.",
          items: [
            { text: "Pilih instrumen asesmen yang sesuai dengan kebutuhan diagnostik siswa." },
            { text: "Hasil rekapitulasi angket dapat dianalisis untuk menentukan pemetaan kebutuhan konseling." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0">
          <Suspense fallback={<Loader />}>
            <AsesmenSection />
          </Suspense>
        </SectionCard>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
}
