import React, { useMemo } from 'react';
import {
  BookOpen,
  FileText,
  ArrowLeftRight,
  Award,
  Users,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  Calendar,
  Inbox,
  Database,
  Wallet,
  Package,
  Wrench,
  UserCheck,
} from 'lucide-react';
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
  canAccess?: (capability: string) => boolean;
}

export const TuBerandaTab: React.FC<TuBerandaTabProps> = React.memo(({
  stats,
  onSelectTab,
  onOpenSuratKeterangan,
  onOpenMutasi,
  onOpenBastIjazah,
  onOpenDknPrint,
  canAccess = () => true,
}) => {
  const recentActivities = stats?.recentActivities || [];

  const hasPersuratan = canAccess('correspondence.inbox.view') || canAccess('correspondence.outbox.view');
  const hasKepegawaian = canAccess('academic.teachers.manage') || canAccess('tu.staff.view.list') || canAccess('academic.dapodik.view');
  const hasKeuangan = canAccess('tu.finance.invoices.view.list') || canAccess('tu.finance.payments.view.history');
  const hasSarpras = canAccess('sarpras.inventory.view.list') || canAccess('sarpras.loans.view.list');

  const kpiCards = useMemo(() => {
    const cards: Array<{
      id: string;
      title: string;
      value: string | number;
      icon: React.ReactNode;
      description: string;
      gradient: string;
    }> = [];

    if (canAccess('academic.students.view.list') || canAccess('academic.dapodik.view')) {
      cards.push({
        id: 'siswa-induk',
        title: 'SISWA AKTIF BUKU INDUK',
        value: stats?.bukuInduk?.totalSiswaAktif || 0,
        icon: <Users className="w-5 h-5 text-blue-500" />,
        description: 'Peserta didik aktif terdaftar',
        gradient: 'from-blue-600 to-indigo-700',
      });
    }

    if (canAccess('correspondence.inbox.view') || canAccess('correspondence.outbox.view')) {
      cards.push({
        id: 'surat-masuk',
        title: 'SURAT MASUK BARU',
        value: `${stats?.suratMasuk?.baru || stats?.persuratan?.totalSuratBulanIni || 0}`,
        icon: <Inbox className="w-5 h-5 text-emerald-500" />,
        description: `Total ${stats?.suratMasuk?.total || 0} surat masuk | ${stats?.suratMasuk?.disposisi || 0} disposisi aktif`,
        gradient: 'from-emerald-600 to-teal-700',
      });
    }

    if (canAccess('correspondence.outbox.view') || canAccess('academic.transitions.manage')) {
      cards.push({
        id: 'mutasi',
        title: 'MUTASI SEMESTER INI',
        value: `${stats?.mutasi?.keluar || 0} / ${stats?.mutasi?.masuk || 0}`,
        icon: <ArrowLeftRight className="w-5 h-5 text-sky-500" />,
        description: 'Rasio siswa keluar vs masuk',
        gradient: 'from-sky-600 to-blue-700',
      });
    }

    if (canAccess('correspondence.outbox.view')) {
      cards.push({
        id: 'ijazah',
        title: 'BLANGKO IJAZAH DI BRANKAS',
        value: `${stats?.ijazah?.sisaBrankas || 0} Blangko`,
        icon: <Award className="w-5 h-5 text-amber-500" />,
        description: `${stats?.ijazah?.sudahDiserahkan || 0} dari ${stats?.ijazah?.totalLulusan || 0} ijazah telah diambil`,
        gradient: 'from-amber-500 to-orange-600',
      });
    }

    if (hasKepegawaian && cards.length < 4) {
      cards.push({
        id: 'ptk',
        title: 'TOTAL PTK & STAF',
        value: stats?.kepegawaian?.totalPtk || 0,
        icon: <UserCheck className="w-5 h-5 text-violet-500" />,
        description: 'Pendidik & Tenaga Kependidikan aktif',
        gradient: 'from-violet-600 to-purple-700',
      });
    }

    if (hasKeuangan && cards.length < 4) {
      cards.push({
        id: 'keuangan-spp',
        title: 'ADMINISTRASI KEUANGAN TU',
        value: 'SPP & Billing',
        icon: <Wallet className="w-5 h-5 text-emerald-500" />,
        description: 'Akses tagihan & riwayat pembayaran siswa',
        gradient: 'from-emerald-600 to-green-700',
      });
    }

    if (hasSarpras && cards.length < 4) {
      cards.push({
        id: 'sarpras-aset',
        title: 'LOGISTIK & INVENTARIS KIB',
        value: 'Sarpras TU',
        icon: <Package className="w-5 h-5 text-indigo-500" />,
        description: 'Katalog aset, peminjaman & perbaikan barang',
        gradient: 'from-indigo-600 to-slate-800',
      });
    }

    return cards.slice(0, 4);
  }, [stats, canAccess, hasKepegawaian, hasKeuangan, hasSarpras]);

  const quickActions = useMemo(() => {
    const items = [];

    if (canAccess('correspondence.outbox.view') || canAccess('correspondence.outbox.manage')) {
      items.push({
        id: 'surat-keterangan',
        title: 'Surat Keterangan',
        icon: FileText,
        color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
        onClick: () => {
          if (onOpenSuratKeterangan) onOpenSuratKeterangan();
          else if (onSelectTab) onSelectTab('surat-keterangan');
        },
      });
    }

    if (canAccess('correspondence.outbox.view') || canAccess('academic.transitions.manage')) {
      items.push({
        id: 'mutasi',
        title: 'Mutasi Siswa',
        icon: ArrowLeftRight,
        color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
        onClick: () => {
          if (onOpenMutasi) onOpenMutasi();
          else if (onSelectTab) onSelectTab('mutasi');
        },
      });
    }

    if (canAccess('correspondence.outbox.view')) {
      items.push({
        id: 'bast',
        title: 'Clearance & BAST',
        icon: Award,
        color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
        onClick: () => {
          if (onOpenBastIjazah) onOpenBastIjazah();
          else if (onSelectTab) onSelectTab('bast-ijazah');
        },
      });
    }

    if (canAccess('correspondence.outbox.view') || canAccess('academic.dapodik.view')) {
      items.push({
        id: 'dkn',
        title: 'Matriks DKN',
        icon: FileSpreadsheet,
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
        onClick: () => {
          if (onOpenDknPrint) onOpenDknPrint();
          else if (onSelectTab) onSelectTab('dkn');
        },
      });
    }

    if (canAccess('academic.students.manage') || canAccess('academic.dapodik.view')) {
      items.push({
        id: 'buku-induk',
        title: 'Buku Induk',
        icon: BookOpen,
        color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
        onClick: () => onSelectTab?.('buku-induk'),
      });
    }

    if (canAccess('correspondence.inbox.view')) {
      items.push({
        id: 'surat-masuk',
        title: 'Surat Masuk',
        icon: Inbox,
        color: 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400',
        onClick: () => onSelectTab?.('surat-masuk'),
      });
    }

    if (canAccess('academic.teachers.manage') || canAccess('tu.staff.view.list')) {
      items.push({
        id: 'kepegawaian',
        title: 'Kepegawaian PTK',
        icon: Users,
        color: 'bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
        onClick: () => onSelectTab?.('kepegawaian'),
      });
    }

    if (canAccess('academic.dapodik.view') || canAccess('academic.dapodik.manage')) {
      items.push({
        id: 'dapodik',
        title: 'Integrasi Dapodik',
        icon: Database,
        color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
        onClick: () => onSelectTab?.('dapodik'),
      });
    }

    if (hasKeuangan) {
      items.push({
        id: 'keuangan-spp',
        title: 'Keuangan & SPP',
        icon: Wallet,
        color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
        onClick: () => onSelectTab?.('keuangan-spp'),
      });
    }

    if (canAccess('sarpras.inventory.view.list')) {
      items.push({
        id: 'sarpras-inventaris',
        title: 'Inventaris KIB',
        icon: Package,
        color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
        onClick: () => onSelectTab?.('sarpras-inventaris'),
      });
    }

    if (canAccess('sarpras.loans.view.list')) {
      items.push({
        id: 'sarpras-peminjaman',
        title: 'Peminjaman Aset',
        icon: ArrowLeftRight,
        color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
        onClick: () => onSelectTab?.('sarpras-peminjaman'),
      });
    }

    if (canAccess('sarpras.repairs.view.list')) {
      items.push({
        id: 'sarpras-perbaikan',
        title: 'Perbaikan Barang',
        icon: Wrench,
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
        onClick: () => onSelectTab?.('sarpras-perbaikan'),
      });
    }

    return items;
  }, [canAccess, hasKeuangan, onOpenSuratKeterangan, onOpenMutasi, onOpenBastIjazah, onOpenDknPrint, onSelectTab]);

  const kpiGridColsClass =
    kpiCards.length <= 1
      ? 'grid-cols-1'
      : kpiCards.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : kpiCards.length === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  const agendaItems = useMemo(() => {
    const list: Array<{ time: string; timeClass: string; title: string; badge: string; badgeClass: string }> = [];

    if (hasPersuratan) {
      list.push({
        time: '07:30 - 09:00',
        timeClass: 'text-blue-600 dark:text-blue-400',
        title: 'Agenda Surat Masuk & Disposisi Kepala Sekolah',
        badge: 'DISPOSISI',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      });
      list.push({
        time: '09:30 - 12:00',
        timeClass: 'text-purple-600 dark:text-purple-400',
        title: 'Pelayanan Surat Keterangan & Berkas Mutasi Siswa',
        badge: 'LAYANAN',
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
      });
    }

    if (hasKepegawaian) {
      list.push({
        time: '10:00 - 12:00',
        timeClass: 'text-violet-600 dark:text-violet-400',
        title: 'Verifikasi Data Induk PTK, Siswa & Sinkronisasi Dapodik',
        badge: 'DAPODIK',
        badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
      });
    }

    if (hasKeuangan) {
      list.push({
        time: '08:00 - 14:00',
        timeClass: 'text-emerald-600 dark:text-emerald-400',
        title: 'Pelayanan Administrasi Keuangan & Rekapitulasi SPP',
        badge: 'KEUANGAN',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      });
    }

    if (hasSarpras) {
      list.push({
        time: '08:30 - 15:00',
        timeClass: 'text-indigo-600 dark:text-indigo-400',
        title: 'Inventarisasi KIB, Sirkulasi Peminjaman & Perbaikan Aset',
        badge: 'LOGISTIK',
        badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
      });
    }

    if (list.length === 0) {
      list.push({
        time: '07:30 - 15:30',
        timeClass: 'text-slate-600 dark:text-slate-400',
        title: 'Operasional Administrasi Harian Tata Usaha',
        badge: 'AKTIF',
        badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
      });
    }

    return list;
  }, [hasPersuratan, hasKepegawaian, hasKeuangan, hasSarpras]);

  return (
    <div className="space-y-6">
      {/* ─── 1. TOP KPI CARDS (FILTERED BY CAPABILITIES) ─── */}
      {kpiCards.length > 0 && (
        <div className={`grid ${kpiGridColsClass} gap-4`}>
          {kpiCards?.map((card) => (
            <AnalyticsCard
              key={card.id}
              variant="compact-premium"
              mobileCompact={true}
              title={card.title}
              value={card.value}
              icon={card.icon}
              description={card.description}
              gradient={card.gradient}
            />
          ))}
        </div>
      )}

      {/* ─── 2. PINTASAN OPERASIONAL TATA USAHA ─── */}
      {quickActions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Pintasan Operasional Tata Usaha
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Akses cepat modul layanan sesuai tugas dan kewenangan jabatan Anda.
              </p>
            </div>
            {hasPersuratan && (
              <button
                type="button"
                onClick={onOpenSuratKeterangan}
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Layanan Persuratan <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <ShopeeQuickActionSlider items={quickActions} />
        </div>
      )}

      {/* ─── 3. BOTTOM COLUMNS ─── */}
      <div className={`grid grid-cols-1 ${hasPersuratan ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Kolom Kiri: Aktivitas Dokumen (Hanya untuk user dengan akses Persuratan) */}
        {hasPersuratan && (
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
                recentActivities?.map((act) => (
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
        )}

        {/* Kolom Kanan: Agenda & Supervisi Hari Ini */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              Agenda & Layanan Hari Ini
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-3">
            {agendaItems?.map((item) => (
              <div
                key={item.title}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <span className={`text-[10px] font-bold font-mono ${item.timeClass}`}>
                    {item.time}
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.title}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${item.badgeClass}`}>
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

TuBerandaTab.displayName = 'TuBerandaTab';
