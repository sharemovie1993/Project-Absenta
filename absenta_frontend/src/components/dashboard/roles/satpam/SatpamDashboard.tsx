import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Scan, 
  UserCheck, 
  LogOut, 
  AlertTriangle, 
  Activity, 
  Clock, 
  RefreshCw,
  Camera,
  DoorOpen,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { getGerbangDashboardStats } from '@/api/dashboard.api';
import { piketApi } from '@/api/piket.api';

// Subcomponents
import { SatpamDashboardSkeleton } from './SatpamDashboardSkeleton';
import { SatpamScanGerbangTab } from './tabs/SatpamScanGerbangTab';
import { SatpamBukuTamuTab } from './tabs/SatpamBukuTamuTab';
import { SatpamIzinKeluarTab } from './tabs/SatpamIzinKeluarTab';
import { SatpamPelanggaranTab } from './tabs/SatpamPelanggaranTab';
import { SatpamTrafficTab } from './tabs/SatpamTrafficTab';
import type { 
  SatpamTabType, 
  SatpamStats, 
  RecentScanRecord, 
  GuestLogRecord, 
  StudentGatePermit 
} from './types';

// Mock Seed Data
const MOCK_RECENT_TAPS: RecentScanRecord[] = [
  {
    id: 'tap-1',
    nama: 'Fahrizal Rahmat',
    nisn: '0058291824',
    kelas: 'XI RPL 1',
    status: 'HADIR',
    jam: '06:48:12',
    gate: 'Pos Gerbang Utama 1',
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'tap-2',
    nama: 'Anisa Maharani',
    nisn: '0058291825',
    kelas: 'XI RPL 1',
    status: 'HADIR',
    jam: '06:50:05',
    gate: 'Pos Gerbang Utama 1',
  },
  {
    id: 'tap-3',
    nama: 'Bagas Prasetyo',
    nisn: '0058291826',
    kelas: 'XII TKJ 2',
    status: 'HADIR',
    jam: '06:52:40',
    gate: 'Pos Gerbang Utama 1',
  },
  {
    id: 'tap-4',
    nama: 'Citra Dewi Permata',
    nisn: '0058291827',
    kelas: 'X DKV 1',
    status: 'HADIR',
    jam: '06:54:19',
    gate: 'Pos Gerbang Barat',
  },
  {
    id: 'tap-5',
    nama: 'Rian Pratama',
    nisn: '0061298411',
    kelas: 'X TJKT 2',
    status: 'TERLAMBAT',
    jam: '07:22:04',
    gate: 'Pos Gerbang Utama 1',
  },
];

const MOCK_GUESTS: GuestLogRecord[] = [
  {
    id: 'g-1',
    nama_tamu: 'Drs. Supriyadi, M.Pd.',
    instansi: 'Pengawas Cabang Dinas Pendidikan',
    keperluan: 'Monitoring KBM & Kordinasi Kurikulum Merdeka',
    menemui: 'Kepala Sekolah',
    no_telepon: '081289123891',
    nomor_kartu_tamu: 'V-01',
    jam_masuk: '08:15',
    status: 'BERKUNJUNG',
  },
  {
    id: 'g-2',
    nama_tamu: 'Ibu Linda Susanti',
    instansi: 'Orang Tua Siswa (Daffa Rizky)',
    keperluan: 'Menyerahkan surat keterangan dokter',
    menemui: 'Guru Piket / Wali Kelas',
    no_telepon: '085718293012',
    nomor_kartu_tamu: 'V-02',
    jam_masuk: '08:40',
    status: 'BERKUNJUNG',
  },
  {
    id: 'g-3',
    nama_tamu: 'Bpk. Surya Wijaya',
    instansi: 'PT Tera Data Indonusa (Axioo)',
    keperluan: 'Kunjungan sinkronisasi kurikulum industri',
    menemui: 'Waka Hubin & Kaprog TKJ',
    no_telepon: '081399887766',
    nomor_kartu_tamu: 'V-03',
    jam_masuk: '09:00',
    jam_keluar: '10:30',
    status: 'SELESAI',
  },
];

