import React, { useMemo } from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { NilaiPklView, type UniversalNilaiPklViewProps } from '../../components/hubin/nilai-pkl/NilaiPklView';

export const InputNilaiPklPage: React.FC<UniversalNilaiPklViewProps> = React.memo((props) => {
  const { layoutMode = 'hubin' } = props;

  const breadcrumbs = useMemo(() => {
    if (layoutMode === 'rapor') {
      return [
        { label: 'Rapor', path: '/rapor/input-nilai' },
        { label: 'Nilai PKL' }
      ];
    }
    return [
      { label: 'Hubin & PKL', path: '/hubin/workspace' },
      { label: 'Penilaian PKL' }
    ];
  }, [layoutMode]);

  const pageContent = (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title={layoutMode === 'rapor' ? "Nilai Praktik Kerja Lapangan (PKL) Rapor" : "Penilaian & Sertifikasi Praktik Kerja Lapangan (PKL)"}
        description={layoutMode === 'rapor' ? "Rekapitulasi dan entri nilai capaian PKL siswa untuk penyusunan lembar rapor dan leger nilai." : "Entri nilai hard skills & soft skills, catatan instruktur DUDI, serta pratinjau sertifikat resmi PKL siswa."}
        breadcrumbs={breadcrumbs}
        hardeningModuleKey={layoutMode === 'rapor' ? "rapor_pkl" : "hubin_input_nilai_pkl"}
        instruction={{
          title: "Panduan Penilaian PKL",
          description: "Gunakan modul ini untuk memasukkan capaian kompetensi siswa di DUDI mitra.",
          items: [
            { text: "Pilih kelas untuk memuat daftar siswa yang sedang atau telah menyelesaikan masa PKL." },
            { text: "Gunakan fitur Paste dari Excel untuk mempercepat entri massal nilai dari instruktur industri." },
            { text: "Buka tab Nilai Sidang & Laporan untuk menginput nilai ujian presentasi dan memeriksa portofolio." },
            { text: "Klik tombol Sertifikat pada baris siswa untuk mencetak sertifikat resmi PKL." }
          ]
        }}
      >
        <NilaiPklView {...props} isModal={false} hideHeaderStats={false} />
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );

  if (layoutMode === 'rapor') {
    return pageContent;
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Penilaian & Sertifikasi PKL Siswa"
      description="Kelola penilaian hard skills, soft skills, catatan instruktur industri, dan sertifikat resmi PKL siswa."
    >
      {pageContent}
    </PremiumFeatureGate>
  );
});

InputNilaiPklPage.displayName = 'InputNilaiPklPage';
export default InputNilaiPklPage;

// Re-export View and types for backward compatibility
export { NilaiPklView };
export type { UniversalNilaiPklViewProps };
