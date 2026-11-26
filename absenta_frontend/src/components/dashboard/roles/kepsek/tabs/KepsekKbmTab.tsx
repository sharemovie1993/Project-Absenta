import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle, PlayCircle, Award, ArrowUpRight, Laptop } from 'lucide-react';
import { HubCard } from '@/components/ui/hub';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PersonPhoto } from '@/components/ui/PersonPhoto';
import { cn } from '@/lib/utils';
import { MonitoringKbmWidget } from '@/components/dashboard/shared/MonitoringKbmWidget';
import { getSupervisionSchedule } from '@/api/dashboard.api';
import { UnifiedBlockMetrics } from '../components/UnifiedBlockMetrics';

export interface KepsekKbmTabProps {
  stats: any;
  teacherLeaderboard: any[];
  onOpenTeacherLeaderboard: () => void;
}

export const KepsekKbmTab: React.FC<KepsekKbmTabProps> = React.memo(({
  stats,
  teacherLeaderboard,
  onOpenTeacherLeaderboard,
}) => {
  const navigate = useNavigate();

  const { data: supervisionRes } = useQuery({
    queryKey: ['kepsek-kbm-supervision'],
    queryFn: () => getSupervisionSchedule(),
    staleTime: 60_000,
  });

  const supervisionList = useMemo(() => {
    if (Array.isArray(supervisionRes)) return supervisionRes;
    if (Array.isArray(supervisionRes?.data)) return supervisionRes.data;
    return [];
  }, [supervisionRes]);

  const guruAttendance = useMemo(
    () => (stats?.total_guru ? Math.round((stats.guru_hadir / stats.total_guru) * 100) : 0),
    [stats?.total_guru, stats?.guru_hadir]
  );
  const siswaAttendance = useMemo(
    () => (stats?.total_siswa ? Math.round((stats.siswa_hadir / stats.total_siswa) * 100) : 0),
    [stats?.total_siswa, stats?.siswa_hadir]
  );

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Metrik Utama KBM */}
      <UnifiedBlockMetrics
        items={[
          {
            label: 'Hadir Siswa',
            value: `${siswaAttendance}%`,
            subtitle: 'Kehadiran hari ini',
            icon: Users,
            color: 'blue',
          },
          {
            label: 'Hadir Guru',
            value: `${guruAttendance}%`,
            subtitle: 'Pendidik bertugas',
            icon: CheckCircle,
            color: 'emerald',
          },
          {
            label: 'Sesi KBM Live',
            value: `${stats?.total_sesi_aktif || 0} Kelas`,
            subtitle: 'Sedang belajar',
            icon: PlayCircle,
            color: 'purple',
          },
          {
            label: 'Supervisi KBM',
            value: supervisionList.length > 0 ? `${supervisionList.length} Agenda` : `${guruAttendance}%`,
            subtitle: supervisionList.length > 0 ? 'Pendidik terjadwal' : 'Jam efektif tercapai',
            icon: Award,
            color: 'amber',
          },
        ]}
      />

      {/* 2. Monitoring KBM Live Real-Time */}
      <HubCard
        title="Monitoring KBM Live Real-Time"
        headerAction={
          <Badge variant="outline" className="text-[10px] font-bold">
            Live Connected
          </Badge>
        }
      >
        <MonitoringKbmWidget isExecutive={true} />
      </HubCard>

      {/* 2b. Monitoring Asesmen & Ujian CBT */}
      <HubCard
        title="Monitoring Asesmen & Ujian Berbasis Komputer (CBT)"
        headerAction={
          <Button
            size="toolbar"
            variant="toolbarOutline"
            onClick={() => navigate('/cbt/sesi')}
            className="text-xs font-semibold gap-1.5 cursor-pointer text-violet-600 dark:text-violet-400"
          >
            <Laptop size={14} />
            <span>Pengawasan Sesi CBT Live</span>
            <ArrowUpRight size={14} />
          </Button>
        }
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Infrastruktur &amp; Engine Asesmen Siap Operasional</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mendukung monitoring ruang ujian, anti-kecurangan token browser, autosave jawaban berkala, dan rekap nilai otomatis.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/cbt/bank-soal')}
              className="text-xs"
            >
              Bank Soal
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/cbt/jadwal')}
              className="text-xs"
            >
              Jadwal Ujian
            </Button>
          </div>
        </div>
      </HubCard>

      {/* 3. Klasemen Kedisiplinan & Kinerja PTK (Guru) */}
      <HubCard
        title="Klasemen Kedisiplinan & Kinerja PTK (Guru)"
        headerAction={
          <Button
            size="toolbar"
            variant="toolbarOutline"
            onClick={onOpenTeacherLeaderboard}
            className="text-xs font-semibold gap-1.5"
          >
            <span>Klasemen Lengkap</span>
            <ArrowUpRight size={14} />
          </Button>
        }
      >
        {teacherLeaderboard.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {teacherLeaderboard?.slice(0, 5)?.map((teacher: any, idx: number) => {
              const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              return (
                <div
                  key={teacher.id || idx}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-black">{rankMedal}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-black uppercase",
                          teacher.points > 0
                            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40"
                            : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {teacher.points > 0 ? `${teacher.points} Pts` : teacher.status_keaktifan === 'BELUM_ADA_SESI' ? 'Belum Ada Sesi' : '0 Pts'}
                      </Badge>
                    </div>
                    <PersonPhoto
                      name={teacher.nama}
                      foto={teacher.foto}
                      variant="circle"
                      size="sm"
                      showName={true}
                      subtitle={teacher.nip && teacher.nip !== '-' ? `NIP: ${teacher.nip}` : 'Pendidik'}
                    />
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[10px] font-medium text-slate-500">
                    <span>
                      {teacher.kbm_total > 0
                        ? `Hadir: ${teacher.kbm_count}/${teacher.kbm_total} (${teacher.kbm_rate || 0}%)`
                        : teacher.hadir_count > 0
                        ? `Hadir: ${teacher.hadir_count}x`
                        : 'Belum Ada Sesi'}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {teacher.jurnal_count > 0 ? `Jurnal: ${teacher.jurnal_count}` : teacher.score > 0 ? `${teacher.score}% Indeks` : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs font-medium italic">
            Memuat data peringkat kedisiplinan guru...
          </div>
        )}
      </HubCard>
    </div>
  );
});

KepsekKbmTab.displayName = 'KepsekKbmTab';
