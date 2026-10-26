import React, { useMemo } from 'react';
import {
  Users,
  Compass,
  Award,
  Calendar,
  Sparkles,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Clock,
  Printer,
  Plus,
} from 'lucide-react';
import { HubBentoGrid, HubActionGrid, type HubBentoCell, type HubActionItem } from '@/components/ui/hub';
import { cn } from '@/lib/utils';
import type { EkskulTabId, EkskulStats } from '../types';

export interface EkskulBerandaTabProps {
  stats: EkskulStats;
  tpTahun?: string;
  semesterNama?: string;
  onSelectTab: (tabId: EkskulTabId) => void;
}

export const EkskulBerandaTab: React.FC<EkskulBerandaTabProps> = ({
  stats,
  tpTahun,
  semesterNama,
  onSelectTab,
}) => {
  const bentoCells: HubBentoCell[] = useMemo(
    () => [
      {
        id: 'totalEkskul',
        title: 'Ekstrakurikuler Aktif',
        value: `${stats.total_ekskul ?? 0} Unit`,
        subtext: tpTahun ? `Periode ${tpTahun}` : 'Tercatat Resmi',
        icon: Compass,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        badge: (stats.total_ekskul ?? 0) > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500 text-white">
            Aktif
          </span>
        ) : undefined,
        onClick: () => onSelectTab('anggota'),
      },
      {
        id: 'totalAnggota',
        title: 'Total Anggota Siswa',
        value: `${stats.total_anggota ?? 0} Siswa`,
        subtext: 'Siswa Peminatan',
        icon: Users,
        iconColorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60',
        onClick: () => onSelectTab('anggota'),
      },
      {
        id: 'totalPembina',
        title: 'Guru Pembina & Pelatih',
        value: `${stats.total_pembina ?? 0} Staf`,
        subtext: 'Penanggung Jawab',
        icon: UserCheck,
        iconColorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
        onClick: () => onSelectTab('jadwal'),
      },
      {
        id: 'persentaseNilai',
        title: 'Capaian Nilai Rapor',
        value: `${stats.persentase_dinilai ?? 0}%`,
        subtext: semesterNama || 'Semester Berjalan',
        icon: Award,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        badge: (stats.persentase_dinilai ?? 0) >= 80 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
            Lengkap
          </span>
        ) : undefined,
        onClick: () => onSelectTab('nilai'),
      },
    ],
    [stats, tpTahun, semesterNama, onSelectTab]
  );

  const quickActions: HubActionItem[] = useMemo(
    () => [
      {
        id: 'act-anggota',
        label: 'Kelola Anggota',
        icon: Users,
        iconColorClass: 'text-teal-600 dark:text-teal-400',
        onClick: () => onSelectTab('anggota'),
      },
      {
        id: 'act-nilai',
        label: 'Input Nilai Rapor',
        icon: Award,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        onClick: () => onSelectTab('nilai'),
      },
      {
        id: 'act-jadwal',
        label: 'Jadwal Latihan',
        icon: Calendar,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400',
        onClick: () => onSelectTab('jadwal'),
      },
      {
        id: 'act-rekap',
        label: 'Cetak Rekap',
        icon: Printer,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        onClick: () => onSelectTab('rekap'),
      },
    ],
    [onSelectTab]
  );

  const kegiatanAktif = stats.kegiatan_aktif || [];
  const jadwalMingguan = stats.jadwal_mingguan || [];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Bento Grid Metrik Flat (Hairline Dividers Ala Shopee) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <HubBentoGrid cells={bentoCells} columns={4} />
      </div>

      {/* 2. Quick Action Slider (Shopee-Grade Horizontal Track) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Aksi Cepat Pembina
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-2 shadow-xs">
          <HubActionGrid items={quickActions} variant="slider" />
        </div>
      </div>

      {/* 3. 2-Column Bento: Daftar Ekskul Aktif & Jadwal Latihan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kolom Kiri: Klub Ekstrakurikuler Binaan & Terdaftar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Compass size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Daftar Klub Ekstrakurikuler
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Pengembangan Minat &amp; Bakat Siswa
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('anggota')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Kelola Anggota</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
            {kegiatanAktif.length > 0 ? (
              kegiatanAktif.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
                  onClick={() => onSelectTab('anggota')}
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {item.nama}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {item.kategori || 'Ekstrakurikuler'} • {item.jadwal_hari || 'Sabtu'} ({item.jadwal_jam || 'Sore'})
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
                      {item.jumlah_anggota ?? 0} Siswa
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                Belum ada data ekstrakurikuler yang dimuat.
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Jadwal Latihan Mingguan */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Jadwal Latihan Mingguan
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Agenda Latihan Rutin
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('jadwal')}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Semua Jadwal</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
            {jadwalMingguan.length > 0 ? (
              jadwalMingguan.map((j) => (
                <div
                  key={j.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {j.nama_kegiatan}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      Pembina: {j.pembina || 'Guru Pembina'} • {j.lokasi || 'Lapangan / Ruang Ekskul'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono shrink-0">
                    {j.hari}, {j.jam_mulai}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                Belum ada jadwal latihan rutin yang tersimpan.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
