import React, { useMemo } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui/SectionCard';
import { HubinSettingsView } from '../../components/hubin/settings/HubinSettingsView';

export const HubinSettingsPage: React.FC = React.memo(() => {
  const breadcrumbs = useMemo(() => [
    { label: 'Hubin & PKL', path: '/hubin/workspace' },
    { label: 'Pengaturan & Referensi' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Pengaturan & Referensi Data Hubin"
      description="Pusat konfigurasi dan referensi resmi persuratan sertifikat, skema penilaian, serta arsip digital PKL per angkatan tahun ajaran."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout
          title="Pusat Pengaturan & Referensi Hubin"
          description="Source of truth untuk nomor surat sertifikat PKL resmi dari TU per tahun pelajaran, skema penilaian, dan arsip digital."
          breadcrumbs={breadcrumbs}
          hardeningModuleKey="hubin_settings"
          instruction={{
            title: "Panduan Referensi & Pengaturan Hubin",
            description: "Halaman ini berfungsi sebagai referensi induk tunggal (Source of Truth) untuk seluruh operasional Hubin & PKL dalam format tabel slot per tahun pelajaran.",
            items: [
              { text: "Tab Nomor Surat & Sertifikat: Klik [Atur Slot] pada baris tahun pelajaran terkait untuk menginput nomor surat resmi dari TU dan identitas pejabat penandatangan." },
              { text: "Tab Skema & Bobot: Tentukan model penilaian (Hanya DUDI atau Gabungan DUDI + Laporan + Sidang) untuk tiap angkatan." },
              { text: "Tab Siklus Kunjungan: Tetapkan pola target monitoring pembimbing (3 Siklus Kemendikbud vs 4 Siklus Intensif) dan instrumen wajib (Foto GPS, TTD Industri, Jurnal)." },
              { text: "Tab Cloud Storage: Sambungkan folder Google Drive untuk arsip portofolio dan dokumen PKL siswa." }
            ]
          }}
        >
          <SectionCard fullWidth noPadding className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm pb-24 sm:pb-8">
            <HubinSettingsView hideLayout={false} />
          </SectionCard>
        </AcademicPageLayout>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default HubinSettingsPage;
