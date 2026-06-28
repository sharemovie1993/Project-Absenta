import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import { renderAttendancePdf } from './modules/pdfAttendance';
import { renderBpbkPdf } from './modules/pdfBpbk';
import { renderKurikulumCalendarPdf, renderKurikulumRosterPdf } from './modules/pdfKurikulum';
import { renderKesiswaanPdf } from './modules/pdfKesiswaan';
import { renderSarprasPdf } from './modules/pdfSarpras';
import { renderHubinPdf } from './modules/pdfHubin';

export interface GenerateGenericPdfOptions {
  module: 'kurikulum' | 'kesiswaan' | 'attendance' | 'bpbk' | 'sarpras' | 'hubin';
  printType: string;
  selectedClassId: string;
  sekolah: Sekolah | null;
  tenantInfo: Tenant | null;
  strukturList: StrukturOrganisasi[];
  logoDaerahBase64: string | null;
  logoSekolahBase64: string | null;
  includeSchoolLogo: boolean;
  selectedGuruId?: string;
  selectedStudentId?: string;
  eventDetails?: Record<string, string>;
  filterData?: Record<string, any>;
  checklistData?: any;
  isSigned?: boolean;
  studentSignatureBase64?: string | null;
  parentSignatureBase64?: string | null;
  counselorName?: string;
}

export const getAcademicYearFromPeriod = (periodStr?: string): string => {
  if (!periodStr) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  }
  try {
    const parts = periodStr.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(year) && !isNaN(month)) {
        return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
      }
    }
  } catch (e) {}
  const today = new Date();
  const year = today.getFullYear();
  return `${year - 1}/${year}`;
};

export const drawClassHeaderInfo = (
  doc: jsPDF,
  title: string,
  currentClass: any,
  headerEndY: number,
  pageWidth: number,
  checklistData: any,
  subtitle?: string,
  periodStr?: string
): number => {
  const tahunPel = periodStr 
    ? getAcademicYearFromPeriod(periodStr) 
    : (checklistData?.current_year?.tahun || getAcademicYearFromPeriod());
    
  const progKeahlian = currentClass?.Jurusan?.nama || currentClass?.Jurusan?.nama_jurusan || 'Teknik Elektronika';
  const kelasName = currentClass?.nama_kelas || 'X TE 1';

  // 1. Draw Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), pageWidth / 2, headerEndY + 6, { align: 'center' });
  doc.setFontSize(9.5);
  let nextY = headerEndY + 10;
  if (subtitle) {
    doc.text(subtitle.toUpperCase(), pageWidth / 2, nextY, { align: 'center' });
    nextY += 4;
  }
  
  const showTahunPelLine = !subtitle || !subtitle.toUpperCase().includes('SEMESTER');
  if (showTahunPelLine) {
    doc.text(`TAHUN PELAJARAN ${tahunPel}`, pageWidth / 2, nextY, { align: 'center' });
  } else {
    nextY -= 4; // Save vertical space when omitting year line
  }

  // 2. Draw Class Info Block
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Program Keahlian', 15, nextY + 6);
  doc.text('Tingkat/Konsentrasi Keahlian', 15, nextY + 10);
  doc.text(`: ${progKeahlian}`, 58, nextY + 6);
  doc.text(`: ${kelasName}`, 58, nextY + 10);

  // Return the Y coordinate where content should start
  return nextY + 15;
};

export const drawKopSurat = (
  doc: jsPDF,
  pageWidth: number,
  sekolah: Sekolah | null,
  tenantInfo: Tenant | null,
  logoDaerahBase64: string | null,
  logoSekolahBase64: string | null,
  includeSchoolLogo: boolean
): number => {
  if (logoDaerahBase64) {
    try {
      doc.addImage(logoDaerahBase64, 'JPEG', 15, 10, 16, 16);
    } catch (e) {
      console.warn('Failed to add logo daerah', e);
    }
  }
  if (includeSchoolLogo && logoSekolahBase64) {
    try {
      doc.addImage(logoSekolahBase64, 'JPEG', pageWidth - 31, 10, 16, 16);
    } catch (e) {
      console.warn('Failed to add logo sekolah', e);
    }
  }

  const rawLines = tenantInfo?.print_header_lines && tenantInfo.print_header_lines.length > 0
    ? tenantInfo.print_header_lines
    : [
        tenantInfo?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
        tenantInfo?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
        tenantInfo?.nama_cabang_dinas || 'KANTOR CABANG DINAS PENDIDIKAN WILAYAH IV',
        tenantInfo?.name || sekolah?.nama || 'SMK NEGERI ABSENTA'
      ];
      
  const parsedLines = rawLines.map(line => {
    if (typeof line === 'object' && line !== null) return line as any;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) return parsed;
    } catch (e) {}
    return { text: line };
  });

  let currentY = 13;
  parsedLines.forEach((line, index) => {
    const isLast = index === parsedLines.length - 1;
    const isSecondLast = index === parsedLines.length - 2 && parsedLines.length > 1;
    let fontSize = line.fontSize ? line.fontSize * 0.7 : (isLast ? 11 : (isSecondLast ? 8.5 : 7.5));
    let isBold = line.bold !== undefined ? line.bold : (isLast || isSecondLast);

    doc.setFont('Helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.text(String(line.text).toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += (fontSize * 0.35) + 1.2;
  });

  const address = tenantInfo?.address || sekolah?.alamat || '';
  const phone = tenantInfo?.phone || sekolah?.telepon || '';
  const email = tenantInfo?.email || sekolah?.email || '';
  const website = tenantInfo?.website || sekolah?.website || '';

  if (address) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${address}${phone ? ` | Telp: ${phone}` : ''}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 3.2;
  }
  if (website || email) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${website ? `Website: ${website}` : ''}${email ? ` | Email: ${email}` : ''}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 3;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(15, currentY, pageWidth - 15, currentY);
  doc.setLineWidth(0.18);
  doc.line(15, currentY + 0.6, pageWidth - 15, currentY + 0.6);

  return currentY + 2.5;
};

