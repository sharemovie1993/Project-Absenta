import React, { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Target,
  BarChart3,
  ChevronRight,
  BookOpen,
  Settings
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { kurikulumApi } from '../../api/kurikulum.api';
import { tahunPelajaranApi } from '../../api/academic.api';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useJenjang } from '../../hooks/useJenjang';

interface StrukturItem {
  id: string;
  tingkat: number;
  jp_per_minggu: number;
  kelompok?: string;
  [key: string]: unknown;
}

interface GradeStats {
  count: number;
  totalJp: number;
}

const StrukturKurikulumPage: React.FC = () => {
  const navigate = useNavigate();
  const { tingkatList } = useJenjang();

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => tahunPelajaranApi.getAll()
  });

  const activeYear = useMemo(() => (years?.data ?? []).find(y => y.is_active), [years]);

  const { data: mapping, isLoading } = useQuery({
    queryKey: ['kurikulum-struktur-summary', activeYear?.id],
    queryFn: () => kurikulumApi.getStruktur({ tahun_pelajaran_id: activeYear?.id }),
    enabled: !!activeYear
  });

  const statsByGrade = useMemo<Record<number, GradeStats>>(() => {
    if (!mapping?.data) return {};
    const stats: Record<number, GradeStats> = {};

    ((mapping.data ?? []) as StrukturItem[]).forEach((item) => {
      if (!stats[item.tingkat]) stats[item.tingkat] = { count: 0, totalJp: 0 };
      stats[item.tingkat].count++;
      stats[item.tingkat].totalJp += item.jp_per_minggu ?? 0;
    });

    return stats;
  }, [mapping]);

  const distribusiKelompok = useMemo<Record<string, number>>(() => {
    if (!mapping?.data) return {};
    return ((mapping.data ?? []) as StrukturItem[]).reduce<Record<string, number>>((acc, curr) => {
      const cat = curr.kelompok ?? 'UMUM';
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {});
  }, [mapping]);

  const handleManagePlotting = useCallback(() => navigate('/kurikulum/plotting'), [navigate]);

  const statsGrid = useMemo(() => {
    return tingkatList.map((grade) => {
      const s = statsByGrade[grade] ?? { count: 0, totalJp: 0 };
      return (
        <Card key={grade} className="p-6 border-none shadow-sm group hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 -mr-12 -mt-12 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase">TINGKAT {grade}</Badge>
              <Target size={20} className="text-indigo-400" />
            </div>

            <div>
              {isLoading ? <Skeleton className="h-10 w-20" /> : <p className="text-4xl font-black text-gray-900 dark:text-white">{s.totalJp}</p>}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Jam / Minggu</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
              <div className="flex items-center text-xs font-bold text-gray-500">
                <BookOpen size={14} className="mr-1.5" />
                {s.count} Mata Pelajaran
              </div>
            </div>
          </div>
        </Card>
      );
    });
  }, [statsByGrade, isLoading]);

  const distribusiContent = useMemo(() => {
     if (isLoading) return [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />);
     
     const entries = Object.entries(distribusiKelompok);
     if (entries.length === 0) {
       return (
         <div className="py-10 text-center text-gray-400 text-xs italic">
           Belum ada data distribusi kelompok mata pelajaran.
         </div>
       );
     }

     return entries?.map(([key, val]) => (
       <div key={key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
         <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{key}</span>
         <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold border-none">{val} Mapel</Badge>
       </div>
     ));
   }, [distribusiKelompok, isLoading]);

   const breadcrumbs = useMemo(() => [
     { label: 'Kurikulum', href: '/kurikulum' },
     { label: 'Struktur Kurikulum' }
   ], []);

   return (
    <AcademicPageLayout
      title="Struktur Kurikulum"
      description="Overview pembagian beban belajar dan kurikulum operasional."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="strukturkurikulumpage"
      instruction={{
        title: 'Panduan Struktur Kurikulum',
        description: 'Halaman ini menampilkan ringkasan alokasi jam pelajaran (JP) per tingkat kelas berdasarkan tahun pelajaran aktif.',
        items: [
          { text: 'Pastikan sudah ada Tahun Pelajaran yang diaktifkan di menu Akademik sebelum menggunakan halaman ini.' },
          { text: 'Data jam pelajaran diambil dari master struktur kurikulum yang telah dikonfigurasi.' },
          { text: 'Klik tombol "KELOLA PLOTTING JP" untuk mengubah alokasi jam pelajaran per mata pelajaran.' }
        ]
      }}
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Struktur Kurikulum</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Overview pembagian beban belajar dan kurikulum operasional.</p>
          </div>
          <Button
            onClick={handleManagePlotting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none font-black"
          >
            <Settings className="w-4 h-4 mr-2" />
            KELOLA PLOTTING JP
          </Button>
        </div>

        {!activeYear && !isLoading && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl border border-amber-200 dark:border-amber-800 text-sm font-bold flex items-center">
            <span className="mr-2">⚠️</span>
            Tahun Pelajaran Aktif tidak ditemukan. Harap aktifkan Tahun Pelajaran di menu Akademik.
          </div>
        )}

        {activeYear && !isLoading && !mapping?.data?.length && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800 text-gray-500 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium flex items-center">
            <span className="mr-2">📋</span>
            Belum ada data struktur kurikulum untuk tahun pelajaran ini. Mulai dengan menambahkan plotting JP.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsGrid}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border-none shadow-sm space-y-4">
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center text-sm">
              <BarChart3 size={18} className="mr-2 text-indigo-500" />
              Distribusi Kelompok Mapel
            </h3>
            <div className="space-y-3">
              {distribusiContent}
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-3 bg-white/10 rounded-xl w-fit">
                  <Layers size={24} className="text-indigo-400" />
                </div>
                <h4 className="text-xl font-bold">Siapkan Jadwal Mingguan</h4>
                <p className="text-sm text-white/50 leading-relaxed font-medium">
                  Setelah struktur kurikulum (JP) selesai dipetakan, sistem akan mengotomatisasi pembuatan slot jadwal pelajaran untuk setiap kelas.
                </p>
              </div>
              <Button
                onClick={handleManagePlotting}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl border-none h-12"
              >
                PENGATURAN LANJUTAN
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default StrukturKurikulumPage;
