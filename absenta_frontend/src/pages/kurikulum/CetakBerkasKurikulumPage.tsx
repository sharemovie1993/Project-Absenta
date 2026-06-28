import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { getJadwalTemplate } from '../../api/attendance/jadwalTemplate.api';

export const CetakBerkasKurikulumPage: React.FC = () => {
  const docOptions: DocOption[] = [
    { value: 'roster', label: '1. JADWAL PELAJARAN MINGGUAN KELAS', requireClass: true },
    { value: 'calendar', label: '2. KALENDER AKADEMIK & HARI EFEKTIF SEKOLAH', requireClass: false }
  ];

  return (
    <CetakBerkasTemplate
      module="kurikulum"
      title="Cetak Berkas Kurikulum"
      description="Buat dan cetak dokumen administrasi kurikulum secara otomatis — menggantikan proses manual yang sebelumnya dikerjakan menggunakan Excel."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/struktur' },
        { label: 'Cetak Berkas' }
      ]}
      instruction={{
        title: "Panduan Cetak Berkas Kurikulum",
        description: (
          <div className="space-y-2">
            <p>Halaman ini mengotomasi pembuatan dokumen jadwal mingguan kelas dan kalender akademik sekolah.</p>
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
      }}
      showChecklist={false}
      defaultPrintType="roster"
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
        includeSchoolLogo,
        checklistData
      }) => {
        let jadwalList = [];
        if (selectedPrintType === 'roster') {
          try {
            const res = await getJadwalTemplate({
              kelas_id: selectedClassId === 'all' ? undefined : selectedClassId,
              tahun_pelajaran_id: checklistData?.current_year?.id,
              semester_id: checklistData?.current_semester?.id
            });
            if (res.success && res.data) {
              jadwalList = res.data;
            }
          } catch (e) {
            console.error('Gagal mengambil jadwal pelajaran:', e);
          }
        }

        return generateGenericPdf({
          module: 'kurikulum',
          printType: selectedPrintType,
          selectedClassId,
          sekolah,
          tenantInfo,
          strukturList,
          logoDaerahBase64,
          logoSekolahBase64,
          includeSchoolLogo,
          filterData: { jadwalList }
        });
      }}
    />
  );
};
