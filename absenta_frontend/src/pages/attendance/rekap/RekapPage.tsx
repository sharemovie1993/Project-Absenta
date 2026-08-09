import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RekapBulananKelasContent } from './RekapBulananKelasPage';
import { RekapBulananMapelContent } from './RekapBulananMapelPage';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';
import { FileText, Calendar, BarChart3, Users, BookOpen } from 'lucide-react';
import Card from '../../../components/ui/Card';

const rekapBreadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Laporan & Rekap Presensi', active: true }
];

const rekapStats = [
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
];

type RekapTab = 'BULANAN_KELAS' | 'BULANAN_MAPEL';

export default React.memo(function RekapPage({ initialTab }: { initialTab?: RekapTab }) {
  const [searchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab');
  const defaultTab: RekapTab = tabFromQuery === 'mapel' || initialTab === 'BULANAN_MAPEL' ? 'BULANAN_MAPEL' : 'BULANAN_KELAS';
  const [activeTab, setActiveTab] = useState<RekapTab>(defaultTab);

  const memoStats = useMemo(() => rekapStats, []);
  const memoBreadcrumbs = useMemo(() => rekapBreadcrumbs, []);

  const { subscription } = useAuthStore();
  const { isKurikulum, isKesiswaan, isHomeroomTeacher, isAdmin, can } = useCapabilities();
  const subRecord = subscription as unknown as Record<string, unknown> | null;
  const subFeatures = subRecord?.features || subRecord?.Plan?.features_json || subRecord?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  const instructionData = {
    title: "Panduan Laporan Rekap Presensi",
    description: "Halaman ini menyajikan rekapitulasi data kehadiran siswa per kelas dan per mata pelajaran secara menyeluruh.",
    items: [
      { text: "Pilih Tab 'Bulanan Per Kelas' untuk melihat presensi akumulatif seluruh siswa kelas." },
      { text: "Pilih Tab 'Rekap Per Mapel' untuk melihat presensi siswa khusus pada sesi mata pelajaran tertentu." },
      { text: "Gunakan sakelar tampilan 'Total Akumulasi' dan 'Detail Per Hari' (Matrix 1..31) untuk cetak laporan PDF/Excel." }
    ]
  };

  return (
    <AcademicPageLayout
      title="Laporan & Rekap Presensi"
      description="Rekapitulasi data kehadiran siswa dalam format akumulasi dan detail harian per kelas maupun per mata pelajaran."
      stats={memoStats}
      instruction={instructionData}
      breadcrumbs={memoBreadcrumbs}
      hardeningModuleKey="rekappage"
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Rekapitulasi Kehadiran"
        description="Lihat ringkasan kehadiran siswa secara harian, bulanan, per kelas, maupun per mata pelajaran dengan data yang akurat."
      >
        <Card className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-6 space-y-6">
          {/* TAB BAR REKAP */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 max-w-md">
            <button
              type="button"
              onClick={() => setActiveTab('BULANAN_KELAS')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'BULANAN_KELAS'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md shadow-slate-200/50 dark:shadow-none'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Users size={15} /> Bulanan Per Kelas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BULANAN_MAPEL')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'BULANAN_MAPEL'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-slate-200/50 dark:shadow-none'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BookOpen size={15} /> Rekap Per Mapel
            </button>
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'BULANAN_KELAS' ? (
            <RekapBulananKelasContent />
          ) : (
            <RekapBulananMapelContent />
          )}
        </Card>
      </PremiumFeatureGate>
    </AcademicPageLayout>
  );
});
