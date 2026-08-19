import React, { useMemo, useCallback } from 'react';
import { MonitoringKbmWidget } from '../../../components/dashboard/shared/MonitoringKbmWidget';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import { useCapabilities } from '../../../hooks/useCapabilities';
import PageLayout from '../../../components/common/PageLayout';
import Card from '../../../components/ui/Card';
import { Activity } from 'lucide-react';

const stats = [
  {
    title: "Pemantauan",
    value: "KBM",
    icon: <Activity size={14} />,
    gradient: "from-blue-500 to-indigo-600",
    subtitle: "Real-time Kelas"
  }
];

const instructionData = {
  title: "Panduan Monitoring Live KBM",
  description: "Pantau presensi kelas & keberadaan guru di kelas secara real-time saat ini.",
  items: [
    { text: "Daftar kelas yang sedang berlangsung saat ini ditampilkan beserta gurunya." },
    { text: "Guru Piket dapat menugaskan pengganti (Inval) jika ada kelas kosong." }
  ]
};

const breadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Monitoring Live KBM', active: true }
];

const MonitoringKbmPage: React.FC = React.memo(() => {
  const { isKurikulum, isKesiswaan, isPiketGuru, isAdmin, can } = useCapabilities();
  const memoStats = useMemo(() => stats, []);
  const memoBreadcrumbs = useMemo(() => breadcrumbs, []);
  const handleDummy = useCallback(() => {}, []);

  return (
    <PageLayout
      title="Monitoring Live KBM"
      description="Pantau aktivitas pembelajaran & keberadaan guru di kelas secara real-time saat ini."
      stats={memoStats}
      instruction={instructionData}
      breadcrumbs={memoBreadcrumbs}
      hardeningModuleKey="monitoringkbmpage"
    >
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Monitoring KBM (Realtime Dashboard)"
        description="Dapatkan pandangan menyeluruh terhadap seluruh aktivitas belajar mengajar yang sedang berlangsung di sekolah Anda."
      >
        <MonitoringKbmWidget isExecutive={false} />
      </PremiumFeatureGate>
    </PageLayout>
  );
});

export default MonitoringKbmPage;
