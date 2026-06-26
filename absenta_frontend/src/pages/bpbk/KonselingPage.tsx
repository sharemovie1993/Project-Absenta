import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { KonselingSection } from './components/KonselingSection';

export default function KonselingPage() {
  return (
    <AcademicPageLayout
      title="Layanan Konseling Siswa"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
        { label: 'Layanan Konseling', path: '/bpbk/konseling' }
      ]}
      hardeningModuleKey="bpbk_konseling"
      instruction={{
        title: "Panduan Layanan Konseling",
        description: "Halaman ini digunakan untuk mengelola aktivitas bimbingan/konseling langsung dengan siswa.",
        items: [
          { text: "Catat setiap sesi bimbingan konseling baik individu, kelompok, maupun klasikal." },
          { text: "Hasil konseling dapat digunakan sebagai dasar penentuan rekomendasi tindakan berikutnya." }
        ]
      }}
    >
      <div className="w-full min-w-0">
        <KonselingSection />
      </div>
    </AcademicPageLayout>
  );
}
