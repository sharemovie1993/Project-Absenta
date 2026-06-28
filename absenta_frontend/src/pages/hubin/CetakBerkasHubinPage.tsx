import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormGeneric, type DocOption } from '../../components/academic/CetakFormGeneric';
import { generateGenericPdf } from '../../utils/print/pdfGeneric';
import { hubinApi } from '../../api/hubin.api';

export const CetakBerkasHubinPage: React.FC = () => {
  const docOptions: DocOption[] = [
    { value: 'pkl_intro', label: '1. SURAT PENGANTAR PRAKTIK KERJA LAPANGAN (PKL)', requireClass: true }
  ];

  return (
    <CetakBerkasTemplate
      module="hubin"
      title="Cetak Berkas Hubin"
      description="Buat dan cetak surat pengantar PKL, daftar siswa penempatan industri, laporan monitoring, dan sertifikat kompetensi."
      breadcrumbs={[
        { label: 'Hubin', path: '/hubin/dashboard' },
        { label: 'Cetak Berkas' }
      ]}
      instruction={{
        title: "Panduan Cetak Berkas Hubin",
        description: (
          <div className="space-y-2">
            <p>Halaman ini mengotomasi pembuatan surat permohonan tempat PKL dan pengantar siswa ke dunia industri.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mencetak berkas resmi pengantar PKL siswa ke DUDI mitra.</p>
              <p><strong>Waktu Penggunaan:</strong> Periode pra-PKL (persiapan keberangkatan siswa ke industri).</p>
            </div>
          </div>
        ),
        items: [
          { text: "Pilih jenis berkas hubungan industri yang ingin dicetak." },
          { text: "Tentukan kelas kelompok siswa pendaftar PKL." },
          { text: "Verifikasi surat secara virtual di pratinjau sebelum dicetak." }
        ]
      }}
      showChecklist={false}
      defaultPrintType="pkl_intro"
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
        const penempatanMap: Record<string, any[]> = {};

        if (selectedPrintType === 'pkl_intro' && selectedClassId) {
          try {
            const res = await hubinApi.getPenempatan({ limit: 500 });
            if (res.success && res.data) {
              const allPenempatan = res.data.list || res.data || [];
              const targetClasses = selectedClassId === 'all'
                ? classes
                : selectedClassId.startsWith('all_tingkat_')
                  ? (() => {
                      const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
                      return classes.filter(c => Number(c.tingkat) === tingkatNum);
                    })()
                  : classes.filter(c => c.id === selectedClassId);

              targetClasses.forEach(c => {
                penempatanMap[c.id] = allPenempatan.filter((p: any) => 
                  p.Siswa?.Kelas?.nama_kelas === c.nama_kelas
                );
              });
            }
          } catch (e) {
            console.error('Failed to load PKL placements:', e);
          }
        }

        return generateGenericPdf({
          module: 'hubin',
          printType: selectedPrintType,
          selectedClassId,
          sekolah,
          tenantInfo,
          strukturList,
          logoDaerahBase64,
          logoSekolahBase64,
          includeSchoolLogo,
          filterData: { penempatanMap, classes }
        });
      }}
    />
  );
};
