import React from 'react';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { TracerStudySection } from './components/TracerStudySection';

export const TracerStudyPage: React.FC = () => {
  const { user } = useAuthStore();
  const isStudent = user?.role?.name === 'SISWA';

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Tracer Study"
      description="Sistem pelacakan dan survei keterserapan alumni di dunia kerja, wirausaha, maupun pendidikan tinggi."
    >
      <AcademicPageLayout 
        title={isStudent ? "Tracer Study Alumni" : "Tracer Study (Alumni)"} 
        description={isStudent ? "Isi kuesioner pelacakan alumni untuk pengembangan sekolah" : "Pantau data keterserapan alumni dan statistik pekerjaan lulusan"}
        hardeningModuleKey="hubin_tracer"
        instruction={{
          title: "Panduan Tracer Study Alumni",
          items: [
            { text: isStudent ? "Isi data kuesioner kelulusan Anda secara lengkap dan akurat." : "Lihat sebaran keterserapan alumni berdasarkan status bekerja, wirausaha, kuliah, atau mencari kerja." },
            { text: isStudent ? "Anda dapat mengupdate status pekerjaan Anda kapan saja jika terjadi perubahan." : "Gunakan filter tahun lulus untuk mempermudah analisis data alumni per angkatan." }
          ]
        }}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Tracer Study', path: '/hubin/tracer' }
        ]}
      >
        <TracerStudySection />
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default TracerStudyPage;
