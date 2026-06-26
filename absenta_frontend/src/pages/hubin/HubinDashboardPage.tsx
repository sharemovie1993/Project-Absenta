import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { HubinDashboardSection } from './components/HubinDashboardSection';

export const HubinDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isStudent = user?.role?.name === 'SISWA';

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Pusat Kendali Hubungan Industri"
      description="Pusat kolaborasi terpadu antara sekolah dengan dunia industri, mencakup pengelolaan mitra, MoU, program PKL, BKK lowongan kerja, Tracer Study alumni, dan Teaching Factory."
    >
      <AcademicPageLayout 
        title={isStudent ? "Portal Hubungan Industri (HUBIN)" : "Pusat Kendali Hubungan Industri (HUBIN)"} 
        description={isStudent ? "Akses presensi PKL, bursa kerja khusus, dan kuesioner tracer study" : "Kelola kemitraan industri, program PKL, BKK lowongan kerja, tracer study alumni, dan teaching factory (TEFA)."}
        hardeningModuleKey="hubin_dashboard"
        instruction={{
          title: "Panduan Portal Hubungan Industri (HUBIN)",
          items: [
            { text: "Dashboard Hubin menampilkan ringkasan data keterserapan alumni dan keaktifan PKL." },
            { text: "Gunakan menu sidebar utama untuk mengakses sub-modul HUBIN lainnya." }
          ]
        }}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Hubin Dashboard', path: '/hubin/dashboard' }
        ]}
      >
        <HubinDashboardSection onNavigateTab={(tabId) => navigate(`/hubin/${tabId}`)} />
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default HubinDashboardPage;
