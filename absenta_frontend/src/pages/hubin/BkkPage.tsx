import React from 'react';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { BkkSection } from './components/BkkSection';

export const BkkPage: React.FC = () => {
  const { user } = useAuthStore();
  const isStudent = user?.role?.name === 'SISWA';

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Bursa Kerja Khusus (BKK)"
      description="Pusat informasi lowongan pekerjaan dan manajemen lamaran kerja untuk siswa tingkat akhir dan alumni."
    >
      <AcademicPageLayout 
        title={isStudent ? "Lowongan Kerja (BKK)" : "BKK & Lowongan Kerja"} 
        description={isStudent ? "Temukan dan lamar lowongan pekerjaan industri" : "Kelola lowongan pekerjaan dan pantau pelamar dari siswa/alumni"}
        hardeningModuleKey="hubin_bkk"
        instruction={{
          title: "Panduan Bursa Kerja Khusus (BKK)",
          items: [
            { text: isStudent ? "Cari lowongan kerja yang sesuai minat dan kirim lamaran Anda." : "Buat lowongan pekerjaan baru dari mitra industri yang bekerjasama." },
            { text: isStudent ? "Pantau status lamaran Anda secara berkala di tab Pelamar." : "Verifikasi berkas CV pelamar dan update status lamaran mereka." }
          ]
        }}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'BKK & Lowongan Kerja', path: '/hubin/bkk' }
        ]}
      >
        <BkkSection />
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default BkkPage;
