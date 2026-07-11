import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Target,
  BarChart3,
  ChevronRight,
  BookOpen,
  Settings,
  Search
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
import { cn } from '../../lib/utils';

interface StrukturItem {
  id: string;
  tingkat: number;
  jp_per_minggu: number;
  kelompok?: string;
  Mapel?: {
    nama_mapel: string;
    kode_mapel: string;
  };
  [key: string]: unknown;
}

interface GradeStats {
  count: number;
  totalJp: number;
}

const StrukturKurikulumPage: React.FC = () => {
  const navigate = useNavigate();
  const { tingkatList } = useJenjang();

  const [selectedTingkat, setSelectedTingkat] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState<string>('ALL');

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

  // Set default selectedTingkat to first element in tingkatList when available
  React.useEffect(() => {
    if (tingkatList.length > 0 && selectedTingkat === null) {
      setSelectedTingkat(tingkatList[0]);
    }
  }, [tingkatList, selectedTingkat]);

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

  const filteredData = useMemo(() => {
    if (!mapping?.data || selectedTingkat === null) return [];
    
    return ((mapping.data ?? []) as StrukturItem[]).filter(item => {
      if (item.tingkat !== selectedTingkat) return false;
      
      const matchesSearch = !searchTerm || 
        item.Mapel?.nama_mapel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Mapel?.kode_mapel?.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesKelompok = selectedKelompok === 'ALL' || item.kelompok === selectedKelompok;
      
      return matchesSearch && matchesKelompok;
    });
  }, [mapping, selectedTingkat, searchTerm, selectedKelompok]);

  const selectedGradeStats = useMemo(() => {
    const defaultStats = { totalJp: 0, mapelCount: 0, byKelompok: {} as Record<string, { jp: number, count: number }> };
    if (!mapping?.data || selectedTingkat === null) return defaultStats;
    
    const gradeData = ((mapping.data ?? []) as StrukturItem[]).filter(item => item.tingkat === selectedTingkat);
    
    return gradeData.reduce((acc, curr) => {
      acc.totalJp += curr.jp_per_minggu ?? 0;
      acc.mapelCount++;
      
      const kel = curr.kelompok ?? 'NASIONAL';
      if (!acc.byKelompok[kel]) {
        acc.byKelompok[kel] = { jp: 0, count: 0 };
      }
      acc.byKelompok[kel].jp += curr.jp_per_minggu ?? 0;
      acc.byKelompok[kel].count++;
      
      return acc;
    }, { totalJp: 0, mapelCount: 0, byKelompok: {} as Record<string, { jp: number, count: number }> });
  }, [mapping, selectedTingkat]);

  const handleManagePlotting = useCallback(() => navigate('/kurikulum/plotting'), [navigate]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik', path: '/academic' },
    { label: 'Kurikulum', path: '/kurikulum' },
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
        description: 'Halaman ini menampilkan alokasi jam pelajaran (JP) per tingkat kelas berdasarkan tahun pelajaran aktif.',
        items: [
          { text: 'Pilih tingkat kelas pada kartu di atas untuk memfilter daftar mata pelajaran di bawah.' },
          { text: 'Pastikan total JP per minggu di setiap tingkat telah sesuai dengan standar Kurikulum Merdeka.' },
          { text: 'Klik "KELOLA PLOTTING JP" untuk menambah atau mengubah pembagian jam pelajaran.' }
        ]
      }}
    >
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">
              Tahun Pelajaran: {activeYear ? activeYear.tahun : 'Memuat...'}
            </span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tingkatList.map((grade) => {
            const s = statsByGrade[grade] ?? { count: 0, totalJp: 0 };
            const isActive = selectedTingkat === grade;
            return (
              <Card 
                key={grade} 
                onClick={() => setSelectedTingkat(grade)}
                className={cn(
                  "p-6 border transition-all cursor-pointer relative overflow-hidden group select-none rounded-2xl",
                  isActive 
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/10" 
                    : "border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-gray-250 dark:hover:border-slate-700 shadow-sm"
                )}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 -mr-12 -mt-12 rounded-full group-hover:scale-110 transition-transform"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={isActive ? "primary" : "outline"} className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg">
                      TINGKAT {grade}
                    </Badge>
                    <Target className={cn("w-5 h-5 transition-colors", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400")} />
                  </div>

                  <div>
                    {isLoading ? (
                      <Skeleton className="h-10 w-20" />
                    ) : (
                      <p className="text-4xl font-black text-slate-850 dark:text-white leading-none">{s.totalJp}</p>
                    )}
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">Total Jam / Minggu</p>
                  </div>

                  <div className={cn(
                    "flex items-center justify-between pt-4 border-t transition-colors",
                    isActive ? "border-indigo-100 dark:border-indigo-900/40" : "border-slate-50 dark:border-slate-900"
                  )}>
                    <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <BookOpen size={12} className="mr-1.5 text-indigo-500" />
                      {s.count} Mata Pelajaran
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {selectedTingkat !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-8 flex">
              <Card className="p-6 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col justify-between w-full">
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-50 dark:border-slate-900">
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center text-sm">
                        <BookOpen size={16} className="mr-2 text-indigo-600" />
                        Daftar Mapel - Tingkat {selectedTingkat}
                      </h3>
                      <p className="text-[10px] text-gray-450 font-bold uppercase mt-1">
                        Menampilkan {filteredData.length} dari {selectedGradeStats.mapelCount} mata pelajaran
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          placeholder="Cari mapel..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-48 h-9 pl-9 pr-3 text-xs rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50/50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        />
                      </div>

                      <select
                        value={selectedKelompok}
                        onChange={(e) => setSelectedKelompok(e.target.value)}
                        className="h-9 px-3 text-xs rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50/50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer outline-none"
                      >
                        <option value="ALL">SEMUA KELOMPOK</option>
                        <option value="NASIONAL">NASIONAL</option>
                        <option value="KEJURUAN">KEJURUAN</option>
                        <option value="PILIHAN">PILIHAN</option>
                        <option value="LOKAL">MUATAN LOKAL</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Kelompok</th>
                          <th className="px-4 py-3">Mata Pelajaran</th>
                          <th className="px-4 py-3 text-center">Beban Belajar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                        {isLoading ? (
                          [1, 2, 3, 4].map(i => (
                            <tr key={i}>
                              <td className="px-4 py-3" colSpan={3}>
                                <Skeleton className="h-10 w-full rounded-xl" />
                              </td>
                            </tr>
                          ))
                        ) : filteredData.length === 0 ? (
                          <tr>
                            <td className="px-4 py-16 text-center text-xs font-bold text-gray-400 italic" colSpan={3}>
                              Tidak ada mata pelajaran yang cocok dengan filter.
                            </td>
                          </tr>
                        ) : (
                          filteredData.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="px-4 py-3">
                                <Badge className={cn(
                                  "font-bold border-none px-2 py-0.5 rounded text-[9px] uppercase",
                                  item.kelompok === 'KEJURUAN' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" :
                                  item.kelompok === 'PILIHAN' ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" :
                                  item.kelompok === 'LOKAL' ? "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400" :
                                  "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400"
                                )}>
                                  {item.kelompok || 'NASIONAL'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.Mapel?.nama_mapel}</p>
                                  <p className="text-[9px] font-mono text-gray-400 mt-0.5">{item.Mapel?.kode_mapel}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{item.jp_per_minggu}</span>
                                <span className="text-[9px] font-bold text-gray-450 ml-1">JP / Minggu</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-900 text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    * JP: Jam Pelajaran (1 JP bernilai 45 menit)
                  </span>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className="p-6 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-6">
                <div className="space-y-1">
                  <h3 className="font-black text-slate-850 dark:text-white uppercase tracking-tight text-xs flex items-center">
                    <BarChart3 size={15} className="mr-2 text-indigo-600" />
                    Metrik Beban Tingkat {selectedTingkat}
                  </h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Analisis alokasi jam</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedGradeStats.totalJp} JP</p>
                    <p className="text-[9px] text-gray-450 font-bold uppercase tracking-wider">Total Beban Kelas</p>
                  </div>
                  <div className={cn(
                    "text-[10px] font-black uppercase px-2.5 py-1 rounded-lg",
                    selectedGradeStats.totalJp >= 40 && selectedGradeStats.totalJp <= 48 
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20" 
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/20"
                  )}>
                    {selectedGradeStats.totalJp >= 40 && selectedGradeStats.totalJp <= 48 ? "IDEAL" : "KHUSUS"}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kontribusi Kelompok</p>
                  {['NASIONAL', 'KEJURUAN', 'PILIHAN', 'LOKAL'].map(kel => {
                    const dataKel = selectedGradeStats.byKelompok[kel] ?? { jp: 0, count: 0 };
                    const percentage = selectedGradeStats.totalJp > 0 
                      ? Math.round((dataKel.jp / selectedGradeStats.totalJp) * 100) 
                      : 0;
                    return (
                      <div key={kel} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-gray-500 uppercase">{kel}</span>
                          <span className="text-slate-800 dark:text-white">{dataKel.jp} JP ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              kel === 'KEJURUAN' ? "bg-emerald-500" :
                              kel === 'PILIHAN' ? "bg-amber-500" :
                              kel === 'LOKAL' ? "bg-sky-500" :
                              "bg-indigo-500"
                            )}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6 rounded-2xl border-none shadow-sm bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden flex-1 flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10 space-y-4">
                  <div className="p-3 bg-white/10 rounded-xl w-fit">
                    <Layers size={20} className="text-indigo-400" />
                  </div>
                  <h4 className="text-base font-black uppercase tracking-tight">Otomasi Slot Jadwal</h4>
                  <p className="text-xs text-white/60 leading-relaxed font-medium">
                    Apabila struktur kurikulum (JP) tingkat ini telah terdefinisi secara lengkap, slot waktu mingguan untuk guru pengampu akan terbuat secara otomatis pada modul Jadwal Pelajaran.
                  </p>
                </div>
                <Button
                  onClick={handleManagePlotting}
                  className="mt-6 w-full bg-indigo-650 hover:bg-indigo-700 text-white font-black rounded-xl border-none h-11 text-xs"
                >
                  PLOT STRUKTUR SEKARANG
                  <ChevronRight size={16} className="ml-1.5" />
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AcademicPageLayout>
  );
};

export default StrukturKurikulumPage;
