import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { 
  SectionCard, 
  Button, 
  Input, 
  Badge, 
  Loader, 
  Alert, 
  AlertDescription 
} from '../../../components/ui';
import { dropdownApi, type DropdownOption } from '../../../api/dropdown.api';
import { getRekapHarianKelas } from '../../../api/attendanceGerbang.api';
import { guruApi } from '../../../api/academic.api';
import { sekolahApi, type Sekolah } from '../../../api/academic/sekolah.api';
import { getTenantById, type Tenant } from '../../../api/tenants.api';
import { getStrukturList, type StrukturOrganisasi } from '../../../api/academic/strukturOrganisasi.api';
import { getBase64ImageFromUrl } from '../../../utils/cooperative/coopDocUtils';
import { toLocalDate } from '../../../utils/attendance/time';
import { exportDataToExcel } from '../../../utils/export.utils';
import { generateGenericPdf } from '../../../utils/print/pdfGeneric';
import { downloadFileFromBlob } from '../../../utils/file-download.utils';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Search, 
  RefreshCw, 
  Users, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X,
  Filter
} from 'lucide-react';

import { useAuthStore } from '../../../store/authStore';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';

// Lazy loading heavy components with Suspense
const SearchableSelect = lazy(() => import('../../../components/ui/SearchableSelect').then(module => ({ default: module.SearchableSelect })));
const Table = lazy(() => import('../../../components/ui/Table').then(module => ({ default: module.Table })));

