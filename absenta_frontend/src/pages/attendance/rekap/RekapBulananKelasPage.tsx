import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { SectionCard, Loader, Alert, AlertDescription } from '../../../components/ui';
import { dropdownApi, type DropdownOption } from '../../../api/dropdown.api';
import { getRekapBulananKelas } from '../../../api/attendanceGerbang.api';
import { guruApi } from '../../../api/academic.api';
import { sekolahApi, type Sekolah } from '../../../api/academic/sekolah.api';
import { getTenantById, type Tenant } from '../../../api/tenants.api';
import { getStrukturList, type StrukturOrganisasi } from '../../../api/academic/strukturOrganisasi.api';
import { getBase64ImageFromUrl } from '../../../utils/cooperative/coopDocUtils';
import { toLocalMonth } from '../../../utils/attendance/time';
import { exportDataToExcel } from '../../../utils/export.utils';
import { generateGenericPdf } from '../../../utils/print/pdfGeneric';
import { formatDate } from '../../../utils/layoutUtils';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { Users } from 'lucide-react';

import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../../components/academic/AcademicPageLayout';

// ─── Subkomponent yang diekstrak ──────────────────────────────────────────────
import { RekapBulananKelasToolbar } from '../../../components/attendance/rekap/RekapBulananKelasToolbar';
import { RekapBulananKelasPdfModal } from '../../../components/attendance/rekap/RekapBulananKelasPdfModal';
import { useRekapBulananKelasColumns } from '../../../components/attendance/rekap/rekapBulananKelasColumns';
import type { RekapBulananKelasRow, ViewMode } from '../../../components/attendance/rekap/types';

// Lazy loading heavy UI
const Table = lazy(() => import('../../../components/ui/Table').then(m => ({ default: m.Table })));

// ─── Skema Validasi Zod ────────────────────────────────────────────────────────
const filterSchema = z.object({
  kelasId: z.string().min(1),
  bulan: z.string().regex(/^\d{4}-\d{2}$/),
  tahunPelajaranId: z.string().optional(),
});

// ─── Tipe lokal ────────────────────────────────────────────────────────────────
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
  nama_guru?: string;
  nip?: string;
}
interface CustomUser {
  guru_profile?: CustomGuruProfile;
  kelas_id?: string;
  role?: string;
}
interface SubscriptionRecord {
  features?: string[];
  Plan?: { features_json?: string[] };
  plan?: { features_json?: string[] };
}

// ─── Static data (di luar komponen agar tidak re-render) ─────────────────────
const instructionData = {
  title: 'Panduan Rekap Bulanan',
  description: 'Laporan kehadiran akumulatif seluruh siswa kelas dalam satu bulan.',
  items: [
    { text: 'Pilih kelas dan bulan untuk melihat rekap bulanan kelas.' },
    { text: 'Gunakan sakelar Tampilan untuk beralih antara mode Total Akumulasi dan Detail Per Hari.' },
  ],
};
const breadcrumbs = [
  { label: 'Presensi', path: '/attendance' },
  { label: 'Rekap', path: '/attendance/rekap' },
  { label: 'Bulanan Kelas', active: true },
];

