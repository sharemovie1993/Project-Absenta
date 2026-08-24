import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { CetakBerkasTemplate } from '@/components/academic/CetakBerkasTemplate';
import { DocOption } from '@/components/academic/CetakFormGeneric';
import { generateGenericPdf } from '@/utils/print/pdfGeneric';
import { getRekapKelasBulanan, getRekapHarianGuru } from '@/api/attendance/rekap.api';
import { siswaApi } from '@/api/academic.api';
import { toLocalDate, toLocalMonth } from '@/utils/attendance/time';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { Card, Loader } from '@/components/ui';
import type { Kelas, Siswa } from '@/types/academic';
import type { Sekolah } from '@/api/academic/sekolah.api';
import type { Tenant } from '@/api/tenants.api';
import type { StrukturOrganisasi } from '@/api/academic/strukturOrganisasi.api';
import type { PrepChecklistData } from '@/api/academic/cetak-berkas.api';

// Lazy load heavy form component
const CetakFormGeneric = lazy(() => import('@/components/academic/CetakFormGeneric').then(m => ({ default: m.CetakFormGeneric })));

const hardeningModuleKey = 'cetakberkasabsensipage';

interface StudentStatAccumulator {
  id: string;
  nama: string;
  nis: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  total_poin: number;
}

