import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Kelas, Siswa, GuruMapel } from '../../types/academic';
import type { Sekolah } from '../../api/academic/sekolah.api';
import type { Tenant } from '../../api/tenants.api';
import type { StrukturOrganisasi } from '../../api/academic/strukturOrganisasi.api';
import { siswaApi } from '../../api/academic.api';

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

    // Draw Logo Daerah (Kiri)
    if (logoDaerahBase64) {
      try {
        doc.addImage(logoDaerahBase64, 'PNG', 15, 10, 16, 16);
      } catch (e) {
        console.warn('Failed to add logo daerah to PDF', e);
      }
    }
    
    // Draw Logo Sekolah (Kanan)
    if (includeSchoolLogo && logoSekolahBase64) {
      try {
        doc.addImage(logoSekolahBase64, 'PNG', pageWidth - 31, 10, 16, 16);
      } catch (e) {
        console.warn('Failed to add logo sekolah to PDF', e);
      }
    }
    
    // Parse print header lines from tenantInfo / fallbacks
    const rawLines = tenantInfo?.print_header_lines && tenantInfo.print_header_lines.length > 0
      ? tenantInfo.print_header_lines
      : [
          tenantInfo?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          tenantInfo?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
          tenantInfo?.nama_cabang_dinas || 'KANTOR CABANG DINA PENDIDIKAN WILAYAH IV',
          tenantInfo?.name || sekolah?.nama || 'SMK NEGERI 1 PLERED'
        ];
        
    const parsedLines = rawLines.map(line => {
      if (typeof line === 'object' && line !== null) {
        return line as any;
      }
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object' && 'text' in parsed) {
          return parsed;
        }
      } catch (e) {}
      return { text: line };
    });
    
    // Draw official lines
    let currentY = 13;
    parsedLines.forEach((line, index) => {
      const isLast = index === parsedLines.length - 1;
      const isSecondLast = index === parsedLines.length - 2 && parsedLines.length > 1;
      
      let fontSize = 7.5;
      let isBold = false;
      
      if (line.fontSize) {
        fontSize = line.fontSize * 0.7;
      } else {
        if (isLast) fontSize = 11;
        else if (isSecondLast) fontSize = 8.5;
        else fontSize = 7.5;
      }
      
      if (line.bold !== undefined) {
        isBold = line.bold;
      } else {
        if (isLast || isSecondLast) isBold = true;
      }
      
      doc.setFont('Helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      
      const textToDraw = String(line.text).toUpperCase();
      doc.text(textToDraw, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += (fontSize * 0.35) + 1.2;
    });
    
    // Draw Address and Contact Info
    const address = tenantInfo?.address || sekolah?.alamat || '';
    const phone = tenantInfo?.phone || sekolah?.telepon || '';
    const email = tenantInfo?.email || sekolah?.email || '';
    const website = tenantInfo?.website || sekolah?.website || '';
    
    if (address) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      const contactText = `${address}${phone ? ` | Telp: ${phone}` : ''}`;
      doc.text(contactText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 3.2;
    }
    
    if (website || email) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      const webText = `${website ? `Website: ${website}` : ''}${email ? ` | Email: ${email}` : ''}`;
      doc.text(webText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 3;
    }
    
    // Draw double lines under header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(15, currentY, pageWidth - 15, currentY);
    doc.setLineWidth(0.18);
    doc.line(15, currentY + 0.6, pageWidth - 15, currentY + 0.6);

    const headerEndY = currentY + 2.5;

    // Draw Document Content
    if (selectedPrintType === 'attendance') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('DAFTAR HADIR HARIAN SISWA', pageWidth / 2, headerEndY + 6, { align: 'center' });
      doc.setFontSize(9.5);
      doc.text(`TAHUN PELAJARAN ${checklistData?.current_year?.tahun || '2025/2026'}`, pageWidth / 2, headerEndY + 10, { align: 'center' });

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`Program Keahlian`, 15, headerEndY + 16);
      doc.text(`Tingkat/Konsentrasi Keahlian`, 15, headerEndY + 20);
      doc.text(`: ${(c?.Jurusan as any)?.nama || (c?.Jurusan as any)?.nama_jurusan || 'Teknik Elektronika'}`, 58, headerEndY + 16);
      doc.text(`: ${c?.nama_kelas || 'X TE 1'}`, 58, headerEndY + 20);

      const head = [
        [
          { content: 'NO', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'NIS', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'NISN', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'NAMA SISWA', rowSpan: 3, styles: { valign: 'middle' } },
          { content: 'Hari / Tanggal :\n....................................................', colSpan: 12, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Hari / Tanggal :\n....................................................', colSpan: 12, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'JAM KE-', colSpan: 12, styles: { halign: 'center' } },
          { content: 'JAM KE-', colSpan: 12, styles: { halign: 'center' } }
        ],
        [
          ...Array.from({ length: 12 }).map((_, i) => ({ content: String(i + 1), styles: { halign: 'center' } })),
          ...Array.from({ length: 12 }).map((_, i) => ({ content: String(i + 1), styles: { halign: 'center' } }))
        ]
      ];
      const body = classStudents.map((s, idx) => [
        idx + 1,
        s.nis || '-',
        s.nisn || '-',
        s.nama_siswa?.toUpperCase() || '',
        ...Array.from({ length: 24 }).map(() => '')
      ]);
      body.push([
        '',
        '',
        '',
        { content: '+++', styles: { halign: 'center' } } as any,
        ...Array.from({ length: 24 }).map(() => '')
      ]);

      autoTable(doc, {
        startY: headerEndY + 24,
        head: head as any,
        body: body as any,
        theme: 'grid',
        styles: { fontSize: 5.5, font: 'Helvetica', cellPadding: 0.8 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.15, lineColor: [0, 0, 0] },
        bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 38 },
        }
      });
    } else if (selectedPrintType === 'journal') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('BUKU JURNAL HARIAN KEGIATAN BELAJAR MENGAJAR (KBM)', pageWidth / 2, headerEndY + 6, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`KELAS: ${c?.nama_kelas?.toUpperCase() || '---'}  |  TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

      const head = [[
        { content: 'NO', styles: { halign: 'center' } },
        { content: 'HARI / TANGGAL', styles: { halign: 'center' } },
        { content: 'JAM KE-', styles: { halign: 'center' } },
        { content: 'MATA PELAJARAN' },
        { content: 'URAIAN MATERI / KD YANG DIAJARKAN' },
        { content: 'SISWA TIDAK HADIR (NAMA & ALASAN)' },
        { content: 'PARAF GURU', styles: { halign: 'center' } }
      ]];
      const body = Array.from({ length: 8 }).map((_, idx) => [
        idx + 1, '', '', '', '', '', ''
      ]);
      autoTable(doc, {
        startY: headerEndY + 16,
        head: head as any,
        body: body as any,
        theme: 'grid',
        styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2, minCellHeight: 12 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0], minCellHeight: 6 },
        bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 35 },
          4: { cellWidth: 60 },
          5: { cellWidth: 25 },
          6: { cellWidth: 15 }
        }
      });
    } else if (selectedPrintType === 'roster') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DAFTAR KELAS & DAFTAR FORMAT PENILAIAN GURU', pageWidth / 2, headerEndY + 6, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`KELAS: ${c?.nama_kelas?.toUpperCase() || '---'}  |  TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

      const head = [[
        { content: 'NO', styles: { halign: 'center' } },
        { content: 'NIS / NISN', styles: { halign: 'center' } },
        { content: 'NAMA LENGKAP SISWA' },
        { content: 'L/P', styles: { halign: 'center' } },
        ...Array.from({ length: 10 }).map((_, i) => ({ content: `COL ${i+1}`, styles: { halign: 'center' } }))
      ]];
      const body = classStudents.map((s, idx) => [
        idx + 1,
        s.nis || '-',
        s.nama_siswa?.toUpperCase() || '',
        String(s.jenis_kelamin).startsWith('L') ? 'L' : 'P',
        ...Array.from({ length: 10 }).map(() => '')
      ]);
      autoTable(doc, {
        startY: headerEndY + 16,
        head: head as any,
        body: body as any,
        theme: 'grid',
        styles: { fontSize: 7.5, font: 'Helvetica', cellPadding: 1.2 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0] },
        bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
        columnStyles: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 16, halign: 'center' },
          2: { cellWidth: 48 },
          3: { cellWidth: 6, halign: 'center' },
        }
      });
    } else if (selectedPrintType === 'sk_load') {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`LAMPIRAN SURAT KEPUTUSAN KEPALA ${sekolah?.nama?.toUpperCase() || 'SMK NEGERI CONTOH ABSENTA'}`, pageWidth / 2, headerEndY + 5, { align: 'center' });
      doc.text(`NOMOR: 421.3 / 088 / TU-CADISDIK / VI / ${new Date().getFullYear()}`, pageWidth / 2, headerEndY + 9, { align: 'center' });
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DISTRIBUSI GURU PENGAMPU BEBAN TUGAS MENGAJAR', pageWidth / 2, headerEndY + 15, { align: 'center' });
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`TAHUN PELAJARAN: ${checklistData?.current_year?.tahun || '---'}`, pageWidth / 2, headerEndY + 19, { align: 'center' });

      const head = [[
        { content: 'NO', styles: { halign: 'center' } },
        { content: 'NAMA GURU / NIP' },
        { content: 'MATA PELAJARAN YANG DIAMPU' },
        { content: 'KODE MAPEL', styles: { halign: 'center' } }
      ]];
      const body = guruMapelList.map((gm, idx) => [
        idx + 1,
        `${gm.Guru?.nama_guru || ''}\nNIP: ${gm.Guru?.nip || '---'}`,
        gm.Mapel?.nama_mapel?.toUpperCase() || '',
        gm.Mapel?.kode_mapel || '---'
      ]);
      autoTable(doc, {
        startY: headerEndY + 23,
        head: head as any,
        body: body as any,
        theme: 'grid',
        styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2 },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [0, 0, 0] },
        bodyStyles: { lineWidth: 0.15, lineColor: [0, 0, 0], textColor: [15, 23, 42] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 62 },
          2: { cellWidth: 70 },
          3: { cellWidth: 30, halign: 'center' }
        }
      });
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
