import React, { lazy, Suspense, useMemo } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui';

const SettingsSection = lazy(() => import('./components/SettingsSection').then(m => ({ default: m.SettingsSection })));

export const SettingsPage: React.FC = React.memo(() => {
  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Kesiswaan' },
    { label: 'Pengaturan Kategori & Poin', path: '/kesiswaan/settings' }
  ], []);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pengaturan Kategori & Poin Kesiswaan"
        description="Konfigurasi bobot poin pelanggaran (kedisiplinan) dan poin penghargaan (prestasi) siswa."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="kesiswaan_settings"
        instruction={{
          title: "Panduan Pengaturan Poin Kesiswaan",
          description: "Halaman ini digunakan untuk mengkonfigurasi bobot poin pelanggaran (kedisiplinan) dan poin penghargaan (prestasi).",
          items: [
            { text: "Pilih tab 'Kategori Pelanggaran' untuk mengelola kriteria pelanggaran dan poin hukuman." },
            { text: "Pilih tab 'Kategori Prestasi' untuk mengelola kriteria prestasi dan poin penghargaan." },
            { text: "Perubahan bobot poin akan berlaku pada pencatatan kasus baru." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Memuat pengaturan kesiswaan...</div>}>
            <SettingsSection />
          </Suspense>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default SettingsPage;
