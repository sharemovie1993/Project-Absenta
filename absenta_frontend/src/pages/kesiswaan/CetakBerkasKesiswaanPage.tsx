import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';

export const CetakBerkasKesiswaanPage: React.FC = () => {
  const docOptions: DocOption[] = [
    { value: 'letter_summons', label: '1. SURAT PANGGILAN ORANG TUA / WALI SISWA', requireClass: true },
    { value: 'kesiswaan_recap', label: '2. LAPORAN & REKAPITULASI KESISWAAN', requireClass: false }
  ];

  return (
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
          { text: "Periksa kembali data pratinjau sebelum melakukan pencetakan fisik." }
        ]
      }}
      showChecklist={false}
      defaultPrintType="letter_summons"
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
          module: 'kesiswaan',
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
