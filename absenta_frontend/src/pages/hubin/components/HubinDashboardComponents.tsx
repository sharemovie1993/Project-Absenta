import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Card } from '@/components/ui/Card';
import { 
  Building2, Users, ClipboardList, Briefcase, GraduationCap, 
  Activity, AlertTriangle, ArrowRight, ChevronRight, TrendingUp, Clock, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HubinActivity {
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

export interface HubinStats {
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

// Divider Sekat Visual
export const Divider: React.FC<{ title: string }> = ({ title }) => (
  <div className="relative py-4 shrink-0 select-none">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
    </div>
    <div className="relative flex justify-center">
      <span className="bg-white dark:bg-slate-900 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
        {title}
      </span>
    </div>
  </div>
);

// Tracer Study Uraian
interface TracerStudyUraianProps {
  stats: HubinStats | null;
  onNavigateTab: (tabId: string) => void;
}

export const TracerStudyUraian: React.FC<TracerStudyUraianProps> = React.memo(({ stats, onNavigateTab }) => {
  const totalTraced = React.useMemo(() => {
    if (!stats?.tracerStats) return 0;
    return (
      (stats.tracerStats.BEKERJA || 0) +
      (stats.tracerStats.KULIAH || 0) +
      (stats.tracerStats.WIRAUSAHA || 0) +
      (stats.tracerStats.MENCARI_KERJA || 0)
    );
  }, [stats]);

  const tracerItems = React.useMemo(() => {
    if (!stats?.tracerStats) return [];
    return [
      { label: 'Bekerja', value: stats.tracerStats.BEKERJA || 0, color: 'bg-emerald-500' },
      { label: 'Kuliah / Studi Lanjut', value: stats.tracerStats.KULIAH || 0, color: 'bg-indigo-500' },
      { label: 'Wirausaha', value: stats.tracerStats.WIRAUSAHA || 0, color: 'bg-amber-500' },
      { label: 'Mencari Kerja', value: stats.tracerStats.MENCARI_KERJA || 0, color: 'bg-rose-500' },
    ];
  }, [stats]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">Uraian Serapan Tracer Study</span>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-[20px] font-black text-slate-800 dark:text-slate-100">{stats?.totalAlumniTraced || 0}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Lulusan Terlacak</p>
          </div>
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
            <GraduationCap size={16} />
          </div>
        </div>

        {totalTraced === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
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
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold transition-all mt-4 cursor-pointer"
        >
          Lihat Detail Tracer Study
          <ChevronRight size={12} className="text-slate-400" />
        </button>
      </div>
    </Card>
  );
});

// Top Jurusan Terserap List
interface TopJurusanListProps {
  stats: HubinStats | null;
}

export const TopJurusanList: React.FC<TopJurusanListProps> = React.memo(({ stats }) => {
  const topJurusanList = React.useMemo(() => stats?.topJurusanTerserap || [], [stats]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">Top Program Keahlian Terserap</span>
      {topJurusanList?.length === 0 ? (
        <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">Belum ada data serapan program keahlian.</div>
      ) : (
        <div className="space-y-3">
          {topJurusanList?.map((j, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <span className="font-bold text-slate-700 dark:text-slate-300">{j.nama}</span>
              <Badge variant="info" className="font-bold text-[10px]">{j.count} alumni terserap</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

// Recent PKL Placements Table
interface RecentPklTableProps {
  stats: HubinStats | null;
  onNavigateTab: (tabId: string) => void;
}

export const RecentPklTable: React.FC<RecentPklTableProps> = React.memo(({ stats, onNavigateTab }) => {
  const recentPklList = React.useMemo(() => stats?.recentPkl || [], [stats]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">Aktivitas Penempatan Siswa PKL Terbaru</span>
      
      {recentPklList?.length === 0 ? (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
          Tidak ada data penempatan PKL baru-baru ini.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider text-[9px]">
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
                  <td className="py-3 px-3 text-slate-400 dark:text-slate-500">{new Date(pkl.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
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
          className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
        >
          Kelola Penempatan PKL
          <ArrowRight size={11} className="mt-0.5" />
        </button>
      </div>
    </Card>
  );
});

// Top Mitra Grid
interface TopMitraGridProps {
  stats: HubinStats | null;
}

export const TopMitraGrid: React.FC<TopMitraGridProps> = React.memo(({ stats }) => {
  const topMitraList = React.useMemo(() => stats?.topMitra || [], [stats]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl shadow-sm">
      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">Top Mitra Industri Partner PKL Aktif</span>
      {topMitraList?.length === 0 ? (
        <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">Belum ada siswa PKL ditempatkan di mitra industri.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topMitraList?.map((m, idx) => (
            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">{m.nama}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">DU-DI Rekanan PKL</p>
              </div>
              <Badge variant="success" className="font-bold">{m.count} siswa aktif</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

// Timeline Log Aktivitas Hubin
interface ActivityLogTimelineProps {
  activities: HubinActivity[];
  activitiesLoading: boolean;
}

export const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = React.memo(({ activities, activitiesLoading }) => {
  const getActionLabel = React.useCallback((action: string) => {
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

  const getActionBadgeColor = React.useCallback((action: string) => {
    if (action.includes('CREATE')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (action.includes('UPDATE') || action.includes('RENEW')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
  }, []);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-white/5 backdrop-blur-md p-5 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="text-indigo-500" size={16} />
        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Aktivitas Terakhir HUBIN (Audit Trail)</span>
      </div>

      {activitiesLoading ? (
        <div className="py-12 flex justify-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memuat audit trail...</div>
      ) : activities?.length === 0 ? (
        <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">Tidak ada aktivitas tercatat.</div>
      ) : (
        <div className="space-y-4">
          {activities?.map((act) => (
            <div key={act.id} className="flex items-start justify-between text-xs py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition-colors px-2 rounded-lg">
              <div className="flex items-start gap-3 min-w-0">
                <span className={cn("text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded shrink-0", getActionBadgeColor(act.action))}>
                  {act.action.replace('HUBIN_', '')}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{getActionLabel(act.action)}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Oleh <span className="font-semibold text-slate-500 dark:text-slate-400">{act.actor}</span>
                    {act.metadata && (
                      <span className="italic opacity-80">
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
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 ml-2">
                {new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});