const resizeBase64Image = (base64: string, maxDim: number = 150): Promise<string> => {
  if (!base64 || !base64.startsWith('data:')) return Promise.resolve(base64);
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      resolve(base64);
    };
    img.src = base64;
  });
};

export const generateGenericPdf = async (options: GenerateGenericPdfOptions): Promise<Blob> => {
  const [logoDaerahResized, logoSekolahResized] = await Promise.all([
    options.logoDaerahBase64 ? resizeBase64Image(options.logoDaerahBase64) : Promise.resolve(null),
    options.logoSekolahBase64 ? resizeBase64Image(options.logoSekolahBase64) : Promise.resolve(null)
  ]);
  
  options.logoDaerahBase64 = logoDaerahResized;
  options.logoSekolahBase64 = logoSekolahResized;

  const {
    module,
    printType,
    selectedClassId,
    sekolah,
    tenantInfo,
    strukturList,
    logoDaerahBase64,
    logoSekolahBase64,
    includeSchoolLogo,
    filterData,
    checklistData
  } = options;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // Retrieve principal details
  const principalAssign = strukturList?.find(s => s.kode === 'KEPALA_SEKOLAH');
  const principalGuru = principalAssign?.organizationalAssigns?.[0]?.User?.Guru;
  const principalName = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || principalGuru?.nama_guru || 'DRS. H. CONTOH KEPSEK, M.Pd.';
  let principalNip = sekolah?.nip_kepala || tenantInfo?.nip_kepala || principalGuru?.nip || '19720512 199803 1 002';
  if (principalNip && !principalNip.startsWith('NIP')) {
    principalNip = `NIP. ${principalNip}`;
  }

  // Handle coming soon documents
  const comingSoonDocs = ['leger', 'kkm', 'rpp', 'osis_sk', 'attendance_recap_semester', 'bk_case_recap', 'stock_card', 'pkl_certificate'];
  if (comingSoonDocs.includes(printType)) {
    const headerEndY = drawKopSurat(
      doc,
      pageWidth,
      sekolah,
      tenantInfo,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo
    );
    
    const getRequiredModule = (type: string): string => {
      switch (type) {
        case 'leger': return 'Rapor & Nilai';
        case 'kkm': return 'Kriteria Ketuntasan Minimal (KKM)';
        case 'rpp': return 'Supervisi & Modul Ajar (RPP)';
        case 'osis_sk': return 'Kesiswaan & Ekstrakurikuler';
        case 'attendance_recap_semester': return 'Absensi Lanjutan';
        case 'bk_case_recap': return 'Kasus Lanjutan BP/BK';
        case 'stock_card': return 'Manajemen Gudang Sarpras';
        case 'pkl_certificate': return 'Sertifikat & Penilaian DUDI';
        default: return 'Modul Tambahan';
      }
    };
    
    const getDocName = (type: string): string => {
      switch (type) {
        case 'leger': return 'Leger Nilai Semester';
        case 'kkm': return 'KKM / KKTP Mata Pelajaran';
        case 'rpp': return 'Blanko Format RPP / Modul Ajar';
        case 'osis_sk': return 'SK Kepengurusan OSIS';
        case 'attendance_recap_semester': return 'Rekapitulasi Kehadiran Semester';
        case 'bk_case_recap': return 'Laporan & Rekapitulasi Kasus BK';
        case 'stock_card': return 'Kartu Kontrol Stok Barang';
        case 'pkl_certificate': return 'Sertifikat Praktik Kerja Lapangan (PKL)';
        default: return 'Dokumen Fisik';
      }
    };

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(getDocName(printType).toUpperCase(), pageWidth / 2, headerEndY + 12, { align: 'center' });

    // Draw coming soon box
    doc.setFillColor(254, 243, 199); // light amber
    doc.setDrawColor(245, 158, 11); // amber border
    doc.setLineWidth(0.3);
    doc.rect(20, headerEndY + 22, pageWidth - 40, 24, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text('FITUR SEGERA HADIR (COMING SOON)', pageWidth / 2, headerEndY + 28, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 113, 108);
    doc.text(`Dokumen ini memerlukan Modul "${getRequiredModule(printType)}" yang saat ini belum aktif di sistem Anda.`, pageWidth / 2, headerEndY + 34, { align: 'center' });
    doc.text('Hubungi Administrator untuk mengaktifkan modul ini.', pageWidth / 2, headerEndY + 39, { align: 'center' });

    // Draw mockup table placeholder
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.text('CONTOH PREVIEW DOKUMEN:', 20, headerEndY + 54);

    const head = [['KOLOM A', 'KOLOM B', 'KOLOM C', 'KOLOM D']];
    const body = Array.from({ length: 4 }).map((_, i) => [
      `Data Contoh ${i+1}-A`, `Data Contoh ${i+1}-B`, `Data Contoh ${i+1}-C`, `Data Contoh ${i+1}-D`
    ]);
    
    autoTable(doc, {
      startY: headerEndY + 58,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8, font: 'Helvetica', cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139] }
    });

    // Draw Signature
    let finalY = (doc as any).lastAutoTable?.finalY ?? 100;
    const sigY = finalY + 12;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    const dateText = `${sekolah?.alamat?.split(',')[0]?.split(' ')[0] || 'Purwakarta'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    doc.text(dateText, pageWidth - 65, sigY - 4, { align: 'center' });
    doc.text('Kepala Sekolah,', pageWidth - 65, sigY, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.text(principalName, pageWidth - 65, sigY + 22, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(principalNip, pageWidth - 65, sigY + 26, { align: 'center' });

    return doc.output('blob');
  }

  // Multi-page roster logic
  if (module === 'kurikulum' && ['roster', 'roster_teacher'].includes(printType)) {
    return renderKurikulumRosterPdf(
      doc,
      options,
      pageWidth,
      pageHeight,
      sekolah,
      tenantInfo,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo,
      principalName,
      principalNip,
      drawKopSurat
    );
  }

  // Resolve target classes loop for class-based generic documents
  const classes = (filterData?.classes || []) as any[];
  const targetClasses = selectedClassId === 'all'
    ? classes
    : selectedClassId.startsWith('all_tingkat_')
      ? (() => {
          const tingkatNum = Number(selectedClassId.replace('all_tingkat_', ''));
          return classes.filter(c => Number(c.tingkat) === tingkatNum);
        })()
      : classes.filter(c => c.id === selectedClassId);

  const isClassBased = !['calendar', 'teacher_attendance', 'roster', 'roster_teacher', 'sk_load'].includes(printType);
  const classesToPrint = isClassBased ? targetClasses : [null];

  const totalClasses = classesToPrint.length > 0 ? classesToPrint.length : 1;

  for (let classIndex = 0; classIndex < totalClasses; classIndex++) {
    const currentClass = classesToPrint[classIndex];
    const classId = currentClass?.id || selectedClassId;

    const classRekapList = filterData?.rekapMap?.[classId] || filterData?.rekapList;
    const classStudents = filterData?.studentsMap?.[classId] || filterData?.students || [];
    const classViolations = filterData?.violationsMap?.[classId] || filterData?.violations || [];
    const classAchievements = filterData?.achievementsMap?.[classId] || filterData?.achievements || [];
    const classAssets = filterData?.assetsMap?.[classId] || filterData?.assets || [];
    const classPenempatanList = filterData?.penempatanMap?.[classId] || filterData?.penempatanList || [];

    const classOptions = {
      ...options,
      selectedClassId: classId,
      filterData: {
        ...options.filterData,
        rekapList: classRekapList,
        students: classStudents,
        violations: classViolations,
        achievements: classAchievements,
        assets: classAssets,
        penempatanList: classPenempatanList
      }
    };

    // Single-page document rendering: Header first
    const headerEndY = drawKopSurat(
      doc,
      pageWidth,
      sekolah,
      tenantInfo,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo
    );

    let currentY = headerEndY;

    // Delegate rendering based on module
    if (module === 'attendance') {
      currentY = renderAttendancePdf(doc, classOptions, headerEndY, pageWidth, pageHeight);
    } else if (module === 'bpbk') {
      currentY = renderBpbkPdf(doc, classOptions, headerEndY, pageWidth, pageHeight);
    } else if (module === 'kurikulum' && printType === 'calendar') {
      currentY = renderKurikulumCalendarPdf(doc, classOptions, headerEndY, pageWidth, pageHeight);
    } else if (module === 'kesiswaan') {
      currentY = renderKesiswaanPdf(doc, classOptions, headerEndY, pageWidth, pageHeight);
    } else if (module === 'sarpras') {
      currentY = renderSarprasPdf(doc, classOptions, headerEndY, pageWidth, pageHeight);
    } else if (module === 'hubin') {
      currentY = renderHubinPdf(doc, classOptions, headerEndY, pageWidth, pageHeight);
    }

    // Shared Bottom Signature
    let finalY = currentY;
    
    // Highly compact signature spacing check to prevent layout spilling over
    const signatureHeightNeeded = printType === 'attendance_warning' ? 32 : 25;
    if (finalY + signatureHeightNeeded > pageHeight - 10) {
      doc.addPage();
      finalY = 15;
    }
    const sigY = finalY + 6;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    const dateText = `${sekolah?.alamat?.split(',')[0]?.split(' ')[0] || 'Purwakarta'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

    if (['attendance_warning', 'bk_minutes', 'bk_statement'].includes(printType)) {
      // 3 signature blocks for warning letter & BK documents
      doc.text(dateText, pageWidth - 50, sigY - 3, { align: 'center' });
      
      const middleTitle = ['bk_minutes', 'bk_statement'].includes(printType) ? 'Guru Pembimbing (BK),' : 'Wali Kelas,';

      // Titles
      doc.text('Orang Tua / Wali Siswa,', 35, sigY, { align: 'center' });
      doc.text(middleTitle, pageWidth / 2, sigY, { align: 'center' });
      doc.text('Kepala Sekolah,', pageWidth - 50, sigY, { align: 'center' });
      
      if (options.isSigned) {
        // Draw e-signature badge for Headmaster!
        doc.setDrawColor(16, 185, 129); // Emerald border
        doc.setFillColor(240, 253, 244); // Light emerald bg
        doc.setLineWidth(0.2);
        doc.rect(pageWidth - 70, sigY + 2, 40, 9, 'FD');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(5, 150, 105);
        doc.text('TANDA TANGAN ELEKTRONIK', pageWidth - 50, sigY + 5, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(5);
        doc.text('DOKUMEN RESMI TERVERIFIKASI', pageWidth - 50, sigY + 8, { align: 'center' });
        doc.setTextColor(0, 0, 0); // Restore text color
      }

      // Draw student/parent signature images if provided
      if (options.parentSignatureBase64) {
        try {
          doc.addImage(options.parentSignatureBase64, 'JPEG', 20, sigY + 4, 30, 11);
        } catch (err) {
          console.warn('Failed to add parent signature to PDF:', err);
        }
      }
      if (options.studentSignatureBase64) {
        try {
          doc.addImage(options.studentSignatureBase64, 'JPEG', (pageWidth / 2) - 15, sigY + 4, 30, 11);
        } catch (err) {
          console.warn('Failed to add student signature to PDF:', err);
        }
      }

      // Resolve parent & counselor names
      const student = options.filterData?.selectedStudent;
      const parentName = student?.nama_wali || student?.nama_ayah || student?.nama_ibu || '___________________';
      const counselorName = options.counselorName || '___________________';

      // Names
      doc.text(`( ${parentName} )`, 35, sigY + 18, { align: 'center' });
      doc.text(`( ${counselorName} )`, pageWidth / 2, sigY + 18, { align: 'center' });
      
      doc.setFont('Helvetica', 'bold');
      doc.text(principalName, pageWidth - 50, sigY + 18, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(principalNip, pageWidth - 50, sigY + 22, { align: 'center' });
    } else {
      // Standard single headmaster signature
      doc.text(dateText, pageWidth - 65, sigY - 3, { align: 'center' });
      doc.text('Kepala Sekolah,', pageWidth - 65, sigY, { align: 'center' });

      if (options.isSigned) {
        // Draw a beautiful digital signature verification mark!
        doc.setDrawColor(16, 185, 129); // Emerald border
        doc.setFillColor(240, 253, 244); // Light emerald bg
        doc.setLineWidth(0.2);
        doc.rect(pageWidth - 85, sigY + 2, 40, 9, 'FD');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(5, 150, 105);
        doc.text('TANDA TANGAN ELEKTRONIK', pageWidth - 65, sigY + 5, { align: 'center' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(5);
        doc.text('DOKUMEN RESMI TERVERIFIKASI', pageWidth - 65, sigY + 8, { align: 'center' });
        doc.setTextColor(0, 0, 0); // Restore text color
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(principalName, pageWidth - 65, sigY + 15, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(principalNip, pageWidth - 65, sigY + 19, { align: 'center' });
    }

    if (classIndex < totalClasses - 1) {
      doc.addPage();
    }
  }

  return doc.output('blob');
};
