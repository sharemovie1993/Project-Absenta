import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getKelasDetail } from '../../../api/academic/kelas.api';
import { getMyTenant } from '../../../api/tenants.api';
import { formatIndoDate } from './raporShared';

/**
 * 📊 3. Generate Buku Leger Nilai PDF (Landscape A4 - Client-side jsPDF)
 */
export const generateLegerPdf = async (options: {
  kelasId: string;
  tahunPelajaranId: string;
  semesterId: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  kelasNama?: string;
}): Promise<{ blobUrl: string; filename: string }> => {
  const { kelasId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama } = options;

  const [legerRes, sekolahRes, tenantRes, settingsRes, kelasRes] = await Promise.allSettled([
    raporApi.getLeger({ kelas_id: kelasId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings().catch(() => null),
    kelasId ? getKelasDetail(kelasId).catch(() => null) : Promise.resolve(null),
  ]);

  const legerData = legerRes.status === 'fulfilled' ? (legerRes.value?.data || legerRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  const settingsData = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;
  const kelasDetailData = kelasRes.status === 'fulfilled' ? (kelasRes.value as any) : null;

  if (!legerData) {
    throw new Error('Gagal memuat data buku leger dari server.');
  }

  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = 297;
  const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SMKN 1 PLERED';
  const effectiveKota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';
  const tpText = tahunPelajaranNama || legerData?.tahun_pelajaran?.tahun || '2025 / 2026';
  const semText = semesterNama || legerData?.semester?.nama_semester || 'Ganjil';

  // Smart Academic Class Resolution (Prioritize actual class name from DB/Leger/API over generic 'Kelas')
  const rawOption = (kelasNama && kelasNama.trim().toLowerCase() !== 'kelas') ? kelasNama.trim() : '';
  const rawLeger = (legerData?.kelas?.nama_kelas && legerData.kelas.nama_kelas.trim().toLowerCase() !== 'kelas') ? legerData.kelas.nama_kelas.trim() : '';
  const rawApi = (kelasDetailData?.nama_kelas || kelasDetailData?.data?.nama_kelas) ? (kelasDetailData?.nama_kelas || kelasDetailData?.data?.nama_kelas).trim() : '';
  const rawStudent = (legerData?.students?.[0]?.kelas && legerData.students[0].kelas.trim().toLowerCase() !== 'kelas') ? legerData.students[0].kelas.trim() : '';
  const klsText = rawOption || rawLeger || rawApi || rawStudent || 'X TE 3';

  // Smart Academic Fallback for titimangsa date
  const isGenap = Boolean(semText.toLowerCase().includes('genap') || semText.includes('2'));
  let effectiveDateVal = settingsData?.tanggal_rapor;
  if (!effectiveDateVal) {
    const matchYear = String(tpText || '').match(/^(\d{4})/);
    const parsedStartYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    effectiveDateVal = isGenap ? `${parsedStartYear + 1}-06-24` : `${parsedStartYear}-12-22`;
  }
  const dateParts = String(effectiveDateVal).split('-');
  let dateStr = '';
  if (dateParts.length === 3) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    dateStr = `${parseInt(dateParts[2], 10)} ${months[parseInt(dateParts[1], 10) - 1]} ${dateParts[0]}`;
  } else {
    dateStr = formatIndoDate(new Date());
  }

  // Header Title (Landscape, exactly matching official school format)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`LEGER SEMESTER ${semText.toUpperCase()}`, pageWidth / 2, 7.5, { align: 'center' });
  doc.text(namaSekolah.toUpperCase(), pageWidth / 2, 11, { align: 'center' });
  doc.setFontSize(9.5);
  doc.text(`TAHUN PELAJARAN ${tpText.toUpperCase()}`, pageWidth / 2, 14.5, { align: 'center' });

  const mapelList: any[] = legerData.mapel_list || [];
  const students: any[] = legerData.students || [];

  // Dynamic column width calculation for perfect horizontal centering on A4 Landscape (297 mm)
  const numMapels = mapelList.length || 1;
  const targetTotalWidth = 281; // gives equal 8 mm margins on left and right
  const fixedColsWidth = 85.5;  // NO(6) + KELAS(12) + SEMESTER(13) + SAKIT(6.5) + IZIN(6.5) + TANPA(8) + JML(12) + RATA(12) + RANK(9.5)
  const remainingForFlex = targetTotalWidth - fixedColsWidth; // 195.5 mm

  // Dynamically allocate width per mapel (fills space proportionately)
  const mapelWidth = Number(Math.min(9.5, Math.max(6.0, 104 / numMapels)).toFixed(1));
  const totalMapelWidth = mapelWidth * numMapels;

  // Remaining for NAMA and 2 EKSKUL columns
  const remainingForNamesAndEskul = remainingForFlex - totalMapelWidth;
  const namaWidth = Math.max(42, Math.round(remainingForNamesAndEskul * 0.50));
  const ekskulWidth = Number(((remainingForNamesAndEskul - namaWidth) / 2).toFixed(1));

  const actualTotalWidth = fixedColsWidth + totalMapelWidth + namaWidth + (ekskulWidth * 2);
  const tableMarginLeft = Math.max(6, Number(((pageWidth - actualTotalWidth) / 2).toFixed(1)));

  // Calculate dynamic font sizes so all rows and text fit crisply on 1 landscape page
  const numRows = students.length || 1;
  const cellPadY = numRows > 32 ? 0.35 : numRows > 28 ? 0.5 : 0.65;
  const bodyFontSize = numRows > 32 ? 5.8 : numRows > 28 ? 6.2 : 6.8;

  // Header Row 1
  const headRow1: any[] = [
    { content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'NAMA PESERTA DIDIK', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'KELAS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'SEMESTER', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'NILAI HASIL BELAJAR', colSpan: numMapels, styles: { halign: 'center', valign: 'middle' } },
    { content: 'KEHADIRAN', colSpan: 3, styles: { halign: 'center', valign: 'middle' } },
    { content: 'EKSTRAKURIKULER', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'JML', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'RATA-RATA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'PERINGKAT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
  ];

  // Header Row 2: dynamic mapel names + attendance sub-headers + 2 ekskul
  const headRow2: any[] = [
    ...mapelList.map((m: any) => ({
      content: m.kode_mapel || m.nama_mapel || 'MAPEL',
      styles: { halign: 'center', valign: 'middle' }
    })),
    { content: 'S', styles: { halign: 'center', valign: 'middle' } },
    { content: 'I', styles: { halign: 'center', valign: 'middle' } },
    { content: 'A', styles: { halign: 'center', valign: 'middle' } },
    { content: 'Ekskul 1', styles: { halign: 'center', valign: 'middle' } },
    { content: 'Ekskul 2', styles: { halign: 'center', valign: 'middle' } },
  ];

  const colStyles: any = {
    0: { cellWidth: 6, halign: 'center' },      // NO
    1: { cellWidth: namaWidth, halign: 'left' },// NAMA PESERTA DIDIK
    2: { cellWidth: 12, halign: 'center' },     // KELAS
    3: { cellWidth: 13, halign: 'center' },     // SEMESTER
  };

  let colIdx = 4;
  mapelList.forEach(() => {
    colStyles[colIdx] = { cellWidth: mapelWidth, halign: 'center' };
    colIdx++;
  });

  colStyles[colIdx++] = { cellWidth: 6.5, halign: 'center' };   // S
  colStyles[colIdx++] = { cellWidth: 6.5, halign: 'center' };   // I
  colStyles[colIdx++] = { cellWidth: 8, halign: 'center' };     // A
  colStyles[colIdx++] = { cellWidth: ekskulWidth, halign: 'left' }; // EKSKUL 1
  colStyles[colIdx++] = { cellWidth: ekskulWidth, halign: 'left' }; // EKSKUL 2
  colStyles[colIdx++] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' }; // JML
  colStyles[colIdx++] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' }; // RATA-RATA
  colStyles[colIdx++] = { cellWidth: 9.5, halign: 'center', fontStyle: 'bold' }; // PERINGKAT

  const studentRows = students.map((s: any, idx: number) => {
    const mapelScores = mapelList.map((m: any) => {
      const score = s.nilai?.[m.id];
      return typeof score === 'number' ? score : (score || '-');
    });

    const ekskul1 = s.ekskul?.[0] ? `${s.ekskul[0].nama || s.ekskul[0].nama_ekskul || ''} (${s.ekskul[0].predikat || 'B'})` : '-';
    const ekskul2 = s.ekskul?.[1] ? `${s.ekskul[1].nama || s.ekskul[1].nama_ekskul || ''} (${s.ekskul[1].predikat || 'B'})` : '-';

    return [
      idx + 1,
      (s.nama_siswa || '-').toUpperCase(),
      klsText,
      semText,
      ...mapelScores,
      s.absensi?.sakit ?? 0,
      s.absensi?.izin ?? 0,
      s.absensi?.alpa ?? 0,
      ekskul1,
      ekskul2,
      s.total_nilai || 0,
      s.rata_rata || '0.00',
      s.ranking || idx + 1,
    ];
  });

  const aggregateMapelAvg = mapelList.map((m: any) => {
    let sum = 0;
    let count = 0;
    students.forEach((s: any) => {
      const val = Number(s.nilai?.[m.id]);
      if (!isNaN(val) && val > 0) {
        sum += val;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(1) : '-';
  });

  let grandTotalRata = 0;
  let countRata = 0;
  students.forEach((s: any) => {
    const r = parseFloat(String(s.rata_rata || 0));
    if (!isNaN(r) && r > 0) {
      grandTotalRata += r;
      countRata++;
    }
  });
  const classAvgOfAvg = countRata > 0 ? (grandTotalRata / countRata).toFixed(2) : '-';

  const footerRow: any[] = [
    { content: 'RATA-RATA', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [243, 244, 246] } },
    ...aggregateMapelAvg.map((avg) => ({
      content: avg,
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [243, 244, 246] }
    })),
    { content: '-', colSpan: 3, styles: { halign: 'center', fillColor: [243, 244, 246] } },
    { content: '-', colSpan: 2, styles: { halign: 'center', fillColor: [243, 244, 246] } },
    { content: '-', styles: { halign: 'center', fillColor: [243, 244, 246] } },
    { content: classAvgOfAvg, styles: { halign: 'center', fontStyle: 'bold', fillColor: [243, 244, 246] } },
    { content: '-', styles: { halign: 'center', fillColor: [243, 244, 246] } },
  ];

  autoTable(doc, {
    startY: 17.5,
    margin: { left: tableMarginLeft, right: tableMarginLeft },
    head: [headRow1, headRow2],
    body: [...studentRows, footerRow],
    theme: 'grid',
    styles: {
      font: 'Helvetica',
      fontSize: bodyFontSize,
      cellPadding: { top: cellPadY, bottom: cellPadY, left: 1, right: 1 },
      textColor: [17, 24, 39],
      lineColor: [100, 116, 139],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: numRows > 32 ? 5.8 : 6.4,
      lineWidth: 0.15,
      lineColor: [100, 116, 139],
    },
    columnStyles: colStyles,
    didParseCell: (data) => {
      if (data.section === 'head') {
        const row = data.row.index;
        const col = data.column.index;
        if (row === 1 && col >= 4 && col < 4 + numMapels) {
          data.cell.styles.cellPadding = { top: 1.0, bottom: 1.0, left: 0.2, right: 0.2 };
          data.cell.styles.fontSize = Math.min(5.6, mapelWidth * 0.85);
        }
      }
      if (data.section === 'body') {
        if (data.row.index % 2 === 1 && data.row.index !== studentRows.length) {
          data.cell.styles.fillColor = [248, 250, 252];
        }
        if (data.column.index === 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || 165;
  const maxSafeSignY = 182;
  const signStartY = Math.min(finalTableY + 4, maxSafeSignY);

  if (signStartY > maxSafeSignY && (finalTableY + 26) > 200) {
    doc.addPage();
  }

  const leftSignX = tableMarginLeft + 6;
  const rightSignX = tableMarginLeft + actualTotalWidth - 68;
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '197111022008011001';
  const walasNama = legerData?.walas?.nama || 'YULI ANISA FATRIA, S.Pd.';
  const walasNip = legerData?.walas?.nip || '197712182022212008';

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);

  // Left Signatory (Kepsek)
  doc.text('Mengetahui,', leftSignX, signStartY);
  doc.text(`Kepala ${namaSekolah}`, leftSignX, signStartY + 3.8);

  // Right Signatory (Wali Kelas) - Left aligned in right block
  doc.text(`${effectiveKota}, ${dateStr}`, rightSignX, signStartY);
  doc.text('Wali Kelas,', rightSignX, signStartY + 3.8);

  // Underlined Names
  const signYName = signStartY + 16.5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.2);

  // Left name + underline
  doc.text(kepalaSekolahNama, leftSignX, signYName);
  const kepsekWidth = doc.getTextWidth(kepalaSekolahNama);
  doc.setLineWidth(0.25);
  doc.line(leftSignX, signYName + 0.6, leftSignX + kepsekWidth, signYName + 0.6);

  // Right name + underline
  doc.text(walasNama, rightSignX, signYName);
  const walasWidth = doc.getTextWidth(walasNama);
  doc.line(rightSignX, signYName + 0.6, rightSignX + walasWidth, signYName + 0.6);

  // NIPs
  const signYNip = signYName + 3.8;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(`NIP. ${kepalaSekolahNip}`, leftSignX, signYNip);
  doc.text(`NIP. ${walasNip}`, rightSignX, signYNip);

  const filename = `Buku_Leger_${klsText.replace(/\s+/g, '_')}_${semText}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};
