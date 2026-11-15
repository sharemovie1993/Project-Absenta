import React, { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/utils/layoutUtils';
import { 
  Building2, Users, ClipboardList, Briefcase, GraduationCap, 
  Activity, AlertTriangle, ArrowRight, ChevronRight, TrendingUp, Clock, Award,
  CheckCircle2, AlertCircle, FileSpreadsheet, Printer, Settings, MapPin, Factory,
  Sparkles, Stethoscope, FileText, UserCheck, UserPlus, ShieldCheck, Star, Calendar, Filter,
  Crown, Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolvePklLifecyclePhase } from '@/utils/hubinPklLifecycle';
import { HubinPklPhase } from '@/constants/HubinConstants';

export interface HubinActivity { 
  id: string; 
  action: string; 
  actor: string; 
  metadata?: { 
    nama?: string; 
    siswa_nama?: string; 
    mitra_nama?: string;
    posisi?: string; 
    nama_proyek?: string; 
    mou_nomor?: string; 
    status?: string;
    dudi_avg?: number;
    count?: number;
    tahap?: string;
    keterangan?: string;
    tanggal?: string;
    is_bulk?: boolean;
    target_tp_id?: string;
  }; 
  created_at: string; 
}

export interface HubinStats {
  totalMitra: number; totalSiswaPkl: number; pklAktif: number; pklOverdue?: number; pklSelesai?: number; fasePkl?: string; pendingReports: number; mouExpiringCount: number;
  totalLowonganAktif: number; totalAlumniTraced: number; tracerCoverage: number; employmentRate: number; totalRecruitmentSuccess: number;
  tracerStats: { BEKERJA: number; KULIAH: number; WIRAUSAHA: number; MENCARI_KERJA: number; };
  recentPkl: Array<{ 
    id: string; 
    siswa: string; 
    kelas?: string | null;
    nis?: string | null;
    mitra: string; 
    mitra_kota?: string | null;
    bidang_usaha?: string | null;
    status: string; 
    tanggal: string; 
  }>;
  topMitra: Array<{ 
    id: string; 
    nama: string; 
    bidang_usaha?: string | null;
    kota?: string | null;
    kuota_pkl?: number | null;
    count: number 
  }>;
  topJurusanTerserap: Array<{ nama: string; count: number }>;
  todayPresensi?: {
    hadir: number;
    sakit: number;
    izin: number;
    unverified: number;
    totalHariIni: number;
  };
  penilaianStats?: {
    sudahDinilai: number;
    belumDinilai: number;
    totalSiswaPkl: number;
    persenSelesai: number;
    sertifikatTerbit: number;
    selesaiPraktikCount?: number;
    selesaiBelumDinilaiCount?: number;
  };
  tefaStats?: {
    totalOrders: number;
    activeOrders: number;
  };
  tahunPelajaran?: {
    id: string;
    nama: string;
    is_active: boolean;
  } | null;
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

// Helper formatting
const getInitials = (name?: string | null): string => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name?: string | null): string => {
  const gradients = [
    'from-indigo-500 to-indigo-700 text-white',
    'from-blue-500 to-cyan-600 text-white',
    'from-emerald-500 to-teal-700 text-white',
    'from-violet-500 to-purple-700 text-white',
    'from-amber-500 to-orange-600 text-white',
    'from-rose-500 to-pink-600 text-white',
    'from-fuchsia-500 to-rose-600 text-white',
  ];
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const formatTitleCase = (str?: string | null): string => {
  if (!str) return '-';
  return str.toLowerCase().replace(/(?:^|\s|\/|-)\S/g, (c) => c.toUpperCase());
};

// Recent PKL Placements Table
interface RecentPklTableProps {
  stats: HubinStats | null;
  onNavigateTab: (tabId: string) => void;
}

export const RecentPklTable: React.FC<RecentPklTableProps> = React.memo(({ stats, onNavigateTab }) => {
  const recentPklList = React.useMemo(() => stats?.recentPkl || [], [stats]);

  return (
    <Card className="border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Aktivitas Penempatan Siswa PKL Terbaru
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Siswa yang terpetakan pada mitra DU-DI periode ini
            </p>
          </div>
        </div>
        {recentPklList.length > 0 && (
          <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            {recentPklList.length} Penempatan Baru
          </Badge>
        )}
      </div>

      {recentPklList.length === 0 ? (
        <div className="py-14 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Users size={22} />
          </div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Belum ada aktivitas penempatan PKL</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Plotting siswa ke mitra DUDI untuk memantau data di sini</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800/80 text-slate-400 dark:text-slate-400 uppercase font-black tracking-wider text-[9px]">
                <th className="py-2.5 px-3.5">Nama Siswa</th>
                <th className="py-2.5 px-3.5">Perusahaan Mitra</th>
                <th className="py-2.5 px-3.5">Tanggal Mulai</th>
                <th className="py-2.5 px-3.5 text-right">Status PKL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentPklList.map((pkl) => (
                <tr key={pkl.id} className="group hover:bg-indigo-50/20 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm", getAvatarColor(pkl.siswa))}>
                        {getInitials(pkl.siswa)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {formatTitleCase(pkl.siswa)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                          {pkl.nis && <span className="font-mono text-slate-400 dark:text-slate-500">{pkl.nis}</span>}
                          {pkl.nis && pkl.kelas && <span>•</span>}
                          {pkl.kelas && (
                            <span className="font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px]">
                              {pkl.kelas}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                        <Building2 size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{pkl.mitra}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {pkl.mitra_kota || pkl.bidang_usaha || 'DU-DI Rekanan PKL'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Calendar size={12} className="text-slate-400 shrink-0" />
                      <span className="text-[11px] font-medium">
                        {formatDate(pkl.tanggal, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    {pkl.status === 'AKTIF' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Aktif PKL
                      </span>
                    ) : pkl.status === 'SELESAI' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-xs">
                        <CheckCircle2 size={11} />
                        Selesai
                      </span>
                    ) : (
                      <Badge variant="secondary" className="font-bold text-[9px] px-2.5 py-0.5 rounded-full">
                        {pkl.status}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Menampilkan {recentPklList.length} penempatan teraktual
        </span>
        <button 
          onClick={() => onNavigateTab('penempatan')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50/60 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 transition-all cursor-pointer group"
        >
          <span>Kelola Penempatan PKL</span>
          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
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

  const getRankStyle = (idx: number) => {
    if (idx === 0) {
      return {
        badge: 'bg-amber-500 text-white shadow-xs',
        border: 'border-amber-200/80 dark:border-amber-800/40 hover:border-amber-400',
        cardBg: 'bg-gradient-to-br from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900/60 dark:to-slate-900/40',
        iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        label: '#1 Top'
      };
    }
    if (idx === 1) {
      return {
        badge: 'bg-slate-400 text-white shadow-xs',
        border: 'border-slate-200/80 dark:border-slate-700/50 hover:border-slate-400',
        cardBg: 'bg-gradient-to-br from-slate-50/50 via-white to-white dark:from-slate-800/30 dark:via-slate-900/60 dark:to-slate-900/40',
        iconBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        label: '#2 Top'
      };
    }
    if (idx === 2) {
      return {
        badge: 'bg-orange-500 text-white shadow-xs',
        border: 'border-orange-200/80 dark:border-orange-900/40 hover:border-orange-400',
        cardBg: 'bg-gradient-to-br from-orange-50/30 via-white to-white dark:from-orange-950/20 dark:via-slate-900/60 dark:to-slate-900/40',
        iconBg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        label: '#3 Top'
      };
    }
    return {
      badge: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
      border: 'border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-700',
      cardBg: 'bg-white dark:bg-slate-900/50',
      iconBg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
      label: `#${idx + 1}`
    };
  };

  return (
    <Card className="border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/60 shadow-sm">
            <Building2 size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Top Mitra Industri Partner PKL
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              DU-DI dengan kontribusi serapan siswa tertinggi
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          {topMitraList.length} Mitra Unggulan
        </Badge>
      </div>

      {topMitraList.length === 0 ? (
        <div className="py-14 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Building2 size={22} />
          </div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Belum ada siswa aktif di mitra</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Data serapan akan muncul saat siswa ditempatkan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topMitraList.map((m, idx) => {
            const style = getRankStyle(idx);
            return (
              <div 
                key={m.id || idx} 
                className={cn(
                  "p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col gap-2.5",
                  style.border,
                  style.cardBg
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("p-2 rounded-xl shrink-0 font-bold", style.iconBg)}>
                      <Building2 size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                        {m.nama}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{m.kota || 'Jawa Barat'}</span>
                        <span>•</span>
                        <span className="truncate">{m.bidang_usaha || 'DU-DI Rekanan PKL'}</span>
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0", style.badge)}>
                    {style.label}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {m.kuota_pkl ? `Kuota: ${m.kuota_pkl} siswa` : 'Rekanan Aktif'}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-black shadow-xs">
                    <Users size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>{m.count} Siswa Aktif</span>
                  </div>
                </div>
              </div>
            );
          })}
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filterCategory = useCallback((action: string): string => {
    if (action.includes('PKL') && !action.includes('ABSENSI') && !action.includes('NILAI')) return 'pkl';
    if (action.includes('NILAI') || action.includes('SETTINGS')) return 'nilai';
    if (action.includes('ABSENSI') || action.includes('KUNJUNGAN')) return 'presensi';
    if (action.includes('MITRA') || action.includes('MOU')) return 'mitra';
    if (action.includes('LOWONGAN') || action.includes('LAMARAN') || action.includes('TRACER') || action.includes('TEFA')) return 'bkk_tefa';
    return 'other';
  }, []);

  const getActionMeta = useCallback((action: string) => {
    const metaMap: Record<string, { label: string; category: string; icon: React.ElementType; colorClass: string; badgeClass: string }> = {
      // PKL Placement
      HUBIN_PKL_PLACE: { label: 'Menempatkan Siswa PKL', category: 'Penempatan', icon: UserCheck, colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
      HUBIN_PKL_UPDATE: { label: 'Memperbarui Penempatan Siswa', category: 'Penempatan', icon: Settings, colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
      HUBIN_PKL_MUTASI: { label: 'Mutasi Mitra Siswa PKL', category: 'Penempatan', icon: ArrowRight, colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
      HUBIN_PKL_REMOVE: { label: 'Menarik Siswa PKL', category: 'Penempatan', icon: AlertTriangle, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
      HUBIN_PKL_BULK_STATUS: { label: 'Pembaruan Status PKL Masal', category: 'Penempatan', icon: CheckCircle2, colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800', badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
      HUBIN_PKL_BULK_REMOVE: { label: 'Penarikan Siswa PKL Masal', category: 'Penempatan', icon: AlertCircle, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
      HUBIN_PKL_EXCEL_IMPORT: { label: 'Impor Data Siswa PKL Excel', category: 'Penempatan', icon: FileSpreadsheet, colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },

      // Nilai & Sertifikat
      HUBIN_NILAI_UPDATE: { label: 'Input / Update Nilai PKL Siswa', category: 'Nilai & Sertifikat', icon: Award, colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
      HUBIN_SETTINGS_UPDATE: { label: 'Pembaruan Konfigurasi PKL', category: 'Pengaturan', icon: Settings, colorClass: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800', badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },

      // Presensi & Kunjungan
      HUBIN_ABSENSI_VERIFY: { label: 'Verifikasi Presensi Siswa PKL', category: 'Presensi', icon: CheckCircle2, colorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800', badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
      HUBIN_ABSENSI_IZIN_SUBMIT: { label: 'Pengajuan Izin / Sakit PKL', category: 'Presensi', icon: Stethoscope, colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
      HUBIN_KUNJUNGAN_CREATE: { label: 'Pencatatan Kunjungan Monitoring DUDI', category: 'Kunjungan DUDI', icon: MapPin, colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
      HUBIN_KUNJUNGAN_UPDATE: { label: 'Perubahan Kunjungan Monitoring', category: 'Kunjungan DUDI', icon: MapPin, colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
      HUBIN_KUNJUNGAN_DELETE: { label: 'Pembatalan Kunjungan Monitoring', category: 'Kunjungan DUDI', icon: AlertCircle, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },

      // Mitra & MoU
      HUBIN_MITRA_CREATE: { label: 'Pendaftaran Mitra Industri Baru', category: 'Mitra Industri', icon: Building2, colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
      HUBIN_MITRA_UPDATE: { label: 'Pembaruan Profil Mitra Industri', category: 'Mitra Industri', icon: Building2, colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
      HUBIN_MITRA_DELETE: { label: 'Penghapusan Mitra Industri', category: 'Mitra Industri', icon: Building2, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
      HUBIN_MOU_CREATE: { label: 'Penerbitan Dokumen MoU Kerja Sama', category: 'MoU DUDI', icon: FileText, colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800', badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
      HUBIN_MOU_UPDATE: { label: 'Revisi Dokumen MoU Kerja Sama', category: 'MoU DUDI', icon: FileText, colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
      HUBIN_MOU_RENEW: { label: 'Perpanjangan Masa Berlaku MoU', category: 'MoU DUDI', icon: Sparkles, colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
      HUBIN_MOU_DELETE: { label: 'Pembatalan Dokumen MoU', category: 'MoU DUDI', icon: AlertCircle, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },

      // BKK & TEFA
      HUBIN_LOWONGAN_CREATE: { label: 'Pembukaan Lowongan Kerja BKK', category: 'Bursa Kerja', icon: Briefcase, colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
      HUBIN_LOWONGAN_UPDATE: { label: 'Pembaruan Lowongan BKK', category: 'Bursa Kerja', icon: Briefcase, colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
      HUBIN_LOWONGAN_DELETE: { label: 'Penutupan Lowongan BKK', category: 'Bursa Kerja', icon: Briefcase, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
      HUBIN_LAMARAN_CREATE: { label: 'Pengajuan Lamaran Kerja Alumni', category: 'Bursa Kerja', icon: UserPlus, colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
      HUBIN_LAMARAN_STATUS: { label: 'Pembaruan Status Seleksi Lamaran', category: 'Bursa Kerja', icon: UserCheck, colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800', badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
      HUBIN_LAMARAN_DELETE: { label: 'Pembatalan Lamaran Alumni', category: 'Bursa Kerja', icon: AlertCircle, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
      HUBIN_TRACER_SUBMIT: { label: 'Pengisian Kuesioner Tracer Study', category: 'Tracer Study', icon: GraduationCap, colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
      HUBIN_TEFA_CREATE: { label: 'Pembuatan Proyek Teaching Factory', category: 'TEFA', icon: Factory, colorClass: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800', badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
      HUBIN_TEFA_UPDATE: { label: 'Pembaruan Proyek TEFA', category: 'TEFA', icon: Factory, colorClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
      HUBIN_TEFA_DELETE: { label: 'Penghapusan Proyek TEFA', category: 'TEFA', icon: Factory, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
    };

    if (metaMap[action]) return metaMap[action];

    // Fallback parser
    const cleanAction = action.replace(/^HUBIN_/, '');
    return {
      label: formatTitleCase(cleanAction.replace(/_/g, ' ')),
      category: 'Aktivitas Hubin',
      icon: Activity,
      colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    };
  }, []);

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    if (selectedCategory === 'all') return activities;
    return activities.filter(act => filterCategory(act.action) === selectedCategory);
  }, [activities, selectedCategory, filterCategory]);

  const categoryChips = [
    { id: 'all', label: 'Semua Aktivitas' },
    { id: 'pkl', label: 'Penempatan PKL' },
    { id: 'nilai', label: 'Nilai & Sertifikat' },
    { id: 'presensi', label: 'Presensi & Kunjungan' },
    { id: 'mitra', label: 'Mitra & MoU' },
    { id: 'bkk_tefa', label: 'BKK & TEFA' },
  ];

  return (
    <Card className="border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm relative">
            <Activity size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Aktivitas Terakhir Hubin (Audit Trail)
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Rekam jejak mutasi data penempatan, penilaian, presensi, mitra, dan dokumen Hubin
            </p>
          </div>
        </div>

        {/* Filter Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categoryChips.map((chip) => {
            const isSelected = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedCategory(chip.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer",
                  isSelected 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {activitiesLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Activity size={24} className="text-indigo-500 animate-spin" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Memuat audit trail hubin...
          </span>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Activity size={22} />
          </div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Tidak ada log aktivitas pada kategori ini</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {selectedCategory === 'all' 
              ? 'Seluruh mutasi data Hubin akan otomatis terekam secara realtime' 
              : 'Pilih kategori filter lain untuk melihat riwayat aktivitas'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredActivities.map((act) => {
            const meta = getActionMeta(act.action);
            const IconComponent = meta.icon;
            const actDate = new Date(act.created_at);
            const isToday = new Date().toDateString() === actDate.toDateString();

            return (
              <div 
                key={act.id} 
                className="py-3 px-2 flex items-start justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 rounded-xl transition-colors group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn("p-2 rounded-xl shrink-0 border mt-0.5 shadow-2xs", meta.colorClass)}>
                    <IconComponent size={15} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {meta.label}
                      </p>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.2 rounded-full border", meta.badgeClass)}>
                        {meta.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>Oleh</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
                        {act.actor}
                      </span>
                    </div>

                    {/* Metadata Context Badges */}
                    {act.metadata && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {act.metadata.siswa_nama && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/50 dark:border-indigo-800/50">
                            <Users size={10} />
                            <span>{act.metadata.siswa_nama}</span>
                          </span>
                        )}
                        {act.metadata.mitra_nama && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200/60 dark:border-slate-700/60">
                            <Building2 size={10} />
                            <span>{act.metadata.mitra_nama}</span>
                          </span>
                        )}
                        {act.metadata.dudi_avg !== undefined && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/50 dark:border-amber-800/50">
                            <Award size={10} />
                            <span>Nilai Rata-rata: {act.metadata.dudi_avg}</span>
                          </span>
                        )}
                        {act.metadata.tahap && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/50 dark:border-blue-800/50">
                            <MapPin size={10} />
                            <span>Kunjungan Tahap {act.metadata.tahap}</span>
                          </span>
                        )}
                        {act.metadata.count && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/50 dark:border-emerald-800/50">
                            <CheckCircle2 size={10} />
                            <span>{act.metadata.count} Siswa</span>
                          </span>
                        )}
                        {act.metadata.posisi && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-[10px] font-bold border border-sky-200/50 dark:border-sky-800/50">
                            <Briefcase size={10} />
                            <span>Posisi: {act.metadata.posisi}</span>
                          </span>
                        )}
                        {act.metadata.nama_proyek && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold border border-violet-200/50 dark:border-violet-800/50">
                            <Factory size={10} />
                            <span>Proyek: {act.metadata.nama_proyek}</span>
                          </span>
                        )}
                        {act.metadata.mou_nomor && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200/50 dark:border-purple-800/50">
                            <FileText size={10} />
                            <span>MoU #{act.metadata.mou_nomor}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    {actDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block">
                    {isToday ? 'Hari Ini' : formatDate(act.created_at, { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
});

// Pusat Pintasan Akses Cepat Modul Hubin Baru
interface HubinQuickActionsBarProps {
  onNavigateTab: (tabId: string) => void;
  stats?: HubinStats | null;
}

export const HubinQuickActionsBar: React.FC<HubinQuickActionsBarProps> = React.memo(({ onNavigateTab, stats }) => {
  const actions = [
    {
      id: 'mitra',
      title: 'Mitra & MoU',
      shortTitle: 'Mitra',
      desc: 'Pengelolaan mitra & kerja sama MoU',
      icon: Building2,
      badge: `${stats?.totalMitra || 0} mitra`,
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      gradient: 'from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200/60 dark:border-blue-800/60',
    },
    {
      id: 'penempatan',
      title: 'Plotting & Penempatan',
      shortTitle: 'Plotting',
      desc: 'Pemetaan siswa & pembimbing DUDI',
      icon: Users,
      badge: `${stats?.pklAktif || 0} aktif`,
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      gradient: 'from-indigo-500/10 to-violet-500/10 hover:from-indigo-500/20 hover:to-violet-500/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/60 dark:border-indigo-800/60',
    },
    {
      id: 'absensi',
      title: 'Presensi & Geofence',
      shortTitle: 'Presensi',
      desc: 'Monitoring GPS & permohonan izin/sakit',
      icon: MapPin,
      badge: (stats?.todayPresensi?.unverified || 0) > 0 ? `${stats?.todayPresensi?.unverified} verifikasi` : 'Live Absensi',
      badgeColor: (stats?.todayPresensi?.unverified || 0) > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      gradient: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-800/60',
      hasAlert: (stats?.todayPresensi?.unverified || 0) > 0,
    },
    {
      id: 'nilai-pkl',
      title: 'Nilai & Rapor PKL',
      shortTitle: 'Nilai PKL',
      desc: 'Input nilai teknis & cetak rapor',
      icon: Award,
      badge: stats?.penilaianStats ? `${stats.penilaianStats.persenSelesai}% selesai` : 'Rapor Merdeka',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      gradient: 'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200/60 dark:border-amber-800/60',
    },
    {
      id: 'cetak-berkas',
      title: 'Cetak Berkas & MoU',
      shortTitle: 'Berkas',
      desc: 'Surat tugas, pengesahan, dan rapor',
      icon: Printer,
      badge: 'PDF Ready',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      gradient: 'from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200/60 dark:border-purple-800/60',
    },
    {
      id: 'bkk',
      title: 'Bursa Kerja (BKK)',
      shortTitle: 'BKK',
      desc: 'Lowongan kerja & rekrutmen alumni',
      icon: Briefcase,
      badge: `${stats?.totalLowonganAktif || 0} lowongan`,
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      gradient: 'from-sky-500/10 to-cyan-500/10 hover:from-sky-500/20 hover:to-cyan-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-50 dark:bg-sky-950/50 border-sky-200/60 dark:border-sky-800/60',
    },
    {
      id: 'tracer',
      title: 'Tracer Study Alumni',
      shortTitle: 'Tracer',
      desc: 'Keterserapan kerja & wirausaha alumni',
      icon: GraduationCap,
      badge: `${stats?.totalAlumniTraced || 0} terlacak`,
      badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      gradient: 'from-teal-500/10 to-emerald-500/10 hover:from-teal-500/20 hover:to-emerald-500/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-50 dark:bg-teal-950/50 border-teal-200/60 dark:border-teal-800/60',
    },
    {
      id: 'tefa',
      title: 'Teaching Factory',
      shortTitle: 'TEFA',
      desc: 'Unit produksi & pesanan mitra DUDI',
      icon: Factory,
      badge: `${stats?.tefaStats?.totalOrders || 0} order`,
      badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      gradient: 'from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-950/50 border-orange-200/60 dark:border-orange-800/60',
    },
  ];

  return (
    <div className="space-y-2 w-full max-w-full min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-500" />
          Aksi Cepat & Navigasi Modul Hubin
        </span>
      </div>

      {/* Tampilan Mobile: Grid 4x2 App Drawer (100% Discoverability, Zero Scroll, Zero Trim) */}
      <div className="grid grid-cols-4 sm:hidden gap-2 p-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 shadow-xs backdrop-blur-sm w-full max-w-full min-w-0">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={() => onNavigateTab(act.id)}
            className="group flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:scale-95 transition-all text-center cursor-pointer relative"
          >
            <div className="relative mb-1">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105 border",
                act.iconBg
              )}>
                <act.icon size={18} className={act.iconColor} />
              </div>
              {act.hasAlert && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-tight text-center">
              {act.shortTitle}
            </span>
          </button>
        ))}
      </div>

      {/* Tampilan Desktop / Tablet: Grid Kartu Horizontal Komprehensif */}
      <div className="hidden sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 w-full max-w-full min-w-0">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={() => onNavigateTab(act.id)}
            className={cn(
              "group p-2.5 sm:p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-gradient-to-br transition-all duration-200 text-left flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative overflow-hidden min-w-0",
              act.gradient
            )}
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className={cn("p-1.5 rounded-xl bg-white dark:bg-slate-900 shadow-sm", act.iconColor)}>
                <act.icon size={14} className="sm:w-[15px] sm:h-[15px]" />
              </div>
              <span className={cn("text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full border", act.badgeColor)}>
                {act.badge}
              </span>
            </div>
            <div>
              <p className="font-bold text-[11px] sm:text-xs text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                {act.title}
              </p>
              <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                {act.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

// Seksi Siklus Pelaksanaan & Evaluasi PKL (Presensi & Penilaian Adaptif)
interface PklMonitoringCycleSectionProps {
  stats: HubinStats | null;
  onNavigateTab: (tabId: string) => void;
}

export const PklMonitoringCycleSection: React.FC<PklMonitoringCycleSectionProps> = React.memo(({ stats, onNavigateTab }) => {
  const tp = stats?.todayPresensi || { hadir: 0, sakit: 0, izin: 0, unverified: 0, totalHariIni: 0 };
  const ps = stats?.penilaianStats || { sudahDinilai: 0, belumDinilai: 0, totalSiswaPkl: stats?.totalSiswaPkl || 0, persenSelesai: 0, sertifikatTerbit: 0 };
  const pklAktif = stats?.pklAktif || 0;
  const totalSiswaPkl = stats?.totalSiswaPkl || 0;
  const belumDinilai = ps.belumDinilai;
  const tahunPelajaran = stats?.tahunPelajaran;

  const presensiRate = pklAktif > 0 ? Math.min(100, Math.round((tp.totalHariIni / pklAktif) * 100)) : (tp.totalHariIni > 0 ? 100 : 0);

  // State Machine Siklus PKL Adaptif SSOT
  const phaseInfo = resolvePklLifecyclePhase(stats);
  const isInSeasonOrRolling = phaseInfo.phase === HubinPklPhase.IN_SEASON_ACTIVE || phaseInfo.phase === HubinPklPhase.ROLLING_MIXED;
  const isPostSeasonEvaluation = phaseInfo.phase === HubinPklPhase.POST_SEASON_EVALUATION;
  const isOffSeasonPreparation = phaseInfo.phase === HubinPklPhase.OFF_SEASON_PREPARATION;

  return (
    <div className="space-y-3">
      {/* Header Siklus dengan Konteks Tahun Pelajaran & Status Fase */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Siklus Program PKL
          </span>
          {tahunPelajaran && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 hidden sm:inline-flex">
              TP {tahunPelajaran.nama} {tahunPelajaran.is_active ? '(Aktif)' : ''}
            </span>
          )}
        </div>

        <div>
          <span className={cn(
            "inline-flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-0.5 rounded-full border",
            phaseInfo.badgeVariant === 'purple' && "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
            phaseInfo.badgeVariant === 'emerald' && "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
            phaseInfo.badgeVariant === 'amber' && "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
            phaseInfo.badgeVariant === 'blue' && "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
          )}>
            {phaseInfo.badgeVariant === 'emerald' || phaseInfo.badgeVariant === 'purple' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            ) : phaseInfo.badgeVariant === 'amber' ? (
              <Clock size={10} />
            ) : (
              <Briefcase size={10} />
            )}
            {phaseInfo.badgeText}
          </span>
        </div>
      </div>

      {/* TAMPILAN ADAPTIF FASE 1 & 2: PELAKSANAAN AKTIF ATAU CAMPURAN (IN-SEASON / ROLLING) */}
      {isInSeasonOrRolling && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 1: Monitoring Presensi PKL Hari Ini */}
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <MapPin size={16} />
                    </span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">Presensi PKL Hari Ini</p>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">
                    Geofencing DUDI & Dispensasi Izin/Sakit
                  </p>
                </div>
                {tp.unverified > 0 && (
                  <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 sm:py-1 rounded-full animate-pulse">
                    <AlertCircle size={11} />
                    {tp.unverified} Menunggu Verifikasi
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3 my-3 sm:my-4 w-full max-w-full min-w-0">
                <div className="p-2 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                    <CheckCircle2 size={11} /> Hadir
                  </span>
                  <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300">{tp.hadir}</p>
                  <p className="text-[8px] sm:text-[9px] text-emerald-600/70 dark:text-emerald-400/70">Check-in</p>
                </div>

                <div className="p-2 sm:p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                    <Stethoscope size={11} /> Sakit
                  </span>
                  <p className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-300">{tp.sakit}</p>
                  <p className="text-[8px] sm:text-[9px] text-amber-600/70 dark:text-amber-400/70">Surat Dokter</p>
                </div>

                <div className="p-2 sm:p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 text-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                    <FileText size={11} /> Izin
                  </span>
                  <p className="text-lg sm:text-xl font-black text-sky-700 dark:text-sky-300">{tp.izin}</p>
                  <p className="text-[8px] sm:text-[9px] text-sky-600/70 dark:text-sky-400/70">Dispensasi</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Total Tercatat Hari Ini</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {tp.totalHariIni} dari {pklAktif} siswa ({presensiRate}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pklAktif > 0 ? (tp.hadir / pklAktif) * 100 : 0}%` }} title={`Hadir: ${tp.hadir}`} />
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${pklAktif > 0 ? (tp.sakit / pklAktif) * 100 : 0}%` }} title={`Sakit: ${tp.sakit}`} />
                  <div className="h-full bg-sky-500 transition-all" style={{ width: `${pklAktif > 0 ? (tp.izin / pklAktif) * 100 : 0}%` }} title={`Izin: ${tp.izin}`} />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-0 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => onNavigateTab('penempatan')}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer text-left sm:text-auto"
              >
                Lihat Plotting PKL →
              </button>
              <button 
                onClick={() => onNavigateTab('absensi')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer w-full sm:w-auto"
              >
                Buka Presensi & Verifikasi
                <ArrowRight size={11} />
              </button>
            </div>
          </Card>

          {/* Card 2: Progres Penilaian & Rapor PKL */}
          <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Award size={16} />
                    </span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">Progres Penilaian & Rapor PKL</p>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">
                    Aspek Teknis, Soft Skills & Sertifikat Digital
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{ps.persenSelesai}%</p>
                  <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tuntas</p>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3 my-3 sm:my-4 w-full max-w-full min-w-0">
                <div className="p-2 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                    <CheckCircle2 size={11} /> Dinilai
                  </span>
                  <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300">{ps.sudahDinilai}</p>
                  <p className="text-[8px] sm:text-[9px] text-emerald-600/70 dark:text-emerald-400/70">Nilai Lengkap</p>
                </div>

                <div className="p-2 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                    <Clock size={11} /> Belum
                  </span>
                  <p className="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-300">{ps.belumDinilai}</p>
                  <p className="text-[8px] sm:text-[9px] text-slate-500/70 dark:text-slate-400/70">Menunggu Input</p>
                </div>

                <div className="p-2 sm:p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-center">
                  <span className="text-[9px] sm:text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1 mb-0.5 sm:mb-1">
                    <Award size={11} /> Sertifikat
                  </span>
                  <p className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-300">{ps.sertifikatTerbit}</p>
                  <p className="text-[8px] sm:text-[9px] text-purple-600/70 dark:text-purple-400/70">Nomor Terbit</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Penyelesaian Nilai Siswa</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {ps.sudahDinilai} dari {ps.totalSiswaPkl} siswa ({ps.persenSelesai}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${ps.persenSelesai}%` }} 
                  />
                </div>
              </div>

              {Number(ps.selesaiBelumDinilaiCount || 0) > 0 && (
                <div className="p-2 sm:p-2.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                    <AlertCircle size={13} className="text-amber-600 shrink-0" />
                    <span><strong>{ps.selesaiBelumDinilaiCount} siswa selesai praktik</strong> menunggu input nilai rapor.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('nilai-pkl')}
                    className="text-[9px] font-bold text-amber-700 hover:text-amber-900 dark:text-amber-400 underline shrink-0 cursor-pointer"
                  >
                    Input Nilai →
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-0 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => onNavigateTab('cetak-berkas')}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer text-left sm:text-auto"
              >
                Cetak Rapor & Berkas →
              </button>
              <button 
                onClick={() => onNavigateTab('nilai-pkl')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer w-full sm:w-auto"
              >
                Kelola Nilai PKL
                <ArrowRight size={11} />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* TAMPILAN ADAPTIF FASE 2: EVALUASI AKHIR / PASCA PKL */}
      {isPostSeasonEvaluation && (
        <Card className="border border-amber-200/70 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 via-white/80 to-orange-50/40 dark:from-amber-950/20 dark:via-slate-900/80 dark:to-orange-950/20 p-4 sm:p-5 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Award size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Masa Penarikan PKL Selesai — Fokus Penyelesaian Nilai & Sertifikat
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    Semua siswa telah selesai bertugas di DUDI. Masih ada <span className="font-black underline">{belumDinilai} nilai siswa</span> yang menunggu input sebelum rapor dan sertifikat digital diterbitkan.
                  </p>
                </div>
              </div>

              {/* Progress Bar Penyelesaian Nilai */}
              <div className="pt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    Progres Penilaian: {ps.sudahDinilai} dari {ps.totalSiswaPkl} Siswa ({ps.persenSelesai}%)
                  </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {ps.sertifikatTerbit} Sertifikat Terbit
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${ps.persenSelesai}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => onNavigateTab('nilai-pkl')}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <CheckCircle2 size={13} />
                Input Nilai PKL ({belumDinilai})
              </button>
              <button
                onClick={() => onNavigateTab('cetak-berkas')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Printer size={13} />
                Cetak Rapor & Sertifikat
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* TAMPILAN ADAPTIF FASE 3: PERSIAPAN & PLOTTING DUDI (OFF-SEASON) */}
      {isOffSeasonPreparation && (
        <Card className="border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/40 via-white/80 to-sky-50/40 dark:from-indigo-950/20 dark:via-slate-900/80 dark:to-sky-950/20 p-4 sm:p-5 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Fase Persiapan Penempatan PKL {tahunPelajaran ? `(TP ${tahunPelajaran.nama})` : ''}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {totalSiswaPkl > 0 
                      ? `Sebanyak ${totalSiswaPkl} siswa telah terdaftar / terplotting. Menunggu jadwal tanggal pelaksanaan aktif di DUDI.`
                      : `Belum ada gelombang siswa yang aktif di DUDI saat ini. Siapkan plotting siswa ke mitra industri dan periksa dokumen MoU.`
                    }
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[9px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  Mitra Industri: {stats?.totalMitra || 0} Terdaftar
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Building2 size={11} className="text-indigo-500" />
                  Siswa Terdaftar TP Ini: {totalSiswaPkl} Siswa
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => onNavigateTab('penempatan')}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              >
                <Users size={13} />
                Plotting Siswa PKL
              </button>
              <button
                onClick={() => onNavigateTab('mitra')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Building2 size={13} />
                Cek Kuota DUDI
              </button>
              <button
                onClick={() => onNavigateTab('cetak-berkas')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Printer size={13} />
                Surat Pengantar
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
});

