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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
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
      {/* ─── 1. KPI 4 KOLOM BERSTANDAR PILAR 30 & 23 (AnalyticsCard compact-premium) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Buku Induk Siswa Aktif */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Buku Induk Siswa"
          value={`${stats?.bukuInduk?.totalSiswaAktif || 0} Siswa`}
          icon={<Users className="w-5 h-5 text-blue-500" />}
          description="Peserta didik aktif ber-NISN"
          gradient="from-blue-500 to-indigo-600"
        />

        {/* Card 2: Surat Keluar Bulan Ini */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Surat Keluar Bulan Ini"
          value={stats?.persuratan?.totalSuratBulanIni || 0}
          icon={<Send className="w-5 h-5 text-amber-500" />}
          description={`${stats?.persuratan?.suratKeteranganBulanIni || 0} Surat Keterangan Siswa`}
          gradient="from-amber-500 to-amber-600"
        />

        {/* Card 3: Mutasi Siswa */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Mutasi Semester Ini"
          value={`${stats?.mutasi?.keluar || 0} Keluar / ${stats?.mutasi?.masuk || 0} Masuk`}
          icon={<ArrowLeftRight className="w-5 h-5 text-purple-500" />}
          description="Tercatat di Register Mutasi"
          gradient="from-purple-500 to-violet-600"
        />

        {/* Card 4: Brankas Ijazah & BAST */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Brankas Ijazah Lulusan"
          value={`${stats?.ijazah?.sudahDiserahkan || 0} / ${stats?.ijazah?.totalLulusan || 0}`}
          icon={<Award className="w-5 h-5 text-emerald-500" />}
          description={`${stats?.ijazah?.sisaBrankas || 0} Blangko di brankas sekolah`}
          gradient="from-emerald-500 to-teal-600"
        />
      </div>

      {/* ─── 2. ACTION CENTER: PINTASAN CEPAT 1-KLIK (OPERASIONAL HARIAN) ─── */}
      <Card className="p-4 sm:p-5 border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Action Center Administrasi TU
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Akses cepat formulir persuratan, mutasi, clearance, dan cetak dokumen resmi
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/60 px-2.5 py-1 rounded-full self-start sm:self-auto border border-blue-200/60 dark:border-blue-800/40">
            Standar SOP Permendiknas No. 24/2008
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Action 1: Surat Keterangan */}
          <button
            type="button"
            onClick={onOpenSuratKeterangan}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all text-center group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">
              Surat Keterangan
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Aktif / Berkelakuan</span>
          </button>

          {/* Action 2: Mutasi Siswa */}
          <button
            type="button"
            onClick={onOpenMutasi}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-purple-50/60 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-700/60 transition-all text-center group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
              Mutasi Siswa
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Pindah Keluar / Masuk</span>
          </button>

          {/* Action 3: BAST Ijazah */}
          <button
            type="button"
            onClick={onOpenBastIjazah}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all text-center group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              Clearance & BAST
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Cap 3 Jari & Ekspedisi</span>
          </button>

          {/* Action 4: Cetak DKN */}
          <button
            type="button"
            onClick={onOpenDknPrint}
            className="flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700/60 transition-all text-center group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              Matriks DKN
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Kelulusan & Pengantar</span>
          </button>

          {/* Action 5: Buku Induk 360° */}
          <button
            type="button"
            onClick={() => onSelectTab?.('buku-induk')}
            className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all text-center group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              Buku Induk & Klapper
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Rekam Jejak 360°</span>
          </button>
        </div>
      </Card>

      {/* ─── 3. DUA KOLOM: LOG AKTIVITAS PERSURATAN & AGENDA HARIAN TU ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI (2/3): LOG AKTIVITAS DOKUMEN & PERSURATAN TERAKHIR */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Aktivitas Persuratan & Dokumen Terakhir
            </h3>
            <span className="text-xs text-slate-500">Agenda Surat Keluar</span>
          </div>

          <Card className="p-0 border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
            {recentActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada aktivitas persuratan yang tercatat hari ini.
              </div>
            ) : (
              recentActivities.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {item.nomor_surat}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.kategori}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tujuan: {item.tujuan}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                      {item.status}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(item.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* KOLOM KANAN (1/3): SOP & AGENDA OPERASIONAL HARIAN TU */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              SOP & Agenda Harian TU
            </h3>
            <span className="text-xs text-slate-500">Standar Dinas</span>
          </div>

          <Card className="p-4 border-slate-200 dark:border-slate-800 space-y-3 shadow-sm bg-white dark:bg-slate-900">
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-900/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Pukul 07.30 - 09.00 WIB
              </div>
              <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                Penerimaan surat masuk dinas, input buku agenda, dan pencetakan lembar disposisi Kepala Sekolah.
              </p>
            </div>

            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200/60 dark:border-purple-900/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                Pukul 09.30 - 12.00 WIB
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                Pelayanan persuratan kesiswaan (Surat Keterangan, berkas mutasi pindah, clearance ijazah alumni).
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pukul 13.00 - 15.30 WIB
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                Verifikasi buku induk siswa 360°, penyusunan berkas DKN kelulusan, dan pengarsipan permanen.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Keamanan Dokumen:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Brankas Terlindungi
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
});

TuBerandaTab.displayName = 'TuBerandaTab';
