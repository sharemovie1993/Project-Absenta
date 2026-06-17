import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import RekapHarianSiswaPage from './RekapHarianSiswaPage';
import RekapBulananSiswaPage from './RekapBulananSiswaPage';
import RekapBulananKelasPage from './RekapBulananKelasPage';

import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import PageLayout from '../../../components/common/PageLayout';
import { FileText, Calendar, Users, BarChart3 } from 'lucide-react';

export default function RekapPage() {
  const { subscription } = useAuthStore();
  const [tab, setTab] = useState('HARIAN_SISWA');

  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  
  const instructionData = {
    title: "Panduan Rekapitulasi",
    description: "Halaman ini menyajikan ringkasan data kehadiran siswa dalam berbagai format laporan.",
    items: [
      { text: "Pilih tab 'Harian Per Siswa' untuk melihat detail log absensi harian." },
      { text: "Gunakan 'Bulanan Per Siswa' untuk melihat akumulasi kehadiran bulanan individu." },
      { text: "Gunakan 'Bulanan Per Kelas' untuk melihat statistik perbandingan antar siswa dalam satu kelas." }
    ]
  };

  const rekapStats = [
    {
      title: "Laporan Harian",
      value: "Real-time",
      icon: <FileText size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Update setiap transaksi"
    },
    {
      title: "Laporan Bulanan",
      value: "Akumulatif",
      icon: <Calendar size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Ringkasan tiap periode"
    },
    {
      title: "Statistik Kelas",
      value: "Komparatif",
      icon: <BarChart3 size={14} />,
      gradient: "from-purple-500 to-violet-600",
      subtitle: "Perbandingan performa"
    }
  ];

  return (
    <PageLayout
      title="Rekapitulasi Kehadiran"
      description="Pusat pelaporan dan analisis kehadiran siswa terpadu."
      stats={rekapStats}
      instruction={instructionData}
    >
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Rekapitulasi Kehadiran"
        description="Lihat ringkasan kehadiran siswa secara harian, bulanan, maupun per kelas dengan data yang akurat dan transparan."
      >
        <div className="space-y-6">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm inline-flex mb-2">
              <TabsList className="bg-transparent border-none gap-1">
                <TabsTrigger 
                  value="HARIAN_SISWA" 
                  className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300"
                >
                  Harian Per Siswa
                </TabsTrigger>
                <TabsTrigger 
                  value="BULANAN_SISWA"
                  className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300"
                >
                  Bulanan Per Siswa
                </TabsTrigger>
                <TabsTrigger 
                  value="BULANAN_KELAS"
                  className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300"
                >
                  Bulanan Per Kelas
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <TabsContent value="HARIAN_SISWA" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <RekapHarianSiswaPage />
              </TabsContent>
              <TabsContent value="BULANAN_SISWA" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <RekapBulananSiswaPage />
              </TabsContent>
              <TabsContent value="BULANAN_KELAS" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <RekapBulananKelasPage />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </PremiumFeatureGate>
    </PageLayout>
  );
}
