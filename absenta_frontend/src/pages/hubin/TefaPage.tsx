import React, { useMemo, lazy, Suspense } from 'react';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui';
import { Factory } from 'lucide-react';

const TefaSection = lazy(() => import('./components/TefaSection').then(m => ({ default: m.TefaSection })));

export const TefaPage: React.FC = React.memo(() => {
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
      <InfraErrorBoundary>
        <AcademicPageLayout 
          title="Teaching Factory (TEFA)" 
          description="Kelola project pesanan industri dan kegiatan pembelajaran berbasis produksi sekolah"
          hardeningModuleKey="hubin_tefa"
          instruction={{
            title: "Panduan Teaching Factory (TEFA)",
            description: "Modul pengelolaan proyek pesanan industri nyata dan praktikum berbasis unit produksi.",
            items: [
              { text: "Catat setiap order/project masuk dari mitra industri rekanan." },
              { text: "Tentukan nilai kontrak, target selesai, dan status pengerjaan project secara transparan." },
              { text: "Gunakan data TEFA untuk mengukur kompetensi keahlian produktif siswa dalam mensimulasikan alur kerja industri." }
            ]
          }}
          breadcrumbs={breadcrumbs}
        >
          <SectionCard icon={Factory} title="Data Teaching Factory" fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Memuat modul TEFA...</div>}>
              <TefaSection />
            </Suspense>
          </SectionCard>
        </AcademicPageLayout>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default TefaPage;
