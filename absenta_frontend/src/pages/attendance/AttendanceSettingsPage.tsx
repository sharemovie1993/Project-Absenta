import React, { lazy, Suspense, useMemo } from 'react';
const KejadianKhususPanel = lazy(() => import('../../components/attendance/settings/KejadianKhususPanel').then(module => ({ default: module.KejadianKhususPanel })));
import { 
  Alert, 
  AlertDescription, 
  Loader 
} from '../../components/ui';
import { useCapabilities } from '../../hooks/useCapabilities';
import { 
  Bell, 
  Fingerprint 
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import PageLayout from '../../components/common/PageLayout';

const stats = [
  {
    title: "Modul",
    value: "Kejadian Khusus",
    icon: <Bell size={14} />,
    gradient: "from-purple-600 to-indigo-700",
    subtitle: "Override & Dispensasi"
  },
  {
    title: "Keamanan",
    value: "Proteksi Data",
    icon: <Fingerprint size={14} />,
    gradient: "from-blue-600 to-indigo-700",
    subtitle: "Validasi Log Presensi"
  }
];

const instructionData = {
  title: "Kejadian Khusus & Dispensasi",
  description: "Konfigurasikan hari libur mendadak, dispensasi acara massal, dan override presensi insidental.",
  items: [
    { text: "Tambahkan Kejadian Khusus jika terjadi kondisi darurat, bencana, atau kegiatan insidental sekolah." },
    { text: "Mode LIBUR otomatis menonaktifkan deteksi alfa/terlambat pada tanggal yang ditentukan." },
    { text: "Pengaturan jam operasional gerbang default sekolah dikelola terpusat di menu Setelan." }
  ]
};

const breadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Kejadian Khusus', active: true }
];

export const AttendanceSettingsPage: React.FC = React.memo(() => {
  const { subscription } = useAuthStore();
  const { can, isAdmin } = useCapabilities();

  const memoStats = useMemo(() => stats, []);
  const memoBreadcrumbs = useMemo(() => breadcrumbs, []);

  const features = (subscription as unknown as Record<string, unknown>)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  if (!can('attendance.events.view.list') && !isAdmin) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  return (
    <PageLayout
      title="Kejadian Khusus Presensi"
      description="Kelola hari libur mendadak, dispensasi massal, dan penyesuaian aturan presensi insidental."
      stats={memoStats}
      instruction={instructionData}
      breadcrumbs={memoBreadcrumbs}
      hardeningModuleKey="attendancesettingspage"
    >
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Kejadian Khusus Presensi"
        description="Atur hari libur mendadak, dispensasi massal, dan penyesuaian aturan presensi insidental sekolah Anda."
      >
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Suspense fallback={<Loader size="lg" />}>
            <KejadianKhususPanel />
          </Suspense>
        </div>
      </PremiumFeatureGate>
    </PageLayout>
  );
});

AttendanceSettingsPage.displayName = 'AttendanceSettingsPage';

export default AttendanceSettingsPage;
