import React from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { RaporStagingView } from '@/components/rapor/staging/RaporStagingView';

export default React.memo(function RaporStagingPage() {
  return (
    <AcademicPageLayout
      title="Wadah Penampung Nilai Rapor"
      subtitle="Hubungkan dan sinkronkan tautan Google Sheet per kelas langsung ke e-Rapor resmi"
      hardeningModuleKey="rapor-staging"
      instruction={{
        title: 'Panduan Wadah Penampung Google Sheet',
        items: [
          'Salin dan tempel tautan berkas Google Sheet kelas atau tautan Folder Google Drive induk.',
          'Penyajian data otomatis diorganisir berjenjang: Tahun Ajaran → Tingkat Kelas (X, XI, XII) → Semester (Ganjil / Genap).',
          'Pada tautan Folder Google Drive, sistem cerdas memfilter hanya berkas Google Sheets (mengabaikan PDF & dokumen lain).',
          'Gunakan tombol Pratinjau Data untuk memeriksa kelengkapan siswa dan nilai sebelum melakukan 1-Click Sync.',
        ],
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 shadow-2xs p-0 border-0 bg-transparent">
        <RaporStagingView />
      </SectionCard>
    </AcademicPageLayout>
  );
});
