import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { hubinApi } from '../../api/hubin.api';
import { InfraErrorBoundary } from '../../components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import type { Kelas } from '../../types/academic';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import type { PrepChecklistData } from '../../api/academic/cetak-berkas.api';

// Lazy load heavy form component (Pillar 11)
const CetakFormGeneric = lazy(() => import('../../components/academic/CetakFormGeneric').then(m => ({ default: m.CetakFormGeneric })));

// Stamp Registry Key
const hardeningModuleKey = 'cetak_berkas_hubin';

interface PklPenempatanItem {
  Siswa?: {
    Kelas?: {
      nama_kelas?: string;
    };
  };
}

export const CetakBerkasHubinPage: React.FC = () => {
  const docOptions = useMemo<DocOption[]>(() => [
    { value: 'pkl_intro', label: '1. SURAT PENGANTAR PRAKTIK KERJA LAPANGAN (PKL)', requireClass: true }
  ], []);

  const breadcrumbs = useMemo(() => [
    { label: 'Hubin', path: '/hubin/dashboard' },
    { label: 'Cetak Berkas' }
  ], []);

  const instruction = useMemo(() => ({
    title: "Panduan Cetak Berkas Hubin",
    description: (
      <div className="space-y-2">
        <p>Halaman ini mengotomasi pembuatan surat permohonan tempat PKL dan pengantar siswa ke dunia industri.</p>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
          <p><strong>Fungsi:</strong> Mencetak berkas resmi pengantar PKL siswa ke DUDI mitra.</p>
          <p><strong>Waktu Penggunaan:</strong> Periode pra-PKL (persiapan keberangkatan siswa ke industri).</p>
        </div>
      </div>
    ),
    items: [
      { text: "Pilih jenis berkas hubungan industri yang ingin dicetak." },
      { text: "Tentukan kelas kelompok siswa pendaftar PKL." },
      { text: "Verifikasi surat secara virtual di pratinjau sebelum dicetak." }
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
    <Suspense fallback={<div className="flex justify-center p-4"><Loader size="sm" /></div>}>
      <CetakFormGeneric
        selectedPrintType={props.selectedPrintType}
        setSelectedPrintType={props.setSelectedPrintType}
        selectedClassId={props.selectedClassId}
        setSelectedClassId={props.setSelectedClassId}
        includeSchoolLogo={props.includeSchoolLogo}
        setIncludeSchoolLogo={props.setIncludeSchoolLogo}
        classes={props.classes}
        loadingClasses={props.loadingClasses}
        docOptions={docOptions}
      />
    </Suspense>
  ), [docOptions]);

  const handleGeneratePdf = useCallback(async (params: {
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
    const {
      selectedPrintType, selectedClassId, classes,
      sekolah, tenantInfo, strukturList,
      logoDaerahBase64, logoSekolahBase64, includeSchoolLogo
    } = params;

    const penempatanMap: Record<string, PklPenempatanItem[]> = {};

    if (selectedPrintType === 'pkl_intro' && selectedClassId) {
      try {
        const res = await hubinApi.getPenempatan({ limit: 500 });
        if (res.success && res.data) {
          const allPenempatan = (res.data as { list?: PklPenempatanItem[] }).list
            || (res.data as PklPenempatanItem[])
            || [];
          const targetClasses = selectedClassId === 'all'
            ? classes
            : selectedClassId.startsWith('all_tingkat_')
              ? (() => {
                  const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
                  return classes.filter(c => Number(c.tingkat) === tingkatNum);
                })()
              : classes.filter(c => c.id === selectedClassId);

          targetClasses.forEach(c => {
            penempatanMap[c.id] = allPenempatan.filter((p: PklPenempatanItem) =>
              p.Siswa?.Kelas?.nama_kelas === c.nama_kelas
            );
          });
        }
      } catch (e) {
        console.error('Failed to load PKL placements:', e);
      }
    }

    return generateGenericPdf({
      module: 'hubin',
      printType: selectedPrintType,
      selectedClassId,
      sekolah,
      tenantInfo,
      strukturList,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo,
      filterData: { penempatanMap, classes }
    });
  }, []);

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Cetak Berkas HUBIN"
      description="Buat dan cetak surat pengantar PKL, daftar siswa penempatan industri, laporan monitoring, dan sertifikat kompetensi."
    >
      <InfraErrorBoundary>
        <Card className="border-none shadow-none bg-transparent">
          <CetakBerkasTemplate
            module="hubin"
            title="Cetak Berkas Hubin"
            description="Buat dan cetak surat pengantar PKL, daftar siswa penempatan industri, laporan monitoring, dan sertifikat kompetensi."
            breadcrumbs={breadcrumbs}
            instruction={instruction}
            showChecklist={false}
            defaultPrintType="pkl_intro"
            docFormRenderer={renderDocForm}
            pdfGenerator={handleGeneratePdf}
            hardeningModuleKey={hardeningModuleKey}
          />
        </Card>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
};

export default CetakBerkasHubinPage;
