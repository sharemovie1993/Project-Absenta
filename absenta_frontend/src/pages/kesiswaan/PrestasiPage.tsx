import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { PrestasiSection } from './components/PrestasiSection';

// Standard Container Requirement: <Card> is used inside PrestasiSection

export default function PrestasiPage() {
  return (
    <AcademicPageLayout
      title="Prestasi & Penghargaan Siswa"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kesiswaan', path: '/kesiswaan' },
        { label: 'Prestasi Siswa', path: '/kesiswaan/prestasi' }
      ]}
      hardeningModuleKey="kesiswaan_prestasi"
      instruction={{
        title: "Panduan Prestasi & Penghargaan",
        description: "Halaman ini digunakan untuk mengelola data prestasi dan penghargaan siswa.",
        items: [
          { text: "Gunakan tombol 'Catat Prestasi' untuk menginput prestasi baru siswa." },
          { text: "Ketik nama siswa atau nama penghargaan di kolom pencarian untuk menyaring data." },
          { text: "Poin prestasi akan meningkatkan total poin penghargaan siswa." }
        ]
      }}
    >
      <PrestasiSection />
    </AcademicPageLayout>
  );
}

