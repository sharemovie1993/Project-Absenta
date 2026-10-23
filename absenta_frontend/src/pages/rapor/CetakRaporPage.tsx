import React, { useMemo } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import type { InstructionData } from '../../contexts/InstructionContext';
import { CetakRaporView } from '../../components/rapor/cetak-rapor/CetakRaporView';

// Static Instruction Constant to eliminate infinite re-render loops
const CETAK_RAPOR_INSTRUCTION: InstructionData = {
  title: 'Panduan Cetak Rapor & Leger',
  description: 'Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pencetakan lembar e-Rapor resmi.',
  items: [
    { text: 'Pilih Rombel / Kelas untuk merekap ranking leger dan absensi.' },
    { text: 'Klik Catatan untuk mengisi catatan wali kelas dan status transisi.' },
    { text: 'Gunakan Cetak Sekaligus untuk mengunduh seluruh rapor dalam 1 file PDF.' },
    { text: 'Ekspor Leger ke spreadsheet Excel untuk kebutuhan arsip dan administrasi.' },
  ],
};

export default React.memo(function CetakRaporPage() {
  const breadcrumbs = useMemo(
    () => [{ label: 'Rapor', href: '/rapor/input-nilai' }, { label: 'Cetak Rapor & Leger' }],
    []
  );

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Leger Kelas & Cetakan Rapor"
        description="Penyusunan ranking kelas, rekapitulasi absensi wali kelas, serta pratinjau PDF lembar e-Rapor resmi di tab baru."
        breadcrumbs={breadcrumbs}
        instruction={CETAK_RAPOR_INSTRUCTION}
        hardeningModuleKey="cetakraporpage"
      >
        <SectionCard fullWidth className="border-none shadow-none bg-transparent p-0">
          <CetakRaporView hideLayout={true} />
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});
