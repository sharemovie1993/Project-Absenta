import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { HomeVisitSection } from './components/HomeVisitSection';

export default function HomeVisitPage() {
  return (
    <AcademicPageLayout
      title="Kunjungan Rumah (Home Visit)"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
        { label: 'Home Visit', path: '/bpbk/homevisit' }
      ]}
      hardeningModuleKey="bpbk_home_visit"
      instruction={{
        title: "Panduan Home Visit",
        description: "Halaman ini digunakan untuk mendokumentasikan hasil kunjungan rumah guru BK ke kediaman orang tua siswa.",
        items: [
          { text: "Klik 'Catat Home Visit' untuk mendokumentasikan detail kegiatan kunjungan rumah." },
          { text: "Unggah dokumen pendukung atau foto dokumentasi jika diperlukan pada catatan laporan." }
        ]
      }}
    >
      <div className="w-full min-w-0">
        <HomeVisitSection />
      </div>
    </AcademicPageLayout>
  );
}
