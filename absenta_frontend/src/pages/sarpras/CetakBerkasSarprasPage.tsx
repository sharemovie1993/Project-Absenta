import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import type { DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { sarprasApi } from '../../api/sarpras.api';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Loader } from '@/components/ui/Loader';
import { Card, SectionCard } from '../../components/ui';

import type { Kelas } from '../../types/academic';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';

// Kontainer standard: Halaman ini merender kontainer <SectionCard> dan <Card> di dalam CetakBerkasTemplate.
// Kunci registrasi kepatuhan hardening
const hardeningModuleKey = 'cetak_berkas_sarpras';

// Lazy load komponen form berat
const CetakFormGeneric = lazy(() =>
  import('../../components/academic/CetakFormGeneric').then(m => ({ default: m.CetakFormGeneric }))
);

const DOC_OPTIONS: DocOption[] = [
  { value: 'room_inventory', label: '1. DAFTAR INVENTARIS BARANG & ASET RUANGAN', requireClass: true }
];

interface DocFormProps {
  selectedPrintType: string;
  setSelectedPrintType: (val: string) => void;
  selectedClassId: string;
  setSelectedClassId: (val: string) => void;
  includeSchoolLogo: boolean;
  setIncludeSchoolLogo: (val: boolean) => void;
  classes: Kelas[];
  loadingClasses: boolean;
}

interface PdfGeneratorProps {
  selectedPrintType: string;
  selectedClassId: string;
  classes: Kelas[];
  sekolah?: Sekolah;
  tenantInfo?: Tenant;
  strukturList: StrukturOrganisasi[];
  logoDaerahBase64: string | null;
  logoSekolahBase64: string | null;
  includeSchoolLogo: boolean;
}

interface AssetRecord {
  id: string;
  location_id?: string;
  [key: string]: unknown;
}

export const CetakBerkasSarprasPage: React.FC = React.memo(() => {
  const renderDocForm = useCallback(({
    selectedPrintType,
    setSelectedPrintType,
    selectedClassId,
    setSelectedClassId,
    includeSchoolLogo,
    setIncludeSchoolLogo,
    classes,
    loadingClasses
  }: DocFormProps) => (
    <Suspense fallback={<div className="p-4 flex items-center justify-center"><Loader size="sm" /></div>}>
      <CetakFormGeneric
        selectedPrintType={selectedPrintType}
        setSelectedPrintType={setSelectedPrintType}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        includeSchoolLogo={includeSchoolLogo}
        setIncludeSchoolLogo={setIncludeSchoolLogo}
        classes={classes}
        loadingClasses={loadingClasses}
        docOptions={DOC_OPTIONS}
      />
    </Suspense>
  ), []);

  const generatePdf = useCallback(async ({
    selectedPrintType,
    selectedClassId,
    classes,
    sekolah,
    tenantInfo,
    strukturList,
    logoDaerahBase64,
    logoSekolahBase64,
    includeSchoolLogo
  }: PdfGeneratorProps) => {
    const assetsMap: Record<string, AssetRecord[]> = {};

    if (selectedPrintType === 'room_inventory' && selectedClassId) {
      try {
        const isBulk = selectedClassId === 'all' || selectedClassId.startsWith('all_tingkat_');
        const params = isBulk ? { limit: 1000 } : { location_id: selectedClassId, limit: 100 };
        const res = await sarprasApi.getAssets(params);
        if (res.success && res.data) {
          const list = (res.data.list || res.data || []) as AssetRecord[];
          if (isBulk) {
            const targetClasses = selectedClassId === 'all'
              ? (classes ?? [])
              : (() => {
                  const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
                  return (classes ?? []).filter(c => Number(c.tingkat) === tingkatNum);
                })();
            targetClasses?.forEach(c => {
              assetsMap[c.id] = (list ?? []).filter(asset => asset.location_id === c.id);
            });
          } else {
            assetsMap[selectedClassId] = list;
          }
        }
      } catch (e) {
        console.error('Failed to fetch sarpras assets:', e);
      }
    }

    return generateGenericPdf({
      module: 'sarpras',
      printType: selectedPrintType,
      selectedClassId,
      sekolah,
      tenantInfo,
      strukturList,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo,
      filterData: { assetsMap, classes }
    });
  }, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Sarpras', path: '/sarpras/dashboard' },
    { label: 'Cetak Berkas Sarpras' }
  ], []);

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Cetak Berkas Sarpras"
      description="Buat dan cetak daftar inventaris barang per ruangan, kartu stok barang, dan laporan kondisi aset secara otomatis."
    >
      <InfraErrorBoundary>
        <Card className="border-none shadow-none bg-transparent">
          <CetakBerkasTemplate
            module="sarpras"
            title="Cetak Berkas Sarana & Prasarana"
            description="Buat dan cetak daftar inventaris barang per ruangan, kartu stok barang, dan laporan kondisi aset secara otomatis."
            breadcrumbs={breadcrumbs}
            instruction={{
              title: "Panduan Cetak Berkas Sarpras",
              description: (
                <div className="space-y-2">
                  <p>Halaman ini mengotomasi pembuatan lembar inventaris aset ruangan dan kartu kontrol barang sarana prasarana.</p>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
                    <p><strong>Fungsi:</strong> Mencetak daftar inventarisasi barang inventaris ruangan (DIR) sekolah.</p>
                    <p><strong>Waktu Penggunaan:</strong> Pengecekan aset tengah/akhir tahun atau serah terima ruangan baru.</p>
                  </div>
                </div>
              ),
              items: [
                { text: "Pilih jenis berkas sarana prasarana yang ingin di-render." },
                { text: "Tentukan lokasi ruangan atau kategori aset jika diperlukan." },
                { text: "Gunakan tombol cetak untuk mencetak langsung ke kertas fisik." }
              ]
            }}
            showChecklist={false}
            defaultPrintType="room_inventory"
            docFormRenderer={renderDocForm}
            pdfGenerator={generatePdf}
            hardeningModuleKey={hardeningModuleKey}
          />
        </Card>
      </InfraErrorBoundary>
    </PremiumFeatureGate>
  );
});

export default CetakBerkasSarprasPage;
