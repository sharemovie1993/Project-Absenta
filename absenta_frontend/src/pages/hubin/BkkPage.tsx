import React, { useMemo, lazy, Suspense } from 'react';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard, Loader } from '../../components/ui';
import { Briefcase } from 'lucide-react';

const BkkSection = lazy(() => import('@/components/hubin/bkk/BkkSection').then(m => ({ default: m.BkkSection })));

export const BkkPage: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const isStudent = useMemo(() => !!user?.isStudent, [user]);

  const title = useMemo(
    () => isStudent ? "Lowongan Kerja (BKK)" : "BKK & Lowongan Kerja",
    [isStudent]
  );

  const description = useMemo(
    () => isStudent
      ? "Temukan dan lamar lowongan pekerjaan industri"
      : "Kelola lowongan pekerjaan dan pantau pelamar dari siswa/alumni",
    [isStudent]
  );

  const instructions = useMemo(() => [
    { text: isStudent ? "Cari lowongan kerja yang sesuai minat dan kirim lamaran Anda." : "Buat lowongan pekerjaan baru dari mitra industri yang bekerjasama." },
    { text: isStudent ? "Pantau status lamaran Anda secara berkala di tab Pelamar." : "Verifikasi berkas CV pelamar dan update status lamaran mereka." }
  ], [isStudent]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'BKK & Lowongan Kerja', path: '/hubin/bkk' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Bursa Kerja Khusus (BKK)"
      description="Pusat informasi lowongan pekerjaan dan manajemen lamaran kerja untuk siswa tingkat akhir dan alumni."
    >
      <AcademicPageLayout 
        title={title}
        description={description}
        hardeningModuleKey="hubin_bkk"
        instruction={{
          title: "Panduan Bursa Kerja Khusus (BKK)",
          description: "Panduan dan pengelolaan bursa kerja khusus dan lowongan pekerjaan alumni.",
          items: instructions
        }}
        breadcrumbs={breadcrumbs}
      >
        <SectionCard icon={Briefcase} title="Bursa Kerja Khusus" fullWidth className="flex flex-col w-full min-w-0">
          <Suspense fallback={<div className="flex justify-center py-12"><Loader size="lg" /></div>}>
            <BkkSection />
          </Suspense>
        </SectionCard>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default BkkPage;

