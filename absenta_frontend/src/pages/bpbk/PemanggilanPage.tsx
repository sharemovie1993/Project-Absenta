import React, { lazy, Suspense } from 'react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { SectionCard } from '@/components/ui';

const PemanggilanSection = lazy(() => import('./components/PemanggilanSection').then(m => ({ default: m.PemanggilanSection })));

export default React.memo(function PemanggilanPage() {
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
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <Suspense fallback={<div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
            <PemanggilanSection />
          </Suspense>
        </SectionCard>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});
