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
  AlertTriangle, 
  GraduationCap,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { 
  HubCard, 
  HubBentoGrid, 
  HubActionGrid, 
  HubListRow, 
  type HubBentoCell, 
  type HubActionItem 
} from '@/components/ui/hub';
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
        ? `KBM Berlangsung: ${kbmAktif.jadwalSaatIni?.mapel || 'Mapel'}` 
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
      desc: `Total ${data?.totalJurnalWalasTercatat || 0} kegiatan pembinaan tercatat pada semester ini`,
      time: 'Semester Ini',
      isWarning: false
    }
  ];

  // Agenda KBM & Pembinaan Hari Ini
  const agendaHariIni = [
    {
      jam: '07:15 - 09:30',
      agenda: kbmAktif?.jadwalSaatIni?.mapel 
        ? `${kbmAktif.jadwalSaatIni.mapel} (${kbmAktif.jadwalSaatIni.namaGuru || 'Guru'})`
        : 'Jam KBM 1 - 3 (Mata Pelajaran Kejuruan / Teori)',
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
      agenda: 'Jam KBM 6 - 8 (Pendalaman Materi & Evaluasi)',
      tipe: 'KBM'
    }
  ];

  // Bento Metrik Grid Cells (2x2 Flat dengan Hairline Divider - STRICTLY MAX 2 LINES)
  const siswaL = data?.kelasInfo?.totalLaki ?? 0;
  const siswaP = data?.kelasInfo?.totalPerempuan ?? 0;

  const bentoCells: HubBentoCell[] = [
    {
      id: 'siswa',
      title: 'Total Siswa',
      value: totalSiswa > 0 ? `${totalSiswa} Siswa (${siswaL}L • ${siswaP}P)` : '0 Siswa',
      icon: Users,
      iconColorClass: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60',
      onClick: () => onSelectTab('siswa'),
    },
    {
      id: 'presensi',
      title: 'Presensi Hari Ini',
      value: totalSiswa > 0 ? `${hadir}/${totalSiswa} (${rateKehadiran}% Hadir)` : '0 / 0 Hadir',
      icon: UserCheck,
      iconColorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60',
      onClick: () => onSelectTab('presensi'),
    },
    {
      id: 'kbm',
      title: 'KBM Rombel',
      value: kbmAktif?.adaSesiAktif 
        ? `${kbmAktif.jadwalSaatIni?.mapel || 'KBM Aktif'}` 
        : 'Selesai / Libur',
      icon: BookOpen,
      iconColorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60',
    },
    {
      id: 'ews',
      title: 'Siswa At-Risk',
      value: ewsAlerts.length > 0 ? `${ewsAlerts.length} Perlu Tindakan BK` : 'Aman (0 Kasus)',
      icon: AlertTriangle,
      iconColorClass: ewsAlerts.length > 0
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60'
        : 'text-slate-500 bg-slate-100 dark:bg-slate-800',
      onClick: () => onSelectTab('disiplin'),
    },
  ];

  // Quick Action Items (Disusun berdasarkan Urutan Prioritas Operasional Harian Walas)
  const actionItems: HubActionItem[] = [
    // Slot 1 (Pagi 06:45): Validasi Surat Dokter / Izin Ortu
    {
      id: 'izin',
      label: 'Setujui Izin',
      icon: FileCheck2,
      iconColorClass: 'text-amber-600 dark:text-amber-400',
      badge: izinPending > 0 ? izinPending : undefined,
      onClick: () => onSelectTab('izin'),
    },
    // Slot 2 (Pagi 07:15): Presensi Masuk Rombel
    {
      id: 'presensi',
      label: 'Presensi Rombel',
      icon: Users,
      iconColorClass: 'text-indigo-600 dark:text-indigo-400',
      badge: daftarTidakHadir.length > 0 ? daftarTidakHadir.length : undefined,
      onClick: () => onSelectTab('presensi'),
    },
    // Slot 3 (Harian): Jurnal Walas (Pengakuan Beban Kerja 2 JP)
    {
      id: 'jurnal',
      label: 'Jurnal Walas',
      icon: BookOpen,
      iconColorClass: 'text-blue-600 dark:text-blue-400',
      onClick: () => {
        if (onOpenJurnalModal) onOpenJurnalModal();
        else onSelectTab('jurnal');
      },
    },
    // Slot 4 (Disiplin): Rujukan Kasus & Early Warning BK
    {
      id: 'disiplin',
      label: 'Rujukan BK',
      icon: ShieldAlert,
      iconColorClass: 'text-rose-600 dark:text-rose-400',
      badge: ewsAlerts.length > 0 ? ewsAlerts.length : undefined,
      onClick: () => onSelectTab('disiplin'),
    },
    // Slot 5: Data Siswa & Kontak Ortu
    {
      id: 'siswa',
      label: 'Data Siswa',
      icon: GraduationCap,
      iconColorClass: 'text-sky-600 dark:text-sky-400',
      onClick: () => onSelectTab('siswa'),
    },
    // Slot 6: Cetak Rekapitulasi F-BK
    {
      id: 'rekap',
      label: 'Cetak Rekap',
      icon: FileText,
      iconColorClass: 'text-teal-600 dark:text-teal-400',
      onClick: () => onSelectTab('rekap'),
    },
    // Slot 7: Cetak Rapor Akademik
    {
      id: 'rapor',
      label: 'Cetak Rapor',
      icon: Award,
      iconColorClass: 'text-violet-600 dark:text-violet-400',
      onClick: () => onSelectTab('rapor'),
    },
    // Slot 8: Catatan Prestasi Siswa
    {
      id: 'prestasi',
      label: 'Prestasi Siswa',
      icon: Award,
      iconColorClass: 'text-emerald-600 dark:text-emerald-400',
      onClick: () => onSelectTab('prestasi'),
    },
  ];

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Historical Mode Alert (jika masa lampau) */}
      {isHistorical && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 truncate">
                Mode Arsip Historis (Masa Lampau)
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 truncate">
                Data rombel periode {data?.academicContext?.tahunPelajaranNama || 'TP'} - {data?.academicContext?.semesterNama || 'Sem'}. Seluruh formulir berstatus Read-Only.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 shrink-0 text-[10px]">
            Read-Only
          </Badge>
        </div>
      )}

      {/* 1. METRIK ROMBEL KELAS (Shopee-Grade Flat HubBentoGrid) */}
      <HubCard noPadding>
        <HubBentoGrid cells={bentoCells} columns={2} />
      </HubCard>

      {/* 2. PINTASAN AKSI OPERASIONAL (Shopee-Grade Headerless Quick Action Slider) */}
      <HubCard bodyClassName="py-2.5 sm:py-3 px-2 sm:px-3">
        <HubActionGrid items={actionItems} variant="slider" />
      </HubCard>

      {/* 3. DAFTAR SISWA TIDAK HADIR HARI INI (Direct Actionable Feed) */}
      {daftarTidakHadir.length > 0 ? (
        <HubCard
          title={`Siswa Tidak Hadir Hari Ini (${daftarTidakHadir.length})`}
          subtitle="Verifikasi izin & tindak lanjut kehadiran rombel"
          actionLabel="Lihat Presensi >"
          onAction={() => onSelectTab('presensi')}
          noPadding
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {daftarTidakHadir.map((s) => {
              const isAlfa = s.status === 'Alpha' || s.status === 'Alfa';
              const isSakit = s.status === 'Sakit';
              return (
                <HubListRow
                  key={s.siswaId}
                  title={s.nama}
                  subtitle={s.alasan || (isAlfa ? 'Tanpa keterangan resmi' : 'Menunggu surat dokter')}
                  icon={isAlfa ? ShieldAlert : isSakit ? Clock : FileCheck2}
                  iconColorClass={
                    isAlfa 
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' 
                      : isSakit 
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' 
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                  }
                  rightBadge={
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full leading-none',
                        isAlfa
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : isSakit
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      )}
                    >
                      {s.status}
                    </span>
                  }
                  onClick={() => onSelectTab('presensi')}
                />
              );
            })}
          </div>
        </HubCard>
      ) : totalSiswa > 0 && hadir > 0 ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <UserCheck size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Seluruh Siswa Hadir Lengkap
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                Tingkat kehadiran rombel 100% pada jam KBM hari ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('presensi')}
            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 cursor-pointer"
          >
            Detail &gt;
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Presensi KBM Hari Ini Belum Dimulai
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Belum ada catatan presensi rombel untuk tanggal ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('presensi')}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
          >
            Buka Presensi &gt;
          </button>
        </div>
      )}

      {/* 4. DUA KOLOM BAWAH: AKTIVITAS & LOG TERBARU + AGENDA & KBM HARI INI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Kolom 1: Log Aktivitas Rombel */}
        <HubCard
          title="Aktivitas & Log Rombel"
          subtitle="Pembaruan real-time"
          noPadding
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {recentActivities.map((act) => (
              <HubListRow
                key={act.id}
                title={act.title}
                subtitle={act.desc}
                rightBadge={
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      act.isWarning
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {act.time}
                  </span>
                }
              />
            ))}
          </div>
        </HubCard>

        {/* Kolom 2: Agenda & Jadwal KBM Hari Ini */}
        <HubCard
          title="Agenda & KBM Hari Ini"
          subtitle="Jadwal waktu nyata"
          noPadding
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {agendaHariIni.map((ag, i) => (
              <HubListRow
                key={i}
                title={ag.agenda}
                subtitle={ag.jam}
                icon={CalendarCheck}
                iconColorClass="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60"
                rightBadge={
                  <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {ag.tipe}
                  </span>
                }
              />
            ))}
          </div>
        </HubCard>
      </div>
    </div>
  );
});

WalasBerandaTab.displayName = 'WalasBerandaTab';
