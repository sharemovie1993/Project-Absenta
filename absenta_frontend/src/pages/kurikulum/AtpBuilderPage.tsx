import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui/SectionCard';
import { AtpBuilderView } from '../../components/kurikulum/atp/AtpBuilderView';

export const AtpBuilderPage: React.FC = () => {
  return (
    <AcademicPageLayout
      hardeningModuleKey="kurikulum_atp_builder"
      title="Penyusun ATP & TP"
      description="Rancang Alur Tujuan Pembelajaran per mata pelajaran yang Anda ampu — berbasis Kurikulum Merdeka."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Penyusun ATP & TP', path: '/kurikulum/atp' }
      ]}
      instruction={{
        title: 'Cara Kerja ATP Builder (Kurikulum Merdeka)',
        description: 'Susun ATP per mapel yang Anda ajar.',
        items: [
          { text: 'Pilih mata pelajaran yang Anda ampu — hanya tampil mapel Anda sendiri.' },
          { text: 'Pilih Fase Kurikulum Merdeka (Fase E untuk Kelas 10, Fase F untuk Kelas 11-12).' },
          { text: 'Setelah disimpan, TP ini otomatis muncul di Form Jurnal KBM sebagai pilihan 1-klik.' }
        ]
      }}
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
        <AtpBuilderView />
      </SectionCard>
    </AcademicPageLayout>
  );
};

export default AtpBuilderPage;
