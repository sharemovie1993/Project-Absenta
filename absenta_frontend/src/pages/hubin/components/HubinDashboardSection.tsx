import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hubinApi } from '../../../api/hubin.api';
import { Card } from '../../../components/ui/Card';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { formatDate } from '../../../utils/layoutUtils';
import { 
  Building2, 
  Users, 
  ClipboardList, 
  Briefcase, 
  GraduationCap, 
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Activity,
  Award,
  TrendingUp,
  Clock
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface HubinActivity {
  id: string;
  action: string;
  actor: string;
  metadata?: {
    nama?: string;
    siswa_nama?: string;
    posisi?: string;
    nama_proyek?: string;
    mou_nomor?: string;
  };
  created_at: string;
}

interface HubinStats {
  totalMitra: number;
  totalSiswaPkl: number;
  pklAktif: number;
  pendingReports: number;
  mouExpiringCount: number;
  totalLowonganAktif: number;
  totalAlumniTraced: number;
  tracerStats: {
    BEKERJA: number;
    KULIAH: number;
    WIRAUSAHA: number;
    MENCARI_KERJA: number;
  };
  recentPkl: Array<{
    id: string;
    siswa: string;
    mitra: string;
    status: string;
    tanggal: string;
  }>;
  tracerCoverage: number;
  employmentRate: number;
  topMitra: Array<{ id: string; nama: string; count: number }>;
  topJurusanTerserap: Array<{ nama: string; count: number }>;
  totalRecruitmentSuccess: number;
}

interface HubinDashboardSectionProps {
  onNavigateTab: (tabId: string) => void;
}

export const HubinDashboardSection: React.FC<HubinDashboardSectionProps> = React.memo(({ onNavigateTab }) => {
  // 1. Fetch stats via React Query (Pilar 31)
  const { data: statsRes, isLoading: loading, error: statsErr } = useQuery({
    queryKey: ['hubin-dashboard-stats'],
    queryFn: async () => {
      const res = await hubinApi.getStats();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const statsState = statsRes || null;
  const error = statsErr instanceof Error ? statsErr.message : null;

  // 2. Fetch activities via React Query (Pilar 31)
  const { data: actRes, isLoading: activitiesLoading } = useQuery({
    queryKey: ['hubin-recent-activity'],
    queryFn: async () => {
      const res = await hubinApi.getRecentActivity();
      return res.data || [];
    },
    staleTime: 60 * 1000,
  });
  const activities = actRes || [];

  const stats = useMemo(() => {
    if (!statsState) return null;
    return {
      ...statsState,
      totalMitra: statsState.totalMitra ?? 0,
      totalSiswaPkl: statsState.totalSiswaPkl ?? 0,
      pklAktif: statsState.pklAktif ?? 0,
      pendingReports: statsState.pendingReports ?? 0,
      mouExpiringCount: statsState.mouExpiringCount ?? 0,
      totalLowonganAktif: statsState.totalLowonganAktif ?? 0,
      totalAlumniTraced: statsState.totalAlumniTraced ?? 0,
      tracerCoverage: statsState.tracerCoverage ?? 0,
      employmentRate: statsState.employmentRate ?? 0,
      totalRecruitmentSuccess: statsState.totalRecruitmentSuccess ?? 0,
      tracerStats: {
        BEKERJA: statsState.tracerStats?.BEKERJA ?? 0,
        KULIAH: statsState.tracerStats?.KULIAH ?? 0,
        WIRAUSAHA: statsState.tracerStats?.WIRAUSAHA ?? 0,
        MENCARI_KERJA: statsState.tracerStats?.MENCARI_KERJA ?? 0,
      },
      recentPkl: statsState.recentPkl ?? [],
      topMitra: statsState.topMitra ?? [],
      topJurusanTerserap: statsState.topJurusanTerserap ?? [],
    };
  }, [statsState]);

  const getActionLabel = useCallback((action: string) => {
    switch (action) {
      case 'HUBIN_MITRA_CREATE': return 'Menambahkan Mitra Industri';
      case 'HUBIN_MITRA_UPDATE': return 'Memperbarui Mitra Industri';
      case 'HUBIN_MITRA_DELETE': return 'Menghapus Mitra Industri';
      case 'HUBIN_MOU_CREATE': return 'Membuat MoU Kerja Sama';
      case 'HUBIN_MOU_UPDATE': return 'Memperbarui MoU Kerja Sama';
      case 'HUBIN_MOU_DELETE': return 'Menghapus MoU Kerja Sama';
      case 'HUBIN_MOU_RENEW': return 'Memperpanjang MoU Kerja Sama';
      case 'HUBIN_PKL_PLACE': return 'Menempatkan Siswa PKL';
      case 'HUBIN_PKL_REMOVE': return 'Menarik Siswa PKL';
      case 'HUBIN_LOWONGAN_CREATE': return 'Membuka Lowongan Kerja BKK';
      case 'HUBIN_LOWONGAN_UPDATE': return 'Memperbarui Lowongan Kerja';
      case 'HUBIN_LOWONGAN_DELETE': return 'Menutup Lowongan Kerja';
      case 'HUBIN_LAMARAN_CREATE': return 'Mengajukan Lamaran BKK';
      case 'HUBIN_LAMARAN_STATUS': return 'Memperbarui Status Lamaran BKK';
      case 'HUBIN_LAMARAN_DELETE': return 'Membatalkan Lamaran BKK';
      case 'HUBIN_TRACER_SUBMIT': return 'Mengisi Tracer Study';
      case 'HUBIN_TEFA_CREATE': return 'Membuat Proyek TEFA';
      case 'HUBIN_TEFA_UPDATE': return 'Memperbarui Proyek TEFA';
      case 'HUBIN_TEFA_DELETE': return 'Menghapus Proyek TEFA';
      default: return action;
    }
  }, []);

  const getActionBadgeColor = useCallback((action: string) => {
    if (action.includes('CREATE')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (action.includes('UPDATE') || action.includes('RENEW')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
  }, []);

  const recentPklList = useMemo(() => stats?.recentPkl || [], [stats]);
  const topMitraList = useMemo(() => stats?.topMitra || [], [stats]);
  const topJurusanList = useMemo(() => stats?.topJurusanTerserap || [], [stats]);
  const activitiesList = useMemo(() => activities || [], [activities]);

  const tracerItems = useMemo(() => {
    if (!stats?.tracerStats) return [];
    return [
      { label: 'Bekerja', value: stats.tracerStats.BEKERJA, color: 'bg-emerald-500' },
      { label: 'Kuliah / Studi Lanjut', value: stats.tracerStats.KULIAH, color: 'bg-indigo-500' },
      { label: 'Wirausaha', value: stats.tracerStats.WIRAUSAHA, color: 'bg-amber-500' },
      { label: 'Mencari Kerja', value: stats.tracerStats.MENCARI_KERJA, color: 'bg-rose-500' },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader className="mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memproses Dashboard Hubin...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold">
        {error || 'Gagal memuat data'}
      </div>
    );
  }

  const totalTraced = stats.tracerStats.BEKERJA + stats.tracerStats.KULIAH + stats.tracerStats.WIRAUSAHA + stats.tracerStats.MENCARI_KERJA;

  return (
    <div className="space-y-6">
      
      {/* MoU Expiring Alert Banner */}
      {stats.mouExpiringCount > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Perhatian: Dokumen MoU Rekan Industri Expiring</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Ada {stats.mouExpiringCount} mitra industri dengan MoU yang akan berakhir dalam 30 hari kedepan.</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateTab('mitra')} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors active:scale-[0.97]"
          >
            Tinjau MoU
            <ArrowRight size={10} />
          </button>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Mitra Industri Terdaftar"
          value={stats.totalMitra}
          icon={<Building2 />}
          gradient="from-indigo-500 to-indigo-600"
          subtitle="Perusahaan/DU-DI rekanan sekolah"
          onClick={() => onNavigateTab('mitra')}
        />
        <AnalyticsCard
          title="Siswa PKL Aktif"
          value={stats.pklAktif}
          icon={<Users />}
          gradient="from-emerald-500 to-emerald-600"
          subtitle={`Dari ${stats.totalSiswaPkl} total siswa terdaftar PKL`}
          onClick={() => onNavigateTab('penempatan')}
        />
        <AnalyticsCard
          title="Laporan Jurnal Belum Review"
          value={stats.pendingReports}
          icon={<ClipboardList />}
          gradient="from-amber-500 to-amber-600"
          subtitle="Presensi/Logbook menunggu verifikasi"
          onClick={() => onNavigateTab('absensi')}
        />
        <AnalyticsCard
          title="Lowongan BKK Aktif"
          value={stats.totalLowonganAktif}
          icon={<Briefcase />}
          gradient="from-sky-500 to-sky-600"
          subtitle="Lowongan pekerjaan dibuka di portal BKK"
          onClick={() => onNavigateTab('bkk')}
        />
      </div>

      {/* Strategic KPIs Section */}
      <div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">KPI Strategis Kemitraan & BKK (Pimpinan)</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnalyticsCard
            title="Coverage Tracer Study"
            value={`${stats.tracerCoverage.toFixed(1)}%`}
            icon={<GraduationCap />}
            gradient="from-indigo-500 to-indigo-600"
            subtitle={`${stats.totalAlumniTraced} dari total alumni terdaftar`}
          />
          <AnalyticsCard
            title="Serapan Kerja Alumni"
            value={`${stats.employmentRate.toFixed(1)}%`}
            icon={<TrendingUp />}
            gradient="from-emerald-500 to-emerald-600"
            subtitle="Bekerja & Wirausaha dari data terlacak"
          />
          <AnalyticsCard
            title="Rekrutmen Sukses BKK"
            value={`${stats.totalRecruitmentSuccess} siswa`}
            icon={<Award />}
            gradient="from-sky-500 to-sky-600"
            subtitle="Total lamaran berstatus DITERIMA"
          />
        </div>
      </div>

      {/* Main Grid: Tracer Study & Placements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tracer Study Stats & Top Jurusan (Left 1/3) */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Uraian Serapan Tracer Study</span>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[20px] font-black text-slate-800 dark:text-slate-100">{stats.totalAlumniTraced}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Lulusan Terlacak</p>
                </div>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
                  <GraduationCap size={16} />
                </div>
              </div>

              {totalTraced === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                  Belum ada data tracer study terisi
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {tracerItems?.map((item, idx) => {
                    const pct = Math.round((item.value / totalTraced) * 100) || 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                          <span className="text-slate-800 dark:text-slate-200">{item.value} alumni ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", item.color)} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <button 
                onClick={() => onNavigateTab('tracer')}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold transition-all mt-4"
              >
                Lihat Detail Tracer Study
                <ChevronRight size={12} className="text-slate-400" />
              </button>
            </div>
          </Card>

          {/* Top Jurusan Terserap */}
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Top Program Keahlian Terserap</span>
            {topJurusanList?.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-semibold">Belum ada data serapan program keahlian.</div>
            ) : (
              <div className="space-y-3">
                {topJurusanList?.map((j, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{j.nama}</span>
                    <Badge variant="info" className="font-bold text-[10px]">{j.count} alumni terserap</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Placements & Top Partners & Audit Trail (Right 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Aktivitas Penempatan Siswa PKL Terbaru</span>
            
            {recentPklList?.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                Tidak ada data penempatan PKL baru-baru ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[9px]">
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3">Perusahaan Mitra</th>
                      <th className="py-2.5 px-3">Tanggal Mulai</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentPklList?.map((pkl) => (
                      <tr key={pkl.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{pkl.siswa}</td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{pkl.mitra}</td>
                        <td className="py-3 px-3 text-slate-400 dark:text-slate-500">{formatDate(pkl.tanggal, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-3 px-3 text-right">
                          <Badge 
                            variant={pkl.status === 'AKTIF' ? 'success' : pkl.status === 'SELESAI' ? 'info' : 'secondary'}
                            className="font-bold text-[9px] px-2 py-0.5 rounded-full"
                          >
                            {pkl.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button 
                onClick={() => onNavigateTab('penempatan')}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                Kelola Penempatan PKL
                <ArrowRight size={11} className="mt-0.5" />
              </button>
            </div>
          </Card>

          {/* Top Mitra Industri */}
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Top Mitra Industri Partner PKL Aktif</span>
            {topMitraList?.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-semibold">Belum ada siswa PKL ditempatkan di mitra industri.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topMitraList?.map((m, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{m.nama}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">DU-DI Rekanan PKL</p>
                    </div>
                    <Badge variant="success" className="font-bold">{m.count} siswa aktif</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Activity Log (Audit Trail) */}
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-indigo-500" size={16} />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Aktivitas Terakhir HUBIN (Audit Trail)</span>
            </div>

            {activitiesLoading ? (
              <div className="py-6 flex justify-center"><Loader /></div>
            ) : activitiesList?.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-semibold">Tidak ada aktivitas tercatat.</div>
            ) : (
              <div className="space-y-4">
                {activitiesList?.map((act) => (
                  <div key={act.id} className="flex items-start justify-between text-xs py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition-colors px-2 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className={cn("text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded", getActionBadgeColor(act.action))}>
                        {act.action.replace('HUBIN_', '')}
                      </span>
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">{getActionLabel(act.action)}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Oleh <span className="font-semibold text-slate-500 dark:text-slate-400">{act.actor}</span>
                          {act.metadata && (
                            <span className="italic">
                              {act.metadata.nama && ` • ${act.metadata.nama}`}
                              {act.metadata.siswa_nama && ` • ${act.metadata.siswa_nama}`}
                              {act.metadata.posisi && ` • ${act.metadata.posisi}`}
                              {act.metadata.nama_proyek && ` • ${act.metadata.nama_proyek}`}
                              {act.metadata.mou_nomor && ` • MoU ${act.metadata.mou_nomor}`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>

    </div>
  );
});