export const CetakBerkasAbsensiPage: React.FC = React.memo(() => {
  const docOptions = useMemo<DocOption[]>(() => [
    { value: 'monthly_recap', label: '1. REKAP KEHADIRAN & ABSENSI BULANAN KELAS', requireClass: true },
    { value: 'semester_recap', label: '2. REKAP KEHADIRAN SEMESTER KELAS (LEGER ABSENSI)', requireClass: true },
    { value: 'blank_attendance', label: '3. BLANKO DAFTAR HADIR MANUAL KELAS', requireClass: true },
    { value: 'attendance_warning', label: '4. SURAT PERINGATAN KETIDAKHADIRAN SISWA (SP)', requireClass: true },
    { value: 'teacher_attendance', label: '5. LAPORAN KEHADIRAN & JAM MENGAJAR GURU', requireClass: false }
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Presensi', path: '/attendance' },
    { label: 'Cetak Berkas Absensi' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Cetak Berkas Absensi',
    description: (
      <div className="space-y-2">
        <p>Halaman ini mengotomasi pembuatan berkas rekapitulasi presensi bulanan siswa.</p>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
          <p><strong>Fungsi:</strong> Mencetak laporan bulanan kehadiran per kelas.</p>
          <p><strong>Waktu Penggunaan:</strong> Setiap akhir bulan atau akhir periode pelaporan nilai.</p>
        </div>
      </div>
    ),
    items: [
      { text: 'Pilih kelas sasaran yang ingin dicetak rekap absensinya.' },
      { text: 'Gunakan filter bulan untuk menarik data absensi yang sesuai.' },
      { text: 'Pratinjau PDF akan digenerasikan otomatis untuk mempermudah pemeriksaan awal.' }
    ]
  }), []);

  const renderDocForm = useCallback((props: {
    selectedPrintType: string;
    setSelectedPrintType: (val: string) => void;
    selectedClassId: string;
    setSelectedClassId: (val: string) => void;
    selectedStudentId: string;
    setSelectedStudentId: (val: string) => void;
    eventDetails: Record<string, string>;
    setEventDetails: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    includeSchoolLogo: boolean;
    setIncludeSchoolLogo: (val: boolean) => void;
    classes: Kelas[];
    loadingClasses: boolean;
    students: Siswa[];
    loadingStudents: boolean;
  }) => (
    <Suspense fallback={<div className="flex justify-center p-4"><Loader size="sm" /></div>}>
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
    selectedStudentId: string;
    eventDetails: Record<string, string>;
    classes: Kelas[];
    students: Siswa[];
    sekolah: Sekolah | null;
    tenantInfo: Tenant | null;
    strukturList: StrukturOrganisasi[];
    logoDaerahBase64: string | null;
    logoSekolahBase64: string | null;
    includeSchoolLogo: boolean;
    checklistData: PrepChecklistData | null;
  }) => {
    const {
      selectedPrintType,
      selectedClassId,
      selectedStudentId,
      eventDetails,
      classes,
      students,
      sekolah,
      tenantInfo,
      strukturList,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo,
      checklistData
    } = params;

    const targetClasses = selectedClassId === 'all'
      ? classes
      : selectedClassId.startsWith('all_tingkat_')
        ? (() => {
            const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
            return (classes ?? []).filter(c => Number(c.tingkat) === tingkatNum);
          })()
        : (classes ?? []).filter(c => c.id === selectedClassId);

    const classesToPrint = ['monthly_recap', 'semester_recap', 'blank_attendance', 'attendance_warning'].includes(selectedPrintType)
      ? targetClasses
      : [];

    const rekapMap: Record<string, unknown> = {};
    const studentsMap: Record<string, Siswa[]> = {};
    const selectedMonth = eventDetails?.bulanRekap || toLocalMonth();

    // Fetch student roster maps in parallel for blank lists, monthly recaps, warnings or semester recaps
    if (['blank_attendance', 'monthly_recap', 'attendance_warning', 'semester_recap'].includes(selectedPrintType)) {
      const studentPromises = (classesToPrint || [])?.map(async (c) => {
        if (!c) return;
        try {
          const res = await siswaApi.getAll({ kelas_id: c.id, limit: 150 });
          if (res.success && res.data) {
            studentsMap[c.id] = (res.data || []).sort((a, b) => {
              const nameA = (a.nama_siswa || '').toUpperCase();
              const nameB = (b.nama_siswa || '').toUpperCase();
              return nameA.localeCompare(nameB);
            });
          }
        } catch (e) {
          console.error(`Failed to fetch students for class ${c.nama_kelas}:`, e);
        }
      });
      await Promise.all(studentPromises);
    }

    // Fetch monthly recap data maps
    if (['monthly_recap', 'attendance_warning'].includes(selectedPrintType)) {
      const rekapPromises = (classesToPrint || [])?.map(async (c) => {
        if (!c) return;
        try {
          const res = await getRekapKelasBulanan(c.id, selectedMonth);
          if (res.success && res.data) {
            rekapMap[c.id] = res.data;
          }
        } catch (e) {
          console.error(`Failed to fetch monthly recap for ${c.nama_kelas}:`, e);
        }
      });
      await Promise.all(rekapPromises);
    } else if (selectedPrintType === 'semester_recap') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const isSemester1 = month >= 7;
      const targetMonths = isSemester1
        ? ['07', '08', '09', '10', '11', '12']?.map(m => `${year}-${m}`)
        : ['01', '02', '03', '04', '05', '06']?.map(m => `${year}-${m}`);

      for (const c of classesToPrint) {
        if (c) {
          try {
            const monthlyPromises = targetMonths?.map(m => getRekapKelasBulanan(c.id, m).catch(() => null));
            const results = await Promise.all(monthlyPromises);
            
            const studentStatsMap: Record<string, StudentStatAccumulator> = {};
            (results ?? []).forEach(res => {
              if (res && res.success && res.data) {
                const resData = res.data as Record<string, unknown>;
                const studentsArray = Array.isArray(res.data) 
                  ? res.data 
                  : ((resData.students as Array<Record<string, unknown>>) || []);
                  
                studentsArray?.forEach((s: Record<string, unknown>) => {
                  const studentId = String(s.id || s.siswa_id || s.nama_siswa || '');
                  if (studentId) {
                    if (!studentStatsMap[studentId]) {
                      studentStatsMap[studentId] = {
                        id: studentId,
                        nama: String(s.nama || s.nama_siswa || ''),
                        nis: String(s.nis || ''),
                        hadir: 0,
                        sakit: 0,
                        izin: 0,
                        alpa: 0,
                        total_poin: 0
                      };
                    }
                    studentStatsMap[studentId].hadir += Number(s.hadir ?? s.HADIR ?? 0);
                    studentStatsMap[studentId].sakit += Number(s.sakit ?? s.SAKIT ?? 0);
                    studentStatsMap[studentId].izin += Number(s.izin ?? s.IZIN ?? 0);
                    studentStatsMap[studentId].alpa += Number(s.alpa ?? s.ALPA ?? 0);
                    studentStatsMap[studentId].total_poin += Number(s.total_poin ?? 0);
                  }
                });
              }
            });
            
            rekapMap[c.id] = { students: Object.values(studentStatsMap) };
          } catch (e) {
            console.error(`Failed to compile semester recap for ${c.nama_kelas}:`, e);
          }
        }
      }
    }

    let teacherRekap: unknown[] | null = null;
    if (selectedPrintType === 'teacher_attendance') {
      try {
        const targetDate = eventDetails?.tanggalLaporan || toLocalDate();
        const res = await getRekapHarianGuru(targetDate);
        if (res && Array.isArray(res)) {
          teacherRekap = res;
        }
      } catch (e) {
        console.error('Failed to fetch daily teacher attendance:', e);
      }
    }

    return generateGenericPdf({
      module: 'attendance',
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
      filterData: {
        rekapMap,
        studentsMap,
        rekapList: teacherRekap,
        classes,
        students
      }
    });
  }, []);

  return (
    <PremiumFeatureGate feature="attendance_ops">
      <InfraErrorBoundary>
        <Card className="border-none shadow-none bg-transparent">
          <CetakBerkasTemplate
            module="attendance"
            title="Cetak Berkas Absensi"
            description="Buat dan cetak rekapitulasi kehadiran siswa secara otomatis — menggantikan rekap manual Excel."
            breadcrumbs={breadcrumbs}
            instruction={instruction}
            showChecklist={false}
            defaultPrintType="monthly_recap"
            docFormRenderer={renderDocForm}
            pdfGenerator={handleGeneratePdf}
            hardeningModuleKey={hardeningModuleKey}
          />
        </Card>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default CetakBerkasAbsensiPage;
