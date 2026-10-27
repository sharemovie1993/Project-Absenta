import React, { useMemo } from 'react';
import {
  Users,
  Building2,
  Clock,
  CheckCircle2,
  Calendar,
  CalendarCheck,
  Award,
  Printer,
  ChevronRight,
  MapPin,
  Sparkles,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { HubBentoGrid, HubActionGrid, type HubBentoCell, type HubActionItem } from '@/components/ui/hub';
import { Badge, Button } from '@/components/ui';
import type { PklTabId, PklDashboardStats, SiswaBimbinganItem, KunjunganMonitoringItem } from '../types';

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
  semesterNama,
  onSelectTab,
  onOpenSiswaDetail,
}) => {
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'totalSiswa',
        title: 'Siswa Bimbingan',
        value: `${stats.total_siswa_bimbingan ?? 0} Siswa`,
        subtext: tpTahun ? `Periode ${tpTahun}` : 'Aktif Magang',
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
        subtext: 'Lokasi Penempatan',
        icon: Building2,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => onSelectTab('bimbingan'),
      },
      {
        id: 'pendingJurnal',
        title: 'Jurnal Perlu Review',
        value: `${stats.jurnal_pending_review ?? 0} Logbook`,
        subtext: (stats.jurnal_pending_review ?? 0) > 0 ? 'Menunggu Verifikasi' : 'Seluruhnya Terverifikasi',
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
        subtext: 'Kunjungan Monitoring',
        icon: CheckCircle2,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => onSelectTab('monitoring'),
      },
    ],
    [stats, tpTahun, onSelectTab]
  );

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
    [stats.jurnal_pending_review, onSelectTab]
  );

  const siswaList = stats.siswa_bimbingan_list || [];
  const kunjunganList = stats.kunjungan_terbaru || [];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Bento Grid Metrik Flat (Shopee-Grade Hairline) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <HubBentoGrid cells={bentoCells} columns={4} />
      </div>

      {/* 2. Quick Action Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Aksi Cepat Pembimbing PKL
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-2 shadow-xs">
          <HubActionGrid items={quickActions} variant="slider" />
        </div>
      </div>

      {/* 3. 2-Column Bento: Siswa Bimbingan & Log Supervisi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kolom Kiri: Siswa Bimbingan Terkini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Siswa Bimbingan Magang
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {stats.total_siswa_bimbingan} Siswa di {stats.total_mitra_industri} Mitra DU/DI
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab('bimbingan')}
              className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-50 dark:hover:bg-teal-950/50"
            >
              Lihat Semua
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>

          <div className="space-y-2">
            {siswaList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
                <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Belum Ada Siswa Bimbingan Ditugaskan
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hubungi Waka Hubinmas untuk plotting penugasan bimbingan PKL Anda.
                </p>
              </div>
            ) : (
              siswaList.slice(0, 5).map((siswa) => (
                <div
                  key={siswa.id}
                  onClick={() => onOpenSiswaDetail?.(siswa)}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {siswa.nama_siswa}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        ({siswa.kelas})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <Building2 size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate font-medium">{siswa.nama_mitra}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={siswa.status === 'AKTIF' ? 'success' : 'neutral'}
                      className="text-[10px] uppercase font-bold"
                    >
                      {siswa.status}
                    </Badge>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan: Log Kunjungan & Supervisi Industri */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Supervisi &amp; Monitoring DU/DI
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Riwayat Kunjungan Pembimbing Sekolah
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab('monitoring')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              Lihat Agenda
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>

          <div className="space-y-2">
            {kunjunganList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
                <Calendar className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Belum Ada Catatan Supervisi
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik &apos;Catat Supervisi&apos; untuk mendokumentasikan kunjungan ke DU/DI.
                </p>
              </div>
            ) : (
              kunjunganList.slice(0, 4).map((kunjungan) => (
                <div
                  key={kunjungan.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {kunjungan.nama_mitra}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {kunjungan.tanggal_kunjungan}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {kunjungan.catatan_supervisi || kunjungan.tujuan || 'Monitoring berkala progres siswa.'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
