import React, { useMemo } from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { KurikulumDashboard as KurikulumDashboardComponent } from '@/components/dashboard/roles/KurikulumDashboard';

export default function KurikulumDashboardPage() {
  const instruction = useMemo(
    () => ({
      title: 'Dashboard Analitik Kurikulum',
      description:
        'Menyajikan informasi komprehensif jadwal KBM, beban jam mengajar guru, struktur kurikulum, supervisi akademik, dan pelaporan nilai rapor terpadu.',
      items: [
        { text: 'Pantau distribusi beban JP (Jam Pelajaran) per guru dan rombel.' },
        { text: 'Lihat jadwal KBM harian, konflik jadwal, dan plotting penugasan piket.' },
        { text: 'Verifikasi kelengkapan perangkat ajar (ATP, Modul Ajar, Silabus) dan hasil supervisi.' },
      ],
    }),
    []
  );

  return (
    <AcademicPageLayout
      breadcrumbs={[]}
      instruction={instruction}
      hardeningModuleKey="kurikulum_dashboard"
      topSlot={<WorkspaceAppLauncherCard workspaceId="KURIKULUM_WORKSPACE" />}
    >
      <div className="pt-1">
        <KurikulumDashboardComponent />
      </div>
    </AcademicPageLayout>
  );
}
