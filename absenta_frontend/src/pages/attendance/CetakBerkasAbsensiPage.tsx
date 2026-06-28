import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { getRekapKelasBulanan } from '../../api/attendance/rekap.api';

export const CetakBerkasAbsensiPage: React.FC = () => {
  const docOptions: DocOption[] = [
    { value: 'monthly_recap', label: '1. REKAP KEHADIRAN & ABSENSI BULANAN KELAS', requireClass: true }
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
        eventDetails,
        setEventDetails,
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
          eventDetails={eventDetails}
          setEventDetails={setEventDetails}
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
        eventDetails,
        classes,
        students,
        sekolah,
        tenantInfo,
        strukturList,
        logoDaerahBase64,
        logoSekolahBase64,
        includeSchoolLogo
      }) => {
        let rekapList = null;
        if (selectedPrintType === 'monthly_recap' && selectedClassId) {
          try {
            const selectedMonth = eventDetails?.bulanRekap || new Date().toISOString().substring(0, 7);
            const res = await getRekapKelasBulanan(selectedClassId, selectedMonth);
            if (res.success && res.data) {
              rekapList = res.data;
            }
          } catch (e) {
            console.error('Failed to fetch monthly attendance recap:', e);
          }
        }

        return generateGenericPdf({
          module: 'attendance',
          printType: selectedPrintType,
          selectedClassId,
          eventDetails,
          sekolah,
          tenantInfo,
          strukturList,
          logoDaerahBase64,
          logoSekolahBase64,
          includeSchoolLogo,
          filterData: { rekapList, classes, students }
        });
      }}
    />
  );
};
