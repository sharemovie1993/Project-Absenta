import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { kesiswaanApi } from '../../api/kesiswaan.api';

export const CetakBerkasKesiswaanPage: React.FC = () => {
  const docOptions: DocOption[] = [
    { value: 'letter_summons', label: '1. SURAT PANGGILAN ORANG TUA / WALI SISWA', requireClass: true },
    { value: 'recap_violations', label: '2. REKAPITULASI PELANGGARAN KELAS', requireClass: true },
    { value: 'recap_achievements', label: '3. REKAPITULASI PRESTASI SISWA KELAS', requireClass: true },
    { value: 'osis_sk', label: '4. SK KEPENGURUSAN OSIS (COMING SOON)', requireClass: false }
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
          { text: "Pilih nama siswa jika mencetak Surat Panggilan Orang Tua." },
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
        selectedStudentId,
        setSelectedStudentId,
        eventDetails,
        setEventDetails,
        includeSchoolLogo,
        setIncludeSchoolLogo,
        classes,
        loadingClasses,
        students,
        loadingStudents
      }) => (
        <CetakFormGeneric
          selectedPrintType={selectedPrintType}
          setSelectedPrintType={setSelectedPrintType}
          selectedClassId={selectedClassId}
          setSelectedClassId={setSelectedClassId}
          selectedStudentId={selectedStudentId}
          setSelectedStudentId={setSelectedStudentId}
          eventDetails={eventDetails}
          setEventDetails={setEventDetails}
          includeSchoolLogo={includeSchoolLogo}
          setIncludeSchoolLogo={setIncludeSchoolLogo}
          classes={classes}
          loadingClasses={loadingClasses}
          students={students}
          loadingStudents={loadingStudents}
          docOptions={docOptions}
        />
      )}
      pdfGenerator={async ({
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
      }) => {
        const targetClasses = selectedClassId === 'all'
          ? classes
          : selectedClassId.startsWith('all_tingkat_')
            ? (() => {
                const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
                return classes.filter(c => Number(c.tingkat) === tingkatNum);
              })()
            : classes.filter(c => c.id === selectedClassId);

        const classesToPrint = ['recap_violations', 'recap_achievements', 'letter_summons'].includes(selectedPrintType)
          ? targetClasses
          : [null];

        const violationsMap: Record<string, any[]> = {};
        const achievementsMap: Record<string, any[]> = {};
        let selectedStudent = null;

        try {
          if (selectedPrintType === 'letter_summons' && selectedStudentId) {
            // Find selected student details
            selectedStudent = students?.find(s => s.id === selectedStudentId);
            
            // Get their violations to show context in the letter
            const res = await kesiswaanApi.getPelanggaran({ siswa_id: selectedStudentId, limit: 100 });
            if (res.success && res.data) {
              const list = res.data.list || [];
              if (selectedStudent?.kelas_id) {
                violationsMap[selectedStudent.kelas_id] = list;
              }
            }
          } else if (selectedPrintType === 'recap_violations') {
            const promises = classesToPrint.map(async (c) => {
              if (!c) return;
              const res = await kesiswaanApi.getPelanggaran({ kelas_id: c.id, limit: 200 });
              if (res.success && res.data) {
                violationsMap[c.id] = res.data.list || [];
              }
            });
            await Promise.all(promises);
          } else if (selectedPrintType === 'recap_achievements') {
            const promises = classesToPrint.map(async (c) => {
              if (!c) return;
              const res = await kesiswaanApi.getPrestasiSiswa({ kelas_id: c.id, limit: 200 });
              if (res.success && res.data) {
                achievementsMap[c.id] = res.data.list || [];
              }
            });
            await Promise.all(promises);
          }
        } catch (e) {
          console.error('Failed to load kesiswaan printing data:', e);
        }

        return generateGenericPdf({
          module: 'kesiswaan',
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
          filterData: { violationsMap, achievementsMap, selectedStudent, classes, students }
        });
      }}
    />
  );
};
