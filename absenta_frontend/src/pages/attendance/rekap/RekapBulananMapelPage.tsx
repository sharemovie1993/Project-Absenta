import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { SectionCard, Loader, Alert, AlertDescription } from '../../../components/ui';
import { dropdownApi, type DropdownOption } from '../../../api/dropdown.api';
import { getRekapBulananMapel } from '../../../api/attendanceGerbang.api';
import { sekolahApi, type Sekolah } from '../../../api/academic/sekolah.api';
import { getTenantById, type Tenant } from '../../../api/tenants.api';
import { getStrukturList, type StrukturOrganisasi } from '../../../api/academic/strukturOrganisasi.api';
import { getBase64ImageFromUrl } from '../../../utils/cooperative/coopDocUtils';
import { toLocalMonth } from '../../../utils/attendance/time';
import { exportDataToExcel } from '../../../utils/export.utils';
import { generateGenericPdf } from '../../../utils/print/pdfGeneric';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { BookOpen } from 'lucide-react';

import { useAuthStore } from '../../../store/authStore';
import PremiumFeatureGate from '../../../components/auth/PremiumFeatureGate';

// ─── Subkomponen ─────────────────────────────────────────────────────────────
import { RekapBulananMapelToolbar } from '../../../components/attendance/rekap/RekapBulananMapelToolbar';
import { RekapBulananKelasPdfModal } from '../../../components/attendance/rekap/RekapBulananKelasPdfModal';
import { useRekapBulananMapelColumns } from '../../../components/attendance/rekap/rekapBulananMapelColumns';
import type { RekapBulananKelasRow, ViewMode } from '../../../components/attendance/rekap/types';

// Lazy loading Table
const Table = lazy(() => import('../../../components/ui/Table').then(m => ({ default: m.Table })));

// ─── Skema Validasi Zod ────────────────────────────────────────────────────────
const filterMapelSchema = z.object({
  kelasId: z.string().min(1, 'Kelas wajib dipilih'),
  mapelId: z.string().min(1, 'Mata Pelajaran wajib dipilih'),
  bulan: z.string().regex(/^\d{4}-\d{2}$/, 'Format bulan tidak valid'),
  tahunPelajaranId: z.string().optional(),
});

interface SubscriptionRecord {
  features?: string[];
  Plan?: { features_json?: string[] };
  plan?: { features_json?: string[] };
}

