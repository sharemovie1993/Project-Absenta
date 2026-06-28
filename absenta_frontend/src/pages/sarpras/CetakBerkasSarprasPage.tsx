import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';

export const CetakBerkasSarprasPage: React.FC = () => {
  const docOptions: DocOption[] = [
    { value: 'room_inventory', label: '1. DAFTAR INVENTARIS BARANG & ASET RUANGAN', requireClass: false }
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
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo
      }) => {
        return generateGenericPdf({
          module: 'sarpras',
          printType: selectedPrintType,
          selectedClassId,
          sekolah,
          tenantInfo,
          strukturList,
          logoDaerahBase64,
          logoSekolahBase64,
          includeSchoolLogo
        });
      }}
    />
  );
};
