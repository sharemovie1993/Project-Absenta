import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { ReportsSection } from './components/ReportsSection';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

export default function ReportsPage() {
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
        <div className="w-full min-w-0">
          <ReportsSection />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
}
