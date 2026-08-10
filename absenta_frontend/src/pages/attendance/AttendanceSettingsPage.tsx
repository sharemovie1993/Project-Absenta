import React, { useState, lazy, Suspense, useMemo, useCallback } from 'react';
const TenantAttendanceForm = lazy(() => import('../../components/attendance/settings/TenantAttendanceForm').then(module => ({ default: module.TenantAttendanceForm })));
const KejadianKhususPanel = lazy(() => import('../../components/attendance/settings/KejadianKhususPanel').then(module => ({ default: module.KejadianKhususPanel })));
const KelasScheduleList = lazy(() => import('../../components/attendance/settings/KelasScheduleList').then(module => ({ default: module.KelasScheduleList })));
import { 
  Tabs, 
  TabsContent, 
  Alert, 
  AlertDescription, 
  Loader,
  Card 
} from '../../components/ui';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { useCapabilities } from '../../hooks/useCapabilities';
import { 
  Settings, 
  CalendarDays, 
  Clock, 
  ShieldAlert, 
  Sliders,
  Bell,
  Fingerprint
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import PageLayout from '../../components/common/PageLayout';

const stats = [
  {
    title: "Konfigurasi",
    value: "Modul Absensi",
    icon: <Settings size={14} />,
    gradient: "from-slate-700 to-slate-900",
    subtitle: "Sistem Manajemen Kehadiran"
  },
  {
    title: "Security",
    value: "Enterprise",
    icon: <Fingerprint size={14} />,
    gradient: "from-blue-600 to-indigo-700",
    subtitle: "Validasi IoT & Biometrik"
  }
];

const instructionData = {
  title: "Pengaturan Modul",
  description: "Konfigurasikan aturan kehadiran dan jadwal operasional absensi sekolah.",
  items: [
    { text: "Atur toleransi keterlambatan dan poin kedisiplinan pada Pengaturan Umum." },
    { text: "Gunakan Kejadian Khusus untuk hari libur atau acara sekolah mendadak." },
    { text: "Jadwal Kelas (Shift) mengatur waktu operasional gerbang untuk tiap kelas." }
  ]
};

const breadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Pengaturan Absensi', active: true }
];

export const AttendanceSettingsPage: React.FC = React.memo(() => {
  const { subscription } = useAuthStore();
  const { isAdmin, can } = useCapabilities();
  const [activeTab, setActiveTab] = useState('general');

  const memoStats = useMemo(() => stats, []);
  const memoBreadcrumbs = useMemo(() => breadcrumbs, []);
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const tabOptions = useMemo(() => [
    { id: 'general', label: 'Pengaturan Umum', icon: Sliders, colorClass: 'text-indigo-650 dark:text-indigo-400' },
    { id: 'events', label: 'Kejadian Khusus', icon: Bell, colorClass: 'text-purple-650 dark:text-purple-400' },
    { id: 'classes', label: 'Jadwal Kelas (Shift)', icon: Clock, colorClass: 'text-emerald-650 dark:text-emerald-400' }
  ], []);

  const features = (subscription as unknown as Record<string, unknown>)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  if (!can('attendance.gate.bypass')) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const pageContent = (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabSwitcher
          options={tabOptions}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="mb-8"
        />

        <TabsContent value="general" className="mt-0 focus-visible:outline-none">
          <Card className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <Suspense fallback={<Loader size="sm" />}>
              <TenantAttendanceForm />
            </Suspense>
          </Card>
        </TabsContent>
 
        <TabsContent value="events" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<Loader size="sm" />}>
            <KejadianKhususPanel />
          </Suspense>
        </TabsContent>
 
        <TabsContent value="classes" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<Loader size="sm" />}>
            <KelasScheduleList />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <PageLayout
      title="Pengaturan Absensi"
      description="Atur aturan kehadiran, toleransi keterlambatan, dan jadwal operasional modul absensi."
      stats={memoStats}
      instruction={instructionData}
      breadcrumbs={memoBreadcrumbs}
      hardeningModuleKey="attendancesettingspage"
    >
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Konfigurasi Modul Absensi"
        description="Atur aturan kehadiran, toleransi keterlambatan, kejadian khusus, dan jadwal operasional sekolah Anda."
      >
        {pageContent}
      </PremiumFeatureGate>
    </PageLayout>
  );
});

AttendanceSettingsPage.displayName = 'AttendanceSettingsPage';

export default AttendanceSettingsPage;
