import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitoringKbmWidget } from '../../../components/dashboard/shared/MonitoringKbmWidget';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import { useCapabilities } from '../../../hooks/useCapabilities';
import PageLayout from '../../../components/common/PageLayout';
import { SectionCard } from '../../../components/ui/SectionCard';
import { Button } from '../../../components/ui';
import { Activity, CalendarDays, Sliders } from 'lucide-react';

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
    { text: "Guru Piket dapat menugaskan pengganti (Inval) jika ada kelas kosong." },
    { text: "Gunakan pintasan Kejadian Khusus jika suatu rombel/kelas sedang berstatus dispensasi." }
  ]
};

const breadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Monitoring Live KBM', active: true }
];

const MonitoringKbmPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { isKurikulum, isKesiswaan, isPiket, isAdmin, isKepsek } = useCapabilities();
  const memoStats = useMemo(() => stats, []);
  const memoBreadcrumbs = useMemo(() => breadcrumbs, []);

  const toolbar = useMemo(() => (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="toolbarOutline"
        size="toolbar"
        onClick={() => navigate('/attendance/settings')}
        className="rounded-xl flex items-center gap-1.5 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100"
      >
        <CalendarDays size={14} className="text-purple-600 dark:text-purple-400" />
        <span className="font-bold text-xs">Kejadian Khusus (Dispensasi)</span>
      </Button>
      {(isAdmin || isKurikulum || isKepsek) && (
        <Button
          variant="toolbarOutline"
          size="toolbar"
          onClick={() => navigate('/settings?tab=attendance')}
          className="rounded-xl flex items-center gap-1.5 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100"
        >
          <Sliders size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-xs">Aturan Jam & Toleransi</span>
        </Button>
      )}
    </div>
  ), [navigate, isAdmin, isKurikulum, isKepsek]);

  return (
    <PageLayout
      title="Monitoring Live KBM"
      description="Pantau aktivitas pembelajaran & keberadaan guru di kelas secara real-time saat ini."
      stats={memoStats}
      instruction={instructionData}
      breadcrumbs={memoBreadcrumbs}
      toolbar={toolbar}
      hardeningModuleKey="monitoringkbmpage"
    >
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Monitoring KBM (Realtime Dashboard)"
        description="Dapatkan pandangan menyeluruh terhadap seluruh aktivitas belajar mengajar yang sedang berlangsung di sekolah Anda."
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 p-0 border-0 shadow-none bg-transparent">
          <MonitoringKbmWidget isExecutive={false} />
        </SectionCard>
      </PremiumFeatureGate>
    </PageLayout>
  );
});

export default MonitoringKbmPage;
