import React from 'react';
import { TenantAttendanceForm } from '../../components/attendance/settings/TenantAttendanceForm';
import { KejadianKhususPanel } from '../../components/attendance/settings/KejadianKhususPanel';
import { KelasScheduleList } from '../../components/attendance/settings/KelasScheduleList';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent, 
  Alert, 
  AlertDescription, 
  Loader 
} from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
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

export const AttendanceSettingsPage: React.FC = () => {
  const { subscription } = useAuthStore();
  const { can, isLoading: isAuthLoading } = useAuth();

  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  if (isAuthLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  if (!can('attendance.gate.bypass')) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

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

  const pageContent = (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm inline-flex mb-8">
          <TabsTrigger value="general" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
            <Sliders className="w-3.5 h-3.5 mr-2" /> Pengaturan Umum
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
            <Bell className="w-3.5 h-3.5 mr-2" /> Kejadian Khusus
          </TabsTrigger>
          <TabsTrigger value="classes" className="rounded-xl px-6 py-2.5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
            <Clock className="w-3.5 h-3.5 mr-2" /> Jadwal Kelas (Shift)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0 focus-visible:outline-none">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <TenantAttendanceForm />
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-0 focus-visible:outline-none">
          <KejadianKhususPanel />
        </TabsContent>

        <TabsContent value="classes" className="mt-0 focus-visible:outline-none">
          <KelasScheduleList />
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <PageLayout
      title="Pengaturan Absensi"
      description="Atur aturan kehadiran, toleransi keterlambatan, dan jadwal operasional modul absensi."
      stats={stats}
      instruction={instructionData}
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
};

export default AttendanceSettingsPage;