const MOCK_PERMITS: StudentGatePermit[] = [
  {
    id: 'p-1',
    siswa_id: 's-101',
    nama_siswa: 'Muhammad Alif',
    kelas: 'XII RPL 2',
    alasan: 'Mewakili sekolah lomba LKS tingkat kota',
    jam_keluar_rencana: '09:00',
    jam_kembali_rencana: '15:00',
    guru_piket_nama: 'Ibu Ratna Dewi, S.Pd.',
    status: 'DI_LUAR',
    jam_keluar_aktual: '09:05',
  },
  {
    id: 'p-2',
    siswa_id: 's-102',
    nama_siswa: 'Zahra Amelia',
    kelas: 'XI AKL 1',
    alasan: 'Sakit mendadak (demam tinggi) dijemput orang tua',
    jam_keluar_rencana: '09:30',
    guru_piket_nama: 'Bpk. Bambang P.',
    status: 'DISETUJUI',
  },
];

export const SatpamDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as SatpamTabType) || 'scan';

  const handleTabChange = useCallback(
    (tabId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', tabId);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Queries
  const { data: statsRes, isLoading, refetch } = useQuery({
    queryKey: ['satpam-dashboard-stats'],
    queryFn: async () => {
      try {
        const res = await getGerbangDashboardStats();
        return res?.data || null;
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const satpamStats: SatpamStats = useMemo(() => {
    return {
      totalMasuk: statsRes?.hadir_hari_ini ?? 642,
      tepatWaktu: statsRes?.tepat_waktu ?? 618,
      terlambat: statsRes?.terlambat ?? 24,
      belumHadir: statsRes?.belum_hadir ?? 38,
      tamuDiSekolah: 2,
      izinKeluarAktif: 1,
      persentaseKehadiran: statsRes?.persentase ?? 94,
    };
  }, [statsRes]);

  const tabsConfig = useMemo(
    () => [
      { id: 'scan', label: 'Scan Gerbang', icon: Scan },
      { id: 'buku_tamu', label: 'Buku Tamu', icon: UserCheck, badge: satpamStats.tamuDiSekolah },
      { id: 'izin_keluar', label: 'Izin Keluar', icon: LogOut, badge: satpamStats.izinKeluarAktif },
      { id: 'pelanggaran', label: 'Pelanggaran', icon: AlertTriangle },
      { id: 'traffic', label: 'Trafik & Monitoring', icon: Activity },
    ],
    [satpamStats]
  );

  if (isLoading) {
    return <SatpamDashboardSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── 1. HERO POS SATPAM BANNER ──────────────────────── */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-rose-950/50">
              <ShieldCheck size={26} />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-600/20 text-rose-400 border border-rose-500/40 uppercase">
                  POS SATPAM &amp; GERBANG KEAMANAN
                </span>
                <span className="text-xs font-semibold text-slate-500 font-mono hidden sm:inline">
                  Terminal Terminal 01
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                {user?.full_name || 'Petugas Satpam'} — Pos Utama
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-slate-300">
                RFID &amp; Scan Online
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 px-2.5 rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold"
            >
              <RefreshCw size={13} className={cn(isLoading && 'animate-spin text-teal-400')} />
            </Button>
          </div>
        </div>

        {/* ── BENTO QUICK STRIP ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Masuk</p>
            <p className="text-lg font-black text-teal-400 mt-0.5">{satpamStats.totalMasuk} Siswa</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Terlambat</p>
            <p className="text-lg font-black text-rose-400 mt-0.5">{satpamStats.terlambat} Siswa</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Tamu Aktif</p>
            <p className="text-lg font-black text-amber-400 mt-0.5">{satpamStats.tamuDiSekolah} Orang</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Siswa di Luar</p>
            <p className="text-lg font-black text-indigo-400 mt-0.5">{satpamStats.izinKeluarAktif} Izin</p>
          </div>
        </div>
      </div>

      {/* ── 2. TAB NAVIGATION BAR ──────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
        <TabSwitcher
          tabs={tabsConfig}
          activeTab={currentTab}
          onChange={handleTabChange}
        />
      </div>

      {/* ── 3. TAB CONTENT PANELS ──────────────────────────── */}
      <div className="animate-in fade-in duration-150">
        {currentTab === 'scan' && (
          <SatpamScanGerbangTab recentTaps={MOCK_RECENT_TAPS} />
        )}

        {currentTab === 'buku_tamu' && (
          <SatpamBukuTamuTab guestLogs={MOCK_GUESTS} />
        )}

        {currentTab === 'izin_keluar' && (
          <SatpamIzinKeluarTab permits={MOCK_PERMITS} />
        )}

        {currentTab === 'pelanggaran' && (
          <SatpamPelanggaranTab />
        )}

        {currentTab === 'traffic' && (
          <SatpamTrafficTab stats={satpamStats} />
        )}
      </div>
    </div>
  );
};
