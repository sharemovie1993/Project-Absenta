import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';

const PrestasiView = lazy(() => import('@/components/kesiswaan/prestasi').then(m => ({ default: m.PrestasiView })));

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
        title: "Panduan Prestasi & Penghargaan Siswa",
        description: "Pusat pendataan portofolio kejuaraan, lomba kejuruan/LKS, olimpiade sains, dan apresiasi bakat minat seluruh satuan pendidikan.",
        items: [
          { text: "Gunakan tombol 'Catat Prestasi' untuk menginput prestasi baru bagi peserta didik." },
          { text: "Filter berdasarkan tingkat kejuaraan (Sekolah, Kecamatan, Kota, Provinsi, Nasional, Internasional)." },
          { text: "Gunakan tombol 'Ekspor Excel' untuk mengunduh rekapitulasi data penghargaan." },
          { text: "Poin apresiasi otomatis diakumulasikan ke rekam jejak kesiswaan peserta didik." }
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat data prestasi siswa...</div>}>
          <PrestasiView hideLayout={true} />
        </Suspense>
      </SectionCard>
    </AcademicPageLayout>
  );
}
