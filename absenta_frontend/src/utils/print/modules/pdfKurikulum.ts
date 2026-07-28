import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GenerateGenericPdfOptions } from '../pdfGeneric';
import { drawKopSurat } from '../pdfGeneric';

export interface StrukturPrintRow {
  id: string;
  nama: string;
  kode: string;
  jp: Record<number, number>;
}

export interface StrukturPrintData {
  umum: StrukturPrintRow[];
  kejuruan: StrukturPrintRow[];
  mulok: StrukturPrintRow[];
  pilihan: StrukturPrintRow[];
}

export interface RenderStrukturOptions {
  tenantInfo: any;
  sekolah: any;
  logoDaerahBase64: string | null;
  logoSekolahBase64: string | null;
  printRows: StrukturPrintData;
  selectedTahunNama: string;
  selectedJurusan: any;
  city: string;
  principalName: string;
  principalNip: string;
  wakasekName: string;
  wakasekNip: string;
  getJpValueForSemester: (nama: string, kode: string, tingkat: number, sem: 1 | 2, baseJp: number) => string;
  getKelompokTotal: (list: StrukturPrintRow[], tingkat: number, sem: 1 | 2) => number;
}

export const renderStrukturKurikulumPdf = (opts: RenderStrukturOptions): Blob => {
  const {
    tenantInfo, sekolah, logoDaerahBase64, logoSekolahBase64,
    printRows, selectedTahunNama, selectedJurusan, city,
    principalName, principalNip, wakasekName, wakasekNip,
    getJpValueForSemester, getKelompokTotal
  } = opts;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ---- KOP SURAT ----
  const headerEndY = drawKopSurat(doc, pageWidth, sekolah, tenantInfo, logoDaerahBase64, logoSekolahBase64, true);

  // ---- JUDUL ----
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('STRUKTUR KURIKULUM SATUAN PENDIDIKAN', pageWidth / 2, headerEndY + 5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(`TAHUN AJARAN ${selectedTahunNama}`, pageWidth / 2, headerEndY + 9.5, { align: 'center' });

  let metaY = headerEndY + 14;

  // ---- METADATA JURUSAN (SMK) ----
  if (selectedJurusan) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    const leftX = 15;
    const colonX = 50; // Adjusted for portrait
    doc.text('Bidang Keahlian', leftX, metaY);
    doc.text(`: ${selectedJurusan?.ProgramKeahlian?.bidang_keahlian || '-'}`, colonX, metaY);
    metaY += 3.8;
    doc.text('Program Keahlian', leftX, metaY);
    doc.text(`: ${selectedJurusan?.ProgramKeahlian?.nama || '-'}`, colonX, metaY);
    metaY += 3.8;
    doc.text('Konsentrasi Keahlian', leftX, metaY);
    doc.text(`: ${selectedJurusan?.nama || '-'}`, colonX, metaY);
    metaY += 3.5;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(15, metaY, pageWidth - 15, metaY);
    metaY += 2.5;
  }

  // ---- BUILD TABLE DATA ----
  const buildJpCells = (m: StrukturPrintRow) => {
    const cells: any[] = [];
    ([10, 11, 12] as const).forEach(tingkat => {
      ([1, 2] as const).forEach(sem => {
        const baseJp = m.jp[tingkat] || 0;
        const val = baseJp > 0 ? getJpValueForSemester(m.nama, m.kode, tingkat, sem, baseJp) : '-';
        cells.push({ content: val === '-' ? '-' : val, styles: { halign: 'center', fontSize: 7 } });
      });
    });
    return cells;
  };

  const buildTotalCells = (list: StrukturPrintRow[]) => {
    const cells: any[] = [];
    ([10, 11, 12] as const).forEach(tingkat => {
      ([1, 2] as const).forEach(sem => {
        const total = getKelompokTotal(list, tingkat, sem);
        cells.push({ content: total > 0 ? String(total) : '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7, fillColor: [241, 245, 249] } });
      });
    });
    return cells;
  };

  const head = [
    [
      { content: 'MATA PELAJARAN', rowSpan: 3, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 8, fillColor: [241, 245, 249] } },
      { content: 'KELAS', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, fillColor: [241, 245, 249] } }
    ],
    [
      { content: 'X', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, fillColor: [241, 245, 249] } },
      { content: 'XI', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, fillColor: [241, 245, 249] } },
      { content: 'XII', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, fillColor: [241, 245, 249] } }
    ],
    [
      { content: '1', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249] } },
      { content: '2', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249] } },
      { content: '1', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249] } },
      { content: '2', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249] } },
      { content: '1', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249] } },
      { content: '2', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249] } }
    ]
  ];

  const body: any[] = [];

  // A. UMUM
  body.push([
    { content: 'A. MATA PELAJARAN UMUM', colSpan: 7, styles: { fontStyle: 'bold', fontSize: 8, fillColor: [248, 250, 252], textColor: [15, 23, 42] } }
  ]);
  printRows.umum.forEach((m, idx) => {
    body.push([{ content: `${idx + 1}.  ${m.nama}`, styles: { fontSize: 7.5 } }, ...buildJpCells(m)]);
  });
  body.push([
    { content: 'Jumlah Jam Kelompok A', styles: { fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249] } },
    ...buildTotalCells(printRows.umum)
  ]);

  // B. KEJURUAN
  body.push([
    { content: 'B. MATA PELAJARAN KEJURUAN', colSpan: 7, styles: { fontStyle: 'bold', fontSize: 8, fillColor: [248, 250, 252], textColor: [15, 23, 42] } }
  ]);
  printRows.kejuruan.forEach((m, idx) => {
    body.push([{ content: `${idx + 1}.  ${m.nama}`, styles: { fontSize: 7.5 } }, ...buildJpCells(m)]);
  });

  // C. PILIHAN & MULOK
  if (printRows.pilihan.length > 0 || printRows.mulok.length > 0) {
    body.push([
      { content: 'C. MATA PELAJARAN PILIHAN & MUATAN LOKAL', colSpan: 7, styles: { fontStyle: 'bold', fontSize: 8, fillColor: [248, 250, 252], textColor: [15, 23, 42] } }
    ]);
    [...printRows.pilihan, ...printRows.mulok].forEach((m, idx) => {
      body.push([{ content: `${idx + 1}.  ${m.nama}`, styles: { fontSize: 7.5 } }, ...buildJpCells(m)]);
    });
  }

  const allKejuruanPlusMisc = [...printRows.kejuruan, ...printRows.pilihan, ...printRows.mulok];
  body.push([
    { content: 'Jumlah Jam Kelompok B + C', styles: { fontStyle: 'bold', fontSize: 7.5, fillColor: [241, 245, 249] } },
    ...buildTotalCells(allKejuruanPlusMisc)
  ]);

  // TOTAL
  const totalCells: any[] = [];
  ([10, 11, 12] as const).forEach(tingkat => {
    ([1, 2] as const).forEach(sem => {
      const total = getKelompokTotal(printRows.umum, tingkat, sem) + getKelompokTotal(allKejuruanPlusMisc, tingkat, sem);
      totalCells.push({ content: total > 0 ? String(total) : '-', styles: { halign: 'center', fontStyle: 'bold', fontSize: 8, fillColor: [220, 252, 231], textColor: [22, 101, 52] } });
    });
  });
  body.push([
    { content: 'TOTAL BEBAN BELAJAR (A + B + C)', styles: { fontStyle: 'bold', fontSize: 8, fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
    ...totalCells
  ]);

  // ---- RENDER TABLE ----
  const colMapelWidth = pageWidth - 30 - 6 * 15; // Set semester columns to 15mm
  autoTable(doc, {
    startY: metaY,
    head: head as any,
    body: body as any,
    theme: 'grid',
    styles: {
      font: 'Helvetica',
      cellPadding: 1.4, // Reduced padding to fit 1 page
      lineColor: [180, 180, 180],
      lineWidth: 0.18,
      fontSize: 6.8,    // Slightly reduced font size for table
      valign: 'middle'
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      lineWidth: 0.25
    },
    columnStyles: {
      0: { cellWidth: colMapelWidth },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' }
    }
  });

  // ---- TANDA TANGAN ----
  let finalY = (doc as any).lastAutoTable?.finalY ?? (pageHeight - 50);
  if (finalY + 38 > pageHeight) {
    doc.addPage();
    finalY = 20;
  }

  const sigY = finalY + 7;
  const margin = 15;
  const midX = pageWidth / 2;

  // Blok TTD kiri: mulai dari margin (15mm), lebar ~(midX - margin - 5)
  const leftBlockX = margin;
  // Blok TTD kanan: mulai dari midX + 5
  const rightBlockX = midX + 5;

  // Fungsi helper: tulis nama dengan underline rata kiri
  const drawSignatureName = (name: string, x: number, y: number) => {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(name, x, y);
    // Underline manual: garis di bawah teks
    const textWidth = doc.getTextWidth(name);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(x, y + 0.8, x + textWidth, y + 0.8);
    doc.setFont('Helvetica', 'normal');
  };

  // Tanggal: gunakan tanggal_mulai TP jika tersedia, fallback ke hari ini
  const dateStr = `${city}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  // ── TTD KIRI: Wakasek Kurikulum ──
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Mengetahui,', leftBlockX, sigY);
  doc.text('Wakasek Bidang Kurikulum', leftBlockX, sigY + 4);
  // Ruang tanda tangan (14mm)
  if (wakasekName) {
    drawSignatureName(wakasekName, leftBlockX, sigY + 18);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`NIP. ${wakasekNip || '-'}`, leftBlockX, sigY + 22.5);
  } else {
    doc.setFontSize(8);
    doc.text('(___________________________)', leftBlockX, sigY + 18);
    doc.setFontSize(7.5);
    doc.text('NIP. ________________________', leftBlockX, sigY + 22.5);
  }

  // ── TTD KANAN: Kepala Sekolah ──
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(dateStr, rightBlockX, sigY);
  doc.text('Kepala Sekolah,', rightBlockX, sigY + 4);
  // Ruang tanda tangan (14mm)
  if (principalName) {
    drawSignatureName(principalName, rightBlockX, sigY + 18);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`NIP. ${principalNip || '-'}`, rightBlockX, sigY + 22.5);
  } else {
    doc.setFontSize(8);
    doc.text('(___________________________)', rightBlockX, sigY + 18);
    doc.setFontSize(7.5);
    doc.text('NIP. ________________________', rightBlockX, sigY + 22.5);
  }


  return doc.output('blob');
};



export const renderKurikulumCalendarPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  headerEndY: number,
  pageWidth: number,
  pageHeight: number
): number => {
  doc.setFontSize(11);
  doc.setFont('Helvetica', 'bold');
  doc.text('KALENDER AKADEMIK & HARI EFEKTIF SEKOLAH', pageWidth / 2, headerEndY + 6, { align: 'center' });
  
  const head = [['BULAN', 'HARI EFEKTIF', 'HARI LIBUR', 'KEGIATAN UTAMA']];
  const body = [
    ['Juli', '18 Hari', '13 Hari', 'PLS & Awal Tahun Ajaran'],
    ['Agustus', '21 Hari', '10 Hari', 'HUT RI & Pembelajaran Efektif'],
    ['September', '19 Hari', '11 Hari', 'Asesmen Tengah Semester'],
    ['Oktober', '22 Hari', '9 Hari', 'Bulan Bahasa & Pembelajaran'],
    ['November', '21 Hari', '9 Hari', 'Praktik Industri'],
    ['Desember', '10 Hari', '21 Hari', 'PAS & Pembagian Rapor']
  ];
  autoTable(doc, {
    startY: headerEndY + 14,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 9, font: 'Helvetica', cellPadding: 3.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
  });
  return (doc as any).lastAutoTable?.finalY ?? (headerEndY + 50);
};

export const renderKurikulumRosterPdf = (
  doc: jsPDF,
  options: GenerateGenericPdfOptions,
  pageWidth: number,
  pageHeight: number,
  sekolah: any,
  tenantInfo: any,
  logoDaerahBase64: string | null,
  logoSekolahBase64: string | null,
  includeSchoolLogo: boolean,
  principalName: string,
  principalNip: string,
  drawKopSurat: any
): Blob => {
  const { printType, selectedClassId, selectedGuruId, filterData } = options;

  const jadwalList = (filterData?.jadwalList || []) as any[];
  const jenisKegiatanList = (filterData?.jenisKegiatanList || []) as any[];

  const getActivityInfo = (id?: string) => {
    if (!id) return null;
    return jenisKegiatanList.find(k => k.id === id);
  };

  const groups = new Map<string, any[]>();
  if (printType === 'roster_teacher') {
    if (selectedGuruId === 'all') {
      jadwalList.forEach(j => {
        const name = j.Guru?.User?.full_name || 'Guru Tanpa Nama';
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name)!.push(j);
      });
    } else {
      const g = (filterData?.gurus as any[])?.find(x => x.id === selectedGuruId);
      const name = g?.nama_guru || 'Guru';
      groups.set(name, jadwalList);
    }
  } else {
    if (selectedClassId === 'all') {
      jadwalList.forEach(j => {
        const name = j.Kelas?.nama_kelas || 'Tanpa Kelas';
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name)!.push(j);
      });
    } else {
      const cls = (filterData?.classes as any[])?.find(c => c.id === selectedClassId);
      const name = cls?.nama_kelas || 'Kelas';
      groups.set(name, jadwalList);
    }
  }

  const groupNamesList = Array.from(groups.keys());
  const totalGroups = groupNamesList.length > 0 ? groupNamesList.length : 1;

  for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
    const groupName = groupNamesList[groupIndex] || '---';
    const groupJadwal = groups.get(groupName) || [];

    // 1. Draw Header
    const headerEndY = drawKopSurat(
      doc,
      pageWidth,
      sekolah,
      tenantInfo,
      logoDaerahBase64,
      logoSekolahBase64,
      includeSchoolLogo
    );

    // 2. Draw Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    const titleText = printType === 'roster_teacher' ? 'JADWAL MENGAJAR GURU' : 'JADWAL PELAJARAN MINGGUAN KELAS';
    doc.text(titleText, pageWidth / 2, headerEndY + 6, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    const subTitleText = printType === 'roster_teacher' ? `NAMA GURU: ${groupName.toUpperCase()}` : `KELAS: ${groupName.toUpperCase()}`;
    doc.text(subTitleText, pageWidth / 2, headerEndY + 11, { align: 'center' });

    // Clean separator line below title
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.2);
    doc.line(15, headerEndY + 14, pageWidth - 15, headerEndY + 14);

    // 3. Draw Timetable Grid
    const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];
    const days = [...DAYS];
    if (groupJadwal.some(j => j.hari === 'SABTU')) {
      days.push('SABTU');
    }

    const DAY_ABBR: Record<string, string> = {
      'SENIN': 'SENIN',
      'SELASA': 'SELASA',
      'RABU': 'RABU',
      'KAMIS': 'KAMIS',
      'JUMAT': 'JUMAT',
      'SABTU': 'SABTU',
    };

    const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);

    const SLOT_TIME_FALLBACK: Record<number, string> = {
      1: "07:00-07:45",
      2: "07:45-08:30",
      3: "08:30-09:15",
      4: "09:35-10:20",
      5: "10:20-11:05",
      6: "11:05-11:50",
      7: "12:30-13:15",
      8: "13:15-14:00",
      9: "14:00-14:45",
      10: "14:45-15:30",
      11: "15:30-16:15",
      12: "16:15-17:00",
    };

    const head = [
      [
        'HARI',
        ...SLOTS.map(slot => {
          const time = SLOT_TIME_FALLBACK[slot] || '';
          return `JAM ${slot}\n(${time})`;
        })
      ]
    ];

    const getSlotData = (dayStr: string, slotNum: number) => {
      const timeRange = SLOT_TIME_FALLBACK[slotNum] || '';
      const startTime = timeRange.split('-')[0];
      return groupJadwal.find(j => 
        j.hari === dayStr && 
        j.jam_mulai && j.jam_mulai.startsWith(startTime)
      );
    };

    const body: any[] = [];
    days.forEach(day => {
      const row: any[] = [DAY_ABBR[day]];
      let skipCount = 0;

      for (let i = 0; i < SLOTS.length; i++) {
        if (skipCount > 0) {
          skipCount--;
          continue;
        }

        const slot = SLOTS[i];
        const item = getSlotData(day, slot);

        if (!item) {
          row.push('');
          continue;
        }

        // Look ahead for consecutive matches
        let colSpan = 1;
        let nextIdx = i + 1;
        while (nextIdx < SLOTS.length) {
          const nextSlot = SLOTS[nextIdx];
          const nextItem = getSlotData(day, nextSlot);
          if (
            nextItem &&
            String(nextItem.kelas_id || '') === String(item.kelas_id || '') &&
            String(nextItem.guru_id || '') === String(item.guru_id || '') &&
            String(nextItem.mapel_id || '') === String(item.mapel_id || '') &&
            String(nextItem.jenis_kegiatan || '').toUpperCase() === String(item.jenis_kegiatan || '').toUpperCase()
          ) {
            colSpan++;
            nextIdx++;
          } else {
            break;
          }
        }

        skipCount = colSpan - 1;

        // Resolve display text
        const act = getActivityInfo(item.jenis_kegiatan);
        const isKbm = 
          !item.jenis_kegiatan || 
          String(item.jenis_kegiatan).toUpperCase() === 'KBM' || 
          (act && act.tipe?.toUpperCase() === 'KBM');
        const subjectName = isKbm && item.Mapel?.nama_mapel ? item.Mapel.nama_mapel : (act?.nama || 'KEGIATAN');

        let cellText = '';
        if (printType === 'roster_teacher') {
          const targetClass = item.Kelas?.nama_kelas || 'Kelas';
          cellText = `${subjectName.toUpperCase()}\n(${targetClass})`;
        } else {
          const teacher = item.Guru?.User?.full_name || 'Guru';
          const teacherShort = teacher.split(' ')[0];
          cellText = `${subjectName.toUpperCase()}\n(${teacherShort})`;
        }

        if (colSpan > 1) {
          row.push({
            content: cellText,
            colSpan,
            styles: { fillColor: [239, 246, 255] }
          });
        } else {
          row.push(cellText);
        }
      }
      body.push(row);
    });

    autoTable(doc, {
      startY: headerEndY + 17,
      head,
      body,
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        font: 'Helvetica', 
        cellPadding: 3, 
        halign: 'center', 
        valign: 'middle',
        lineColor: [148, 163, 184],
        lineWidth: 0.15
      },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { cellWidth: 24.5 },
        2: { cellWidth: 24.5 },
        3: { cellWidth: 24.5 },
        4: { cellWidth: 24.5 },
        5: { cellWidth: 24.5 },
        6: { cellWidth: 24.5 },
        7: { cellWidth: 24.5 },
        8: { cellWidth: 24.5 },
        9: { cellWidth: 24.5 },
        10: { cellWidth: 24.5 }
      }
    });

    // 4. Draw Signature
    let finalY = (doc as any).lastAutoTable?.finalY ?? 100;
    if (finalY + 38 > pageHeight) {
      doc.addPage();
      finalY = 20;
    }
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

    if (groupIndex < totalGroups - 1) {
      doc.addPage();
    }
  }

  return doc.output('blob');
};
