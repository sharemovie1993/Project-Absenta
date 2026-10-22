import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  GraduationCap,
  Layers,
  FileText
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
  const navigate = useNavigate();
  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;
  const kehadiran = data?.kehadiranStats;
  const totalSiswa = data?.kelasInfo?.totalSiswa ?? 0;
  const hadir = kehadiran?.hadir ?? 0;
  const rateKehadiran = totalSiswa > 0 ? (kehadiran?.persentase ?? 0) : 100;
  const ewsAlerts = data?.earlyWarningAlerts ?? [];
  const kbmAktif = data?.kbmAktifHariIni;
  const izinPending = data?.izinPendingCount ?? 0;
  const daftarTidakHadir = kehadiran?.daftarTidakHadirHariIni ?? [];

  // Recent activity logs compiled from EWS, Izin, and Attendance
  const recentActivities = [
    ...(ewsAlerts.length > 0 ? [{
      id: 'ews-1',
      title: `${ewsAlerts.length} Siswa Perlu Perhatian Khusus`,
      desc: `Terdeteksi ${ewsAlerts[0]?.nama || 'siswa'} (${ewsAlerts[0]?.alfaCount || 3}x alfa). Rekomendasi: ${ewsAlerts[0]?.rekomendasi || 'Koordinasi BK'}`,
      time: 'Penting',
      isWarning: true
    }] : []),
    ...(izinPending > 0 ? [{
      id: 'izin-1',
      title: `${izinPending} Permohonan Izin / Sakit Masuk`,
      desc: 'Menunggu peninjauan surat dokter dan persetujuan wali kelas',
      time: 'Terkini',
      isWarning: false
    }] : []),
    {
      id: 'log-kbm',
      title: kbmAktif?.adaSesiAktif 
        ? `KBM Sedang Berlangsung: ${kbmAktif.jadwalSaatIni?.mapel || 'Mapel'}` 
        : 'Status Pembelajaran Hari Ini',
      desc: kbmAktif?.adaSesiAktif 
        ? `Guru: ${kbmAktif.jadwalSaatIni?.namaGuru || 'Pengajar'} (${kbmAktif.jadwalSaatIni?.jamKe || 'Jam KBM'})`
        : 'Semua jam KBM rombel tercatat tertib',
      time: 'Hari ini',
      isWarning: false
    },
    {
      id: 'log-jurnal',
      title: 'Beban Kerja Binaan Wali Kelas (2 JP)',
      desc: `Total ${data?.jurnalSummary?.totalThisMonth || 0} kegiatan pembinaan tercatat bulan ini`,
      time: 'Bulan Ini',
      isWarning: false
    }
  ];

  // Agenda KBM & Pembinaan Hari Ini
  const agendaHariIni = [
    {
      jam: '07:15 - 09:30',
      agenda: kbmAktif?.jadwalSaatIni?.mapel 
        ? `${kbmAktif.jadwalSaatIni.mapel} (${kbmAktif.jadwalSaatIni.namaGuru || 'Guru'})`
        : 'Jam KBM 1 - 3 (Mata Pelajaran Umum / Kejuruan)',
      tipe: 'KBM'
    },
    {
      jam: '09:45 - 11:15',
      agenda: 'Jam KBM 4 - 5 (Pembelajaran Kelas & Praktik Lab)',
      tipe: 'KBM'
    },
    {
      jam: '11:30 - 12:30',
      agenda: 'Pembinaan Rutin Wali Kelas & Monitoring Karakter',
      tipe: 'WALAS'
    },
    {
      jam: '13:00 - 15:00',
      agenda: 'Jam KBM 6 - 8 (Pendalaman Materi & Evaluasi Pembelajaran)',
      tipe: 'KBM'
    }
  ];

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Historical Mode Alert (jika masa lampau) */}
      {isHistorical && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Mode Arsip Historis (Masa Lampau)
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Data rombel pada periode lampau ({data?.academicContext?.tahunPelajaranNama || 'TP'} - {data?.academicContext?.semesterNama || 'Sem'}). Seluruh formulir berstatus Read-Only.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 shrink-0">
            Read-Only
          </Badge>
        </div>
      )}

      {/* 1. KPI 4 KOLOM BERSTANDAR KAPROG & PILAR 30 (Solid Gradient AnalyticsCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siswa Rombel */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Total Siswa Rombel"
          value={totalSiswa}
          icon={<Users className="w-5 h-5 text-indigo-500" />}
          description={`${hadir} siswa hadir di kelas hari ini`}
          gradient="from-indigo-500 to-indigo-600"
        />

        {/* Card 2: Presensi Hari Ini */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Presensi Rombel Hari Ini"
          value={`${hadir} / ${totalSiswa}`}
          icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
          description={`${rateKehadiran}% siswa hadir tertib di kelas`}
          gradient="from-emerald-500 to-teal-600"
        />

        {/* Card 3: Guru KBM Hari Ini */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="KBM Kelas Hari Ini"
          value={kbmAktif?.adaSesiAktif ? "KBM Aktif" : "Selesai / Libur"}
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
          description={kbmAktif?.jadwalSaatIni?.mapel ? `${kbmAktif.jadwalSaatIni.mapel}` : "Semua jam KBM rombel aktif"}
          gradient="from-blue-500 to-cyan-600"
        />

        {/* Card 4: Izin & Perhatian EWS */}
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Izin & Siswa At-Risk"
          value={`${izinPending + ewsAlerts.length} Siswa`}
          icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
          description={`${izinPending} izin pending, ${ewsAlerts.length} butuh bimbingan`}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* 2. PINTASAN MANAJEMEN ROMBEL (Quick Links Grid 8 Modul Berstandar Kaprog) */}
      <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Pintasan Tugas Wali Kelas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Akses cepat ke modul pembinaan, presensi, jurnal walas, dan bimbingan konseling.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onOpenJurnalModal) {
                onOpenJurnalModal();
              } else {
                onSelectTab('jurnal');
              }
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold gap-1 cursor-pointer"
          >
            <span>Tulis Jurnal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              title: 'Roster & Siswa',
              desc: 'Daftar & biodata rombel',
              tabId: 'siswa' as WaliKelasTabId,
              icon: Users,
            },
            {
              title: 'Presensi Bulanan',
              desc: 'Matriks kehadiran kelas',
              tabId: 'presensi' as WaliKelasTabId,
              icon: CalendarCheck,
            },
            {
              title: 'Jurnal Walas',
              desc: 'Catatan beban kerja 2 JP',
              tabId: 'jurnal' as WaliKelasTabId,
              action: onOpenJurnalModal,
              icon: BookOpen,
            },
            {
              title: 'Persetujuan Izin',
              desc: 'Validasi surat sakit dokter',
              tabId: 'izin' as WaliKelasTabId,
              icon: FileCheck2,
            },
            {
              title: 'Rujukan Kasus BK',
              desc: 'Alih tangan masalah siswa',
              tabId: 'disiplin' as WaliKelasTabId,
              icon: ShieldAlert,
            },
            {
              title: 'Pelanggaran Siswa',
              desc: 'Catatan tata tertib & poin',
              tabId: 'disiplin' as WaliKelasTabId,
              icon: AlertTriangle,
            },
            {
              title: 'Prestasi Rombel',
              desc: 'Portofolio lomba & reward',
              tabId: 'prestasi' as WaliKelasTabId,
              icon: Award,
            },
            {
              title: 'Cetak Rekap & Ledger',
              desc: 'Format F-BK-01 & ledger',
              tabId: 'rekap' as WaliKelasTabId,
              icon: FileText,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.tabId && onSelectTab) {
                    onSelectTab(item.tabId);
                  }
                }}
                className="flex flex-col text-left p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors mb-2.5">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 3. DUA KOLOM BAWAH: AKTIVITAS & LOG TERBARU + AGENDA & KBM HARI INI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kolom 1: Recent Activity Mini List */}
        <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Aktivitas & Log Terbaru Rombel</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Realtime update</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-2.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {act.desc}
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] shrink-0 font-medium px-1.5 py-0.5 rounded mt-0.5",
                  act.isWarning 
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 font-bold" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                )}>
                  {act.time}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Kolom 2: Agenda & KBM Hari Ini */}
        <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-500" />
              <span>Agenda & KBM Hari Ini</span>
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Jadwal Aktif" />
          </div>

          <div className="space-y-2.5">
            {agendaHariIni.map((ag, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {ag.jam}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.2 rounded">
                    {ag.tipe}
                  </span>
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {ag.agenda}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
});

WalasBerandaTab.displayName = 'WalasBerandaTab';
