import React from 'react';
import {
  BookOpen,
  FileText,
  ArrowLeftRight,
  Award,
  Send,
  Users,
  ShieldCheck,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Sparkles,
  Inbox,
  UserCheck,
  Building2,
  FileCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { ShopeeQuickActionSlider } from '@/components/common/ShopeeQuickActionSlider';
import type { TuTabId, TuStatsData } from '../types';

interface TuBerandaTabProps {
  stats?: TuStatsData;
  onSelectTab?: (tabId: TuTabId) => void;
  onOpenSuratKeterangan?: () => void;
  onOpenMutasi?: () => void;
  onOpenBastIjazah?: () => void;
  onOpenDknPrint?: () => void;
}

export const TuBerandaTab: React.FC<TuBerandaTabProps> = React.memo(({
  stats,
  onSelectTab,
  onOpenSuratKeterangan,
  onOpenMutasi,
  onOpenBastIjazah,
  onOpenDknPrint,
}) => {
  const recentActivities = stats?.recentActivities || [];

  return (
    <div className="space-y-6">
      {/* ─── 1. TOP 4 KPI CARDS (EXACT GRADIENT MATCH TO SCREENSHOT) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siswa Aktif Buku Induk */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="SISWA AKTIF BUKU INDUK"
          value={stats?.bukuInduk?.totalSiswaAktif || 0}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          description="Peserta didik aktif ber-NISN nasional"
          gradient="from-blue-600 to-indigo-700"
        />

        {/* Card 2: Pelayanan Persuratan */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="SURAT MASUK BARU"
          value={`${stats?.suratMasuk?.baru || stats?.persuratan?.totalSuratBulanIni || 0}`}
          icon={<Inbox className="w-5 h-5 text-emerald-500" />}
          description={`Total ${stats?.suratMasuk?.total || 0} surat masuk | ${stats?.suratMasuk?.disposisi || 0} disposisi aktif`}
          gradient="from-emerald-600 to-teal-700"
        />

        {/* Card 3: Mutasi Siswa */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="MUTASI SEMESTER INI"
          value={`${stats?.mutasi?.keluar || 0} / ${stats?.mutasi?.masuk || 0}`}
          icon={<ArrowLeftRight className="w-5 h-5 text-sky-500" />}
          description="Rasio siswa keluar vs masuk"
          gradient="from-sky-600 to-blue-700"
        />

        {/* Card 4: Brankas Ijazah & Kelulusan */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="BLANGKO IJAZAH DI BRANKAS"
          value={`${stats?.ijazah?.sisaBrankas || 0} Blangko`}
          icon={<Award className="w-5 h-5 text-amber-500" />}
          description={`${stats?.ijazah?.sudahDiserahkan || 0} dari ${stats?.ijazah?.totalLulusan || 0} ijazah telah diambil`}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* ─── 2. PINTASAN OPERASIONAL TATA USAHA (App Launcher Style - Miller's Law 7 Items) ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Pintasan Operasional Tata Usaha
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Akses cepat penerbitan surat keterangan, mutasi, clearance ijazah, dan arsip induk.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSuratKeterangan}
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Layanan Persuratan <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid 7 Kolom (Desktop: 1 baris 7 ikon, Mobile: 2 baris 4+3 ikon) */}
        <ShopeeQuickActionSlider
          items={[
            {
              id: 'surat-keterangan',
              title: 'Surat Keterangan',
              icon: FileText,
              color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
              onClick: () => {
                if (onOpenSuratKeterangan) onOpenSuratKeterangan();
                else if (onSelectTab) onSelectTab('surat-keterangan');
              },
            },
            {
              id: 'mutasi',
              title: 'Mutasi Siswa',
              icon: ArrowLeftRight,
              color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
              onClick: () => {
                if (onOpenMutasi) onOpenMutasi();
                else if (onSelectTab) onSelectTab('mutasi');
              },
            },
            {
              id: 'bast',
              title: 'Clearance & BAST',
              icon: Award,
              color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
              onClick: () => {
                if (onOpenBastIjazah) onOpenBastIjazah();
                else if (onSelectTab) onSelectTab('bast-ijazah');
              },
            },
            {
              id: 'dkn',
              title: 'Matriks DKN',
              icon: FileSpreadsheet,
              color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
              onClick: () => {
                if (onOpenDknPrint) onOpenDknPrint();
                else if (onSelectTab) onSelectTab('dkn');
              },
            },
            {
              id: 'buku-induk',
              title: 'Buku Induk',
              icon: BookOpen,
              color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
              onClick: () => {
                if (onSelectTab) onSelectTab('buku-induk');
              },
            },
            {
              id: 'surat-masuk',
              title: 'Surat Masuk',
              icon: Inbox,
              color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400',
              onClick: () => {
                if (onSelectTab) onSelectTab('surat-masuk');
              },
            },
            {
              id: 'kepegawaian',
              title: 'Kepegawaian PTK',
              icon: Users,
              color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
              onClick: () => {
                if (onSelectTab) onSelectTab('kepegawaian');
              },
            },
          ]}
        />
      </div>

      {/* ─── 3. BOTTOM TWO COLUMNS (MATCHING KAPROGDASHBOARD EXACT LAYOUT) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Aktivitas & Log Terbaru Jurusan/TU */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Aktivitas & Log Terbaru Dokumen
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Realtime update</span>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                Belum ada aktivitas persuratan yang tercatat hari ini.
              </div>
            ) : (
              recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {act.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {act.kategori}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                      {act.nomor_surat} &bull; Tujuan: {act.tujuan}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                    {new Date(act.tanggal).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan: Agenda & Supervisi Hari Ini */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              Agenda & Supervisi Hari Ini
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                  07:30 - 09:00
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Agenda Surat Masuk & Disposisi Kepala Sekolah
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                DISPOSISI
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 font-mono">
                  09:30 - 12:00
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pelayanan Surat Keterangan & Berkas Mutasi Siswa
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 shrink-0">
                LAYANAN
              </span>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  13:00 - 15:30
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rekonsiliasi Buku Induk & Penyiapan Berkas DKN Dinas
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                DKN & ARSIP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TuBerandaTab.displayName = 'TuBerandaTab';