// ─── Skema Validasi Zod — Google Platform Standards ──────────────────────
const rekapHarianKelasFilterSchema = z.object({
  kelasId: z.string().min(1, 'Kelas wajib dipilih terlebih dahulu'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
  tahunPelajaranId: z.string().optional(),
});

interface WaliKelasInfo {
  id?: string;
  nama_kelas?: string;
  kelas_id?: string;
  kelas?: { id?: string; nama_kelas?: string };
}

interface CustomGuruProfile {
  wali_kelas_di?: WaliKelasInfo;
  WaliKelas?: WaliKelasInfo[];
  kelas_id?: string;
}

interface CustomUser {
  guru_profile?: CustomGuruProfile;
  kelas_id?: string;
  role?: string;
}

interface RekapHarianKelasRow {
  id: string;
  siswa_id?: string;
  nama: string;
  nama_siswa?: string;
  nis?: string | null;
  status: string;
  poin: number;
}

interface RekapHarianKelasMeta {
  kelasId: string;
  tanggal: string;
  totalSiswa: number;
  totalHadir: number;
  totalAbsen: number;
}

export function RekapHarianKelasContent({ 
  initialKelasId 
}: { 
  initialKelasId?: string;
}) {
  const { user, subscription } = useAuthStore();
  const navigate = useNavigate();
  const { can } = useAuth();
  
  const [tahunOptions, setTahunOptions] = useState<DropdownOption[]>([]);
  const [tahunPelajaranId, setTahunPelajaranId] = useState('');
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  
  const customUser = (user as unknown as CustomUser) || null;
  const waliKelasId = customUser?.guru_profile?.wali_kelas_di?.id || 
                      customUser?.guru_profile?.WaliKelas?.[0]?.kelas_id || 
                      customUser?.guru_profile?.WaliKelas?.[0]?.kelas?.id ||
                      customUser?.kelas_id;

  const [kelasId, setKelasId] = useState(initialKelasId || waliKelasId || '');
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RekapHarianKelasRow[] | null>(null);
  const [meta, setMeta] = useState<RekapHarianKelasMeta | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('Laporan_Harian_Presensi_Kelas.pdf');

  // Kop Surat Data
  const [sekolah, setSekolah] = useState<Sekolah | null>(null);
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(null);
  const [strukturList, setStrukturList] = useState<StrukturOrganisasi[]>([]);
  const [logoDaerahBase64, setLogoDaerahBase64] = useState<string | null>(null);
  const [logoSekolahBase64, setLogoSekolahBase64] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const canView = useMemo(
    () => can('attendance.reports.view') && can('academic.structures.view.list'),
    [can],
  );

  interface SubscriptionRecord {
    features?: string[];
    Plan?: { features_json?: string[] };
    plan?: { features_json?: string[] };
  }

  const subRecord = subscription as unknown as SubscriptionRecord | null;
  const subFeatures = subRecord?.features || subRecord?.Plan?.features_json || subRecord?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  // Dropdowns Query
  const dropdownsQuery = useQuery({
    queryKey: ['rekap-harian-kelas-dropdowns'],
    queryFn: async () => {
      const tahun = await dropdownApi.getTahunPelajaranForDropdown();
      const active = await dropdownApi.getActiveTahunPelajaran();
      const kelas = await dropdownApi.getKelasForDropdown();
      return {
        tahun: tahun || [],
        activeId: active?.id || '',
        kelas: kelas || []
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (dropdownsQuery.data) {
      setTahunOptions(dropdownsQuery.data.tahun);
      if (dropdownsQuery.data.activeId && !tahunPelajaranId) setTahunPelajaranId(dropdownsQuery.data.activeId);
      setKelasOptions(dropdownsQuery.data.kelas);
      if (!kelasId && dropdownsQuery.data.kelas.length > 0) setKelasId(dropdownsQuery.data.kelas[0].value);
    }
  }, [dropdownsQuery.data, tahunPelajaranId, kelasId]);

  // Kop Query
  const kopQuery = useQuery({
    queryKey: ['rekap-harian-kelas-kop', (user as any)?.tenant_id],
    queryFn: async () => {
      const sek = await sekolahApi.getProfile().catch(() => null);
      let tenantData = null;
      const tenantId = (user as any)?.tenant_id;
      if (tenantId) {
        const res = await getTenantById(tenantId).catch(() => null);
        if (res?.success) tenantData = res.data;
      }
      const resStruktur = await getStrukturList({ is_active: true }).catch(() => null);
      const strList = resStruktur?.success ? resStruktur.data : [];
      return { sekolah: sek, tenantInfo: tenantData, strukturList: strList };
    },
    staleTime: 5 * 60 * 1000,
  });

  const sekolah = kopQuery.data?.sekolah || null;
  const tenantInfo = kopQuery.data?.tenantInfo || null;
  const strukturList = kopQuery.data?.strukturList || [];

  // Main Rekap Harian Query
  const rekapQuery = useQuery({
    queryKey: ['rekap-harian-kelas-data', kelasId, tanggal, tahunPelajaranId],
    queryFn: async () => {
      const res = await getRekapHarianKelas(kelasId, { tanggal, tahun_pelajaran_id: tahunPelajaranId || undefined });
      const fetchedRows = (Array.isArray(res?.data) ? (res.data as RekapHarianKelasRow[]) : []) || [];
      const fetchedMeta = res?.meta ? (res.meta as RekapHarianKelasMeta) : {
        kelasId,
        tanggal,
        totalSiswa: fetchedRows.length,
        totalHadir: fetchedRows.filter(r => r.status === 'HADIR' || r.status === 'TERLAMBAT').length,
        totalAbsen: fetchedRows.filter(r => r.status !== 'HADIR' && r.status !== 'TERLAMBAT').length,
      };
      return { rows: fetchedRows, meta: fetchedMeta };
    },
    enabled: !!kelasId && !!tanggal && !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const rows = rekapQuery.data?.rows || null;
  const meta = rekapQuery.data?.meta || null;
  const loading = rekapQuery.isLoading;

  const fetchData = useCallback(async () => {
    await rekapQuery.refetch();
  }, [rekapQuery]);

  // Fetch Logos
  useEffect(() => {
    const leftLogoUrl = tenantInfo?.logo_daerah_url || (sekolah as unknown as Record<string, unknown>)?.logo_daerah_url as string | undefined;
    if (leftLogoUrl) {
      getBase64ImageFromUrl(leftLogoUrl)
        .then(res => setLogoDaerahBase64(res))
        .catch(() => setLogoDaerahBase64(null));
    } else {
      setLogoDaerahBase64(null);
    }
  }, [tenantInfo?.logo_daerah_url, sekolah]);

  useEffect(() => {
    const rightLogoUrl = tenantInfo?.logo_url || sekolah?.logo_url;
    if (rightLogoUrl) {
      getBase64ImageFromUrl(rightLogoUrl)
        .then(res => setLogoSekolahBase64(res))
        .catch(() => setLogoSekolahBase64(null));
    } else {
      setLogoSekolahBase64(null);
    }
  }, [tenantInfo?.logo_url, sekolah?.logo_url]);

  // Stat summary counters
  const statsSummary = useMemo(() => {
    if (!rows) return { total: 0, hadir: 0, terlambat: 0, sakit: 0, izin: 0, alpa: 0 };
    return {
      total: rows.length,
      hadir: rows.filter(r => r.status === 'HADIR').length,
      terlambat: rows.filter(r => r.status === 'TERLAMBAT').length,
      sakit: rows.filter(r => r.status === 'SAKIT').length,
      izin: rows.filter(r => r.status === 'IZIN' || r.status === 'DISPEN').length,
      alpa: rows.filter(r => r.status === 'ALPA').length,
    };
  }, [rows]);

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r => 
      (r.nama || r.nama_siswa || '').toLowerCase().includes(q) ||
      (r.nis || '').toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  // Column definitions
  const columns = useMemo(() => [
    {
      label: 'Nama Siswa',
      key: 'nama',
      render: (v: unknown, row: RekapHarianKelasRow) => {
        const studentId = row.siswa_id || row.id;
        const displayName = String(v || row.nama_siswa || '—');
        return (
          <button
            onClick={() => navigate(`/attendance/tracking-siswa?siswa_id=${studentId}`)}
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 text-left transition-all"
            title="Klik untuk Melacak Detail Aktivitas Presensi Siswa"
          >
            {displayName}
          </button>
        );
      }
    },
    {
      label: 'NIS',
      key: 'nis',
      render: (v: unknown) => (
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {v ? String(v) : <span className="text-slate-300 dark:text-slate-600">—</span>}
        </span>
      )
    },
    {
      label: 'Status Kehadiran',
      key: 'status',
      render: (v: unknown) => {
        const statusStr = String(v || 'ALPA').toUpperCase();
        switch (statusStr) {
          case 'HADIR':
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hadir
              </span>
            );
          case 'TERLAMBAT':
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                <Clock className="w-3 h-3 text-purple-500" />
                Terlambat
              </span>
            );
          case 'SAKIT':
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Sakit
              </span>
            );
          case 'IZIN':
          case 'DISPEN':
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <FileText className="w-3 h-3 text-blue-500" />
                {statusStr === 'DISPEN' ? 'Dispensasi' : 'Izin'}
              </span>
            );
          default:
            return (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Alpa
              </span>
            );
        }
      }
    },
    {
      label: 'Poin',
      key: 'poin',
      render: (v: unknown) => (
        <span className="font-bold text-xs text-slate-700 dark:text-slate-300 font-mono">
          {Number(v) || 0}
        </span>
      )
    }
  ], [navigate]);

  // Paginated rows
  const pagedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRows.slice(start, start + limit);
  }, [filteredRows, page, limit]);

  const selectedKelasObj = useMemo(
    () => kelasOptions.find(k => k.value === kelasId),
    [kelasOptions, kelasId]
  );

  // Handle Export Excel
  const handleExportExcel = useCallback(() => {
    if (!rows || rows.length === 0) {
      toast.error('Tidak ada data rekap harian untuk diexport');
      return;
    }
    const namaKelas = selectedKelasObj?.label || 'Kelas';
    exportDataToExcel({
      filename: `Rekap_Harian_Presensi_${namaKelas.replace(/[^a-zA-Z0-9]/g, '_')}_${tanggal}`,
      title: `REKAPITULASI PRESENSI HARIAN KELAS ${namaKelas.toUpperCase()}`,
      subtitle: `Tanggal: ${tanggal}`,
      columns: [
        { header: 'No', accessor: (_r: unknown, index: number) => index + 1 },
        { header: 'Nama Siswa', accessor: 'nama' },
        { header: 'NIS', accessor: (r: unknown) => (r as RekapHarianKelasRow).nis || '-' },
        { header: 'Status Kehadiran', accessor: 'status' },
        { header: 'Poin Kehadiran', accessor: 'poin' }
      ],
      data: rows
    });
    toast.success('File Excel rekap harian berhasil diunduh');
  }, [rows, selectedKelasObj, tanggal]);

  // Handle Export PDF
  const handleExportPdf = useCallback(async () => {
    if (!rows || rows.length === 0) {
      toast.error('Tidak ada data rekap harian untuk dicetak');
      return;
    }

    try {
      toast.loading('Membangun pratinjau PDF rekap harian...', { id: 'pdf-toast' });
      
      const blob = await generateGenericPdf({
        module: 'attendance',
        printType: 'monthly_recap', // Reuse standardized layout
        selectedClassId: kelasId,
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo: true,
        eventDetails: { bulanRekap: tanggal.substring(0, 7) },
        filterData: {
          classes: (kelasOptions ?? []).map(k => ({ id: k.value, nama_kelas: k.label })),
          rekapList: (rows ?? []).map(r => ({
            id: r.siswa_id || r.id,
            nama_siswa: r.nama || r.nama_siswa || '',
            nis: r.nis,
            hadir: r.status === 'HADIR' ? 1 : 0,
            izin: (r.status === 'IZIN' || r.status === 'DISPEN') ? 1 : 0,
            sakit: r.status === 'SAKIT' ? 1 : 0,
            alpa: r.status === 'ALPA' ? 1 : 0,
            terlambat: r.status === 'TERLAMBAT' ? 1 : 0,
            persentase: r.status === 'HADIR' || r.status === 'TERLAMBAT' ? 100 : 0
          }))
        }
      });

      const namaKelas = selectedKelasObj?.label || 'Kelas';
      const filename = `Laporan_Harian_Presensi_${namaKelas.replace(/[^a-zA-Z0-9]/g, '_')}_${tanggal}.pdf`;
      const url = URL.createObjectURL(blob);
      
      setPdfFilename(filename);
      setPdfPreviewUrl(url);

      toast.success('Preview PDF rekap harian siap ditampilkan', { id: 'pdf-toast' });
    } catch (err: unknown) {
      console.error('PDF Export Error:', err);
      toast.error('Gagal membuat preview PDF rekap harian', { id: 'pdf-toast' });
    }
  }, [rows, kelasId, sekolah, tenantInfo, strukturList, logoDaerahBase64, logoSekolahBase64, kelasOptions, selectedKelasObj, tanggal]);

  return (
    <div className="space-y-6">
      {/* ─── Filter & Toolbar Card ────────────────────────────────────── */}
      <SectionCard title="Hasil Rekapitulasi Presensi Harian Kelas" titleIcon={<Users className="w-5 h-5 text-blue-600" />}>
        {isWaliKelasAutoFiltered ? (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Mode Wali Kelas</span>
                  <Badge variant="emerald" className="text-[10px] font-black uppercase">Otomatis Diterapkan</Badge>
                </div>
                <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                  {selectedKelasObj?.label || 'Kelas Wali'}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Input 
                type="date" 
                value={tanggal} 
                onChange={e => setTanggal(e.target.value)} 
                className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold" 
              />
              <Button 
                onClick={handleExportExcel}
                variant="outline" 
                size="sm" 
                className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 border-slate-200 dark:border-slate-800"
              >
                <FileText className="w-3.5 h-3.5 mr-2" /> Export Excel
              </Button>
              <Button 
                onClick={handleExportPdf}
                variant="outline" 
                size="sm" 
                className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Printer className="w-3.5 h-3.5 mr-2" /> Cetak PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
            <div className="space-y-1.5">
              <label htmlFor="filter-harian-kelas-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Kelas</label>
              <Suspense fallback={<div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
                <SearchableSelect 
                  id="filter-harian-kelas-select"
                  aria-label="Pilih Kelas Laporan Harian"
                  value={kelasId} 
                  onValueChange={setKelasId} 
                  options={kelasOptions} 
                  placeholder="Pilih Kelas..." 
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold" 
                />
              </Suspense>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="filter-harian-tanggal-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tanggal Laporan</label>
              <Input 
                id="filter-harian-tanggal-input"
                aria-label="Pilih Tanggal Laporan"
                type="date" 
                value={tanggal} 
                onChange={e => setTanggal(e.target.value)} 
                className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold" 
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="filter-harian-tahun-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tahun Pelajaran</label>
              <Suspense fallback={<div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
                <SearchableSelect 
                  id="filter-harian-tahun-select"
                  aria-label="Pilih Tahun Pelajaran"
                  value={tahunPelajaranId} 
                  onValueChange={setTahunPelajaranId} 
                  options={tahunOptions} 
                  placeholder="Pilih Tahun..." 
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold" 
                />
              </Suspense>
            </div>

            <div>
              <Button 
                onClick={handleExportExcel}
                variant="outline" 
                size="sm" 
                className="h-10 w-full rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 border-slate-200 dark:border-slate-800"
              >
                <FileText className="w-3.5 h-3.5 mr-2" /> Export Excel
              </Button>
            </div>

            <div>
              <Button 
                onClick={handleExportPdf}
                variant="outline" 
                size="sm" 
                className="h-10 w-full rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Printer className="w-3.5 h-3.5 mr-2" /> Cetak PDF
              </Button>
            </div>
          </div>
        )}

        {/* ─── Stat Badges Summary Row ───────────────────────────────── */}
        {rows && rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Siswa</span>
              <p className="text-lg font-black text-slate-800 dark:text-slate-100">{statsSummary.total}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Hadir</span>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{statsSummary.hadir}</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Terlambat</span>
              <p className="text-lg font-black text-purple-700 dark:text-purple-400">{statsSummary.terlambat}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Sakit</span>
              <p className="text-lg font-black text-amber-700 dark:text-amber-400">{statsSummary.sakit}</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Izin / Dispen</span>
              <p className="text-lg font-black text-blue-700 dark:text-blue-400">{statsSummary.izin}</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Alpa</span>
              <p className="text-lg font-black text-rose-700 dark:text-rose-400">{statsSummary.alpa}</p>
            </div>
          </div>
        )}

        {/* Search Input Bar */}
        {rows && rows.length > 0 && (
          <div className="pt-2">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari nama siswa atau NIS..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        )}

        {/* ─── Table Section ────────────────────────────────────────── */}
        <Suspense fallback={
          <div className="p-8 text-center">
            <Loader size="md" />
            <p className="text-xs text-slate-400 mt-2 font-medium">Memuat komponen tabel...</p>
          </div>
        }>
          <Table 
            columns={columns} 
            data={pagedRows} 
            loading={loading} 
            emptyMessage={kelasId ? "Tidak ada data presensi harian untuk tanggal ini." : "Silakan pilih kelas dan tanggal laporan."} 
            compact={true} 
            className="border-none" 
            pagination={{
              currentPage: page,
              totalPages: Math.ceil(filteredRows.length / limit) || 1,
              pageSize: limit,
              totalItems: filteredRows.length,
              onPageChange: (newPage: number) => setPage(newPage),
              onPageSizeChange: (newLimit: number) => {
                setLimit(newLimit);
                setPage(1);
              }
            }}
          />
        </Suspense>
      </SectionCard>

      {/* ─── Built-in PDF Preview Modal ────────────────────────────── */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Pratinjau Cetak PDF Harian</h3>
                  <p className="text-xs text-slate-400 font-mono">{pdfFilename}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = pdfPreviewUrl;
                    a.download = pdfFilename;
                    a.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl font-bold text-xs gap-2 border-slate-200 dark:border-slate-700"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Unduh File PDF
                </Button>
                <button
                  onClick={() => setPdfPreviewUrl(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2">
              <iframe
                src={pdfPreviewUrl}
                title="Pratinjau PDF Harian"
                className="w-full h-full rounded-2xl border-none shadow-inner"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RekapHarianKelasPage() {
  const { subscription } = useAuthStore();
  const subFeatures = (subscription as unknown as Record<string, unknown>)?.features || 
                      subscription?.Plan?.features_json || 
                      subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  return (
    <AcademicPageLayout
      title="Rekap Harian Per Kelas"
      description="Laporan detail status presensi seluruh siswa dalam satu kelas pada tanggal tertentu."
      breadcrumbs={[
        { label: 'Presensi', path: '/attendance' },
        { label: 'Rekap', path: '/attendance/rekap' },
        { label: 'Harian Per Kelas', active: true }
      ]}
      hardeningModuleKey="rekap-harian-kelas"
    >
      <Suspense fallback={<div className="p-8 text-center"><Loader size="md" /></div>}>
        <PremiumFeatureGate
          isLocked={isLocked}
          moduleName="ABSENSI"
          featureName="Rekap Harian Kelas"
          description="Akses laporan detail presensi harian per kelas."
        >
          <RekapHarianKelasContent />
        </PremiumFeatureGate>
      </Suspense>
    </AcademicPageLayout>
  );
}
