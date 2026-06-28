import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';

export const CetakBerkasBkPage: React.FC = () => {
  const docOptions: DocOption[] = [
    { value: 'bk_consult', label: '1. KARTU KONSULTASI & LAYANAN BK SISWA', requireClass: true }
  ];

  return (
    <CetakBerkasTemplate
      module="bpbk"
      title="Cetak Berkas BK"
      description="Buat dan cetak kartu layanan BK, laporan perkembangan, dan surat pemanggilan secara otomatis."
      breadcrumbs={[
        { label: 'BP/BK', path: '/bpbk/dashboard' },
        { label: 'Cetak Berkas' }
      ]}
      instruction={{
        title: "Panduan Cetak Berkas BK",
        description: (
          <div className="space-y-2">
            <p>Halaman ini mengotomasi pembuatan lembar konsultasi siswa dan berkas rekam jejak konseling.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mencetak kartu bimbingan konseling dan rujukan kasus siswa.</p>
              <p><strong>Waktu Penggunaan:</strong> Penanganan berkala atau tindak lanjut laporan bimbingan.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Pilih jenis berkas BK yang ingin dicetak." },
          { text: "Pilih kelas untuk mempermudah pencarian rekam jejak siswa." },
          { text: "Pratinjau visual PDF akan langsung diperbarui saat pengaturan diubah." }
        ]
      }}
      showChecklist={false}
      defaultPrintType="bk_consult"
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
          module: 'bpbk',
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
