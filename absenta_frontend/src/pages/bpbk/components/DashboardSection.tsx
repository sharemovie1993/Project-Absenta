import React, { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bpbkApi, type BpbkDashboardStats, bpbkQueryKeys } from '../../../api/bpbk.api';
import { Card, CardContent } from '../../../components/ui/Card';
import { Loader } from '../../../components/ui/Loader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { 
  UserCheck, 
  MailOpen, 
  Home, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StudentBasic {
  nama_siswa: string;
}

interface RecentViolation {
  id: string;
  poin: number;
  Siswa?: StudentBasic;
  jenis_pelanggaran: string;
  tanggal: string;
}

interface RecentCounseling {
  id: string;
  Siswa?: StudentBasic;
  masalah: string;
  tanggal: string;
  status: string;
}

interface DashboardSectionProps {
  onViewSiswaDetail?: (siswaId: string) => void;
  onViewSiswa?: () => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = React.memo(({ 
  onViewSiswaDetail,
  onViewSiswa 
}) => {
  const { data: stats, isLoading: loading, error } = useQuery({
    queryKey: bpbkQueryKeys.stats(),
    queryFn: async () => {
      const res = await bpbkApi.getDashboardStats();
      if (!res.success) throw new Error(res.message || 'Gagal memuat statistik');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader className="mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memproses Dashboard BK...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
        {error ? (error instanceof Error ? error.message : 'Gagal memuat data') : 'Gagal memuat data'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kasus Konseling Aktif</span>
              <span className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{stats.activeCounselingCount}</span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
              <UserCheck size={20} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 block mt-2">Siswa dalam masa pendampingan BK</span>
        </Card>

        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Panggilan Ortu Menunggu</span>
              <span className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{stats.pendingCallsCount}</span>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
              <MailOpen size={20} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 block mt-2">Surat panggilan dikirim / menunggu hadir</span>
        </Card>

        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kunjungan Rumah (Home Visit)</span>
              <span className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{stats.monthHomeVisitsCount}</span>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 text-violet-500 rounded-xl">
              <Home size={20} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 block mt-2">Total home visit bulan ini</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: EWS & Critical Students */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-500 w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Early Warning System (Pantauan Siswa Kritis)</h3>
              </div>
              <Button variant="toolbarOutline" size="toolbar" onClick={onViewSiswa}>
                Semua Siswa
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {stats.criticalStudents.length === 0 ? (
              <div className="py-10 text-center opacity-50 flex flex-col items-center justify-center">
                <UserCheck className="w-8 h-8 text-emerald-500 mb-3" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada siswa dengan poin kritis</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Profil Siswa</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Pelanggaran</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Prestasi</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Alpa (30H)</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">EWS Risk</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.criticalStudents?.map(student => (
                      <tr key={student.id} className="border-b border-slate-50 dark:border-slate-800/40 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                        <td className="py-3.5">
                          <div className="font-bold text-slate-800 dark:text-white text-xs">{student.nama_siswa}</div>
                          <div className="text-[9px] text-slate-400 font-bold tracking-widest">{student.nis}</div>
                        </td>
                        <td className="py-3.5 text-xs font-bold text-slate-600 dark:text-slate-400">{student.kelas}</td>
                        <td className="py-3.5 text-center text-xs font-black text-rose-500">+{student.violations}</td>
                        <td className="py-3.5 text-center text-xs font-black text-emerald-500">-{student.achievements}</td>
                        <td className="py-3.5 text-center text-xs font-black text-slate-500">{student.alpaCount}x</td>
                        <td className="py-3.5 text-center">
                          <Badge 
                            variant={student.riskLevel === 'HIGH' ? 'error' : student.riskLevel === 'MEDIUM' ? 'warning' : 'success'} 
                            className="px-2 py-0.5 text-[9px] font-black uppercase"
                          >
                            {student.riskLevel} ({student.riskScore})
                          </Badge>
                        </td>
                        <td className="py-3.5 text-right">
                          <Button 
                            variant="toolbarPrimary" 
                            size="toolbar" 
                            onClick={() => onViewSiswaDetail?.(student.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-[9px] h-7 px-3 rounded-lg"
                          >
                            Bimbing
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Recent logs */}
        <div className="space-y-6">
          {/* Recent Violations */}
          <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 block"></span>
              Pelanggaran Terbaru
            </h3>
            <div className="space-y-3">
              {stats.recentViolations.length === 0 ? (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-4">Belum ada pelanggaran</p>
              ) : (
                stats.recentViolations?.map((v: RecentViolation) => (
                  <div key={v.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100/50 dark:border-slate-800/50 flex items-start gap-3">
                    <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg text-xs font-black shrink-0">
                      +{v.poin}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{v.Siswa?.nama_siswa}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">{v.jenis_pelanggaran}</div>
                      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {new Date(v.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Counseling logs */}
          <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
              Konseling Terbaru
            </h3>
            <div className="space-y-3">
              {stats.recentCounselings.length === 0 ? (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-4">Belum ada sesi konseling</p>
              ) : (
                stats.recentCounselings?.map((c: RecentCounseling) => (
                  <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100/50 dark:border-slate-800/50 flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-lg shrink-0">
                      <UserCheck size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{c.Siswa?.nama_siswa}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate line-clamp-1">{c.masalah}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                          {new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                        <Badge variant={c.status === 'SELESAI' ? 'success' : 'warning'} className="text-[7px] font-black px-1 py-0 shadow-none uppercase">
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
});


