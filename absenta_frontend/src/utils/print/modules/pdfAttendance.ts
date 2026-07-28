import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerateGenericPdfOptions } from '../pdfGeneric';
import { drawClassHeaderInfo } from '../pdfGeneric';

export const renderAttendancePdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): number => {
  const { printType, selectedClassId, eventDetails, filterData } = options;

  let studentsList = [];
  const rekapList = filterData?.rekapList;
  if (Array.isArray(rekapList)) {
    studentsList = rekapList;
  } else if (rekapList?.students && Array.isArray(rekapList.students)) {
    studentsList = rekapList.students;
  } else if (filterData?.students && Array.isArray(filterData.students)) {
    studentsList = filterData.students;
  }

  const selectedClassObj = filterData?.classes?.find((c: any) => c.id === selectedClassId);
  const className = selectedClassObj?.nama_kelas || 'SEMUA';

  let currentY = headerEndY;

  if (printType === 'monthly_recap' || printType === 'semester_recap' || printType === 'monthly_matrix') {
    const isMatrixMode = filterData?.viewMode === 'MATRIX' || printType === 'monthly_matrix';

    if (isMatrixMode) {
      const selectedMonth = eventDetails?.bulanRekap || new Date().toISOString().substring(0, 7);
      let daysInMonth = 31;
      try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        daysInMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
      } catch (e) {}

      let periodLabel = selectedMonth;
      try {
        const dt = new Date(`${selectedMonth}-02`);
        periodLabel = dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      } catch (e) {}

      const docTitle = filterData?.mapelName
        ? `LEGER REKAPITULASI PRESENSI MAPEL ${filterData.mapelName.toUpperCase()}`
        : 'LEGER REKAPITULASI PRESENSI HARIAN BULANAN';

      const tableStartY = drawClassHeaderInfo(
        doc,
        docTitle,
        selectedClassObj,
        headerEndY,
        pageWidth,
        options.checklistData,
        `Periode: ${periodLabel}`,
        selectedMonth
      );

      const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
      const head = [['NO', 'NIS', 'NAMA SISWA', ...dayHeaders, 'H', 'S', 'I', 'A', 'T', 'POIN']];

      const body = studentsList.map((s: any, idx: number) => {
        const name = s.nama || s.nama_siswa || '-';
        const nis = s.nis || '-';
        const dailyMap = s.dailyMap || {};
        const days = dayHeaders.map(d => dailyMap[d] || '-');
        const hadir = s.hadir !== undefined ? s.hadir : (s.HADIR !== undefined ? s.HADIR : 0);
        const sakit = s.sakit !== undefined ? s.sakit : (s.SAKIT !== undefined ? s.SAKIT : 0);
        const izin = s.izin !== undefined ? s.izin : (s.IZIN !== undefined ? s.IZIN : 0);
        const alpa = s.alpa !== undefined ? s.alpa : (s.ALPA !== undefined ? s.ALPA : 0);
        const telat = s.terlambat !== undefined ? s.terlambat : (s.TERLAMBAT !== undefined ? s.TERLAMBAT : 0);
        const poin = s.total_poin !== undefined ? s.total_poin : (s.poin !== undefined ? s.poin : 0);

        return [
          (idx + 1).toString(),
          nis,
          name.toUpperCase(),
          ...days,
          hadir.toString(),
          sakit.toString(),
          izin.toString(),
          alpa.toString(),
          telat.toString(),
          poin.toString()
        ];
      });

      autoTable(doc, {
        startY: tableStartY,
        margin: { left: 8, right: 8 },
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 5.5, font: 'Helvetica', cellPadding: 0.6, halign: 'center', textColor: [15, 23, 42] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.1, lineColor: [203, 213, 225], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { lineWidth: 0.1, lineColor: [226, 232, 240] },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 42, halign: 'left' }
        }
      });
      currentY = (doc as any).lastAutoTable?.finalY ?? tableStartY;
    } else {
      const totalStudents = studentsList.length > 0 ? studentsList.length : 5;
      
      const documentTitle = printType === 'semester_recap'
        ? 'REKAP KEHADIRAN SEMESTER KELAS (LEGER ABSENSI)'
        : 'REKAP KEHADIRAN & ABSENSI BULANAN';
      
      const selectedMonth = eventDetails?.bulanRekap || new Date().toISOString().substring(0, 7);
      let periodLabel = '';
      if (printType === 'semester_recap') {
        try {
          const [yearStr, monthStr] = selectedMonth.split('-');
          const month = parseInt(monthStr);
          const isSemester1 = month >= 7;
          periodLabel = isSemester1 ? `SEMESTER GANJIL ${yearStr}/${parseInt(yearStr)+1}` : `SEMESTER GENAP ${parseInt(yearStr)-1}/${yearStr}`;
        } catch (e) {
          periodLabel = selectedMonth;
        }
      } else {
        try {
          const dt = new Date(`${selectedMonth}-02`);
          periodLabel = dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        } catch (e) {
          periodLabel = selectedMonth;
        }
      }

      const tableStartY = drawClassHeaderInfo(
        doc,
        documentTitle,
        selectedClassObj,
        headerEndY,
        pageWidth,
        options.checklistData,
        `Periode: ${periodLabel}`,
        selectedMonth
      );

      let fontSize = 7.5;
      let cellPadding = 1.5;

      if (totalStudents > 36) {
        fontSize = 5.8;
        cellPadding = 0.45;
      } else if (totalStudents > 25) {
        fontSize = 6.5;
        cellPadding = 0.8;
      }

      const getStudentRow = (s: any, displayIdx: number) => {
        const name = s.nama || s.nama_siswa || '-';
        const studentObj = filterData?.students?.find((std: any) => std.id === s.id || std.nama_siswa === name);
        const nis = s.nis || studentObj?.nis || '-';
        const hadir = s.hadir !== undefined ? s.hadir : (s.HADIR !== undefined ? s.HADIR : 0);
        const sakit = s.sakit !== undefined ? s.sakit : (s.SAKIT !== undefined ? s.SAKIT : 0);
        const izin = s.izin !== undefined ? s.izin : (s.IZIN !== undefined ? s.IZIN : 0);
        const alpa = s.alpa !== undefined ? s.alpa : (s.ALPA !== undefined ? s.ALPA : 0);
        const persentase = s.persentase !== undefined ? s.persentase : (s.PERSENTASE !== undefined ? s.PERSENTASE : 100);

        return [
          displayIdx.toString(),
          nis,
          name.toUpperCase(),
          `${hadir} Hari`,
          `${sakit} Hari`,
          `${izin} Hari`,
          `${alpa} Hari`,
          `${persentase}%`
        ];
      };

      let body = [];
      if (studentsList.length > 0) {
        body = studentsList.map((s: any, idx: number) => getStudentRow(s, idx + 1));
      } else {
        body = [
          ['1', '1023881', 'AHMAD SULAIMAN', '20 Hari', '0 Hari', '1 Hari', '0 Hari', '95%'],
          ['2', '1023882', 'BUDI SETIAWAN', '21 Hari', '0 Hari', '0 Hari', '0 Hari', '100%'],
          ['3', '1023883', 'CITRA LESTARI', '19 Hari', '1 Hari', '1 Hari', '0 Hari', '90%'],
          ['4', '1023884', 'DEWI ANGRAENI', '21 Hari', '0 Hari', '0 Hari', '0 Hari', '100%'],
          ['5', '1023885', 'EKO PRASETYO', '18 Hari', '0 Hari', '1 Hari', '2 Hari', '85%']
        ];
      }

      const head = [['NO', 'NIS', 'NAMA SISWA', 'HADIR', 'SAKIT', 'IZIN', 'ALFA', 'PERSENTASE']];

      autoTable(doc, {
        startY: tableStartY,
        margin: { left: 15, right: 15 },
        head,
        body,
        theme: 'grid',
        styles: { fontSize, font: 'Helvetica', cellPadding, halign: 'center', textColor: [15, 23, 42] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [203, 213, 225], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { lineWidth: 0.15, lineColor: [226, 232, 240] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },  // NO
          1: { cellWidth: 20, halign: 'center' },  // NIS
          2: { cellWidth: 'auto', halign: 'left' }, // NAMA SISWA
          3: { cellWidth: 18, halign: 'center' },  // HADIR
          4: { cellWidth: 18, halign: 'center' },  // SAKIT
          5: { cellWidth: 18, halign: 'center' },  // IZIN
          6: { cellWidth: 18, halign: 'center' },  // ALFA
          7: { cellWidth: 22, halign: 'center' }   // PERSENTASE
        }
      });
      currentY = (doc as any).lastAutoTable?.finalY ?? tableStartY;
    }

    // ─── Blok Tanda Tangan 2 Kolom: Guru Mapel / Wali Kelas (kiri) + Kepala Sekolah (kanan) ───
    const isMapelPdf = Boolean(filterData?.mapelName || filterData?.guruMapelName);
    const leftTitle = isMapelPdf ? 'Guru Mata Pelajaran,' : 'Wali Kelas,';
    const leftName: string = isMapelPdf
      ? (filterData?.guruMapelName || '________________________')
      : (filterData?.waliKelasName || '________________________');
    const leftNip: string  = isMapelPdf
      ? (filterData?.guruMapelNip || '')
      : (filterData?.waliKelasNip || '');

    // principalName/Nip diinjeksi oleh pdfGeneric.ts dari strukturList/sekolah/tenantInfo
    const principalName: string = filterData?._principalName
      || options.checklistData?.kepala_sekolah
      || '________________________';
    const principalNip: string  = filterData?._principalNip
      || options.checklistData?.nip_kepala
      || '';

    const kota = (() => {
      try {
        const alamat = (options.sekolah as any)?.alamat || '';
        return alamat.split(',')[0]?.trim() || 'Purwakarta';
      } catch { return 'Purwakarta'; }
    })();
    const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const sigSpaceNeeded = 46;
    if (currentY + sigSpaceNeeded > pageHeight - 8) {
      doc.addPage();
      currentY = 15;
    }

    const sigY = currentY + 6;
    const leftCenterX  = 15 + 30;   // 45mm dari kiri
    const rightCenterX = pageWidth - 15 - 30; // 30mm dari kanan

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    // Baris tanggal — rata kanan
    doc.text(`${kota}, ${tanggal}`, rightCenterX + 30, sigY, { align: 'right' });

    // Baris judul kolom (sama Y)
    doc.text(leftTitle, leftCenterX, sigY + 6, { align: 'center' });
    doc.text('Mengetahui,', rightCenterX, sigY + 6, { align: 'center' });
    doc.text('Kepala Sekolah,', rightCenterX, sigY + 11, { align: 'center' });

    // Nama — setelah ruang tanda tangan 20mm
    const nameY = sigY + 31;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(leftName.toUpperCase(), leftCenterX, nameY, { align: 'center' });
    doc.text(principalName.toUpperCase(), rightCenterX, nameY, { align: 'center' });

    // NIP
    const nipY = nameY + 4;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    if (leftNip) {
      const nipText = leftNip.startsWith('NIP') ? leftNip : `NIP. ${leftNip}`;
      doc.text(nipText, leftCenterX, nipY, { align: 'center' });
    }
    if (principalNip) {
      const nipText = principalNip.startsWith('NIP') ? principalNip : `NIP. ${principalNip}`;
      doc.text(nipText, rightCenterX, nipY, { align: 'center' });
    }

    currentY = nipY + 8;

  } else if (printType === 'blank_attendance') {
    const listSiswa = filterData?.students || [];
    const totalStudents = listSiswa.length > 0 ? listSiswa.length : 15;
    
    const tableStartY = drawClassHeaderInfo(
      doc,
      'BLANKO DAFTAR HADIR MANUAL KELAS',
      selectedClassObj,
      headerEndY,
      pageWidth,
      options.checklistData
    );

    let fontSize = 7.5;
    let cellPadding = 1.4;
    let minCellHeight = 7.0;

    if (totalStudents > 36) {
      fontSize = 5.6;
      cellPadding = 0.45;
      minCellHeight = 3.2;
    } else if (totalStudents > 25) {
      fontSize = 6.3;
      cellPadding = 0.7;
      minCellHeight = 4.0;
    }

    const head = [['NO', 'NIS', 'NAMA SISWA LENGKAP', 'L/P', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'KETERANGAN']];
    let body = [];
    
    if (listSiswa.length > 0) {
      body = listSiswa.map((s: any, idx: number) => {
        const jk = s.jenis_kelamin || s.jk || s.gender || '';
        const jkLabel = jk.toUpperCase().startsWith('L') ? 'L' : (jk.toUpperCase().startsWith('P') ? 'P' : '-');
        return [
          (idx + 1).toString(),
          s.nis || '-',
          s.nama_siswa?.toUpperCase() || '-',
          jkLabel,
          '', '', '', '', '', '', '', '', '', '', ''
        ];
      });
    } else {
      body = Array.from({ length: 15 }).map((_, idx) => [
        (idx + 1).toString(),
        '252610059' + (idx % 10),
        'NAMA SISWA CONTOH ' + (idx + 1),
        'L',
        '', '', '', '', '', '', '', '', '', '', ''
      ]);
    }

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: 15, right: 15 },
      head,
      body,
      theme: 'grid',
      styles: { fontSize, font: 'Helvetica', cellPadding, halign: 'center', textColor: [15, 23, 42] },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [203, 213, 225], fontStyle: 'bold' },
      bodyStyles: { lineWidth: 0.15, lineColor: [203, 213, 225], minCellHeight },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },  // NO
        1: { cellWidth: 24, halign: 'center' }, // NIS
        2: { cellWidth: 'auto', halign: 'left' }, // NAMA SISWA
        3: { cellWidth: 7, halign: 'center' },  // L/P
        4: { cellWidth: 6.5 }, // 1
        5: { cellWidth: 6.5 }, // 2
        6: { cellWidth: 6.5 }, // 3
        7: { cellWidth: 6.5 }, // 4
        8: { cellWidth: 6.5 }, // 5
        9: { cellWidth: 6.5 }, // 6
        10: { cellWidth: 6.5 }, // 7
        11: { cellWidth: 6.5 }, // 8
        12: { cellWidth: 6.5 }, // 9
        13: { cellWidth: 6.5 }, // 10
        14: { cellWidth: 22, halign: 'center' } // KETERANGAN
      }
    });
    currentY = (doc as any).lastAutoTable?.finalY ?? tableStartY;

  } else if (printType === 'attendance_warning') {
    const studentId = options.selectedStudentId;
    const student = filterData?.students?.find((std: any) => std.id === studentId) || filterData?.students?.[0];
    const studentName = student?.nama_siswa || 'AHMAD SULAIMAN';
    const studentNis = student?.nis || '1023881';
    
    const studentStats = filterData?.rekapList?.students?.find((s: any) => s.id === studentId || s.nama === studentName);
    const alpaCount = studentStats?.alpa !== undefined ? studentStats.alpa : 3;

    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('SURAT PERINGATAN KETIDAKHADIRAN SISWA (SP)', pageWidth / 2, headerEndY + 6, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    let textY = headerEndY + 16;
    doc.text(`Nomor : 800 / _____ / Kesiswaan / ${new Date().getFullYear()}`, 15, textY);
    doc.text('Hal   : Surat Teguran / Peringatan Ketidakhadiran', 15, textY + 5);
    
    doc.text('Kepada Yth.', 15, textY + 15);
    doc.setFont('Helvetica', 'bold');
    doc.text('Orang Tua / Wali Siswa', 15, textY + 20);
    doc.setFont('Helvetica', 'normal');
    doc.text('Di tempat', 15, textY + 25);
    
    doc.text('Dengan hormat,', 15, textY + 34);
    doc.text('Berdasarkan hasil pemantauan presensi dan ketertiban siswa, dengan ini kami sampaikan', 15, textY + 39);
    doc.text('bahwa siswa di bawah ini:', 15, textY + 44);
    
    doc.setFont('Helvetica', 'bold');
    doc.text('Nama Siswa', 25, textY + 52);
    doc.text(':', 55, textY + 52);
    doc.text(studentName.toUpperCase(), 58, textY + 52);
    
    doc.text('NIS', 25, textY + 57);
    doc.text(':', 55, textY + 57);
    doc.text(studentNis, 58, textY + 57);
    
    doc.text('Kelas', 25, textY + 62);
    doc.text(':', 55, textY + 62);
    doc.text(className, 58, textY + 62);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Telah melalaikan kewajiban sekolah dengan tidak hadir tanpa keterangan (Alfa) sebanyak:`, 15, textY + 70);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${alpaCount} HARI`, 15, textY + 75);
    doc.setFont('Helvetica', 'normal');
    doc.text('pada periode bulan berjalan ini.', 35, textY + 75);
    
    doc.text('Sehubungan dengan hal tersebut, kami memberikan Surat Peringatan ini agar menjadi perhatian', 15, textY + 83);
    doc.text('serius bagi Bapak/Ibu selaku orang tua/wali untuk membina putra/putrinya agar lebih disiplin.', 15, textY + 88);
    doc.text('Jika ketidakhadiran berlanjut, sekolah terpaksa akan mengambil tindakan disiplin tingkat lanjut.', 15, textY + 93);
    
    doc.text('Demikian surat peringatan ini disampaikan, atas perhatian Bapak/Ibu kami mengucapkan terima kasih.', 15, textY + 101);
    
    currentY = textY + 107;

  } else if (printType === 'teacher_attendance') {
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('LAPORAN HARIAN KEHADIRAN & JURNAL MENGAJAR GURU', pageWidth / 2, headerEndY + 6, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    
    const targetDate = eventDetails?.tanggalLaporan || new Date().toISOString().substring(0, 10);
    let formattedDate = '';
    try {
      const dt = new Date(targetDate);
      formattedDate = dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      formattedDate = targetDate;
    }
    
    doc.text(`HARI / TANGGAL: ${formattedDate.toUpperCase()}`, pageWidth / 2, headerEndY + 11, { align: 'center' });

    const head = [['NO', 'NAMA GURU LENGKAP', 'MATA PELAJARAN', 'KELAS / RUANG', 'STATUS KEHADIRAN']];
    
    const listGuruAbsen = Array.isArray(filterData?.rekapList) ? filterData.rekapList : [];
    let body = [];
    
    if (listGuruAbsen.length > 0) {
      body = listGuruAbsen.map((g: any, idx: number) => [
        (idx + 1).toString(),
        g.nama_guru?.toUpperCase() || '-',
        g.mapel || '-',
        g.kelas || '-',
        g.status || '-'
      ]);
    } else {
      body = [
        ['1', 'DRS. H. CONTOH GURU', 'Pemrograman Web', 'XI PPLG 1', 'HADIR'],
        ['2', 'BUDI SETIAWAN, S.Kom.', 'Jaringan Komputer', 'XI TJKT 2', 'TERLAMBAT'],
        ['3', 'CITRA LESTARI, M.Pd.', 'Matematika', 'X AKL 1', 'HADIR'],
        ['4', 'DEWI ANGRAENI, S.S.', 'Bahasa Inggris', 'XII PH 3', 'IZIN'],
        ['5', 'EKO PRASETYO, S.T.', 'Fisika Industri', 'X TE 2', 'ALPA']
      ];
    }

    autoTable(doc, {
      startY: headerEndY + 16,
      margin: { left: 15, right: 15 },
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8, font: 'Helvetica', cellPadding: 2, halign: 'center', textColor: [15, 23, 42] },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], lineWidth: 0.15, lineColor: [203, 213, 225], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      bodyStyles: { lineWidth: 0.15, lineColor: [226, 232, 240] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },  // NO
        1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' }, // NAMA GURU
        2: { cellWidth: 40, halign: 'left' },  // MAPEL
        3: { cellWidth: 30, halign: 'center' }, // KELAS
        4: { cellWidth: 28, halign: 'center' }  // STATUS
      }
    });
    currentY = (doc as any).lastAutoTable?.finalY ?? (headerEndY + 50);
  }

  return currentY;
};
