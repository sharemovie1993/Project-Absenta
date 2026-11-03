import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  CalendarCheck, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  Compass, 
  ArrowUpRight,
  ChevronRight,
  Layers,
  GraduationCap,
  Clock,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

import { Card } from '@/components/ui/Card';
import { Button, Input, Badge, Loader } from '@/components/ui';
import { dropdownApi, type DropdownOption } from '@/api/dropdown.api';
import { getRekapBulananMapel } from '@/api/attendanceGerbang.api';
import { guruApi } from '@/api/academic.api';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { toLocalMonth } from '@/utils/attendance/time';
import { exportDataToExcel } from '@/utils/export.utils';
import type { RekapBulananKelasRow, ViewMode } from '@/components/attendance/rekap/types';
import { RekapPresensiPrintModal } from '@/components/attendance/rekap/RekapPresensiPrintModal';

const Table = lazy(() => import('@/components/ui/Table').then(m => ({ default: m.Table })));
const SearchableSelect = lazy(() => import('@/components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

interface StaffRekapMapelTabProps {
  user?: any;
}

interface MapelClassCard {
  id: string;
  mapelId: string;
  mapelName: string;
  kelasId: string;
  kelasName: string;
}

const STATUS_BADGE: Record<string, string> = {
  H: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black',
  T: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black',
  S: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black',
  I: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black',
  D: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-black',
  A: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black',
};

export const StaffRekapMapelTab: React.FC<StaffRekapMapelTabProps> = React.memo(({ user }) => {
  const navigate = useNavigate();

  // Filter States
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>('');
  const [kelasId, setKelasId] = useState<string>('');
  const [mapelId, setMapelId] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('MATRIX');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // Shopee Dynamic Scroll Indicator State
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [canScroll, setCanScroll] = useState<boolean>(false);

  const checkScrollable = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const isScrollable = el.scrollWidth > el.clientWidth + 4;
      setCanScroll(isScrollable);
      if (isScrollable) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        setScrollProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
      }
    }
  }, []);

  // 1. Profil Guru Login
  const { data: myGuruData } = useQuery({
    queryKey: ['my-guru-profile-rekap-tab', user?.id],
    queryFn: async () => {
      const res = await guruApi.getMe().catch(() => null);
      if (res?.data) return res.data;
      const allRes = await guruApi.getAll({ limit: 1, ...({ user_id: user?.id } as any) }).catch(() => null);
      return allRes?.data?.[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const myGuruId = (user?.guru_profile as any)?.id || (user as any)?.guru_id || myGuruData?.id;

  // 2. Dropdown Tahun Pelajaran & Master
  const dropdownsQuery = useQuery({
    queryKey: ['staff-rekap-mapel-dropdowns'],
    queryFn: async () => {
      const [tahun, active, kelas, mapelList] = await Promise.all([
        dropdownApi.getTahunPelajaranForDropdown(),
        dropdownApi.getActiveTahunPelajaran(),
        dropdownApi.getKelasForDropdown(),
        dropdownApi.getMapelForDropdown(),
      ]);
      return {
        tahun: tahun ?? [],
        activeId: active?.id ?? '',
        kelas: kelas ?? [],
        mapel: mapelList ?? []
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (dropdownsQuery.data?.activeId && !tahunPelajaranId) {
      setTahunPelajaranId(dropdownsQuery.data.activeId);
    }
  }, [dropdownsQuery.data, tahunPelajaranId]);

  // 3. Penugasan Guru Mapel (Strictly Scoped ke Guru yang Sedang Login)
  const { data: assignmentsData, isLoading: loadingAssignments } = useQuery({
    queryKey: ['my-assigned-mapel-kelas', myGuruId, tahunPelajaranId],
    queryFn: () => listGuruMapel({ 
      guru_id: myGuruId,
      ...(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : {})
    }),
    enabled: !!myGuruId,
    staleTime: 5 * 60 * 1000,
  });

  const mapelCards = useMemo<MapelClassCard[]>(() => {
    const list: MapelClassCard[] = [];
    const seen = new Set<string>();

    const raw = Array.isArray(assignmentsData?.data) ? assignmentsData.data : [];
    const rawMapel = dropdownsQuery.data?.mapel || [];
    const rawKelas = dropdownsQuery.data?.kelas || [];

    raw.forEach((a: any) => {
      const mId = a.mapel_id || a.Mapel?.id || a.mapel?.id;
      const kId = a.kelas_id || a.Kelas?.id || a.kelas?.id;
      const mName = a.Mapel?.nama_mapel || a.mapel?.nama_mapel || rawMapel.find(m => m.value === mId)?.label || 'Mapel';
      const kName = a.Kelas?.nama_kelas || a.kelas?.nama_kelas || rawKelas.find(k => k.value === kId)?.label || 'Kelas';

      if (mId && kId) {
        const key = `${mId}___${kId}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ id: key, mapelId: mId, mapelName: mName, kelasId: kId, kelasName: kName });
        }
      }
    });

    return list;
  }, [assignmentsData, dropdownsQuery.data]);

  // Auto-select kartu pertama jika belum terpilih
  useEffect(() => {
    if (mapelCards.length > 0) {
      const isCurrentValid = mapelCards.some(c => c.mapelId === mapelId && c.kelasId === kelasId);
      if (!isCurrentValid || !mapelId || !kelasId) {
        setMapelId(mapelCards[0].mapelId);
        setKelasId(mapelCards[0].kelasId);
      }
    }
  }, [mapelCards, mapelId, kelasId]);

  // Listener Scroll & Resize untuk Shopee Dynamic Scroll Indicator
  useEffect(() => {
    checkScrollable();
    const timer = setTimeout(checkScrollable, 200);
    window.addEventListener('resize', checkScrollable);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScrollable);
    };
  }, [checkScrollable, mapelCards.length]);

  const handleSliderScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(Math.min(1, Math.max(0, el.scrollLeft / maxScroll)));
      }
    }
  };

  const trackWidth = 36;
  const capsuleWidth = 14;
  const maxTranslate = Math.max(0, trackWidth - capsuleWidth);
  const capsuleTranslateX = scrollProgress * maxTranslate;

  // 4. Fetch Data Rekap Presensi Mapel
  const rekapQuery = useQuery({
    queryKey: ['staff-rekap-mapel-content', kelasId, mapelId, bulan, tahunPelajaranId],
    queryFn: async () => {
      if (!kelasId || !mapelId || !bulan) return null;
      return getRekapBulananMapel({
        kelas_id: kelasId,
        mapel_id: mapelId,
        bulan,
        tahun_pelajaran_id: tahunPelajaranId || undefined,
      });
    },
    enabled: Boolean(kelasId && mapelId && bulan),
    staleTime: 2 * 60 * 1000,
  });

  const rawRows: RekapBulananKelasRow[] = useMemo(() => {
    return Array.isArray(rekapQuery.data?.data) ? (rekapQuery.data.data as RekapBulananKelasRow[]) : [];
  }, [rekapQuery.data]);

  const activeCard = useMemo(() => {
    return mapelCards.find(c => c.mapelId === mapelId && c.kelasId === kelasId) || null;
  }, [mapelCards, mapelId, kelasId]);

  const totalSesi = rekapQuery.data?.total_sesi ?? 0;
  const guruMapelInfo = rekapQuery.data?.guru_mapel || { nama_guru: myGuruData?.nama_guru || user?.full_name, nip: myGuruData?.nip };
  const waliKelasInfo = rekapQuery.data?.wali_kelas || null;

  // Tanggal unik yang memiliki log presensi pada bulan ini
  const dayNumbers = useMemo(() => {
    const daySet = new Set<number>();
    rawRows.forEach(r => {
      if (r.dailyMap) {
        Object.keys(r.dailyMap).forEach(d => {
          const num = parseInt(d, 10);
          if (!isNaN(num)) daySet.add(num);
        });
      }
    });
    return Array.from(daySet).sort((a, b) => a - b);
  }, [rawRows]);

  // Filtered Rows berdasarkan Keyword Pencarian
  const filteredRows = useMemo(() => {
    if (!searchKeyword.trim()) return rawRows;
    const q = searchKeyword.toLowerCase().trim();
    return rawRows.filter(r => 
      (r.nama_siswa && r.nama_siswa.toLowerCase().includes(q)) ||
      (r.nis && r.nis.toLowerCase().includes(q))
    );
  }, [rawRows, searchKeyword]);

  // Bento Metrics
  const stats = useMemo(() => {
    const totalStudents = rawRows.length;
    if (totalStudents === 0) {
      return { totalSesi, avgPresence: 0, criticalCount: 0, totalStudents: 0 };
    }

    let totalPercentage = 0;
    let criticalCount = 0;

    rawRows.forEach(r => {
      const sumHadir = (r.HADIR ?? 0) + (r.TERLAMBAT ?? 0);
      const sumTotal = sumHadir + (r.SAKIT ?? 0) + (r.IZIN ?? 0) + (r.ALPA ?? 0);
      const pct = sumTotal > 0 ? (sumHadir / sumTotal) * 100 : 0;
      totalPercentage += pct;
      if (pct < 75) criticalCount++;
    });

    return {
      totalSesi,
      avgPresence: Math.round(totalPercentage / totalStudents),
      criticalCount,
      totalStudents,
    };
  }, [rawRows, totalSesi]);

  // Pagination Rows
  const pagedRows = useMemo(() => {
    return filteredRows.slice((page - 1) * limit, page * limit);
  }, [filteredRows, page, limit]);

  // Export to Excel
  const handleExportExcel = useCallback(() => {
    if (!activeCard || !rawRows.length) {
      toast.error('Tidak ada data presensi untuk diekspor');
      return;
    }
    const title = `REKAPITULASI PRESENSI MAPEL ${activeCard.mapelName.toUpperCase()} - KELAS ${activeCard.kelasName.toUpperCase()} (${bulan})`;
    const filename = `Rekap_Mapel_${activeCard.mapelName.replace(/[^a-zA-Z0-9]/g, '_')}_${activeCard.kelasName.replace(/[^a-zA-Z0-9]/g, '_')}_${bulan}`;
    
    const excelCols = [
      { header: 'No', accessor: (_: unknown, i?: number) => (i ?? 0) + 1, width: 6 },
      { header: 'Nama Siswa', accessor: (r: RekapBulananKelasRow) => r.nama_siswa, width: 28 },
      { header: 'NIS', accessor: (r: RekapBulananKelasRow) => r.nis ?? '-', width: 14 },
      ...dayNumbers.map(d => ({
        header: `Tgl ${d}`,
        accessor: (r: RekapBulananKelasRow) => r.dailyMap?.[d.toString()] ?? '-',
        width: 6,
      })),
      { header: 'Hadir (H)', accessor: (r: RekapBulananKelasRow) => r.HADIR ?? 0, width: 10 },
      { header: 'Sakit (S)', accessor: (r: RekapBulananKelasRow) => r.SAKIT ?? 0, width: 10 },
      { header: 'Izin (I)', accessor: (r: RekapBulananKelasRow) => r.IZIN ?? 0, width: 10 },
      { header: 'Alpa (A)', accessor: (r: RekapBulananKelasRow) => r.ALPA ?? 0, width: 10 },
      { header: 'Terlambat (T)', accessor: (r: RekapBulananKelasRow) => r.TERLAMBAT ?? 0, width: 12 },
      { header: '% Kehadiran', accessor: (r: RekapBulananKelasRow) => {
        const sum = (r.HADIR ?? 0) + (r.IZIN ?? 0) + (r.SAKIT ?? 0) + (r.ALPA ?? 0) + (r.TERLAMBAT ?? 0);
        return sum === 0 ? '0%' : `${Math.round((((r.HADIR ?? 0) + (r.TERLAMBAT ?? 0)) / sum) * 100)}%`;
      }, width: 12 },
      { header: 'Total Poin', accessor: (r: RekapBulananKelasRow) => r.total_poin ?? 0, width: 10 },
    ];

    exportDataToExcel<RekapBulananKelasRow>(rawRows, excelCols, filename, title);
    toast.success(`Berhasil mengunduh ${filename}.xlsx`);
  }, [activeCard, rawRows, bulan, dayNumbers]);

  // Kolom Tabel
  const tableColumns = useMemo(() => {
    const NamaCell = (v: unknown, row: RekapBulananKelasRow) => (
      <button
        type="button"
        onClick={() => navigate(`/attendance/tracking-siswa?siswa_id=${row.siswa_id}`)}
        className="group/name inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline text-left cursor-pointer transition-all"
        title="Klik untuk Melacak Matriks Presensi Multi-Channel Siswa"
      >
        <span className="truncate max-w-[200px]">{String(v ?? '')}</span>
        <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover/name:opacity-100 group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5 transition-all text-indigo-500 shrink-0" />
      </button>
    );

    const PctBadge = (_: unknown, row: RekapBulananKelasRow) => {
      const sum = (row.HADIR ?? 0) + (row.IZIN ?? 0) + (row.SAKIT ?? 0) + (row.ALPA ?? 0) + (row.TERLAMBAT ?? 0);
      const pct = sum === 0 ? 0 : Math.round((((row.HADIR ?? 0) + (row.TERLAMBAT ?? 0)) / sum) * 100);
      return (
        <span className={`font-mono font-black text-xs ${
          pct >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
          pct >= 75 ? 'text-amber-600 dark:text-amber-400' :
          'text-rose-600 dark:text-rose-400'
        }`}>
          {pct}%
        </span>
      );
    };

    const StatusUjianBadge = (_: unknown, row: RekapBulananKelasRow) => {
      const sum = (row.HADIR ?? 0) + (row.IZIN ?? 0) + (row.SAKIT ?? 0) + (row.ALPA ?? 0) + (row.TERLAMBAT ?? 0);
      const pct = sum === 0 ? 0 : Math.round((((row.HADIR ?? 0) + (row.TERLAMBAT ?? 0)) / sum) * 100);
      if (pct >= 85) {
        return <Badge variant="success" className="text-[9.5px] uppercase font-bold py-0.5 px-1.5">Memenuhi</Badge>;
      }
      if (pct >= 75) {
        return <Badge variant="warning" className="text-[9.5px] uppercase font-bold py-0.5 px-1.5">Waspada</Badge>;
      }
      return <Badge variant="destructive" className="text-[9.5px] uppercase font-bold py-0.5 px-1.5">Kritis (&lt;75%)</Badge>;
    };

    const AksiCell = (_: unknown, row: RekapBulananKelasRow) => (
      <button
        type="button"
        onClick={() => navigate(`/attendance/tracking-siswa?siswa_id=${row.siswa_id}`)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer shadow-2xs"
        title="Buka Matriks Tracking Multi-Channel Siswa"
      >
        <Compass className="w-3 h-3 text-indigo-500" />
        <span>Lacak</span>
      </button>
    );

    if (viewMode === 'SUMMARY') {
      return [
        { label: 'Nama Siswa', key: 'nama_siswa', render: NamaCell },
        { label: 'NIS', key: 'nis', className: 'text-center font-mono text-xs text-slate-500' },
        { label: 'Hadir', key: 'HADIR', className: 'text-center font-bold text-emerald-600' },
        { label: 'Sakit', key: 'SAKIT', className: 'text-center font-bold text-amber-600' },
        { label: 'Izin', key: 'IZIN', className: 'text-center font-bold text-blue-600' },
        { label: 'Alpa', key: 'ALPA', className: 'text-center font-bold text-rose-600' },
        { label: 'Telat', key: 'TERLAMBAT', className: 'text-center font-bold text-purple-600' },
        { label: '% Kehadiran', key: 'persentase', className: 'text-center', render: PctBadge },
        { label: 'Status Ujian', key: 'status_ujian', className: 'text-center', render: StatusUjianBadge },
        { label: 'Poin', key: 'total_poin', className: 'text-center font-mono text-xs font-black' },
        { label: 'Aksi', key: 'aksi', className: 'text-center w-16', render: AksiCell },
      ];
    }

    // MATRIX MODE
    const dayCols = dayNumbers.map(d => ({
      label: d.toString(),
      key: `day_${d}`,
      className: 'text-center p-1',
      render: (_: unknown, row: RekapBulananKelasRow) => {
        const code = row.dailyMap?.[d.toString()];
        if (!code) return <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>;
        const cls = STATUS_BADGE[code] || 'bg-slate-100 text-slate-600';
        return (
          <span 
            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] ${cls}`}
            title={`Pertemuan Tgl ${d}: ${code}`}
          >
            {code}
          </span>
        );
      }
    }));

    return [
      { label: 'Nama Siswa', key: 'nama_siswa', render: NamaCell },
      { label: 'NIS', key: 'nis', className: 'text-center font-mono text-xs text-slate-500' },
      ...dayCols,
      { label: 'H', key: 'HADIR', className: 'text-center font-bold text-emerald-600 text-xs' },
      { label: 'S', key: 'SAKIT', className: 'text-center font-bold text-amber-600 text-xs' },
      { label: 'I', key: 'IZIN', className: 'text-center font-bold text-blue-600 text-xs' },
      { label: 'A', key: 'ALPA', className: 'text-center font-bold text-rose-600 text-xs' },
      { label: 'T', key: 'TERLAMBAT', className: 'text-center font-bold text-purple-600 text-xs' },
      { label: '%', key: 'persentase', className: 'text-center', render: PctBadge },
      { label: 'Syarat', key: 'status_ujian', className: 'text-center', render: StatusUjianBadge },
      { label: 'POIN', key: 'total_poin', className: 'text-center font-mono text-xs font-black' },
      { label: 'Aksi', key: 'aksi', className: 'text-center w-14', render: AksiCell },
    ];
  }, [viewMode, dayNumbers, navigate]);

  return (
    <div className="space-y-3.5">
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 1. UNIFIED COMPACT CONTROL CARD (Shopee-Grade High Density)        */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
        {/* BARIS 1: Header + Stat Mini Hairline + Pemilih Bulan */}
        <div className="p-2.5 sm:p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Sisi Kiri: Title & Subtitle Kompak */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Rekapitulasi Presensi Mengajar
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Kehadiran per rombel mapel yang diampu
              </p>
            </div>
          </div>

          {/* Sisi Tengah / Kanan: Hairline Flat Bento Stats & Month Selector */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 sm:gap-4">
            {/* 4 Metrik Flat Hairline */}
            <div className="flex items-center divide-x divide-slate-100 dark:divide-slate-800/80 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2 py-1 border border-slate-100 dark:border-slate-800">
              <div className="px-2 sm:px-2.5 flex items-center gap-1.5" title="Sesi Terlaksana Bulan Ini">
                <CalendarCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Sesi:</span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{stats.totalSesi}</span>
              </div>
              <div className="px-2 sm:px-2.5 flex items-center gap-1.5" title="Rata-rata Kehadiran Kelas">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Rata2:</span>
                <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.avgPresence}%</span>
              </div>
              <div className="px-2 sm:px-2.5 flex items-center gap-1.5" title="Siswa Perlu Perhatian Khusus (<75%)">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Perhatian:</span>
                <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">{stats.criticalCount}</span>
              </div>
              <div className="px-2 sm:px-2.5 flex items-center gap-1.5" title="Total Siswa di Rombel">
                <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">Siswa:</span>
                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{stats.totalStudents}</span>
              </div>
            </div>

            {/* Pemilih Periode Bulan */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">Bulan:</span>
              <Input
                type="month"
                value={bulan}
                onChange={e => setBulan(e.target.value)}
                className="h-7 w-32 rounded-lg bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs py-0"
              />
            </div>
          </div>
        </div>

        {/* BARIS 2: Horizontal Capsule Pill Slider (Mapel & Kelas Ramping) */}
        <div className="px-2.5 sm:px-3 py-2 bg-slate-50/50 dark:bg-slate-800/20">
          {loadingAssignments ? (
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          ) : mapelCards.length > 0 ? (
            <div className="relative w-full">
              <div
                ref={scrollContainerRef}
                onScroll={handleSliderScroll}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 scroll-smooth"
              >
                {mapelCards.map(card => {
                  const isActive = card.mapelId === mapelId && card.kelasId === kelasId;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        setMapelId(card.mapelId);
                        setKelasId(card.kelasId);
                      }}
                      className={cn(
                        "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-150 shrink-0 cursor-pointer select-none active:scale-95",
                        isActive
                          ? "bg-indigo-600 text-white font-bold shadow-xs ring-1 ring-indigo-500"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/70 dark:border-slate-700/70 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs"
                      )}
                    >
                      <GraduationCap className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-indigo-500")} />
                      <span className="truncate max-w-[120px]">{card.mapelName}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.2 rounded-md leading-none",
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                      )}>
                        {card.kelasName}
                      </span>
                      {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0 animate-in zoom-in-75" />}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Capsule Scroll Indicator */}
              {canScroll && (
                <div className="flex justify-center items-center pt-1.5">
                  <div
                    style={{ width: `${trackWidth}px` }}
                    className="h-0.5 bg-slate-200 dark:bg-slate-700/80 rounded-full relative overflow-hidden"
                  >
                    <div
                      style={{
                        width: `${capsuleWidth}px`,
                        transform: `translateX(${capsuleTranslateX}px)`,
                      }}
                      className="h-full rounded-full transition-transform duration-75 ease-out bg-indigo-500 dark:bg-indigo-400"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-1.5 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-medium">
              Belum ada data penugasan mengajar di sistem untuk akun Anda. Silakan hubungi bagian Kurikulum.
            </div>
          )}
        </div>

        {/* BARIS 3: Toolbar Kontrol View Mode, Search Siswa, & Ekspor */}
        <div className="p-2 sm:p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Switcher Mode: Matriks Sesi vs Akumulasi Rapor */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 h-7.5">
              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all cursor-pointer",
                  viewMode === 'MATRIX'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                Matriks Sesi
              </button>
              <button
                type="button"
                onClick={() => setViewMode('SUMMARY')}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all cursor-pointer",
                  viewMode === 'SUMMARY'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                Akumulasi Rapor
              </button>
            </div>

            {/* Input Search Siswa */}
            <div className="relative min-w-[180px] sm:min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Cari siswa atau NIS..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="h-7.5 pl-8 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-2xs w-full py-0"
              />
            </div>
          </div>

          {/* Tombol Ekspor Excel & Cetak PDF */}
          <div className="flex items-center gap-1.5 self-end md:self-auto">
            <Button
              onClick={handleExportExcel}
              disabled={!rawRows.length}
              variant="outline"
              size="sm"
              className="h-7.5 rounded-lg font-semibold text-xs px-2.5 shadow-2xs cursor-pointer border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>Excel</span>
            </Button>
            <Button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={!rawRows.length}
              variant="outline"
              size="sm"
              className="h-7.5 rounded-lg font-semibold text-xs px-2.5 shadow-2xs cursor-pointer border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              <span>Cetak PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 4. TABEL REKAP PRESENSI MAPEL                                      */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Card className="bg-white dark:bg-slate-900 overflow-x-auto rounded-2xl border-slate-200/80 dark:border-slate-800 p-2 shadow-2xs">
        <Suspense fallback={<div className="p-12 text-center"><Loader size="lg" /></div>}>
          <Table
            columns={tableColumns}
            data={pagedRows}
            loading={rekapQuery.isLoading}
            emptyMessage={kelasId && mapelId ? 'Tidak ada catatan presensi KBM pada bulan ini.' : 'Silakan pilih kelas dan mata pelajaran yang Anda ampu.'}
            compact
            className="border-none"
            pagination={{
              currentPage: page,
              totalPages: Math.ceil(filteredRows.length / limit),
              totalItems: filteredRows.length,
              itemsPerPage: limit,
              onPageChange: setPage,
              onLimitChange: (l) => { setLimit(l); setPage(1); },
            }}
          />
        </Suspense>
      </Card>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 5. MODAL CETAK PDF UNIVERSAL DOCUMENT (TRUE WYSIWYG)               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isPrintModalOpen && (
        <RekapPresensiPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          kelasId={kelasId}
          kelasNama={activeCard?.kelasName || 'Kelas'}
          mapelNama={activeCard?.mapelName || 'Mata Pelajaran'}
          guruMapelNama={guruMapelInfo?.nama_guru}
          guruMapelNip={guruMapelInfo?.nip || undefined}
          waliKelasNama={waliKelasInfo?.nama_guru}
          waliKelasNip={waliKelasInfo?.nip || undefined}
          tahunPelajaran={dropdownsQuery.data?.tahun.find(t => t.value === tahunPelajaranId)?.label}
          bulan={bulan}
          viewMode={viewMode}
          rows={rawRows}
          dayNumbers={dayNumbers}
        />
      )}
    </div>
  );
});

StaffRekapMapelTab.displayName = 'StaffRekapMapelTab';
