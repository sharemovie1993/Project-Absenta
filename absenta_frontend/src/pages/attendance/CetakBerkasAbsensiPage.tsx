import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { getRekapKelasBulanan, getRekapHarianGuru } from '../../api/attendance/rekap.api';
import { siswaApi } from '../../api/academic.api';
import { toLocalDate, toLocalMonth } from '../../utils/attendance/time';

export const CetakBerkasAbsensiPage: React.FC = React.memo(() => {
  const docOptions: DocOption[] = [
    { value: 'monthly_recap', label: '1. REKAP KEHADIRAN & ABSENSI BULANAN KELAS', requireClass: true },
    { value: 'semester_recap', label: '2. REKAP KEHADIRAN SEMESTER KELAS (LEGER ABSENSI)', requireClass: true },
    { value: 'blank_attendance', label: '3. BLANKO DAFTAR HADIR MANUAL KELAS', requireClass: true },
    { value: 'attendance_warning', label: '4. SURAT PERINGATAN KETIDAKHADIRAN SISWA (SP)', requireClass: true },
    { value: 'teacher_attendance', label: '5. LAPORAN KEHADIRAN & JAM MENGAJAR GURU', requireClass: false }
  ];

  return (
    <CetakBerkasTemplate
      module="attendance"
      title="Cetak Berkas Absensi"
      description="Buat dan cetak rekapitulasi kehadiran siswa secara otomatis — menggantikan rekap manual Excel."
      breadcrumbs={[
        { label: 'Absensi', path: '/attendance/dashboard' },
        { label: 'Cetak Berkas' }
      ]}
      instruction={{
        title: "Panduan Cetak Berkas Absensi",
        description: (
          <div className="space-y-2">
            <p>Halaman ini mengotomasi pembuatan berkas rekapitulasi presensi bulanan siswa.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mencetak laporan bulanan kehadiran per kelas.</p>
              <p><strong>Waktu Penggunaan:</strong> Setiap akhir bulan atau akhir periode pelaporan nilai.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Pilih kelas sasaran yang ingin dicetak rekap absensinya." },
          { text: "Gunakan filter bulan untuk menarik data absensi yang sesuai." },
          { text: "Pratinjau PDF akan digenerasikan otomatis untuk mempermudah pemeriksaan awal." }
        ]
      }}
      showChecklist={false}
      defaultPrintType="monthly_recap"
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

        const classesToPrint = ['monthly_recap', 'semester_recap', 'blank_attendance', 'attendance_warning'].includes(selectedPrintType)
          ? targetClasses
          : [null];

        const rekapMap: Record<string, any> = {};
        const studentsMap: Record<string, any[]> = {};
        const selectedMonth = eventDetails?.bulanRekap || toLocalMonth();

        // Fetch student roster maps in parallel for blank lists, monthly recaps, warnings or semester recaps
        if (['blank_attendance', 'monthly_recap', 'attendance_warning', 'semester_recap'].includes(selectedPrintType)) {
          const studentPromises = classesToPrint.map(async (c) => {
            if (!c) return;
            try {
              const res = await siswaApi.getAll({ kelas_id: c.id, limit: 150 });
              if (res.success && res.data) {
                studentsMap[c.id] = (res.data || []).sort((a, b) => {
                  const nameA = (a.nama_siswa || '').toUpperCase();
                  const nameB = (b.nama_siswa || '').toUpperCase();
                  return nameA.localeCompare(nameB);
                });
              }
            } catch (e) {
              console.error(`Failed to fetch students for class ${c.nama_kelas}:`, e);
            }
          });
          await Promise.all(studentPromises);
        }

        // Fetch monthly recap data maps
        if (['monthly_recap', 'attendance_warning'].includes(selectedPrintType)) {
          const rekapPromises = classesToPrint.map(async (c) => {
            if (!c) return;
            try {
              const res = await getRekapKelasBulanan(c.id, selectedMonth);
              if (res.success && res.data) {
                rekapMap[c.id] = res.data;
              }
            } catch (e) {
              console.error(`Failed to fetch monthly recap for ${c.nama_kelas}:`, e);
            }
          });
          await Promise.all(rekapPromises);
        } else if (selectedPrintType === 'semester_recap') {
          const [yearStr, monthStr] = selectedMonth.split('-');
          const year = parseInt(yearStr);
          const month = parseInt(monthStr);
          const isSemester1 = month >= 7;
          const targetMonths = isSemester1
            ? ['07', '08', '09', '10', '11', '12'].map(m => `${year}-${m}`)
            : ['01', '02', '03', '04', '05', '06'].map(m => `${year}-${m}`);

          // Query sequentially over classes to avoid overwhelming database
          for (const c of classesToPrint) {
            if (c) {
              try {
                const monthlyPromises = targetMonths.map(m => getRekapKelasBulanan(c.id, m).catch(() => null));
                const results = await Promise.all(monthlyPromises);
                
                const studentStatsMap: Record<string, any> = {};
                results.forEach(res => {
                  if (res && res.success && res.data) {
                    const studentsArray = Array.isArray(res.data) 
                      ? res.data 
                      : (res.data.students || []);
                      
                    studentsArray.forEach((s: any) => {
                      const studentId = s.id || s.siswa_id || s.nama_siswa;
                      if (studentId) {
                        if (!studentStatsMap[studentId]) {
                          studentStatsMap[studentId] = {
                            id: studentId,
                            nama: s.nama || s.nama_siswa || '',
                            nis: s.nis || '',
                            hadir: 0,
                            sakit: 0,
                            izin: 0,
                            alpa: 0,
                            total_poin: 0
                          };
                        }
                        studentStatsMap[studentId].hadir += s.hadir ?? s.HADIR ?? 0;
                        studentStatsMap[studentId].sakit += s.sakit ?? s.SAKIT ?? 0;
                        studentStatsMap[studentId].izin += s.izin ?? s.IZIN ?? 0;
                        studentStatsMap[studentId].alpa += s.alpa ?? s.ALPA ?? 0;
                        studentStatsMap[studentId].total_poin += s.total_poin ?? 0;
                      }
                    });
                  }
                });
                
                rekapMap[c.id] = { students: Object.values(studentStatsMap) };
              } catch (e) {
                console.error(`Failed to compile semester recap for ${c.nama_kelas}:`, e);
              }
            }
          }
        }

        let teacherRekap: any = null;
        if (selectedPrintType === 'teacher_attendance') {
          try {
            const targetDate = eventDetails?.tanggalLaporan || toLocalDate();
            const res = await getRekapHarianGuru(targetDate);
            if (res && Array.isArray(res)) {
              teacherRekap = res;
            }
          } catch (e) {
            console.error('Failed to fetch daily teacher attendance:', e);
          }
        }

        return generateGenericPdf({
          module: 'attendance',
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
          filterData: {
            rekapMap,
            studentsMap,
            rekapList: teacherRekap,
            classes,
            students
          }
        });
      }}
    />
  );
});
