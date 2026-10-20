import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  Building2, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  GraduationCap, 
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { Card, Button, Badge, Loader } from '@/components/ui';
import { hubinApi } from '@/api/hubin.api';
import { cn } from '@/lib/utils';

export interface StaffKaprogTabProps {
  user?: any;
  kaprogJurusan?: { id?: string; nama?: string; singkatan?: string } | null;
}

export const StaffKaprogTab: React.FC<StaffKaprogTabProps> = ({
  user,
  kaprogJurusan,
}) => {
  const navigate = useNavigate();

  // Query Kaprog Summary dari Backend
  const { 
    data: summaryRes, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['kaprog-pkl-summary', kaprogJurusan?.id],
    queryFn: () => hubinApi.getKaprogSummary({ jurusan_id: kaprogJurusan?.id }),
    staleTime: 60 * 1000,
  });

  const summaryData = summaryRes?.data || null;
  const jurusanInfo = summaryData?.jurusan || kaprogJurusan;
  const tpStatus = summaryData?.tpStatus || { totalMitra: 0, filledMitra: 0, pendingMitra: 0, completionPercentage: 0 };
  const penilaianStatus = summaryData?.penilaianStatus || { totalSiswaPkl: 0, sudahDinilaiDudi: 0, belumDinilaiDudi: 0, sudahSidang: 0, belumSidang: 0 };
  const allMitraList: any[] = summaryData?.allMitraList || [];
  const pendingMitraList: any[] = summaryData?.pendingMitraList || [];

  const hasPendingTp = tpStatus.pendingMitra > 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Jurusan */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3 text-indigo-400" />
                Ketua Program Keahlian (Kaprog)
              </span>
              {jurusanInfo?.singkatan && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/10 text-white border border-white/20 font-mono">
                  {jurusanInfo.singkatan}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {jurusanInfo?.nama || 'Program Keahlian'}
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Monitoring capaian pembelajaran kejuruan, slot mitra industri, dan progres penilaian PKL.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              <span>Sinkron</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/hubin/nilai-pkl?tab=deskripsi')}
              className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
            >
              <span>Kelola TP PKL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader size="lg" />
        </div>
      ) : (
        <>
          {/* 2. Actionable Pending Task Alert (To-Do Notification) */}
          {hasPendingTp ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                    {tpStatus.pendingMitra} Perusahaan Mitra Belum Memiliki Deskripsi TP
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Lengkapi rumusan TP agar pembimbing dan DUDI dapat mengisi penilaian PKL.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => navigate('/hubin/nilai-pkl?tab=deskripsi')}
                className="w-full md:w-auto shrink-0 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
              >
                <span>Lengkapi TP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Kesiapan Instrumen TP PKL Selesai (100%)
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Seluruh {tpStatus.totalMitra} perusahaan mitra aktif jurusan telah memiliki rumusan capaian TP.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/hubin/nilai-pkl?tab=deskripsi')}
                className="text-xs font-semibold rounded-lg border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 shrink-0 h-7"
              >
                Lihat TP
              </Button>
            </div>
          )}

          {/* 3. KPI Metrik Statistik Jurusan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Keterisian TP */}
            <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Keterisian TP DUDI
                </span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {tpStatus.filledMitra} / {tpStatus.totalMitra}{' '}
                <span className="text-xs font-semibold text-slate-400">Mitra</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    tpStatus.completionPercentage === 100 ? "bg-emerald-500" : "bg-indigo-600"
                  )}
                  style={{ width: `${tpStatus.completionPercentage}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                {tpStatus.completionPercentage}% DUDI siap untuk penilaian
              </span>
            </Card>

            {/* KPI 2: Siswa PKL Jurusan */}
            <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Siswa PKL Jurusan
                </span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {penilaianStatus.totalSiswaPkl}{' '}
                <span className="text-xs font-semibold text-slate-400">Siswa Aktif</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Tersebar di {tpStatus.totalMitra} perusahaan industri
              </p>
            </Card>

            {/* KPI 3: Penilaian Industri */}
            <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nilai DUDI Terinput
                </span>
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {penilaianStatus.sudahDinilaiDudi} / {penilaianStatus.totalSiswaPkl}{' '}
                <span className="text-xs font-semibold text-slate-400">Siswa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {penilaianStatus.belumDinilaiDudi > 0 
                  ? `${penilaianStatus.belumDinilaiDudi} siswa belum dinilai industri` 
                  : 'Semua siswa telah dinilai'}
              </p>
            </Card>

            {/* KPI 4: Ujian Sidang PKL */}
            <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sidang & Laporan
                </span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {penilaianStatus.sudahSidang} / {penilaianStatus.totalSiswaPkl}{' '}
                <span className="text-xs font-semibold text-slate-400">Siswa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {penilaianStatus.belumSidang > 0 
                  ? `${penilaianStatus.belumSidang} siswa menunggu jadwal sidang` 
                  : 'Sidang tuntas'}
              </p>
            </Card>
          </div>

          {/* 4. Tabel Kesiapan TP Perusahaan Mitra Jurusan */}
          <Card className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Daftar Perusahaan Mitra & Status Tujuan Pembelajaran (TP)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daftar perusahaan industri yang aktif menampung siswa jurusan {jurusanInfo?.nama || 'Anda'}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/hubin/nilai-pkl?tab=dudi')}
                  className="rounded-xl text-xs font-bold"
                >
                  Rekap Nilai PKL
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate('/hubin/nilai-pkl?tab=deskripsi')}
                  className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Buka Formulasi TP
                </Button>
              </div>
            </div>

            {allMitraList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Building2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs">Belum ada penempatan siswa PKL aktif di jurusan ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Perusahaan Mitra</th>
                      <th className="py-3 px-4">Bidang Usaha</th>
                      <th className="py-3 px-4 text-center">Siswa PKL</th>
                      <th className="py-3 px-4">Rombel Siswa</th>
                      <th className="py-3 px-4 text-center">Status TP</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allMitraList?.map((mitra) => (
                      <tr key={mitra.mitra_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                          {mitra.nama_mitra}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {mitra.bidang_usaha || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-slate-700 dark:text-slate-300">
                          {mitra.siswa_count}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {mitra.rombel_list?.map((r: string, rIdx: number) => (
                              <span key={rIdx} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {mitra.has_tp ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sudah Ada</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/40">
                              <AlertCircle className="w-3 h-3" />
                              <span>Belum Diisi</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => navigate('/hubin/nilai-pkl?tab=deskripsi')}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>{mitra.has_tp ? 'Ubah TP' : 'Rumuskan TP'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
