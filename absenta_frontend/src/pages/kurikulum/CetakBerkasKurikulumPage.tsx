import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { getJadwalTemplate } from '../../api/attendance/jadwalTemplate.api';
import { jenisKegiatanMasterApi } from '../../api/academic/jenisKegiatanMaster.api';

export const CetakBerkasKurikulumPage: React.FC = () => {
  const docOptions: DocOption[] = [
    { value: 'roster', label: '1. JADWAL PELAJARAN MINGGUAN KELAS', requireClass: true },
    { value: 'roster_teacher', label: '2. JADWAL MENGAJAR GURU (PER GURU)', requireClass: false },
    { value: 'calendar', label: '3. KALENDER AKADEMIK & HARI EFEKTIF SEKOLAH', requireClass: false },
    { value: 'leger', label: '4. LEGER NILAI SEMESTER (Segera Hadir)', requireClass: true },
    { value: 'kkm', label: '5. KKM / KKTP MATA PELAJARAN (Segera Hadir)', requireClass: false },
    { value: 'rpp', label: '6. BLANKO FORMAT RPP / MODUL AJAR (Segera Hadir)', requireClass: false }
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
        selectedGuruId,
        setSelectedGuruId,
        includeSchoolLogo,
        setIncludeSchoolLogo,
        classes,
        loadingClasses,
        gurus,
        loadingGurus
      }) => (
        <CetakFormGeneric
          selectedPrintType={selectedPrintType}
          setSelectedPrintType={setSelectedPrintType}
          selectedClassId={selectedClassId}
          setSelectedClassId={setSelectedClassId}
          selectedGuruId={selectedGuruId}
          setSelectedGuruId={setSelectedGuruId}
          includeSchoolLogo={includeSchoolLogo}
          setIncludeSchoolLogo={setIncludeSchoolLogo}
          classes={classes}
          loadingClasses={loadingClasses}
          gurus={gurus}
          loadingGurus={loadingGurus}
          docOptions={docOptions}
        />
      )}
      pdfGenerator={async ({
        selectedPrintType,
        selectedClassId,
        selectedGuruId,
        classes,
        gurus,
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo,
        checklistData
      }) => {
        let jadwalList = [];
        let jenisKegiatanList = [];
        
        if (['roster', 'roster_teacher'].includes(selectedPrintType)) {
          try {
            const [jadwalRes, jenisRes] = await Promise.all([
              getJadwalTemplate({
                kelas_id: selectedPrintType === 'roster_teacher' ? undefined : (selectedClassId === 'all' ? undefined : selectedClassId),
                guru_id: selectedPrintType === 'roster_teacher' && selectedGuruId !== 'all' ? selectedGuruId : undefined,
                tahun_pelajaran_id: checklistData?.current_year?.id,
                semester_id: checklistData?.current_semester?.id
              }),
              jenisKegiatanMasterApi.getAll({ page: 1, limit: 100 })
            ]);
            
            if (jadwalRes.success && jadwalRes.data) {
              jadwalList = jadwalRes.data;
            }
            if (jenisRes.success && jenisRes.data) {
              jenisKegiatanList = jenisRes.data;
            }
          } catch (e) {
            console.error('Gagal mengambil data untuk PDF:', e);
          }
        }

        return generateGenericPdf({
          module: 'kurikulum',
          printType: selectedPrintType,
          selectedClassId,
          selectedGuruId: selectedGuruId || 'all',
          sekolah,
          tenantInfo,
          strukturList,
          logoDaerahBase64,
          logoSekolahBase64,
          includeSchoolLogo,
          filterData: { jadwalList, classes, gurus, jenisKegiatanList }
        });
      }}
    />
  );
};
