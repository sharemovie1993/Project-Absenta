import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui/SectionCard';

const RujukanSection = lazy(() => import('./components/RujukanSection').then(m => ({ default: m.RujukanSection })));
const PremiumFeatureGate = lazy(() => import('../../components/auth/PremiumFeatureGate'));

export default React.memo(function RujukanPage() {
  return (
    <InfraErrorBoundary>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat modul...</div>}>
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
              { label: 'Rujukan Kasus' }
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
            <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat rujukan kasus...</div>}>
                <RujukanSection />
              </Suspense>
            </SectionCard>
          </AcademicPageLayout>
        </PremiumFeatureGate>
      </Suspense>
    </InfraErrorBoundary>
  );
});
