import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { CbtProctorMonitoringView } from '@/components/cbt/sesi/CbtProctorMonitoringView';

export default function CbtSesiPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jadwalId = searchParams.get('jadwalId') || undefined;

  return (
    <AcademicPageLayout
      title="Live Monitoring Sesi Ujian (Proctor)"
      description="Pemantauan real-time status 3.000 peserta, deteksi kecurangan switch tab, dan reset sesi siswa"
      topSlot={<WorkspaceAppLauncherCard workspaceId="CBT_WORKSPACE" />}
    >
      <CbtProctorMonitoringView
        initialJadwalId={jadwalId}
        onBack={() => navigate('/cbt/jadwal')}
      />
    </AcademicPageLayout>
  );
}
