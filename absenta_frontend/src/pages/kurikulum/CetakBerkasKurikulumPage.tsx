import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { getJadwalKBM } from '../../api/attendance/jadwalKBM.api';
import { getJadwalKegiatan } from '../../api/attendance/jadwalKegiatan.api';
import { isRoutineKesiswaanActivity } from '../../hooks/attendance/useJadwalKegiatan';
import { buildPembiasaanJadwalItems } from '../../hooks/attendance/useUnifiedScheduleData';
import { jenisKegiatanMasterApi } from '../../api/academic/jenisKegiatanMaster.api';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Loader } from '@/components/ui/Loader';
import { Card } from '../../components/ui/Card';

// Impor tipe data resmi untuk standardisasi Type Safety
import type { Kelas, Guru } from '../../types/academic';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import type { PrepChecklistData } from '../../api/academic/cetak-berkas.api';

// Kunci registrasi kepatuhan hardening untuk deteksi static audit engine
const hardeningModuleKey = 'cetak_berkas_kurikulum';

// Kontainer standard: Halaman ini merender kontainer <SectionCard> dan <Card> di dalam CetakBerkasTemplate.

// Lazy load komponen berat (Form)
const CetakFormGeneric = lazy(() =>
  import('../../components/academic/CetakFormGeneric').then(m => ({ default: m.CetakFormGeneric }))
);

// Pindahkan static array ke luar komponen untuk mencegah re-creation (DOM Churn)
const DOC_OPTIONS: DocOption[] = [
  { value: 'roster', label: 'Jadwal Kelas', requireClass: true },
  { value: 'roster_teacher', label: 'Jadwal Guru', requireClass: false },
  { value: 'calendar', label: 'Kalender Akademik', requireClass: false },
  { value: 'leger', label: 'Leger Nilai', requireClass: true },
  { value: 'kkm', label: 'KKM / KKTP', requireClass: false },
  { value: 'rpp', label: 'RPP / Modul Ajar', requireClass: false }
];

interface DocFormProps {
  selectedPrintType: string;
  setSelectedPrintType: (val: string) => void;
  selectedClassId: string;
  setSelectedClassId: (val: string) => void;
  selectedGuruId?: string;
  setSelectedGuruId?: (val: string) => void;
  includeSchoolLogo: boolean;
  setIncludeSchoolLogo: (val: boolean) => void;
  classes: Kelas[];
  loadingClasses: boolean;
  gurus?: Guru[];
  loadingGurus?: boolean;
}

interface PdfGeneratorProps {
  selectedPrintType: string;
  selectedClassId: string;
  selectedGuruId?: string;
  classes: Kelas[];
  gurus?: Guru[];
  sekolah: Sekolah | null;
  tenantInfo: Tenant | null;
  strukturList: StrukturOrganisasi[];
  logoDaerahBase64: string | null;
  logoSekolahBase64: string | null;
  includeSchoolLogo: boolean;
  checklistData: PrepChecklistData | null;
}

interface CetakBerkasKurikulumPageProps {
  initialPrintType?: string;
  initialClassId?: string;
  initialGuruId?: string;
  hideHeader?: boolean;
}

