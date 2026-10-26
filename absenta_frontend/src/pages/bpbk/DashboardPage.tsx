import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { BpbkDashboard as BpbkDashboardComponent } from '@/components/dashboard/roles/BpbkDashboard';

export default React.memo(function DashboardPage() {
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Bimbingan Konseling (BP/BK)"
      description="Layanan Bimbingan Konseling terpadu sekolah untuk mengelola data kasus siswa, konseling klinis, pemanggilan orang tua, home visit, asesmen/angket, dan Early Warning System (EWS)."
    >
      <AcademicPageLayout
        hideHeaderAndBreadcrumbs={true}
        title="Pusat Kendali Bimbingan Konseling (BP/BK)"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' }
        ]}
        hardeningModuleKey="bpbk_dashboard"
        topSlot={<WorkspaceAppLauncherCard workspaceId="BPBK_WORKSPACE" />}
        instruction={{
          title: "Panduan Dashboard BPBK",
          description: "Halaman ini menampilkan ringkasan data kasus, konseling aktif, dan tindak lanjut terbaru.",
          items: [
            { text: "Dashboard menampilkan statistik kasus terbuka, selesai, dan rujukan." },
            { text: "Gunakan menu sidebar untuk mengelola siswa kasus, layanan konseling, pemanggilan, dan home visit." }
          ]
        }}
      >
        <div className="w-full min-w-0">
          <BpbkDashboardComponent />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
