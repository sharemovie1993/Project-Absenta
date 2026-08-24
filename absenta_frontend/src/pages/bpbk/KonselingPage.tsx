import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui/SectionCard';

const KonselingSection = lazy(() => import('./components/KonselingSection').then(m => ({ default: m.KonselingSection })));
const PremiumFeatureGate = lazy(() => import('../../components/auth/PremiumFeatureGate'));

export default React.memo(function KonselingPage() {
  return (
    <InfraErrorBoundary>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat modul...</div>}>
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
              { label: 'Layanan Konseling' }
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
            <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat sesi konseling...</div>}>
                <KonselingSection />
              </Suspense>
            </SectionCard>
          </AcademicPageLayout>
        </PremiumFeatureGate>
      </Suspense>
    </InfraErrorBoundary>
  );
});
