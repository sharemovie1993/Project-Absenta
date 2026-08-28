import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { FileText, Calendar, BarChart3, Users, BookOpen } from 'lucide-react';
import { SectionCard } from '../../../components/ui/SectionCard';
import { TabSwitcher } from '../../../components/ui/TabSwitcher';

// Lazy Loaded Subcomponents (Pilar 13)
const PremiumFeatureGate = lazy(() => import('../../../components/auth/PremiumFeatureGate'));
const RekapBulananKelasContent = lazy(() => import('./RekapBulananKelasPage').then(m => ({ default: m.RekapBulananKelasContent })));
const RekapBulananMapelContent = lazy(() => import('./RekapBulananMapelPage').then(m => ({ default: m.RekapBulananMapelContent })));

type RekapTab = 'BULANAN_KELAS' | 'BULANAN_MAPEL';

export const RekapPage: React.FC<{ initialTab?: RekapTab }> = React.memo(({ initialTab }) => {
  const [searchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab');
  const defaultTab: RekapTab = tabFromQuery === 'mapel' || initialTab === 'BULANAN_MAPEL' ? 'BULANAN_MAPEL' : 'BULANAN_KELAS';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const { subscription } = useAuthStore();
  const { can } = useCapabilities();
  const subRecord = subscription as unknown as Record<string, unknown> | null;
  const subFeatures = (subRecord?.features as string[]) || (subRecord?.Plan as { features_json?: string[] })?.features_json || (subRecord?.plan as { features_json?: string[] })?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  const memoBreadcrumbs = useMemo(() => [
    { label: 'Presensi', path: '/attendance/ops' },
    { label: 'Laporan & Rekap Presensi' }
  ], []);

  const memoStats = useMemo(() => [
    {
      title: "Laporan Presensi",
      value: "Real-time",
      icon: <FileText size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Terintegrasi sistem gerbang & KBM"
    },
    {
      title: "Laporan Bulanan",
      value: "Akumulatif & Leger",
      icon: <Calendar size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Dual Tampilan (Akumulasi & Per Hari)"
    },
    {
      title: "Statistik Kelas & Mapel",
      value: "Komparatif",
      icon: <BarChart3 size={14} />,
      gradient: "from-purple-500 to-violet-600",
      subtitle: "Perbandingan performa presensi"
    }
  ], []);

  const instructionData = useMemo(() => ({
    title: "Panduan Laporan Rekap Presensi",
    description: "Halaman ini menyajikan rekapitulasi data kehadiran siswa per kelas dan per mata pelajaran secara menyeluruh.",
    items: [
      { text: "Pilih Tab 'Bulanan Per Kelas' untuk melihat presensi akumulatif seluruh siswa kelas." },
      { text: "Pilih Tab 'Rekap Per Mapel' untuk melihat presensi siswa khusus pada sesi mata pelajaran tertentu." },
      { text: "Gunakan sakelar tampilan 'Total Akumulasi' dan 'Detail Per Hari' (Matrix 1..31) untuk cetak laporan PDF/Excel." }
    ]
  }), []);

  const tabs = useMemo(() => [
    {
      id: 'BULANAN_KELAS',
      label: 'Bulanan Per Kelas',
      icon: Users
    },
    {
      id: 'BULANAN_MAPEL',
      label: 'Rekap Per Mapel',
      icon: BookOpen
    }
  ], []);

  return (
    <InfraErrorBoundary>
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat...</div>}>
        <PremiumFeatureGate
          isLocked={isLocked}
          moduleName="ABSENSI"
          featureName="Rekapitulasi Kehadiran"
          description="Lihat ringkasan kehadiran siswa secara harian, bulanan, per kelas, maupun per mata pelajaran dengan data yang akurat."
        >
          <AcademicPageLayout
            title="Laporan &amp; Rekap Presensi"
            description="Rekapitulasi data kehadiran siswa dalam format akumulasi dan detail harian per kelas maupun per mata pelajaran."
            instruction={instructionData}
            breadcrumbs={memoBreadcrumbs}
            hardeningModuleKey="rekappage"
          >
            <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
              <div className="space-y-6 w-full min-w-0 max-w-full">
                {/* Reusable TabSwitcher (Pilar 30) */}
                <TabSwitcher
                  tabs={tabs}
                  activeTab={activeTab}
                  onChange={handleTabChange}
                />

                {/* Tab Content */}
                <div className="w-full min-w-0 max-w-full">
                  <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat konten rekapitulasi...</div>}>
                    {activeTab === 'BULANAN_KELAS' ? (
                      <RekapBulananKelasContent />
                    ) : (
                      <RekapBulananMapelContent />
                    )}
                  </Suspense>
                </div>
              </div>
            </SectionCard>
          </AcademicPageLayout>
        </PremiumFeatureGate>
      </Suspense>
    </InfraErrorBoundary>
  );
});

export default RekapPage;
