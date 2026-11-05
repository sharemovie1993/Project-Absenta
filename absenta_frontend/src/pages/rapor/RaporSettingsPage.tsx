import React, { useMemo } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui/SectionCard';
import { RaporSettingsView } from '../../components/rapor/settings/RaporSettingsView';

export const RaporSettingsPage: React.FC = React.memo(() => {
  const breadcrumbs = useMemo(() => [
    { label: 'Rapor', path: '/rapor/input' },
    { label: 'Pengaturan & Titimangsa', path: '/rapor/settings' },
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pengaturan Dokumen & Titimangsa Rapor"
        description="Pusat konfigurasi tanggal resmi titimangsa rapor semester ganjil, semester genap, dan pejabat penandatangan dalam format tabel slot per tahun pelajaran."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="rapor_settings"
        instruction={{
          title: "Panduan Pengaturan Dokumen & Titimangsa Rapor",
          description: "Halaman ini berfungsi sebagai referensi induk tunggal (Source of Truth) untuk seluruh dokumen cetak rapor dalam format tabel slot per tahun pelajaran.",
          items: [
            { text: "Tab Slot Titimangsa: Klik [Atur Slot] pada baris tahun pelajaran terkait untuk menginput tanggal titimangsa ganjil, genap, dan data kepala sekolah." },
            { text: "Titimangsa Pokok: Tanggal yang disimpan otomatis berlaku untuk Rapor Capaian, Rapor P5, Transkrip, dan Rapor PKL." },
            { text: "Tab Tim Fasilitator P5: Konfigurasikan guru fasilitator dan koordinator tema projek P5 untuk kelas terkait." },
          ],
        }}
      >
        <SectionCard fullWidth noPadding className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm pb-24 sm:pb-8">
          <RaporSettingsView hideLayout={false} />
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

RaporSettingsPage.displayName = 'RaporSettingsPage';
export default RaporSettingsPage;
