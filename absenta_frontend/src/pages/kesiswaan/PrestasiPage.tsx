import { z } from 'zod';
import { formatDate } from '@/utils/date.utils';
import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';

const PrestasiSection = lazy(() => import('./components/PrestasiSection').then(m => ({ default: m.PrestasiSection })));

const prestasiSchema = z.object({
  nama_prestasi: z.string().min(1, 'Nama prestasi wajib diisi'),
  tingkat: z.string().min(1, 'Tingkat kejuaraan wajib diisi'),
  juara: z.string().min(1, 'Juara/Peringkat wajib diisi')
});

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
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat data prestasi siswa...</div>}>
          <PrestasiSection />
        </Suspense>
      </SectionCard>
    </AcademicPageLayout>
  );
}