export function RekapBulananMapelContent() {
  const { user, subscription } = useAuthStore();
  const { can } = useCapabilities();

  const [tahunOptions, setTahunOptions] = useState<DropdownOption[]>([]);
  const [tahunPelajaranId, setTahunPelajaranId] = useState('');
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [kelasId, setKelasId] = useState('');
  const [mapelOptions, setMapelOptions] = useState<DropdownOption[]>([]);
  const [mapelId, setMapelId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('MATRIX');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('Laporan_Rekap_Mapel.pdf');

  // Metadata hasil fetch API
  const [totalSesi, setTotalSesi] = useState<number>(0);
  const [guruMapelInfo, setGuruMapelInfo] = useState<{ nama_guru: string; nip?: string | null } | null>(null);
  const [waliKelasInfo, setWaliKelasInfo] = useState<{ nama_guru: string; nip?: string | null } | null>(null);
  const [mapelDetail, setMapelDetail] = useState<{ id: string; nama_mapel: string; kode_mapel?: string | null } | null>(null);

  // Kop Surat
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
    queryKey: ['rekap-bulanan-mapel-dropdowns'],
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
    if (dropdownsQuery.data) {
      setTahunOptions(dropdownsQuery.data.tahun);
      if (dropdownsQuery.data.activeId && !tahunPelajaranId) setTahunPelajaranId(dropdownsQuery.data.activeId);
      setKelasOptions(dropdownsQuery.data.kelas);
      if (!kelasId && dropdownsQuery.data.kelas.length > 0) setKelasId(dropdownsQuery.data.kelas[0].value);
      setMapelOptions(dropdownsQuery.data.mapel);
      if (!mapelId && dropdownsQuery.data.mapel.length > 0) setMapelId(dropdownsQuery.data.mapel[0].value);
    }
  }, [dropdownsQuery.data, tahunPelajaranId, kelasId, mapelId]);

  // Kop Query
  const kopQuery = useQuery({
    queryKey: ['rekap-bulanan-mapel-kop', (user as any)?.tenant_id],
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

  // Main Mapel Rekap Query
  const rekapQuery = useQuery({
    queryKey: ['rekap-bulanan-mapel-data', kelasId, mapelId, bulan, tahunPelajaranId],
    queryFn: async () => {
      const res = await getRekapBulananMapel({
        kelas_id: kelasId,
        mapel_id: mapelId,
        bulan,
        tahun_pelajaran_id: tahunPelajaranId || undefined,
      });
      return {
        rows: Array.isArray(res?.data) ? (res.data as RekapBulananKelasRow[]) : [],
        totalSesi: res?.total_sesi ?? 0,
        guruMapelInfo: res?.guru_mapel || null,
        waliKelasInfo: res?.wali_kelas || null,
        mapelDetail: res?.mapel || null
      };
    },
    enabled: !!kelasId && !!mapelId && !!bulan && !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (rekapQuery.data) {
      setRows(rekapQuery.data.rows);
      setTotalSesi(rekapQuery.data.totalSesi);
      setGuruMapelInfo(rekapQuery.data.guruMapelInfo);
      setWaliKelasInfo(rekapQuery.data.waliKelasInfo);
      setMapelDetail(rekapQuery.data.mapelDetail);
      setPage(1);
    }
  }, [rekapQuery.data]);

  const fetchData = useCallback(async () => {
    await rekapQuery.refetch();
  }, [rekapQuery]);

  useEffect(() => {
    const url = tenantInfo?.logo_daerah_url ?? (sekolah as unknown as Record<string, unknown>)?.logo_daerah_url as string | undefined;
    if (url) getBase64ImageFromUrl(url).then(setLogoDaerahBase64).catch(() => setLogoDaerahBase64(null));
    else setLogoDaerahBase64(null);
  }, [tenantInfo?.logo_daerah_url, sekolah]);

  useEffect(() => {
    const url = tenantInfo?.logo_url ?? sekolah?.logo_url;
    if (url) getBase64ImageFromUrl(url).then(setLogoSekolahBase64).catch(() => setLogoSekolahBase64(null));
    else setLogoSekolahBase64(null);
  }, [tenantInfo?.logo_url, sekolah?.logo_url]);

  useEffect(() => {
    if (kelasId && mapelId && bulan) fetchData();
  }, [kelasId, mapelId, bulan, tahunPelajaranId, fetchData]);

  // ─── Derived calculations ───────────────────────────────────────────────────
  const daysInMonth = useMemo(() => {
    if (!bulan || !/^\d{4}-\d{2}$/.test(bulan)) return 31;
    const [y, m] = bulan.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  }, [bulan]);

  const dayNumbers = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const columns = useRekapBulananMapelColumns(viewMode, dayNumbers);

  const pagedRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list.slice((page - 1) * limit, page * limit);
  }, [rows, page, limit]);

  const selectedKelasLabel = useMemo(() => {
    return (kelasOptions ?? []).find(k => k.value === kelasId)?.label ?? '';
  }, [kelasOptions, kelasId]);

  const selectedMapelLabel = useMemo(() => {
    return mapelDetail?.nama_mapel || (mapelOptions ?? []).find(m => m.value === mapelId)?.label || '';
  }, [mapelDetail, mapelOptions, mapelId]);

  // ─── Export Excel ────────────────────────────────────────────────────────────
  const handleExportExcel = useCallback(() => {
    if (!rows?.length) { toast.error('Tidak ada data untuk diekspor'); return; }
    try {
      const namaKelas = selectedKelasLabel || 'Kelas';
      const namaMapel = selectedMapelLabel || 'Mapel';
      const title = `REKAPITULASI PRESENSI MAPEL ${namaMapel.toUpperCase()} - KELAS ${namaKelas.toUpperCase()} (${bulan})`;
      const filename = `Rekap_Mapel_${namaMapel.replace(/[^a-zA-Z0-9]/g, '_')}_${namaKelas.replace(/[^a-zA-Z0-9]/g, '_')}_${bulan}`;
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
  }, [rows, selectedKelasLabel, selectedMapelLabel, bulan, dayNumbers]);

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (!rows?.length) { toast.error('Tidak ada data untuk dicetak'); return; }
    try {
      toast.loading('Menyiapkan dokumen PDF Rekap Mapel...', { id: 'pdf-toast' });
      const isMatrix = viewMode === 'MATRIX';
      const namaKelas = selectedKelasLabel || 'Kelas';
      const namaMapel = selectedMapelLabel || 'Mapel';
      
      const blob = await generateGenericPdf({
        module: 'attendance',
        printType: isMatrix ? 'monthly_matrix' : 'monthly_recap',
        selectedClassId: kelasId,
        sekolah, tenantInfo, strukturList, logoDaerahBase64, logoSekolahBase64,
        includeSchoolLogo: true,
        eventDetails: { bulanRekap: bulan, namaMapel },
        filterData: {
          viewMode,
          mapelName: namaMapel,
          guruMapelName: guruMapelInfo?.nama_guru || '________________________',
          guruMapelNip: guruMapelInfo?.nip || '',
          waliKelasName: waliKelasInfo?.nama_guru || '________________________',
          waliKelasNip: waliKelasInfo?.nip || '',
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
      const filename = `Rekap_Mapel_${namaMapel.replace(/[^a-zA-Z0-9]/g, '_')}_${namaKelas.replace(/[^a-zA-Z0-9]/g, '_')}_${bulan}.pdf`;
      setPdfFilename(filename);
      setPdfPreviewUrl(URL.createObjectURL(blob));
      toast.success(`Preview PDF ${isMatrix ? 'Landscape' : 'Portrait'} siap`, { id: 'pdf-toast' });
    } catch {
      toast.error('Gagal membuat preview PDF', { id: 'pdf-toast' });
    }
  }, [rows, selectedKelasLabel, selectedMapelLabel, kelasId, bulan, viewMode, sekolah, tenantInfo, strukturList, logoDaerahBase64, logoSekolahBase64, guruMapelInfo, waliKelasInfo, kelasOptions]);

  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <SectionCard title="Hasil Rekapitulasi Presensi Per Mata Pelajaran" icon={BookOpen} fullWidth noPadding>
      {/* TOOLBAR */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
        <RekapBulananMapelToolbar
          kelasId={kelasId}
          mapelId={mapelId}
          bulan={bulan}
          tahunPelajaranId={tahunPelajaranId}
          viewMode={viewMode}
          kelasOptions={kelasOptions ?? []}
          mapelOptions={mapelOptions ?? []}
          tahunOptions={tahunOptions ?? []}
          selectedMapelLabel={selectedMapelLabel}
          selectedKelasLabel={selectedKelasLabel}
          totalSesi={totalSesi}
          setKelasId={setKelasId}
          setMapelId={setMapelId}
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
            emptyMessage={kelasId && mapelId ? 'Tidak ada catatan presensi mapel pada bulan ini.' : 'Silakan pilih kelas dan mata pelajaran.'}
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

export default React.memo(function RekapBulananMapelPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Rekap Presensi Per Mapel"
        description="Analisis kehadiran siswa khusus pada jam pelajaran mata pelajaran yang diampu."
      >
        <RekapBulananMapelContent />
      </PremiumFeatureGate>
    </Suspense>
  );
});
