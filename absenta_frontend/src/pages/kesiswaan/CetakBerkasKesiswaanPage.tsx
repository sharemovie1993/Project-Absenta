import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { kesiswaanApi } from '../../api/kesiswaan.api';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';
import { Loader } from '../../components/ui/Loader';
import { Card } from '../../components/ui/Card';
import type { Kelas, Siswa } from '../../types/academic';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import type { PrepChecklistData } from '../../api/academic/cetak-berkas.api';

// Lazy load heavy form component (Pillar 11)
const CetakFormGeneric = lazy(() => import('../../components/academic/CetakFormGeneric').then(m => ({ default: m.CetakFormGeneric })));

// Stamp Registry Key
const hardeningModuleKey = 'cetak_berkas_kesiswaan';

export const CetakBerkasKesiswaanPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Move static doc options outside of component scope to avoid DOM churn (Pillar 3)
  const docOptions: DocOption[] = useMemo(() => [
    { value: 'letter_summons', label: '1. SURAT PANGGILAN ORANG TUA / WALI SISWA', requireClass: true },
    { value: 'recap_violations', label: '2. REKAPITULASI PELANGGARAN KELAS', requireClass: true },
    { value: 'recap_achievements', label: '3. REKAPITULASI PRESTASI SISWA KELAS', requireClass: true },
    { value: 'osis_sk', label: '4. SK KEPENGURUSAN OSIS (COMING SOON)', requireClass: false }
  ], []);

  const renderDocForm = useCallback((props: {
    selectedPrintType: string;
    setSelectedPrintType: (val: string) => void;
    selectedClassId: string;
    setSelectedClassId: (val: string) => void;
    selectedStudentId?: string;
    setSelectedStudentId?: (val: string) => void;
    eventDetails?: Record<string, string>;
    setEventDetails?: (val: Record<string, string>) => void;
    includeSchoolLogo: boolean;
    setIncludeSchoolLogo: (val: boolean) => void;
    classes: Kelas[];
    loadingClasses: boolean;
    students?: Siswa[];
    loadingStudents?: boolean;
  }) => (
    <Suspense fallback={<Loader />}>
      <CetakFormGeneric
        selectedPrintType={props.selectedPrintType}
        setSelectedPrintType={props.setSelectedPrintType}
        selectedClassId={props.selectedClassId}
        setSelectedClassId={props.setSelectedClassId}
        selectedStudentId={props.selectedStudentId}
        setSelectedStudentId={props.setSelectedStudentId}
        eventDetails={props.eventDetails}
        setEventDetails={props.setEventDetails}
        includeSchoolLogo={props.includeSchoolLogo}
        setIncludeSchoolLogo={props.setIncludeSchoolLogo}
        classes={props.classes}
        loadingClasses={props.loadingClasses}
        students={props.students}
        loadingStudents={props.loadingStudents}
        docOptions={docOptions}
      />
    </Suspense>
  ), [docOptions]);

  const handleGeneratePdf = useCallback(async (params: {
    selectedPrintType: string;
    selectedClassId: string;
    selectedStudentId?: string;
    eventDetails?: Record<string, string>;
    classes: Kelas[];
    students?: Siswa[];
    sekolah: Sekolah | null;
    tenantInfo: Tenant | null;
    strukturList: StrukturOrganisasi[];
    logoDaerahBase64: string | null;
    logoSekolahBase64: string | null;
    includeSchoolLogo: boolean;
    checklistData: PrepChecklistData | null;
  }) => {
    const {
      selectedPrintType, selectedClassId, selectedStudentId,
      eventDetails, classes, students, sekolah, tenantInfo,
      strukturList, logoDaerahBase64, logoSekolahBase64,
      includeSchoolLogo, checklistData
    } = params;

    const targetClasses = selectedClassId === 'all'
      ? classes
      : selectedClassId.startsWith('all_tingkat_')
        ? (() => {
            const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
            return classes.filter(c => Number(c.tingkat) === tingkatNum);
          })()
        : classes.filter(c => c.id === selectedClassId);

    const classesToPrint = ['recap_violations', 'recap_achievements', 'letter_summons'].includes(selectedPrintType)
      ? targetClasses
      : [null];

    const violationsMap: Record<string, unknown[]> = {};
    const achievementsMap: Record<string, unknown[]> = {};
    let selectedStudent: Siswa | null = null;

    try {
      if (selectedPrintType === 'letter_summons' && selectedStudentId) {
        selectedStudent = students?.find(s => s.id === selectedStudentId) ?? null;

        const res = await queryClient.fetchQuery({
          queryKey: ['pelanggaran-student', selectedStudentId],
          queryFn: () => kesiswaanApi.getPelanggaran({ siswa_id: selectedStudentId, limit: 100 }),
          staleTime: 10 * 60 * 1000
        }).catch(() => null);

        if (res?.success && res?.data) {
          const list = res.data.list || [];
          const kelasId = (selectedStudent as Siswa & { kelas_id?: string })?.kelas_id;
          if (kelasId) {
            violationsMap[kelasId] = list;
          }
        }
      } else if (selectedPrintType === 'recap_violations') {
        await Promise.all(
          classesToPrint.map(async (c) => {
            if (!c) return;
            const res = await queryClient.fetchQuery({
              queryKey: ['pelanggaran-kelas', c.id],
              queryFn: () => kesiswaanApi.getPelanggaran({ kelas_id: c.id, limit: 200 }),
              staleTime: 10 * 60 * 1000
            }).catch(() => null);

            if (res?.success && res?.data) {
              violationsMap[c.id] = res.data.list || [];
            }
          })
        );
      } else if (selectedPrintType === 'recap_achievements') {
        await Promise.all(
          classesToPrint.map(async (c) => {
            if (!c) return;
            const res = await queryClient.fetchQuery({
              queryKey: ['prestasi-kelas', c.id],
              queryFn: () => kesiswaanApi.getPrestasiSiswa({ kelas_id: c.id, limit: 200 }),
              staleTime: 10 * 60 * 1000
            }).catch(() => null);

            if (res?.success && res?.data) {
              achievementsMap[c.id] = res.data.list || [];
            }
          })
        );
      }
    } catch (e) {
      console.error('Failed to load kesiswaan printing data:', e);
    }

    return generateGenericPdf({
      module: 'kesiswaan',
      printType: selectedPrintType,
      selectedClassId,
      selectedStudentId,
      eventDetails,
      sekolah,
      tenantInfo,
      strukturList,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo,
      checklistData,
      filterData: { violationsMap, achievementsMap, selectedStudent, classes, students }
    });
  }, [queryClient]);

  return (
    <InfraErrorBoundary>
      <Card className="border-none shadow-none bg-transparent">
        <CetakBerkasTemplate
          module="kesiswaan"
          title="Cetak Berkas Kesiswaan"
          description="Buat dan cetak dokumen administrasi kesiswaan secara otomatis — menggantikan proses manual menggunakan Excel."
          breadcrumbs={[
            { label: 'Kesiswaan', path: '/kesiswaan/piket' },
            { label: 'Cetak Berkas' }
          ]}
          instruction={{
            title: "Panduan Cetak Berkas Kesiswaan",
            description: (
              <div className="space-y-2">
                <p>Halaman ini mengotomasi pencetakan surat pemanggilan orang tua dan rekapitulasi data kesiswaan.</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
                  <p><strong>Fungsi:</strong> Mencetak surat pemanggilan orang tua dan rekap pelanggaran/prestasi.</p>
                  <p><strong>Waktu Penggunaan:</strong> Kebutuhan insidental kesiswaan atau pelaporan berkala.</p>
                </div>
              </div>
            ),
            items: [
              { text: "Pilih jenis berkas kesiswaan yang ingin di-render." },
              { text: "Sesuaikan filter kelas siswa yang ditargetkan." },
              { text: "Pilih nama siswa jika mencetak Surat Panggilan Orang Tua." },
              { text: "Periksa kembali data pratinjau sebelum melakukan pencetakan fisik." }
            ]
          }}
          showChecklist={false}
          defaultPrintType="letter_summons"
          docFormRenderer={renderDocForm}
          pdfGenerator={handleGeneratePdf}
          hardeningModuleKey={hardeningModuleKey}
        />
      </Card>
    </InfraErrorBoundary>
  );
};