// ─── Content Component ────────────────────────────────────────────────────────
export function RekapBulananKelasContent({ initialKelasId }: { initialKelasId?: string }) {
  const { user, subscription } = useAuthStore();
  const { can } = useCapabilities();
  const navigate = useNavigate();

  const customUser = (user as unknown as CustomUser) ?? null;
  const waliKelasId =
    customUser?.guru_profile?.wali_kelas_di?.id ||
    customUser?.guru_profile?.WaliKelas?.[0]?.kelas_id ||
    customUser?.guru_profile?.WaliKelas?.[0]?.kelas?.id ||
    customUser?.kelas_id;

  const [tahunOptions, setTahunOptions] = useState<DropdownOption[]>([]);
  const [tahunPelajaranId, setTahunPelajaranId] = useState('');
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [kelasId, setKelasId] = useState(initialKelasId || waliKelasId || '');
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('MATRIX');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('Laporan_Rekap_Presensi.pdf');
  const [isWaliKelasAutoFiltered, setIsWaliKelasAutoFiltered] = useState(false);
  const [waliKelasName, setWaliKelasName] = useState<string>('');
  const [waliKelasNip, setWaliKelasNip] = useState<string>('');

  const [logoDaerahBase64, setLogoDaerahBase64] = useState<string | null>(null);
  const [logoSekolahBase64, setLogoSekolahBase64] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const canView = useMemo(
    () => can('attendance.reports.view') && can('academic.structures.view.list'),
    [can]
  );

  const subRecord = subscription as unknown as SubscriptionRecord | null;
  const subFeatures = subRecord?.features ?? subRecord?.Plan?.features_json ?? subRecord?.plan?.features_json ?? [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  // Dropdowns Query
  const dropdownsQuery = useQuery({
    queryKey: ['rekap-bulanan-kelas-dropdowns'],
    queryFn: async () => {
      const [tahun, active, kelas] = await Promise.all([
        dropdownApi.getTahunPelajaranForDropdown(),
        dropdownApi.getActiveTahunPelajaran(),
        dropdownApi.getKelasForDropdown(),
      ]);
      return { tahun: tahun ?? [], activeId: active?.id ?? '', kelas: kelas ?? [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (dropdownsQuery.data) {
      setTahunOptions(dropdownsQuery.data.tahun);
      if (dropdownsQuery.data.activeId && !tahunPelajaranId) setTahunPelajaranId(dropdownsQuery.data.activeId);
      setKelasOptions(dropdownsQuery.data.kelas);
      if (!kelasId && dropdownsQuery.data.kelas.length > 0) {
        setKelasId(dropdownsQuery.data.kelas[0].value);
      }
    }
  }, [dropdownsQuery.data, tahunPelajaranId, kelasId]);

  // Kop Surat & Sekolah Query
  const kopQuery = useQuery({
    queryKey: ['rekap-bulanan-kelas-kop', (user as { tenant_id?: string })?.tenant_id],
    queryFn: async () => {
      const sek = await sekolahApi.getProfile().catch(() => null);
      let tenantData = null;
      const tenantId = (user as { tenant_id?: string })?.tenant_id;
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

  // Main Rekap Query
  const rekapQuery = useQuery({
    queryKey: ['rekap-bulanan-kelas-data', kelasId, bulan, tahunPelajaranId],
    queryFn: async () => {
      const res = await getRekapBulananKelas(kelasId, { bulan, tahun_pelajaran_id: tahunPelajaranId || undefined });
      return {
        rows: Array.isArray(res?.data) ? (res.data as RekapBulananKelasRow[]) : [],
        waliKelasName: res?.wali_kelas?.nama_guru || '',
        waliKelasNip: res?.wali_kelas?.nip || ''
      };
    },
    enabled: !!kelasId && !!bulan && !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const rows = rekapQuery.data?.rows || null;
  const loading = rekapQuery.isLoading;

  useEffect(() => {
    if (rekapQuery.data) {
      if (rekapQuery.data.waliKelasName) {
        setWaliKelasName(rekapQuery.data.waliKelasName);
        setWaliKelasNip(rekapQuery.data.waliKelasNip);
      }
    }
  }, [rekapQuery.data]);

  const fetchData = useCallback(async () => {
    await rekapQuery.refetch();
  }, [rekapQuery]);

  // ─── Derived: hari dalam bulan ───────────────────────────────────────────────
  const daysInMonth = useMemo(() => {
    if (!bulan || !/^\d{4}-\d{2}$/.test(bulan)) return 31;
    const [y, m] = bulan.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  }, [bulan]);

  const dayNumbers = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // ─── Columns (via extracted hook) ────────────────────────────────────────────
  const columns = useRekapBulananKelasColumns(viewMode, dayNumbers);

  // ─── Pagination ──────────────────────────────────────────────────────────────
  const pagedRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list.slice((page - 1) * limit, page * limit);
  }, [rows, page, limit]);

  const selectedKelasLabel = useMemo(() => {
    return (kelasOptions ?? []).find(k => k.value === kelasId)?.label ?? '';
  }, [kelasOptions, kelasId]);

  // ─── Export Excel ────────────────────────────────────────────────────────────
  const handleExportExcel = useCallback(() => {
    if (!rows?.length) { toast.error('Tidak ada data untuk diekspor'); return; }
    try {
      const namaKelas = (kelasOptions ?? []).find(k => k.value === kelasId)?.label ?? 'Kelas';
      const title = `REKAPITULASI LEGER PRESENSI HARIAN KELAS ${namaKelas.toUpperCase()} - BULAN ${bulan}`;
      const filename = `Leger_Presensi_${namaKelas.replace(/[^a-zA-Z0-9]/g, '_')}_${bulan}`;
      const excelCols = [
        { header: 'No', accessor: (_: unknown, i?: number) => (i ?? 0) + 1, width: 6 },
        { header: 'Nama Siswa', accessor: (r: RekapBulananKelasRow) => r.nama_siswa, width: 28 },
        { header: 'NIS', accessor: (r: RekapBulananKelasRow) => r.nis ?? '-', width: 14 },
        ...(dayNumbers ?? []).map(d => ({
          header: `Tgl ${d}`,
          accessor: (r: RekapBulananKelasRow) => r.dailyMap?.[d.toString()] ?? '-',
          width: 6,
        })),
        { header: 'Hadir (H)', accessor: (r: RekapBulananKelasRow) => r.HADIR ?? 0, width: 10 },
        { header: 'Sakit (S)', accessor: (r: RekapBulananKelasRow) => r.SAKIT ?? 0, width: 10 },
        { header: 'Izin (I)', accessor: (r: RekapBulananKelasRow) => r.IZIN ?? 0, width: 10 },
        { header: 'Alpa (A)', accessor: (r: RekapBulananKelasRow) => r.ALPA ?? 0, width: 10 },
        { header: 'Terlambat (T)', accessor: (r: RekapBulananKelasRow) => r.TERLAMBAT ?? 0, width: 12 },
        { header: 'Total Poin', accessor: (r: RekapBulananKelasRow) => r.total_poin ?? 0, width: 12 },
      ];
      exportDataToExcel<RekapBulananKelasRow>(rows, excelCols, filename, title);
      toast.success(`Berhasil mengunduh ${filename}.xlsx`);
    } catch {
      toast.error('Gagal mengekspor ke Excel');
    }
  }, [rows, kelasOptions, kelasId, bulan, dayNumbers]);

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (!rows?.length) { toast.error('Tidak ada data untuk dicetak'); return; }
    try {
      toast.loading('Menyiapkan dokumen PDF...', { id: 'pdf-toast' });
      const isMatrix = viewMode === 'MATRIX';
      const namaKelas = (kelasOptions ?? []).find(k => k.value === kelasId)?.label ?? 'Kelas';
      const blob = await generateGenericPdf({
        module: 'attendance',
        printType: isMatrix ? 'monthly_matrix' : 'monthly_recap',
        selectedClassId: kelasId,
        sekolah, tenantInfo, strukturList, logoDaerahBase64, logoSekolahBase64,
        includeSchoolLogo: true,
        eventDetails: { bulanRekap: bulan },
        filterData: {
          viewMode,
          waliKelasName: waliKelasName || '________________________',
          waliKelasNip: waliKelasNip || '',
          classes: (kelasOptions ?? []).map(k => ({ id: k.value, nama_kelas: k.label })),
          rekapList: (rows ?? []).map(r => ({
            id: r.siswa_id,
            nama_siswa: r.nama_siswa,
            nis: r.nis,
            dailyMap: r.dailyMap ?? {},
            HADIR: r.HADIR ?? 0, SAKIT: r.SAKIT ?? 0, IZIN: r.IZIN ?? 0, ALPA: r.ALPA ?? 0, TERLAMBAT: r.TERLAMBAT ?? 0,
            hadir: r.HADIR ?? 0, izin: r.IZIN ?? 0, sakit: r.SAKIT ?? 0, alpa: r.ALPA ?? 0, terlambat: r.TERLAMBAT ?? 0,
            total_poin: r.total_poin ?? 0,
            persentase: (() => {
              const t = (r.HADIR ?? 0) + (r.IZIN ?? 0) + (r.SAKIT ?? 0) + (r.ALPA ?? 0) + (r.TERLAMBAT ?? 0);
              return t === 0 ? 0 : Math.round((((r.HADIR ?? 0) + (r.TERLAMBAT ?? 0)) / t) * 100);
            })(),
          })),
        },
      });
      const modeLabel = isMatrix ? 'Leger_Harian' : 'Rekap_Bulanan';
      const filename = `${modeLabel}_${namaKelas.replace(/[^a-zA-Z0-9]/g, '_')}_${bulan}.pdf`;
      setPdfFilename(filename);
      setPdfPreviewUrl(URL.createObjectURL(blob));
      toast.success(`Preview PDF ${isMatrix ? 'Landscape' : 'Portrait'} siap`, { id: 'pdf-toast' });
    } catch {
      toast.error('Gagal membuat preview PDF', { id: 'pdf-toast' });
    }
  }, [rows, kelasOptions, kelasId, bulan, viewMode, sekolah, tenantInfo, strukturList, logoDaerahBase64, logoSekolahBase64, waliKelasName, waliKelasNip]);

  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <SectionCard title="Hasil Rekapitulasi Kolektif" icon={Users} fullWidth noPadding>
      {/* TOOLBAR */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
        <RekapBulananKelasToolbar
          kelasId={kelasId}
          bulan={bulan}
          tahunPelajaranId={tahunPelajaranId}
          viewMode={viewMode}
          kelasOptions={kelasOptions ?? []}
          tahunOptions={tahunOptions ?? []}
          selectedKelasLabel={selectedKelasLabel}
          isWaliKelasAutoFiltered={isWaliKelasAutoFiltered}
          setKelasId={setKelasId}
          setBulan={setBulan}
          setTahunPelajaranId={setTahunPelajaranId}
          setViewMode={setViewMode}
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
        />
      </div>

      {/* TABEL */}
      <div className="bg-white dark:bg-slate-900 overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 p-2">
        <Suspense fallback={<div className="p-8 text-center"><Loader size="lg" /></div>}>
          <Table
            columns={columns}
            data={pagedRows}
            loading={loading}
            emptyMessage={kelasId ? 'Tidak ada catatan presensi bulan ini.' : 'Silakan pilih kelas dan bulan laporan.'}
            compact
            className="border-none"
            pagination={{
              currentPage: page,
              totalPages: Math.ceil(safeRows.length / limit),
              totalItems: safeRows.length,
              itemsPerPage: limit,
              onPageChange: setPage,
              onLimitChange: (l) => { setLimit(l); setPage(1); },
            }}
          />
        </Suspense>
      </div>

      {/* PDF PREVIEW MODAL */}
      {pdfPreviewUrl && (
        <RekapBulananKelasPdfModal
          pdfPreviewUrl={pdfPreviewUrl}
          pdfFilename={pdfFilename}
          onClose={() => setPdfPreviewUrl(null)}
        />
      )}
    </SectionCard>
  );
}

// ─── Page wrapper (standalone route) ─────────────────────────────────────────
export default React.memo(function RekapBulananKelasPage() {
  const [searchParams] = useSearchParams();
  const kelasIdParam = searchParams.get('kelas_id') || undefined;
  const memoBreadcrumbs = useMemo(() => breadcrumbs, []);

  return (
    <AcademicPageLayout
      hardeningModuleKey="rekapbulanankelaspage"
      title="Rekap Bulanan Kelas"
      description="Laporan rekapitulasi kehadiran bulanan siswa per kelas."
      instruction={instructionData}
      breadcrumbs={memoBreadcrumbs}
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
        <PremiumFeatureGate
          moduleName="ABSENSI"
          featureName="Rekap Presensi Per Kelas"
          description="Analisis kehadiran seluruh siswa dalam satu kelas secara kolektif dengan tampilan pivot yang mendetail."
        >
          <RekapBulananKelasContent initialKelasId={kelasIdParam} />
        </PremiumFeatureGate>
      </Suspense>
    </AcademicPageLayout>
  );
});
