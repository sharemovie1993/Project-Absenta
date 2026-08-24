import React, { useMemo, lazy, Suspense } from 'react';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '../../components/ui';
import { Users } from 'lucide-react';

const TracerStudySection = lazy(() => import('./components/TracerStudySection').then(m => ({ default: m.TracerStudySection })));

export const TracerStudyPage: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const isStudent = useMemo(() => !!user?.isStudent, [user]);

  const title = useMemo(
    () => isStudent ? "Tracer Study Alumni" : "Tracer Study (Alumni)",
    [isStudent]
  );

  const description = useMemo(
    () => isStudent
      ? "Isi kuesioner pelacakan alumni untuk pengembangan sekolah"
      : "Pantau data keterserapan alumni dan statistik pekerjaan lulusan",
    [isStudent]
  );

  const instructions = useMemo(() => [
    { text: isStudent ? "Isi data kuesioner kelulusan Anda secara lengkap dan akurat." : "Lihat sebaran keterserapan alumni berdasarkan status bekerja, wirausaha, kuliah, atau mencari kerja." },
    { text: isStudent ? "Anda dapat mengupdate status pekerjaan Anda kapan saja jika terjadi perubahan." : "Gunakan filter tahun lulus untuk mempermudah analisis data alumni per angkatan." }
  ], [isStudent]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Tracer Study', path: '/hubin/tracer' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Tracer Study"
      description="Sistem pelacakan dan survei keterserapan alumni di dunia kerja, wirausaha, maupun pendidikan tinggi."
    >
      <InfraErrorBoundary>
        <AcademicPageLayout 
          title={title}
          description={description}
          hardeningModuleKey="hubin_tracer"
          instruction={{
            title: "Panduan Tracer Study Alumni",
            description: "Modul pelacakan keterserapan lulusan di dunia industri, universitas, dan wirausaha.",
            items: instructions
          }}
          breadcrumbs={breadcrumbs}
        >
          <SectionCard icon={Users} title="Data Tracer Study Alumni" fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400">Memuat modul Tracer Study...</div>}>
              <TracerStudySection />
            </Suspense>
          </SectionCard>
        </AcademicPageLayout>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default TracerStudyPage;
