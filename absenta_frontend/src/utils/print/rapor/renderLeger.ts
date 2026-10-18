import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getKelasDetail } from '../../../api/academic/kelas.api';
import { getMyTenant } from '../../../api/tenants.api';
import { formatIndoDate } from './raporShared';

/**
 * 📊 3. Generate Buku Leger Nilai PDF (Landscape A4 - Client-side jsPDF)
 * Sesuai referensi resmi:
 * - Header vertikal warna-warni per mata pelajaran (berdiri tegak / angle 90)
 * - Header presensi vertikal (SAKIT, IZIN, TANPA KETERANGAN)
 * - Header rekapitulasi vertikal (JUMLAH, RATA-RATA, RANKING)
 * - Badge kelas oranye di pojok kanan atas
 * - Strict 1 halaman A4 Landscape
 * - Blok tanda tangan resmi Kepala Sekolah & Wali Kelas
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

  // Top Right Orange Badge (aligned with table right edge)
  const badgeWidth = 42;
  const badgeX = tableMarginLeft + actualTotalWidth - badgeWidth;
  doc.setFillColor(249, 115, 22); // vibrant orange #f97316
  doc.roundedRect(badgeX, 5.5, badgeWidth, 9.5, 1.2, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(klsText.toUpperCase(), badgeX + (badgeWidth / 2), 12, { align: 'center' });

  // Helper mapel abbreviation
  const getShortMapelName = (name: string, code?: string): string => {
    if (code && code.trim() && code !== 'N/A' && code.length <= 14) return code.trim();
    const n = (name || '').trim().toLowerCase();
    if (n.includes('agama') || n.includes('budi pekerti') || n.includes('pai')) return 'PAI';
    if (n.includes('pancasila') || n.includes('ppkn') || n.includes('pkn')) return 'PKN';
    if (n.includes('indonesia')) return 'B. INDONESIA';
    if (n.includes('jasmani') || n.includes('olahraga') || n.includes('pjok')) return 'PJOK';
    if (n.includes('sejarah')) return 'SEJARAH';
    if (n.includes('seni') || n.includes('budaya')) return 'SENI BUDAYA';
    if (n.includes('sunda')) return 'B. SUNDA';
    if (n.includes('matematika') || n === 'mtk') return 'MTK';
    if (n.includes('inggris')) return 'B. INGGRIS';
    if (n.includes('informatika')) return 'INFORMATIKA';
    if (n.includes('ipas') || n.includes('projek ipas')) return 'PROJEK IPAS';
    if (n.includes('ddpk') || n.includes('dasar-dasar program keahlian') || n.includes('dasar program keahlian')) return 'DDPK';
    if (n.includes('koding') || n.includes('coding') || n.includes('pemrograman')) return 'KODING';
    if (n.includes('pkk') || n.includes('kreatif')) return 'PKK';
    if (n.includes('konsentrasi') || n.includes('kk')) return 'KONSENTRASI';
    if (n.includes('pkl')) return 'PKL';
    return name.length > 15 ? name.substring(0, 14).toUpperCase() : name.toUpperCase();
  };

  const mapelPalette: Array<[number, number, number]> = [
    [245, 158, 11],  // PAI (amber/orange)
    [21, 128, 61],   // PKN (green)
    [37, 99, 235],   // B. INDONESIA (blue)
    [147, 51, 234],  // PJOK (purple)
    [30, 58, 138],   // SEJARAH (navy)
    [217, 119, 6],   // SENI BUDAYA (amber)
    [101, 163, 13],  // B. SUNDA (olive)
    [234, 88, 12],   // MTK (coral)
    [249, 115, 22],  // B. INGGRIS (orange)
    [2, 132, 199],   // INFORMATIKA (sky)
    [13, 148, 136],  // PROJEK IPAS (teal)
    [59, 130, 246],  // DDPK (blue)
    [51, 65, 85],    // KODING (slate)
    [168, 85, 247],  // extra (purple)
    [20, 184, 166],  // extra (teal)
    [239, 68, 68],   // extra (red)
  ];

  const getSoftTint = (rgb: [number, number, number]): [number, number, number] => {
    return [
      Math.round(rgb[0] + (255 - rgb[0]) * 0.90),
      Math.round(rgb[1] + (255 - rgb[1]) * 0.90),
      Math.round(rgb[2] + (255 - rgb[2]) * 0.90),
    ];
  };

  // Header construction (Single tall row with vertical mapel text)
  const verticalHeadersMap: Record<number, { text: string; lines?: string[]; color: [number, number, number] }> = {};
  const headerRow: any[] = [
    { content: 'NO', styles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
    { content: 'NAMA', styles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
    { content: 'KELAS', styles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
    { content: 'SEMESTER', styles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } },
  ];

  let currentColIdx = 4;
  mapelList.forEach((m, idx) => {
    const color = mapelPalette[idx % mapelPalette.length];
    const shortName = getShortMapelName(m.nama_mapel, m.kode_mapel);
    verticalHeadersMap[currentColIdx] = { text: shortName, color: [255, 255, 255] };
    headerRow.push({
      content: '',
      styles: { fillColor: color },
    });
    currentColIdx++;
  });

  // Ekstrakurikuler columns
  headerRow.push(
    { content: 'EKSKUL-1', styles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 6.2 } },
    { content: 'EKSKUL-2', styles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 6.2 } }
  );
  currentColIdx += 2;

  // Presensi columns (vertical text)
  verticalHeadersMap[currentColIdx] = { text: 'SAKIT', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [55, 65, 81] } });
  currentColIdx++;

  verticalHeadersMap[currentColIdx] = { text: 'IZIN', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [55, 65, 81] } });
  currentColIdx++;

  verticalHeadersMap[currentColIdx] = { text: 'TANPA KETERANGAN', lines: ['TANPA', 'KETERANGAN'], color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [55, 65, 81] } });
  currentColIdx++;

  // Summary columns (vertical text, orange background)
  verticalHeadersMap[currentColIdx] = { text: 'JUMLAH', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [245, 158, 11] } });
  currentColIdx++;

  verticalHeadersMap[currentColIdx] = { text: 'RATA-RATA', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [245, 158, 11] } });
  currentColIdx++;

  verticalHeadersMap[currentColIdx] = { text: 'RANKING', color: [255, 255, 255] };
  headerRow.push({ content: '', styles: { fillColor: [245, 158, 11] } });
  currentColIdx++;

  // Body Rows Construction
  const numStudents = students.length || 1;
  const bodyRows = students.map((s, idx) => {
    const mapelScores = mapelList.map((m, mIdx) => {
      const score = s.grades?.[m.id];
      const val = typeof score === 'number' && score > 0 ? score : '-';
      const colColor = mapelPalette[mIdx % mapelPalette.length];
      return {
        content: val,
        styles: { fillColor: getSoftTint(colColor), halign: 'center' },
      };
    });

    const rankVal = s.rank || idx + 1;
    let rankBg: [number, number, number] = [254, 240, 138]; // yellow
    if (rankVal <= 10) {
      rankBg = [187, 247, 208]; // soft green
    } else if (rankVal > Math.floor(numStudents * 0.7)) {
      rankBg = [254, 202, 202]; // soft pink/red
    }

    return [
      idx + 1,
      s.nama_siswa || '-',
      klsText,
      semText,
      ...mapelScores,
      s.ekskul_1 || '',
      s.ekskul_2 || '',
      s.sakit > 0 ? s.sakit : '-',
      s.izin > 0 ? s.izin : '-',
      s.alpa > 0 ? s.alpa : '-',
      { content: s.total ?? 0, styles: { fillColor: [254, 249, 195], fontStyle: 'bold', halign: 'center' } },
      { content: s.rata_rata ? Math.round(s.rata_rata) : 0, styles: { fillColor: [254, 215, 170], fontStyle: 'bold', halign: 'center' } },
      { content: rankVal, styles: { fillColor: rankBg, fontStyle: 'bold', halign: 'center' } },
    ];
  });

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 6, halign: 'center' },
    1: { cellWidth: namaWidth, halign: 'left' },
    2: { cellWidth: 12, halign: 'center' },
    3: { cellWidth: 13, halign: 'center' },
  };

  let cIdx = 4;
  mapelList.forEach(() => {
    columnStyles[cIdx] = { cellWidth: mapelWidth, halign: 'center' };
    cIdx++;
  });

  columnStyles[cIdx] = { cellWidth: ekskulWidth, halign: 'center', fontSize: 5.5 }; // EKSKUL-1
  cIdx++;
  columnStyles[cIdx] = { cellWidth: ekskulWidth, halign: 'center', fontSize: 5.5 }; // EKSKUL-2
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 6.5, halign: 'center' }; // SAKIT
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 6.5, halign: 'center' }; // IZIN
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 8, halign: 'center' }; // TANPA KET
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 12, halign: 'center' }; // JUMLAH
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 12, halign: 'center' }; // RATA-RATA
  cIdx++;
  columnStyles[cIdx] = { cellWidth: 9.5, halign: 'center' }; // RANKING

  // Strict Single-Page Row Heights
  const isLargeClass = numStudents > 40;
  const bodyFontSize = isLargeClass ? 5.7 : (numStudents > 30 ? 6.0 : 6.3);
  const cellPadY = isLargeClass ? 0.22 : 0.32;
  const rowMinHeight = isLargeClass ? 2.45 : (numStudents > 30 ? 2.65 : 2.85);
  const headHeight = isLargeClass ? 18 : 19.5;

  autoTable(doc, {
    startY: 16.5,
    margin: { left: tableMarginLeft, right: tableMarginLeft, top: 4, bottom: 4 },
    pageBreak: 'avoid',
    head: [headerRow],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'Helvetica',
      fontSize: bodyFontSize,
      cellPadding: { top: cellPadY, bottom: cellPadY, left: 0.3, right: 0.3 },
      textColor: [17, 24, 39],
      lineColor: [75, 85, 99],
      lineWidth: 0.15,
      valign: 'middle',
      minCellHeight: rowMinHeight,
    },
    headStyles: {
      valign: 'middle',
      minCellHeight: headHeight,
      lineColor: [55, 65, 81],
      lineWidth: 0.15,
    },
    columnStyles,
    didDrawCell: (data) => {
      if (data.section === 'head' && data.row.index === 0) {
        const vMeta = verticalHeadersMap[data.column.index];
        if (vMeta) {
          const cell = data.cell;
          doc.saveGraphicsState();
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(5.8);
          doc.setTextColor(vMeta.color[0], vMeta.color[1], vMeta.color[2]);

          const lines = vMeta.lines || [vMeta.text];
          if (lines.length > 1) {
            const lineSpacing = 2.6;
            const startX = cell.x + (cell.width - (lines.length - 1) * lineSpacing) / 2 + 0.3;
            const textY = cell.y + cell.height - 1.8;
            lines.forEach((lineText, lIdx) => {
              doc.text(lineText, startX + lIdx * lineSpacing, textY, { angle: 90 });
            });
          } else {
            const textX = cell.x + (cell.width / 2) + 1.0;
            const textY = cell.y + cell.height - 1.8;
            doc.text(lines[0], textX, textY, { angle: 90 });
          }
          doc.restoreGraphicsState();
        }
      }
    },
  });

  // Guarantee strictly 1 page
  while (doc.getNumberOfPages() > 1) {
    doc.deletePage(2);
  }

  // Signatures Block (Landscape, strictly fits bottom of page 1, aligned with table width)
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  const signStartY = Math.max(finalY + 3.5, 163);

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
