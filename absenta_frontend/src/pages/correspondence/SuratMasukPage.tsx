import React from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SuratMasukView } from '@/components/correspondence/surat-masuk/SuratMasukView';

export default function SuratMasukPage() {
  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Surat Masuk Sekolah"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Persuratan', path: '/correspondence' },
          { label: 'Surat Masuk', path: '/correspondence/surat-masuk' },
        ]}
        hardeningModuleKey="correspondence_inbox"
        instruction={{
          title: 'Panduan Surat Masuk',
          description:
            'Gunakan halaman ini untuk meregistrasikan surat eksternal yang masuk ke sekolah dan meneruskan lembar disposisi.',
          items: [
            { text: "Klik 'Registrasi Surat' untuk merekam surat baru masuk." },
            { text: 'Klik ikon centang pada baris surat untuk menginput disposisi Kepala Sekolah.' },
          ],
        }}
      >
        <SuratMasukView hideLayout={false} />
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
}
