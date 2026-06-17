import React, { Suspense } from 'react';
import PetugasList from '../../components/attendance/petugas/PetugasList';
import { Loader } from '../../components/ui/Loader';
import { Users, ShieldCheck, UserPlus, Info } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import PageLayout from '../../components/common/PageLayout';

export default function PetugasPage() {
  const { subscription } = useAuthStore();
  
  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

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

  return (
    <PageLayout
      title="Petugas Absensi"
      description="Kelola hak akses petugas yang berwenang mencatat kehadiran di sekolah Anda."
      stats={stats}
      instruction={instructionData}
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Manajemen Petugas Absensi"
        description="Kelola hak akses petugas (guru/siswa) yang berwenang mencatat kehadiran di gerbang atau kelas."
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-8">
          <Suspense fallback={<div className="flex justify-center py-20"><Loader /></div>}>
            <PetugasList />
          </Suspense>
        </div>
      </PremiumFeatureGate>
    </PageLayout>
  );
}
