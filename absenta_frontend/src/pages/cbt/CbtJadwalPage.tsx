import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { CbtJadwalView } from '@/components/cbt/jadwal/CbtJadwalView';

export default function CbtJadwalPage() {
  const navigate = useNavigate();

  return (
    <AcademicPageLayout
      title="Jadwal & Token Ujian CBT"
      description="Pengaturan sesi ujian, rilis token acak 6 digit, aktivasi sesi, dan cetak berita acara resmi"
      topSlot={<WorkspaceAppLauncherCard workspaceId="CBT_WORKSPACE" />}
    >
      <CbtJadwalView onNavigateMonitor={(jadwalId) => navigate(`/cbt/sesi?jadwalId=${jadwalId}`)} />
    </AcademicPageLayout>
  );
}
