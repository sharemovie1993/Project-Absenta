import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui/SectionCard';

const CasesSection = lazy(() => import('./components/CasesSection').then(m => ({ default: m.CasesSection })));
const PremiumFeatureGate = lazy(() => import('../../components/auth/PremiumFeatureGate'));

export default React.memo(function CasesPage() {
  return (
    <InfraErrorBoundary>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat fitur...</div>}>
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
              { label: 'Kasus BK' }
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
            <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat daftar kasus...</div>}>
                <CasesSection />
              </Suspense>
            </SectionCard>
          </AcademicPageLayout>
        </PremiumFeatureGate>
      </Suspense>
    </InfraErrorBoundary>
  );
});
