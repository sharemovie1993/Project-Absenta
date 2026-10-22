import React from 'react';
import { 
  Users, 
  UserCheck, 
  CalendarCheck, 
  BookOpen, 
  FileCheck2, 
  ShieldAlert, 
  Award, 
  Clock, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Phone,
  MessageCircle,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { cn } from '@/lib/utils';
import type { WaliKelasTabId, WalasDashboardData } from '../types';

export interface WalasBerandaTabProps {
  data?: WalasDashboardData;
  isLoading?: boolean;
  onSelectTab: (tabId: WaliKelasTabId) => void;
  onOpenJurnalModal?: () => void;
}

export const WalasBerandaTab: React.FC<WalasBerandaTabProps> = React.memo(({
  data,
  isLoading,
  onSelectTab,
  onOpenJurnalModal,
}) => {
  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;
  const kehadiran = data?.kehadiranStats;
  const totalSiswa = data?.kelasInfo?.totalSiswa ?? 0;
  const hadir = kehadiran?.hadir ?? 0;
  const rateKehadiran = totalSiswa > 0 ? (kehadiran?.persentase ?? 0) : 100;
  const ewsAlerts = data?.earlyWarningAlerts ?? [];
  const kbmAktif = data?.kbmAktifHariIni;
  const izinPending = data?.izinPendingCount ?? 0;
  const daftarTidakHadir = kehadiran?.daftarTidakHadirHariIni ?? [];

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. STATUS BADGE & MODE BANNER */}
      {isHistorical && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Mode Arsip Historis (Masa Lampau)
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Anda sedang memeriksa data rombel pada periode lampau ({data?.academicContext?.tahunPelajaranNama} - {data?.academicContext?.semesterNama}). Seluruh formulir input berstatus Read-Only.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 shrink-0">
            Read-Only
          </Badge>
        </div>
      )}

      {/* 2. KPI 4 KOLOM BERSTANDAR PILAR 30 & 23 (AnalyticsCard with mobileCompact & compact-premium) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Kehadiran Siswa Hari Ini */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title={isHistorical ? "Rata-rata Kehadiran" : "Kehadiran Hari Ini"}
          value={`${hadir} / ${totalSiswa}`}
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          description={`${rateKehadiran}% peserta didik hadir`}
          gradient="from-emerald-500 to-teal-600"
        />

        {/* Card 2: Siswa Butuh Perhatian (EWS) */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Siswa Butuh Perhatian"
          value={ewsAlerts.length}
          icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
          description={ewsAlerts.length > 0 ? `${ewsAlerts.length} siswa mangkir/at-risk` : "Semua siswa tertib kondusif"}
          gradient="from-rose-500 to-red-600"
        />

        {/* Card 3: Status KBM Kelas */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="KBM Kelas Hari Ini"
          value={kbmAktif?.adaSesiAktif ? "KBM Aktif" : "Tidak Ada Sesi"}
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
          description={kbmAktif?.jadwalSaatIni?.mapel || "Jadwal jam pelajaran"}
          gradient="from-blue-500 to-cyan-600"
        />

        {/* Card 4: Permohonan Izin Masuk */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Izin Perlu Approval"
          value={izinPending}
          icon={<FileCheck2 className="w-5 h-5 text-amber-500" />}
          description={izinPending > 0 ? `${izinPending} surat menunggu approval` : "Semua permohonan tuntas"}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* 3. EARLY WARNING SYSTEM (EWS) ALERT STRIP (JIKA ADA SISWA AT-RISK) */}
      {ewsAlerts.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-4 md:p-5 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <span>Peringatan Dini: {ewsAlerts.length} Siswa Membutuhkan Tindak Lanjut Segera</span>
                  <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 text-[10px] px-2 py-0.5">
                    Prioritas Tinggi
                  </Badge>
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                  Terdeteksi siswa tidak hadir beruntun atau memiliki catatan mangkir tanpa keterangan. Segera koordinasikan dengan Orang Tua & Guru BK.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ewsAlerts.map((siswa, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <strong>{siswa.nama}</strong> ({siswa.alfaCount}x Alfa)
                      <span className="text-rose-600 dark:text-rose-400 text-[11px]">— {siswa.rekomendasi}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="bg-white dark:bg-slate-900 text-rose-700 border-rose-200 hover:bg-rose-100 text-xs font-semibold"
                onClick={() => onSelectTab('disiplin')}
              >
                Rujuk ke BK
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                onClick={() => onSelectTab('presensi')}
              >
                Tinjau EWS
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 4. DUA PANEL UTAMA: LIVE KBM + DAFTAR SISWA TIDAK HADIR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Kiri: Live Sesi KBM Hari Ini */}
        <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">KBM Rombel Hari Ini</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monitoring jam pelajaran dan kehadiran guru pengajar</p>
              </div>
            </div>
            {kbmAktif?.adaSesiAktif && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Sesi Berlangsung
              </Badge>
            )}
          </div>

          {kbmAktif?.adaSesiAktif ? (
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  {kbmAktif.jadwalSaatIni?.mapel}
                </span>
                <span className="text-xs text-slate-500">{kbmAktif.jadwalSaatIni?.jamKe}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Guru Pengampu: <strong className="text-slate-800 dark:text-slate-200">{kbmAktif.jadwalSaatIni?.namaGuru}</strong>
              </p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-blue-100/60 dark:border-blue-900/20">
                <span className="text-slate-500">Status Kehadiran Guru:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {kbmAktif.jadwalSaatIni?.statusGuru}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium">Tidak ada sesi KBM yang sedang berlangsung saat ini</p>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-500">Ada jam kosong tanpa guru?</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold p-0 h-auto hover:bg-transparent"
              onClick={() => onSelectTab('jurnal')}
            >
              Catat di Jurnal Walas <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
            </Button>
          </div>
        </Card>

        {/* Panel Kanan: Ketidakhadiran Hari Ini */}
        <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ketidakhadiran Hari Ini</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Siswa tidak hadir atau membutuhkan konfirmasi</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold h-7 px-2.5"
              onClick={() => onSelectTab('presensi')}
            >
              Semua Presensi
            </Button>
          </div>

          {daftarTidakHadir.length > 0 ? (
            <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
              {daftarTidakHadir.map((s, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {s.nama?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{s.nama}</p>
                      <p className="text-[11px] text-slate-400 truncate">{s.alasan}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 shrink-0",
                      s.status === 'Sakit' && "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
                      s.status === 'Izin' && "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
                      s.status === 'Alfa' && "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                    )}
                  >
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <UserCheck className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                100% Peserta Didik Hadir Tertib Hari Ini
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* 5. QUICK ACTIONS GRID (Sesuai Blueprint Bagian VI) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Pintasan Aksi Cepat Wali Kelas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { id: 'siswa' as WaliKelasTabId, label: 'Data Siswa', icon: Users, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50' },
            { id: 'presensi' as WaliKelasTabId, label: 'Absensi Harian', icon: CalendarCheck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' },
            { id: 'jurnal' as WaliKelasTabId, label: 'Tulis Jurnal', icon: BookOpen, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50' },
            { id: 'izin' as WaliKelasTabId, label: 'Cek Izin Ortu', icon: FileCheck2, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50' },
            { id: 'disiplin' as WaliKelasTabId, label: 'Rujukan BK', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50' },
            { id: 'prestasi' as WaliKelasTabId, label: 'Prestasi Siswa', icon: Award, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50' },
            { id: 'rekap' as WaliKelasTabId, label: 'Cetak Rekap', icon: TrendingUp, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50' },
            { id: 'rekap' as WaliKelasTabId, label: 'Catatan Rapor', icon: GraduationCap, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50' },
          ].map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={() => onSelectTab(act.id)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all group text-center"
              >
                <div className={cn("p-2.5 rounded-xl mb-2 transition-transform group-hover:scale-110", act.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

WalasBerandaTab.displayName = 'WalasBerandaTab';
