import { jsPDF } from 'jspdf';
import type { Kelas, Siswa, GuruMapel } from '../../types/academic';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import { siswaApi } from '../../api/academic.api';
import { drawKopSurat } from './pdfGeneric';
import { renderAcademicAttendancePdf } from './modules/pdfAcademicAttendance';
import { renderAcademicJournalPdf } from './modules/pdfAcademicJournal';
import { renderAcademicRosterPdf } from './modules/pdfAcademicRoster';
import { renderAcademicSkLoadPdf } from './modules/pdfAcademicSkLoad';

export interface GeneratePdfOptions {
  selectedPrintType: 'attendance' | 'journal' | 'roster' | 'sk_load';
  selectedClassId: string;
  classes: Kelas[];
  checklistData: any;
  sekolah: Sekolah | null;
  tenantInfo: Tenant | null;
  strukturList: StrukturOrganisasi[];
  logoDaerahBase64: string | null;
  logoSekolahBase64: string | null;
  includeSchoolLogo: boolean;
  guruMapelList: GuruMapel[];
}

export const generateAcademicPdf = async (options: GeneratePdfOptions): Promise<Blob> => {
  const {
    selectedPrintType,
    selectedClassId,
    classes,
    checklistData,
    sekolah,
    tenantInfo,
    strukturList,
    logoDaerahBase64,
    logoSekolahBase64,
    includeSchoolLogo,
    guruMapelList,
  } = options;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210; // Portrait A4
  const pageHeight = 297;

  // Identify target classes to print
  const targetClasses = selectedPrintType === 'sk_load'
    ? [null]
    : selectedClassId === 'all'
      ? classes
      : selectedClassId.startsWith('all_tingkat_')
        ? (() => {
            const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
            return classes.filter(c => Number(c.tingkat) === tingkatNum);
          })()
        : classes.filter(c => c.id === selectedClassId);

  // Helper values for principal
  const principalAssign = strukturList?.find(s => s.kode === 'KEPALA_SEKOLAH');
  const principalGuru = principalAssign?.organizationalAssigns?.[0]?.User?.Guru;
  const principalName = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || principalGuru?.nama_guru || 'DRS. H. CONTOH KEPSEK, M.Pd.';
  
  let principalNip = sekolah?.nip_kepala || tenantInfo?.nip_kepala || principalGuru?.nip || '19720512 199803 1 002';
  if (principalNip && !principalNip.startsWith('NIP')) {
    principalNip = `NIP. ${principalNip}`;
  }

  for (let classIndex = 0; classIndex < targetClasses.length; classIndex++) {
    const c = targetClasses[classIndex];
    let classStudents: Siswa[] = [];
    if (c && ['attendance', 'journal', 'roster'].includes(selectedPrintType)) {
      try {
        const res = await siswaApi.getAll({ kelas_id: c.id, limit: 150 });
        classStudents = (res.data || []).sort((a, b) => {
          const nameA = (a.nama_siswa || '').toUpperCase();
          const nameB = (b.nama_siswa || '').toUpperCase();
          return nameA.localeCompare(nameB);
        });
      } catch (err) {
        console.error(`Gagal memuat siswa untuk kelas ${c.nama_kelas}:`, err);
      }
    }

    const classWaliKelasObj = c?.WaliKelas?.[0]?.Guru as any;
    const classWaliKelasName = classWaliKelasObj?.nama_guru || '_______________________';
    let classWaliKelasNip = 'NIP/NUPTK. ..............................';
    if (classWaliKelasObj?.nip) {
      const cleanNip = String(classWaliKelasObj.nip).replace(/\s/g, '');
      const isNuptk = cleanNip.length === 16;
      classWaliKelasNip = isNuptk ? `NUPTK. ${classWaliKelasObj.nip}` : `NIP. ${classWaliKelasObj.nip}`;
    }

    // Draw header using shared drawKopSurat helper from pdfGeneric
    const headerEndY = drawKopSurat(
      doc,
      pageWidth,
      sekolah,
      tenantInfo,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo
    );

    // Delegate rendering to sub-modules
    if (selectedPrintType === 'attendance') {
      renderAcademicAttendancePdf(doc, options, c, classStudents, headerEndY, pageWidth, pageHeight);
    } else if (selectedPrintType === 'journal') {
      renderAcademicJournalPdf(doc, options, c, headerEndY, pageWidth, pageHeight);
    } else if (selectedPrintType === 'roster') {
      renderAcademicRosterPdf(doc, options, c, classStudents, headerEndY, pageWidth, pageHeight);
    } else if (selectedPrintType === 'sk_load') {
      renderAcademicSkLoadPdf(doc, options, headerEndY, pageWidth, pageHeight);
    }

    // Draw Signatures
    let finalY = (doc as any).lastAutoTable?.finalY ?? 60;
    if (finalY + 35 > pageHeight) {
      doc.addPage();
      finalY = 20;
    }
    const sigY = finalY + 8;

    if (selectedPrintType === 'attendance') {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Wali Kelas,', pageWidth - 60, sigY + 4, { align: 'center' });

      doc.setFont('Helvetica', 'bold');
      doc.text(classWaliKelasName, pageWidth - 60, sigY + 24, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(classWaliKelasNip, pageWidth - 60, sigY + 28, { align: 'center' });
    } else {
      if (['journal', 'roster'].includes(selectedPrintType)) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Mengetahui,', 40, sigY, { align: 'center' });
        doc.text(`Wali Kelas ${c?.nama_kelas || '---'}`, 40, sigY + 4, { align: 'center' });

        doc.setFont('Helvetica', 'bold');
        doc.text(classWaliKelasName, 40, sigY + 22, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(classWaliKelasNip, 40, sigY + 26, { align: 'center' });
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      const dateText = `${sekolah?.alamat?.split(',')[0]?.split(' ')[0] || 'Purwakarta'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      doc.text(dateText, pageWidth - 60, sigY - 4, { align: 'center' });
      doc.text('Kepala Sekolah,', pageWidth - 60, sigY, { align: 'center' });

      doc.setFont('Helvetica', 'bold');
      doc.text(principalName, pageWidth - 60, sigY + 22, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(principalNip, pageWidth - 60, sigY + 26, { align: 'center' });
    }

    if (classIndex < targetClasses.length - 1) {
      doc.addPage();
    }
  }

  return doc.output('blob');
};
