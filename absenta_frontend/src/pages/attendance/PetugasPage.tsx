import React, { lazy, Suspense, useMemo, useCallback } from 'react';
const PetugasList = lazy(() => import('../../components/attendance/petugas/PetugasList'));
import { Loader, Card } from '../../components/ui';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import PageLayout from '../../components/common/PageLayout';

const stats = [
  {
    title: "Hak Akses",
    value: "Aktif",
    icon: <ShieldCheck size={14} />,
    gradient: "from-blue-500 to-indigo-600",
    subtitle: "Petugas Terverifikasi"
  },
  {
    title: "Penugasan",
    value: "Siswa/Guru",
    icon: <UserPlus size={14} />,
    gradient: "from-emerald-500 to-teal-600",
    subtitle: "Multi-Role Access"
  }
];

const instructionData = {
  title: "Manajemen Petugas",
  description: "Kelola hak akses untuk petugas yang berwenang melakukan absensi.",
  items: [
    { text: "Hanya petugas terdaftar yang dapat mengakses menu Operasional Absensi." },
    { text: "Petugas dapat berupa Guru (untuk kelas) atau Siswa (untuk gerbang)." },
    { text: "Pastikan penugasan sesuai dengan jadwal piket atau tanggung jawabnya." }
  ]
};

const breadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Petugas Absensi', active: true }
];

export const PetugasPage: React.FC = React.memo(() => {
  const { subscription } = useAuthStore();
  const memoStats = useMemo(() => stats, []);
  const memoBreadcrumbs = useMemo(() => breadcrumbs, []);
  const handleDummy = useCallback(() => {}, []);
  
  const features = (subscription as unknown as Record<string, unknown>)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  return (
    <PageLayout
      title="Petugas Absensi"
      description="Kelola hak akses petugas yang berwenang mencatat kehadiran di sekolah Anda."
      stats={memoStats}
      instruction={instructionData}
      breadcrumbs={memoBreadcrumbs}
      hardeningModuleKey="petugaspage"
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Manajemen Petugas Absensi"
        description="Kelola hak akses petugas (guru/siswa) yang berwenang mencatat kehadiran di gerbang or kelas."
      >
        <Card className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8">
          <Suspense fallback={<div className="flex justify-center py-20"><Loader /></div>}>
            <PetugasList />
          </Suspense>
        </Card>
      </PremiumFeatureGate>
    </PageLayout>
  );
});

PetugasPage.displayName = 'PetugasPage';

export default PetugasPage;