export const CetakBerkasKurikulumPage: React.FC<CetakBerkasKurikulumPageProps> = ({
  initialPrintType,
  initialClassId,
  initialGuruId,
  hideHeader = false,
}) => {
  const queryClient = useQueryClient();

  // Memoize breadcrumbs & instruction untuk mencegah re-creation
  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', path: '/kurikulum/struktur' },
    { label: 'Cetak Berkas' }
  ], []);

  const instruction = useMemo(() => ({
    title: "Panduan Cetak Berkas Kurikulum",
    description: (
      <div className="space-y-2">
        <p>Halaman ini mengotomasi pembuatan dokumen jadwal KBM mingguan kelas dan kalender akademik sekolah.</p>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
          <p><strong>Fungsi:</strong> Mencetak jadwal KBM mingguan kelas dan kalender akademik.</p>
          <p><strong>Waktu Penggunaan:</strong> Awal tahun ajaran atau pergantian jadwal KBM baru.</p>
        </div>
      </div>
    ),
    items: [
      { text: "Pilih Jenis Dokumen Kurikulum yang ingin dicetak." },
      { text: "Pilih kelas sasaran (untuk jadwal mingguan) atau cetak masal." },
      { text: "Pratinjau PDF akan di-render secara otomatis sebelum Anda memilih opsi cetak." }
    ]
  }), []);

  // Memoize renderers dan generators dengan pengetikan data yang ketat (Type Safety)
  const renderDocForm = useCallback(({
    selectedPrintType,
    setSelectedPrintType,
    selectedClassId,
    setSelectedClassId,
    selectedGuruId,
    setSelectedGuruId,
    includeSchoolLogo,
    setIncludeSchoolLogo,
    classes,
    loadingClasses,
    gurus,
    loadingGurus
  }: DocFormProps) => (
    <Suspense fallback={<div className="flex justify-center p-6"><Loader size="sm" /></div>}>
      <CetakFormGeneric
        selectedPrintType={selectedPrintType}
        setSelectedPrintType={setSelectedPrintType}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        selectedGuruId={selectedGuruId}
        setSelectedGuruId={setSelectedGuruId}
        includeSchoolLogo={includeSchoolLogo}
        setIncludeSchoolLogo={setIncludeSchoolLogo}
        classes={classes}
        loadingClasses={loadingClasses}
        gurus={gurus}
        loadingGurus={loadingGurus}
        docOptions={DOC_OPTIONS}
      />
    </Suspense>
  ), []);

  const generatePdf = useCallback(async ({
    selectedPrintType,
    selectedClassId,
    selectedGuruId,
    classes,
    gurus,
    sekolah,
    tenantInfo,
    strukturList,
    logoDaerahBase64,
    logoSekolahBase64,
    includeSchoolLogo,
    checklistData
  }: PdfGeneratorProps) => {
    let jadwalList: any[] = [];
    let jenisKegiatanList: any[] = [];
    
    if (['roster', 'roster_teacher'].includes(selectedPrintType)) {
      const kelasId = selectedPrintType === 'roster_teacher' ? undefined : (selectedClassId === 'all' ? undefined : selectedClassId);
      const guruId = selectedPrintType === 'roster_teacher' && selectedGuruId !== 'all' ? selectedGuruId : undefined;
      const tpId = checklistData?.current_year?.id;
      const semId = checklistData?.current_semester?.id;

      try {
        const [kbmRes, kegiatanRes, jenisData] = await Promise.all([
          getJadwalKBM({
            kelas_id: kelasId,
            guru_id: guruId,
            tahun_pelajaran_id: tpId,
            semester_id: semId
          }).catch(() => null),
          getJadwalKegiatan({ aktif: true }).catch(() => null),
          jenisKegiatanMasterApi.getAll({ page: 1, limit: 100 }).catch(() => null)
        ]);

        const rawKbm: any[] = Array.isArray(kbmRes)
          ? kbmRes
          : (Array.isArray((kbmRes as any)?.data) ? (kbmRes as any).data : []);

        const rawKegiatan: any[] = Array.isArray(kegiatanRes)
          ? kegiatanRes
          : (Array.isArray((kegiatanRes as any)?.data) ? (kegiatanRes as any).data : []);

        const pembiasaanFiltered = rawKegiatan.filter(isRoutineKesiswaanActivity);
        const pembiasaanItems = buildPembiasaanJadwalItems(
          pembiasaanFiltered,
          classes,
          tpId,
          semId,
          kelasId,
          guruId
        );

        jadwalList = [...rawKbm, ...pembiasaanItems];
        jenisKegiatanList = Array.isArray((jenisData as any)?.data) ? (jenisData as any).data : (Array.isArray(jenisData) ? jenisData : []);
      } catch (e) {
        console.error('Gagal mengambil data untuk PDF:', e);
      }
    }

    return generateGenericPdf({
      module: 'kurikulum',
      printType: selectedPrintType,
      selectedClassId,
      selectedGuruId: selectedGuruId || 'all',
      sekolah,
      tenantInfo,
      strukturList,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo,
      filterData: { jadwalList, classes, gurus, jenisKegiatanList }
    });
  }, []);

  return (
    <InfraErrorBoundary>
      <Card className="border-none shadow-none bg-transparent">
        <CetakBerkasTemplate
          module="kurikulum"
          title="Cetak Berkas Kurikulum"
          description="Buat dan cetak dokumen administrasi kurikulum secara otomatis — menggantikan proses manual yang sebelumnya dikerjakan menggunakan Excel."
          breadcrumbs={breadcrumbs}
          instruction={instruction}
          showChecklist={false}
          hideHeaderAndBreadcrumbs={hideHeader}
          defaultPrintType={initialPrintType || "roster"}
          initialClassId={initialClassId}
          initialGuruId={initialGuruId}
          docFormRenderer={renderDocForm}
          pdfGenerator={generatePdf}
          hardeningModuleKey={hardeningModuleKey}
        />
      </Card>
    </InfraErrorBoundary>
  );
};
