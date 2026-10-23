import React from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SuratKeluarView } from '@/components/correspondence/surat-keluar/SuratKeluarView';

export default function SuratKeluarPage() {
  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Surat Keluar Sekolah"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Persuratan', path: '/correspondence' },
          { label: 'Surat Keluar', path: '/correspondence/surat-keluar' },
        ]}
        hardeningModuleKey="correspondence_outbox"
        instruction={{
          title: 'Panduan Surat Keluar',
          description:
            'Gunakan halaman ini untuk memanajemen pembuatan surat keluar sekolah dan memproses tanda tangan digital Kepala Sekolah.',
          items: [
            { text: "Klik 'Buat Draft Surat' untuk membuat draft surat keluar." },
            { text: 'Klik tombol bintang/persetujuan untuk melakukan Tanda Tangan Digital Kepala Sekolah secara instan.' },
          ],
        }}
      >
        <SuratKeluarView hideLayout={false} />
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
}
