import React from 'react';
import { CetakBerkasTemplate } from '../../components/academic/CetakBerkasTemplate';
import { CetakFormAcademic } from '../../components/academic/CetakFormAcademic';
import { generateAcademicPdf } from '../../utils/print/pdfAcademic';
import { listGuruMapel } from '../../api/academic/guru-mapel.api';
import type { GuruMapel } from '../../types/academic';

interface AcademicFormWrapperProps {
  selectedPrintType: string;
  setSelectedPrintType: (type: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  includeSchoolLogo: boolean;
  setIncludeSchoolLogo: (val: boolean) => void;
  classes: any[];
  loadingClasses: boolean;
  uniqueTingkatList: number[];
  setUniqueTingkatList: React.Dispatch<React.SetStateAction<number[]>>;
  setGuruMapelList: React.Dispatch<React.SetStateAction<GuruMapel[]>>;
}

const AcademicFormWrapper: React.FC<AcademicFormWrapperProps> = ({
  selectedPrintType,
  setSelectedPrintType,
  selectedClassId,
  setSelectedClassId,
  includeSchoolLogo,
  setIncludeSchoolLogo,
  classes,
  loadingClasses,
  uniqueTingkatList,
  setUniqueTingkatList,
  setGuruMapelList
}) => {
  // Compute unique tingkat list dynamically
  React.useEffect(() => {
    const list = classes.map(c => Number(c.tingkat)).filter(t => !isNaN(t) && t > 0);
    setUniqueTingkatList(Array.from(new Set(list)).sort((a, b) => a - b));
  }, [classes, setUniqueTingkatList]);

  // Load guru mapel list if sk_load selected
  React.useEffect(() => {
    if (selectedPrintType === 'sk_load') {
      listGuruMapel().then(res => {
        if (res.success && res.data) setGuruMapelList(res.data);
      }).catch(console.error);
    }
  }, [selectedPrintType, setGuruMapelList]);

  return (
    <CetakFormAcademic
      selectedPrintType={selectedPrintType as any}
      setSelectedPrintType={setSelectedPrintType as any}
      selectedClassId={selectedClassId}
      setSelectedClassId={setSelectedClassId}
      selectedMonth={new Date().getMonth() + 1}
      setSelectedMonth={() => {}}
      selectedYear={new Date().getFullYear()}
      setSelectedYear={() => {}}
      includeSchoolLogo={includeSchoolLogo}
      setIncludeSchoolLogo={setIncludeSchoolLogo}
      classes={classes}
      loadingClasses={loadingClasses}
      uniqueTingkatList={uniqueTingkatList}
    />
  );
};

export const CetakBerkasPage: React.FC = () => {
  const [uniqueTingkatList, setUniqueTingkatList] = React.useState<number[]>([]);
  const [guruMapelList, setGuruMapelList] = React.useState<GuruMapel[]>([]);

  return (
    <CetakBerkasTemplate
      module="academic"
      title="Cetak Berkas"
      description="Buat dan cetak dokumen administrasi kelas secara otomatis — menggantikan proses manual yang sebelumnya dikerjakan menggunakan Excel oleh Tata Usaha."
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Cetak Berkas' }
      ]}
      instruction={{
        title: "Panduan Cetak Berkas Akademik",
        description: (
          <div className="space-y-2">
            <p>Halaman ini mengotomasi pembuatan dokumen fisik yang biasanya disiapkan secara manual oleh Tata Usaha menggunakan Excel sebelum tahun ajaran baru dimulai.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mencetak berkas administrasi kelas — absensi, jurnal KBM, daftar kelas, dan SK Beban Mengajar — langsung dari data sistem.</p>
              <p><strong>Waktu Penggunaan:</strong> Setiap awal tahun ajaran atau semester baru, setelah data kelas dan siswa sudah lengkap.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Gunakan tab 'Checklist Sistem' untuk memverifikasi bahwa seluruh data kelas, guru, dan siswa sudah siap sebelum mencetak." },
          { text: "Pilih jenis berkas yang ingin dicetak: Daftar Hadir, Jurnal KBM, Daftar Kelas & Nilai, atau SK Beban Mengajar." },
          { text: "Aktifkan opsi 'Background Graphics' di pengaturan printer agar tampilan tabel dan header tercetak dengan sempurna." }
        ]
      }}
      showChecklist={true}
      defaultPrintType="attendance"
      docFormRenderer={(props) => (
        <AcademicFormWrapper
          {...props}
          uniqueTingkatList={uniqueTingkatList}
          setUniqueTingkatList={setUniqueTingkatList}
          setGuruMapelList={setGuruMapelList}
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
        includeSchoolLogo,
        checklistData
      }) => {
        return generateAcademicPdf({
          selectedPrintType: selectedPrintType as any,
          selectedClassId,
          classes,
          sekolah,
          tenantInfo,
          strukturList,
          logoDaerahBase64,
          logoSekolahBase64,
          includeSchoolLogo,
          checklistData,
          guruMapelList
        });
      }}
    />
  );
};

