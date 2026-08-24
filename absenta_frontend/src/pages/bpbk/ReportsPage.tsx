import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { useCapabilities } from '../../hooks/useCapabilities';
import { SectionCard } from '@/components/ui';

const ReportsSection = lazy(() => import('./components/ReportsSection').then(m => ({ default: m.ReportsSection })));

export default React.memo(function ReportsPage() {
  const { isBpbk, isAdmin, can } = useCapabilities();
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Laporan & Statistik BK"
      description="Analisis grafik, statistik kasus aktif, tindak lanjut, tren kerawanan siswa, dan ekspor laporan bulanan BP/BK secara komprehensif."
    >
      <AcademicPageLayout
        title="Laporan & Statistik Bimbingan Konseling"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
          { label: 'Laporan & Statistik', path: '/bpbk/reports' }
        ]}
        hardeningModuleKey="bpbk_reports"
        instruction={{
          title: "Panduan Laporan & Statistik",
          description: "Halaman ini menyajikan grafik dan visualisasi statistik kasus aktif, tindak lanjut, dan tren kerawanan siswa.",
          items: [
            { text: "Analisis tren kerawanan berdasarkan klasifikasi jenis kasus (akademis, pribadi, sosial, disiplin)." },
            { text: "Ekspor data laporan bulanan untuk kepentingan rapat evaluasi tim wali kelas dan pimpinan." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <Suspense fallback={<div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
            <ReportsSection />
          </Suspense>
        </SectionCard>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
