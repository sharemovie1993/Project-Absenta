import React from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { CbtBankSoalView } from '@/components/cbt/bank-soal/CbtBankSoalView';

export default function CbtBankSoalPage() {
  return (
    <AcademicPageLayout
      title="Bank Soal CBT"
      description="Penyusunan butir soal pilihan ganda, gambar stimulus, opsi jawaban, dan rumus matematika"
      topSlot={<WorkspaceAppLauncherCard workspaceId="CBT_WORKSPACE" />}
    >
      <CbtBankSoalView />
    </AcademicPageLayout>
  );
}
