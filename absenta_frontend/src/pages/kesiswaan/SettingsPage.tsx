import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SettingsSection } from './components/SettingsSection';
import { Card } from '../../components/ui/Card';

export default React.memo(function SettingsPage() {
  return (
    <AcademicPageLayout
      title="Pengaturan Kategori & Poin Kesiswaan"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kesiswaan' },
        { label: 'Pengaturan Kategori & Poin', path: '/kesiswaan/settings' }
      ]}
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
      <Card className="border-none shadow-none bg-transparent">
        <SettingsSection />
      </Card>
    </AcademicPageLayout>
  );
});
