import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { sarprasApi } from '../../api/sarpras.api';

export const CetakBerkasSarprasPage: React.FC = React.memo(() => {
  const docOptions: DocOption[] = [
    { value: 'room_inventory', label: '1. DAFTAR INVENTARIS BARANG & ASET RUANGAN', requireClass: true }
  ];

  return (
    <CetakBerkasTemplate
      module="sarpras"
      title="Cetak Berkas Sarpras"
      description="Buat dan cetak daftar inventaris barang per ruangan, kartu stok barang, dan laporan kondisi aset secara otomatis."
      breadcrumbs={[
        { label: 'Sarpras', path: '/sarpras/dashboard' },
        { label: 'Cetak Berkas' }
      ]}
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
      docFormRenderer={({
        selectedPrintType,
        setSelectedPrintType,
        selectedClassId,
        setSelectedClassId,
        includeSchoolLogo,
        setIncludeSchoolLogo,
        classes,
        loadingClasses
      }) => (
        <CetakFormGeneric
          selectedPrintType={selectedPrintType}
          setSelectedPrintType={setSelectedPrintType}
          selectedClassId={selectedClassId}
          setSelectedClassId={setSelectedClassId}
          includeSchoolLogo={includeSchoolLogo}
          setIncludeSchoolLogo={setIncludeSchoolLogo}
          classes={classes}
          loadingClasses={loadingClasses}
          docOptions={docOptions}
        />
      )}
      pdfGenerator={async ({
        selectedPrintType,
        selectedClassId,
        classes,
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo
      }) => {
        const assetsMap: Record<string, any[]> = {};

        if (selectedPrintType === 'room_inventory' && selectedClassId) {
          try {
            const isBulk = selectedClassId === 'all' || selectedClassId.startsWith('all_tingkat_');
            const params = isBulk ? { limit: 1000 } : { location_id: selectedClassId, limit: 100 };
            const res = await sarprasApi.getAssets(params);
            if (res.success && res.data) {
              const list = res.data.list || res.data || [];
              if (isBulk) {
                const targetClasses = selectedClassId === 'all'
                  ? classes
                  : (() => {
                      const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
                      return classes.filter(c => Number(c.tingkat) === tingkatNum);
                    })();
                targetClasses.forEach(c => {
                  assetsMap[c.id] = list.filter((asset: any) => asset.location_id === c.id);
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
      }}
    />
  );
});
