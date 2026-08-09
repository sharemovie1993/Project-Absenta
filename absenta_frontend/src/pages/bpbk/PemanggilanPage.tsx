import React from 'react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { PemanggilanSection } from './components/PemanggilanSection';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { useCapabilities } from '../../hooks/useCapabilities';

export default React.memo(function PemanggilanPage() {
  const { isBpbk, isAdmin, can } = useCapabilities();
  return (
    <PremiumFeatureGate
      moduleName="BPBK"
      featureName="Pemanggilan Orang Tua"
      description="Kelola administrasi pemanggilan orang tua/wali siswa, cetak surat panggilan, dan catat hasil pertemuan/kehadiran secara terstruktur."
    >
      <AcademicPageLayout
        title="Pemanggilan Orang Tua / Wali Siswa"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Bimbingan Konseling', path: '/bpbk/dashboard' },
          { label: 'Pemanggilan Ortu', path: '/bpbk/pemanggilan' }
        ]}
        hardeningModuleKey="bpbk_pemanggilan"
        instruction={{
          title: "Panduan Pemanggilan Orang Tua",
          description: "Halaman ini digunakan untuk mengelola administrasi surat panggilan dan kehadiran orang tua/wali siswa.",
          items: [
            { text: "Klik 'Buat Panggilan' untuk menginput agenda pemanggilan orang tua siswa." },
            { text: "Status panggilan dapat dipantau dari mulai dikirim, hadir, hingga selesai tindak lanjut." }
          ]
        }}
      >
        <div className="w-full min-w-0">
          <PemanggilanSection />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
