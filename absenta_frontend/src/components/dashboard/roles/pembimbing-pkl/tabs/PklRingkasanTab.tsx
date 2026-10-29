import React, { useMemo } from 'react';
import {
  Users,
  Building2,
  Clock,
  CheckCircle2,
  Calendar,
  CalendarCheck,
  ShieldCheck,
  Award,
  Printer,
  ChevronRight,
} from 'lucide-react';
import {
  HubCard,
  HubBentoGrid,
  HubActionGrid,
  HubListRow,
  type HubBentoCell,
  type HubActionItem,
} from '@/components/ui/hub';
import type { PklTabId, PklDashboardStats, SiswaBimbinganItem } from '../types';

export interface PklRingkasanTabProps {
  stats: PklDashboardStats;
  tpTahun?: string;
  semesterNama?: string;
  onSelectTab: (tabId: PklTabId) => void;
  onOpenSiswaDetail?: (siswa: SiswaBimbinganItem) => void;
}

export const PklRingkasanTab: React.FC<PklRingkasanTabProps> = ({
  stats,
  tpTahun,
  onSelectTab,
  onOpenSiswaDetail,
}) => {
  // 1. Bento Grid Metrik Flat (Shopee-Grade Hairline)
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'totalSiswa',
        title: 'Siswa Bimbingan',
        value: `${stats.total_siswa_bimbingan ?? 0} Siswa`,
        subtext: (stats.siswa_aktif ?? 0) > 0 ? `${stats.siswa_aktif} Siswa Aktif` : tpTahun ? `Periode ${tpTahun}` : 'Aktif Magang',
        icon: Users,
        iconColorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
        badge: (stats.siswa_aktif ?? 0) > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-teal-500 text-white">
            {stats.siswa_aktif} Aktif
          </span>
        ) : undefined,
        onClick: () => onSelectTab('bimbingan'),
      },
      {
        id: 'totalMitra',
        title: 'Mitra Industri DU/DI',
        value: `${stats.total_mitra_industri ?? 0} Perusahaan`,
        subtext: 'Tempat Penempatan',
        icon: Building2,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => onSelectTab('bimbingan'),
      },
      {
        id: 'pendingJurnal',
        title: 'Jurnal Perlu Review',
        value: `${stats.jurnal_pending_review ?? 0} Logbook`,
        subtext: (stats.jurnal_pending_review ?? 0) > 0 ? 'Menunggu Verifikasi' : 'Semua Terverifikasi',
        icon: Clock,
        iconColorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
        badge: (stats.jurnal_pending_review ?? 0) > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white animate-pulse">
            Review
          </span>
        ) : undefined,
        onClick: () => onSelectTab('jurnal'),
      },
      {
        id: 'supervisi',
        title: 'Supervisi Terlaksana',
        value: `${stats.total_kunjungan_terlaksana ?? 0} Kali`,
        subtext: 'Kunjungan Lapangan',
        icon: CheckCircle2,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onSelectTab('monitoring'),
      },
    ],
    [stats, tpTahun, onSelectTab]
  );

  // 2. Quick Action Slider (Dipertahankan sesuai permintaan pengguna)
  const quickActions: HubActionItem[] = useMemo(
    () => [
      {
        id: 'act-bimbingan',
        label: 'Siswa Bimbingan',
        icon: Users,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        onClick: () => onSelectTab('bimbingan'),
      },
      {
        id: 'act-verif-absensi',
        label: 'Verifikasi Absensi',
        icon: ShieldCheck,
        iconColorClass: 'text-blue-600 dark:text-blue-400',
        badge: (stats.absensi_pending_verification ?? 0) > 0 ? stats.absensi_pending_verification : undefined,
        onClick: () => onSelectTab('verifikasi_absensi'),
      },
      {
        id: 'act-absensi',
        label: 'Rekap Presensi',
        icon: CalendarCheck,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onSelectTab('absensi'),
      },
      {
        id: 'act-jurnal',
        label: 'Verifikasi Jurnal',
        icon: Clock,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        badge: stats.jurnal_pending_review > 0 ? stats.jurnal_pending_review : undefined,
        onClick: () => onSelectTab('jurnal'),
      },
      {
        id: 'act-monitoring',
        label: 'Catat Supervisi',
        icon: Calendar,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onSelectTab('monitoring'),
      },
      {
        id: 'act-nilai',
        label: 'Input Penilaian',
        icon: Award,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onSelectTab('penilaian'),
      },
      {
        id: 'act-rekap',
        label: 'Cetak Lembar PKL',
        icon: Printer,
        iconColorClass: 'text-purple-600 dark:text-purple-400',
        onClick: () => onSelectTab('rekap'),
      },
    ],
    [stats.absensi_pending_verification, stats.jurnal_pending_review, onSelectTab]
  );

  const siswaList = stats.siswa_bimbingan_list || [];
  const kunjunganList = stats.kunjungan_terbaru || [];

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Bento Grid Metrik Flat (Shopee-Grade Hairline) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <HubBentoGrid cells={bentoCells} columns={4} />
      </div>

      {/* 2. Quick Action Slider (Horizontal Slider Dipertahankan) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Aksi Cepat Pembimbing PKL
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-2.5 px-1.5 shadow-xs">
          <HubActionGrid items={quickActions} variant="slider" />
        </div>
      </div>

      {/* 3. 2-Column: Siswa Bimbingan & Log Supervisi (Flat Hairline Divider, Bebas Box-in-Box) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Kolom Kiri: Siswa Bimbingan Terkini */}
        <HubCard
          title={
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Users size={15} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate">
                  Siswa Bimbingan Magang
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                  {stats.total_siswa_bimbingan} Siswa di {stats.total_mitra_industri} Mitra DU/DI
                </p>
              </div>
            </div>
          }
          actionLabel="Lihat Semua"
          onAction={() => onSelectTab('bimbingan')}
          noPadding
        >
          {siswaList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-1.5" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">Belum Ada Siswa Bimbingan</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Plotting penugasan akan tampil di sini.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {siswaList.slice(0, 5).map((siswa) => (
                <HubListRow
                  key={siswa.id}
                  title={siswa.nama_siswa}
                  subtitle={
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-slate-500">{siswa.kelas}</span>
                      <span>•</span>
                      <Building2 size={11} className="shrink-0 text-slate-400" />
                      <span className="truncate">{siswa.nama_mitra}</span>
                    </span>
                  }
                  rightBadge={
                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                        siswa.status === 'AKTIF'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {siswa.status}
                    </span>
                  }
                  onClick={() => onOpenSiswaDetail?.(siswa)}
                />
              ))}
            </div>
          )}
        </HubCard>

        {/* Kolom Kanan: Log Kunjungan & Supervisi Industri */}
        <HubCard
          title={
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar size={15} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate">
                  Supervisi &amp; Monitoring DU/DI
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                  Riwayat Kunjungan Pembimbing Sekolah
                </p>
              </div>
            </div>
          }
          actionLabel="Lihat Agenda"
          onAction={() => onSelectTab('monitoring')}
          noPadding
        >
          {kunjunganList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-1.5" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">Belum Ada Catatan Supervisi</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Catat kunjungan industri untuk memulai log.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {kunjunganList.slice(0, 4).map((kunjungan) => (
                <div
                  key={kunjungan.id}
                  onClick={() => onSelectTab('monitoring')}
                  className="p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800/60 transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {kunjungan.nama_mitra}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {kunjungan.tanggal_kunjungan}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                    {kunjungan.catatan_supervisi || kunjungan.tujuan || 'Monitoring berkala pelaksanaan PKL.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </HubCard>
      </div>
    </div>
  );
};

export default PklRingkasanTab;
