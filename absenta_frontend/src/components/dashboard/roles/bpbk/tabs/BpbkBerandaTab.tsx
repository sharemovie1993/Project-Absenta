import React, { useMemo } from 'react';
import {
  UserCheck,
  MailOpen,
  Home,
  AlertTriangle,
  FileText,
  HeartHandshake,
  Share2,
  ClipboardList,
  Printer,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { BpbkDashboardStats } from '@/api/bpbk.api';
import type { BpbkTabId } from '../types';

export interface BpbkBerandaTabProps {
  stats: BpbkDashboardStats | null;
  loading: boolean;
  onTabSelect: (tabId: BpbkTabId) => void;
  onSelectSiswaDetail?: (siswaId: string) => void;
  onViewAllSiswa?: () => void;
}

export const BpbkBerandaTab: React.FC<BpbkBerandaTabProps> = React.memo(({
  stats,
  loading,
  onTabSelect,
  onSelectSiswaDetail,
  onViewAllSiswa,
}) => {
  // 1. Bento Grid Cells (Shopee-Grade Hairline 2x2 or 4x1)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'activeCounseling',
        title: 'Kasus Aktif',
        value: `${stats?.activeCounselingCount ?? 0} Kasus`,
        subtext: 'Masa Pendampingan',
        icon: UserCheck,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        badge: (stats?.activeCounselingCount ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
            Aktif
          </span>
        ) : undefined,
        onClick: () => onTabSelect('konseling'),
      },
      {
        id: 'pendingCalls',
        title: 'Panggilan Ortu',
        value: `${stats?.pendingCallsCount ?? 0} Surat`,
        subtext: 'Menunggu Hadir',
        icon: MailOpen,
        iconColorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
        badge: (stats?.pendingCallsCount ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
            Pending
          </span>
        ) : undefined,
        onClick: () => onTabSelect('pemanggilan'),
      },
      {
        id: 'monthHomeVisits',
        title: 'Home Visit',
        value: `${stats?.monthHomeVisitsCount ?? 0} Kunjungan`,
        subtext: 'Bulan Berjalan',
        icon: Home,
        iconColorClass: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60',
        onClick: () => onTabSelect('homevisit'),
      },
      {
        id: 'criticalStudents',
        title: 'Pantauan EWS',
        value: `${stats?.criticalStudents?.length ?? 0} Siswa`,
        subtext: 'Prioritas Penanganan',
        icon: AlertTriangle,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        badge: (stats?.criticalStudents?.length ?? 0) > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
            Atensi
          </span>
        ) : undefined,
        onClick: () => onTabSelect('cases'),
      },
    ],
    [stats, onTabSelect]
  );

  // 2. Quick Action Slider (Shopee-Grade Headerless Quick Action Slider)
  const actionItems: HubActionItem[] = useMemo(
    () => [
      {
        id: 'cases',
        label: 'Kasus BK',
        icon: FileText,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onTabSelect('cases'),
      },
      {
        id: 'konseling',
        label: 'Konseling',
        icon: HeartHandshake,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onTabSelect('konseling'),
      },
      {
        id: 'pemanggilan',
        label: 'Panggilan Ortu',
        icon: MailOpen,
        iconColorClass: 'text-rose-600 dark:text-rose-400',
        onClick: () => onTabSelect('pemanggilan'),
      },
      {
        id: 'homevisit',
        label: 'Home Visit',
        icon: Home,
        iconColorClass: 'text-violet-600 dark:text-violet-400',
        onClick: () => onTabSelect('homevisit'),
      },
      {
        id: 'rujukan',
        label: 'Rujukan',
        icon: Share2,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        onClick: () => onTabSelect('rujukan'),
      },
      {
        id: 'asesmen',
        label: 'Asesmen',
        icon: ClipboardList,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onTabSelect('asesmen'),
      },
      {
        id: 'rekap',
        label: 'Cetak Dokumen',
        icon: Printer,
        iconColorClass: 'text-slate-600 dark:text-slate-400',
        onClick: () => onTabSelect('rekap'),
      },
    ],
    [onTabSelect]
  );

  const criticalStudents = stats?.criticalStudents ?? [];
  const recentViolations = stats?.recentViolations ?? [];
  const recentCounselings = stats?.recentCounselings ?? [];

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* 1. Bento Grid Executive KPI */}
      <HubBentoGrid cells={bentoCells} columns={4} />

      {/* 2. Shopee Quick Action Slider */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-2 shadow-xs">
        <HubActionGrid items={actionItems} variant="slider" />
      </div>

      {/* 3. Early Warning System (EWS Pantauan Siswa Kritis) */}
      <HubCard
        title="Early Warning System (EWS Siswa Kritis)"
        headerAction={
          onViewAllSiswa ? (
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={onViewAllSiswa}
              className="text-xs font-semibold"
            >
              Semua Siswa
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : undefined
        }
      >
        {criticalStudents.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <UserCheck className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Tidak Ada Siswa Berisiko Tinggi
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Seluruh siswa berada dalam zona aman dari akumulasi pelanggaran dan alpa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 -my-2 sm:mx-0 sm:my-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Profil Siswa</th>
                  <th className="py-2.5 px-2">Kelas</th>
                  <th className="py-2.5 px-2 text-center">Pelanggaran</th>
                  <th className="py-2.5 px-2 text-center">Prestasi</th>
                  <th className="py-2.5 px-2 text-center">Alpa (30H)</th>
                  <th className="py-2.5 px-2 text-center">Tingkat Risiko</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {criticalStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800 dark:text-white text-xs">
                        {student.nama_siswa}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        NIS: {student.nis}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {student.kelas}
                    </td>
                    <td className="py-2.5 px-2 text-center text-xs font-bold text-rose-600 dark:text-rose-400">
                      +{student.violations}
                    </td>
                    <td className="py-2.5 px-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      -{student.achievements}
                    </td>
                    <td className="py-2.5 px-2 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
                      {student.alpaCount}x
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Badge
                        variant={
                          student.riskLevel === 'HIGH'
                            ? 'error'
                            : student.riskLevel === 'MEDIUM'
                            ? 'warning'
                            : 'success'
                        }
                        className="px-2 py-0.5 text-[9px] font-bold uppercase"
                      >
                        {student.riskLevel} ({student.riskScore})
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {onSelectSiswaDetail && (
                        <Button
                          variant="toolbarPrimary"
                          size="toolbar"
                          onClick={() => onSelectSiswaDetail(student.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-[10px] h-7 px-2.5 rounded-lg font-semibold"
                        >
                          Bimbing
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </HubCard>

      {/* 4. Feeds: Pelanggaran Terbaru & Konseling Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Violations */}
        <HubCard
          title="Pelanggaran Terbaru"
          headerAction={
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => onTabSelect('cases')}
              className="text-xs font-semibold"
            >
              Lihat Kasus
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="space-y-2.5">
            {recentViolations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-medium">
                Belum ada rekam catatan pelanggaran terbaru.
              </p>
            ) : (
              recentViolations.map((v) => (
                <div
                  key={v.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3"
                >
                  <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-black shrink-0">
                    +{v.poin}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {v.Siswa?.nama_siswa || 'Siswa'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {v.jenis_pelanggaran}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                      {v.tanggal ? new Date(v.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </HubCard>

        {/* Recent Counselings */}
        <HubCard
          title="Konseling Terbaru"
          headerAction={
            <Button
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => onTabSelect('konseling')}
              className="text-xs font-semibold"
            >
              Lihat Konseling
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="space-y-2.5">
            {recentCounselings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-medium">
                Belum ada sesi konseling tercatat.
              </p>
            ) : (
              recentCounselings.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3"
                >
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                    <HeartHandshake size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {c.Siswa?.nama_siswa || 'Siswa'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate line-clamp-1">
                      {c.masalah}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {c.tanggal ? new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </span>
                      <Badge
                        variant={c.status === 'SELESAI' ? 'success' : 'warning'}
                        className="text-[8px] font-bold px-1.5 py-0 uppercase"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </HubCard>
      </div>
    </div>
  );
});

BpbkBerandaTab.displayName = 'BpbkBerandaTab';
