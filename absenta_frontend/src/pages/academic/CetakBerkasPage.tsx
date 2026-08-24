import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useCapabilities } from '../../hooks/useCapabilities';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { generateAcademicPdf } from '../../utils/print/pdfAcademic';
import { listGuruMapel } from '../../api/kurikulum/guru-mapel.api';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card } from '@/components/ui/Card';
import { Loader } from '@/components/ui/Loader';
import { formatDate } from '../../utils/layoutUtils';
import type { GuruMapel, Kelas, Guru, Siswa } from '../../types/academic';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import type { PrepChecklistData } from '../../api/academic/cetak-berkas.api';

// Lazy load heavy form component (Pillar 11)
const CetakFormAcademic = lazy(() => import('../../components/academic/CetakFormAcademic').then(m => ({ default: m.CetakFormAcademic })));

// Stamp Registry Key (Pillar 1)
const hardeningModuleKey = 'cetakberkaspage';

interface AcademicFormWrapperProps {
  selectedPrintType: string;
  setSelectedPrintType: (type: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  includeSchoolLogo: boolean;
  setIncludeSchoolLogo: (val: boolean) => void;
  classes: Kelas[];
  loadingClasses: boolean;
  uniqueTingkatList: number[];
  setUniqueTingkatList: React.Dispatch<React.SetStateAction<number[]>>;
  setGuruMapelList: React.Dispatch<React.SetStateAction<GuruMapel[]>>;
}

const AcademicFormWrapper: React.FC<AcademicFormWrapperProps> = ({
  selectedPrintType,
  setSelectedPrintType,
  selectedClassId,
  setSelectedClassId,
  includeSchoolLogo,
  setIncludeSchoolLogo,
  classes,
  loadingClasses,
  uniqueTingkatList,
  setUniqueTingkatList,
  setGuruMapelList
}) => {
  // Compute unique tingkat list dynamically with safe mapping
  useEffect(() => {
    const list = (classes || [])?.map(c => Number(c.tingkat)).filter(t => !isNaN(t) && t > 0);
    setUniqueTingkatList(Array.from(new Set(list)).sort((a, b) => a - b));
  }, [classes, setUniqueTingkatList]);

  // Load guru mapel list if sk_load selected
  useEffect(() => {
    if (selectedPrintType === 'sk_load') {
      listGuruMapel().then(res => {
        if (res.success && res.data) setGuruMapelList(res.data);
      }).catch(console.error);
    }
  }, [selectedPrintType, setGuruMapelList]);

  return (
    <Suspense fallback={<div className="flex justify-center p-6"><Loader size="sm" /></div>}>
      <CetakFormAcademic
        selectedPrintType={selectedPrintType as 'attendance' | 'journal' | 'roster' | 'sk_load'}
        setSelectedPrintType={setSelectedPrintType as (val: 'attendance' | 'journal' | 'roster' | 'sk_load') => void}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        selectedMonth={new Date().getMonth() + 1}
        setSelectedMonth={() => {}}
        selectedYear={new Date().getFullYear()}
        setSelectedYear={() => {}}
        includeSchoolLogo={includeSchoolLogo}
        setIncludeSchoolLogo={setIncludeSchoolLogo}
        classes={classes}
        loadingClasses={loadingClasses}
        uniqueTingkatList={uniqueTingkatList}
      />
    </Suspense>
  );
};

export const CetakBerkasPage: React.FC = React.memo(() => {
  const { isKurikulum, isTuHead, isTuStaff, isAdmin, can } = useCapabilities();
  const [uniqueTingkatList, setUniqueTingkatList] = useState<number[]>([]);
  const [guruMapelList, setGuruMapelList] = useState<GuruMapel[]>([]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik', path: '/academic' },
    { label: 'Cetak Berkas' }
  ], []);

  const instruction = useMemo(() => ({
    title: "Panduan Cetak Berkas Akademik",
    description: (
      <div className="space-y-2">
        <p>Halaman ini mengotomasi pembuatan dokumen fisik yang biasanya disiapkan secara manual oleh Tata Usaha menggunakan Excel sebelum tahun ajaran baru dimulai.</p>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
          <p><strong>Fungsi:</strong> Mencetak berkas administrasi kelas — absensi, jurnal KBM, daftar kelas, dan SK Beban Mengajar — langsung dari data sistem.</p>
          <p><strong>Waktu Penggunaan:</strong> Setiap awal tahun ajaran atau semester baru, setelah data kelas dan siswa sudah lengkap.</p>
        </div>
      </div>
    ),
    items: [
      { text: "Gunakan tab 'Checklist Sistem' untuk memverifikasi bahwa seluruh data kelas, guru, dan siswa sudah siap sebelum mencetak." },
      { text: "Pilih jenis berkas yang ingin dicetak: Daftar Hadir, Jurnal KBM, Daftar Kelas & Nilai, atau SK Beban Mengajar." },
      { text: "Aktifkan opsi 'Background Graphics' di pengaturan printer agar tampilan tabel dan header tercetak dengan sempurna." }
    ]
  }), []);

  const renderDocForm = useCallback((props: {
    selectedPrintType: string;
    setSelectedPrintType: (val: string) => void;
    selectedClassId: string;
    setSelectedClassId: (val: string) => void;
    includeSchoolLogo: boolean;
    setIncludeSchoolLogo: (val: boolean) => void;
    classes: Kelas[];
    loadingClasses: boolean;
  }) => (
    <AcademicFormWrapper
      {...props}
      uniqueTingkatList={uniqueTingkatList}
      setUniqueTingkatList={setUniqueTingkatList}
      setGuruMapelList={setGuruMapelList}
    />
  ), [uniqueTingkatList]);

  const handleGeneratePdf = useCallback(async ({
    selectedPrintType,
    selectedClassId,
    classes,
    sekolah,
    tenantInfo,
    strukturList,
    logoDaerahBase64,
    logoSekolahBase64,
    includeSchoolLogo,
    checklistData
  }: {
    selectedPrintType: string;
    selectedClassId: string;
    classes: Kelas[];
    sekolah: Sekolah | null;
    tenantInfo: Tenant | null;
    strukturList: StrukturOrganisasi[];
    logoDaerahBase64: string | null;
    logoSekolahBase64: string | null;
    includeSchoolLogo: boolean;
    checklistData: PrepChecklistData | null;
  }) => {
    return generateAcademicPdf({
      selectedPrintType: selectedPrintType as 'attendance' | 'journal' | 'roster' | 'sk_load',
      selectedClassId,
      classes,
      sekolah,
      tenantInfo,
      strukturList,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo,
      checklistData,
      guruMapelList
    });
  }, [guruMapelList]);

  return (
    <InfraErrorBoundary>
      <Card className="border-none shadow-none bg-transparent">
        <CetakBerkasTemplate
          module="academic"
          title="Cetak Berkas"
          description="Buat dan cetak dokumen administrasi kelas secara otomatis — menggantikan proses manual yang sebelumnya dikerjakan menggunakan Excel oleh Tata Usaha."
          breadcrumbs={breadcrumbs}
          instruction={instruction}
          showChecklist={true}
          defaultPrintType="attendance"
          docFormRenderer={renderDocForm}
          pdfGenerator={handleGeneratePdf}
          hardeningModuleKey={hardeningModuleKey}
        />
      </Card>
    </InfraErrorBoundary>
  );
});

export default CetakBerkasPage;
