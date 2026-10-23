import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PklMatriksTPPdfData {
  orientation: 'portrait' | 'landscape';
  jurusanNama: string;
  tahunPelajaran?: string;
  mitraList: Array<{
    mitra_id: string;
    nama_mitra: string;
    bidang_usaha?: string;
    alamat?: string;
    siswa_count: number;
    rombel_list?: string[];
    has_tp: boolean;
    deskripsi_tp?: string;
  }>;
  sekolah: {
    nama: string;
    alamat?: string;
    kota?: string;
    telepon?: string;
    email?: string;
    website?: string;
    kepala_sekolah?: string;
    nip_kepala?: string;
    nama_dinas_atas?: string;
    nama_dinas_bawah?: string;
    nama_cabang_dinas?: string;
    print_header_lines?: any[];
  };
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
  };
  kaprog: { nama: string; nip?: string };
  wakasekHubin: { nama: string; nip?: string };
  kepsek: { nama: string; nip?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parse print_header_lines (same logic as pdfUkkRab.ts) */
function parseHeaderLines(
  sekolah: PklMatriksTPPdfData['sekolah']
): Array<{ text: string; bold: boolean; fontSize: number }> {
  const rawLines =
    sekolah.print_header_lines && sekolah.print_header_lines.length > 0
      ? sekolah.print_header_lines
      : [
          sekolah.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          sekolah.nama_dinas_bawah || 'DINAS PENDIDIKAN',
          sekolah.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
          sekolah.nama || 'SEKOLAH MENENGAH KEJURUAN',
        ];

  return rawLines.map((line: any, idx: number) => {
    let textStr = '';
    let bold = true;
    let fontSize = 9;

    if (typeof line === 'object' && line !== null) {
      textStr = line.text || '';
      bold = line.bold !== false;
      fontSize = line.fontSize ? line.fontSize * 0.85 : idx === rawLines.length - 1 ? 11.5 : 9;
    } else {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object' && 'text' in parsed) {
          textStr = parsed.text || '';
          bold = parsed.bold !== false;
          fontSize = parsed.fontSize
            ? parsed.fontSize * 0.85
            : idx === rawLines.length - 1
            ? 11.5
            : 9;
        } else {
          textStr = String(line);
        }
      } catch {
        textStr = String(line);
      }
      if (idx === rawLines.length - 1) {
        fontSize = textStr.length > 32 ? 11 : 12;
      }
    }

    return { text: textStr, bold, fontSize };
  });
}

/** Render kop surat resmi — returns the Y position right after the double rule */
function renderKopSurat(
  doc: jsPDF,
  data: PklMatriksTPPdfData,
  pageWidth: number,
  margin: number
): number {
  const parsedLines = parseHeaderLines(data.sekolah);
  let curY = 13;

  // Logos
  if (data.options?.logoDaerahBase64) {
    try {
      doc.addImage(data.options.logoDaerahBase64, 'PNG', margin, 10, 18, 18);
    } catch {}
  }
  if (data.options?.logoSekolahBase64) {
    try {
      doc.addImage(data.options.logoSekolahBase64, 'PNG', pageWidth - margin - 18, 10, 18, 18);
    } catch {}
  }

  // Header lines
  parsedLines.forEach((item) => {
    doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
    doc.setFontSize(item.fontSize);
    doc.setTextColor(15, 23, 42);
    doc.text(item.text.toUpperCase(), pageWidth / 2, curY, { align: 'center' });
    curY += item.fontSize > 11 ? 4.5 : 3.8;
  });

  // Alamat & kontak
  if (data.sekolah.alamat) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const alamatText = `${data.sekolah.alamat}${data.sekolah.telepon ? ' | Telp: ' + data.sekolah.telepon : ''}`;
    doc.text(alamatText, pageWidth / 2, curY, { align: 'center' });
    curY += 3.2;
  }
  if (data.sekolah.website || data.sekolah.email) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const contactText = `${data.sekolah.website ? 'Website: ' + data.sekolah.website : ''}${
      data.sekolah.email ? ' | Email: ' + data.sekolah.email : ''
    }`;
    doc.text(contactText, pageWidth / 2, curY, { align: 'center' });
    curY += 3.2;
  }

  // Double rule
  curY += 1;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(margin, curY, pageWidth - margin, curY);
  doc.setLineWidth(0.3);
  doc.line(margin, curY + 0.8, pageWidth - margin, curY + 0.8);

  return curY + 0.8;
}

/** Render running header for continuation pages — returns new Y */
function renderRunningHeader(
  doc: jsPDF,
  data: PklMatriksTPPdfData,
  pageWidth: number,
  margin: number,
  pageNum: number,
  totalPages: number,
  startY: number
): number {
  const tp = data.tahunPelajaran || '-';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Matriks Rumusan TP PKL — ${data.jurusanNama} (${tp})`,
    margin,
    startY
  );
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Lanjutan (Halaman ${pageNum} dari ${totalPages})`, pageWidth - margin, startY, {
    align: 'right',
  });

  const lineY = startY + 1.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  return lineY + 4;
}

/** Render TTD block 3-tier — Waka Hubin (kiri) | Kaprog (kanan) di atas, Kepsek (tengah) di bawah */
function renderTTD(
  doc: jsPDF,
  data: PklMatriksTPPdfData,
  pageWidth: number,
  margin: number,
  startY: number
): void {
  const kota = data.sekolah.kota || 'Purwakarta';
  const tglStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const contentWidth = pageWidth - margin * 2;
  const colHalfWidth = contentWidth / 2;
  const xLeft = margin + colHalfWidth / 2;    // Center of left column
  const xRight = margin + colHalfWidth + colHalfWidth / 2; // Center of right column
  const xCenter = pageWidth / 2;

  let y = startY;

  // Catatan kepatuhan kurikulum
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const noteLabel = 'Catatan Kepatuhan Kurikulum: ';
  doc.text(noteLabel, margin, y);
  doc.setFont('helvetica', 'normal');
  const noteBody =
    'Rumusan Tujuan Pembelajaran (TP) di atas diselaraskan berdasarkan Standard Operating Procedure ' +
    '(SOP) mitra dunia usaha/industri dan disahkan untuk dicetak pada buku Rapor PKL serta Sertifikat Praktik Kerja Lapangan siswa.';
  const noteLines = doc.splitTextToSize(noteLabel + noteBody, contentWidth);
  // Only draw body lines (skip header repeat)
  const noteBodyLines = doc.splitTextToSize(noteBody, contentWidth - doc.getTextWidth(noteLabel));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  // Simpler: just print the whole note as one block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(noteLines, margin, y);
  y += noteLines.length * 3.2 + 2;

  // Date aligned above right column (Kaprog)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${kota}, ${tglStr}`, xRight, y, { align: 'center' });
  y += 4;

  const yRow1Title = y;

  // Left: Waka Hubin
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Diverifikasi oleh,', xLeft, yRow1Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Wakil Kepala Sekolah Bidang Hubinmas', xLeft, yRow1Title + 4, { align: 'center' });

  // Right: Kaprog
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Dibuat oleh,', xRight, yRow1Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Ketua Program Keahlian ${data.jurusanNama}`, xRight, yRow1Title + 4, {
    align: 'center',
    maxWidth: colHalfWidth - 4,
  });

  const yRow1Name = yRow1Title + 18; // Space for signature

  // Left name & NIP
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    data.wakasekHubin?.nama || '.......................................',
    xLeft,
    yRow1Name,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${data.wakasekHubin?.nip || '-'}`, xLeft, yRow1Name + 3.5, { align: 'center' });

  // Right name & NIP
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    data.kaprog?.nama || '.......................................',
    xRight,
    yRow1Name,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${data.kaprog?.nip || '-'}`, xRight, yRow1Name + 3.5, { align: 'center' });

  // Row 2: Kepsek (center)
  const yRow2Title = yRow1Name + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Mengetahui / Mengesahkan,', xCenter, yRow2Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala Sekolah', xCenter, yRow2Title + 4, { align: 'center' });

  const yRow2Name = yRow2Title + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    data.kepsek?.nama || data.sekolah.kepala_sekolah || '.......................................',
    xCenter,
    yRow2Name,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `NIP. ${data.kepsek?.nip || data.sekolah.nip_kepala || '-'}`,
    xCenter,
    yRow2Name + 3.5,
    { align: 'center' }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

export function generatePdfMatriksTP(data: PklMatriksTPPdfData): {
  doc: jsPDF;
  blobUrl: string;
} {
  const isLandscape = data.orientation === 'landscape';

  const doc = new jsPDF({
    orientation: data.orientation,
    unit: 'mm',
    format: 'a4',
  });

  // A4 dimensions (mm): Portrait = 210×297, Landscape = 297×210
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const tp = data.tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const totalMitra = data.mitraList.length;
  const totalSiswa = data.mitraList.reduce((a, m) => a + (m.siswa_count || 0), 0);
  const filledMitra = data.mitraList.filter((m) => m.has_tp).length;

  // ── Column widths for the matrix table ──────────────────────────────────
  const noColW = 8;
  const dudiColW = isLandscape ? 88 : 65;
  // remainder goes to TP column (autoTable handles it via flex)

  // ── Build body rows ──────────────────────────────────────────────────────
  const bodyRows = data.mitraList.map((mitra, idx) => {
    // Compose multi-line DUDI cell
    const dudiLines: string[] = [mitra.nama_mitra];
    if (mitra.alamat) dudiLines.push(mitra.alamat);
    const meta: string[] = [`${mitra.siswa_count} Siswa PKL`];
    if (mitra.rombel_list && mitra.rombel_list.length > 0) {
      meta.push(mitra.rombel_list.join(', '));
    }
    if (mitra.bidang_usaha && mitra.bidang_usaha !== '-') {
      meta.push(`(${mitra.bidang_usaha})`);
    }
    dudiLines.push(meta.join(' • '));

    const tpText = mitra.has_tp && mitra.deskripsi_tp
      ? `"${mitra.deskripsi_tp}"`
      : 'Belum ada rumusan deskripsi capaian pembelajaran khusus yang ditetapkan.';

    return [idx + 1, dudiLines.join('\n'), tpText];
  });

  if (bodyRows.length === 0) {
    bodyRows.push(['-', 'Belum ada mitra penempatan PKL pada tahun pelajaran ini.', '-'] as any);
  }

  // ── Page tracking for running header ────────────────────────────────────
  let isFirstPage = true;
  let kopEndY = 0;
  let firstPageContentStartY = 0;

  // We use didDrawPage callback to render kop/running header on each page
  // and track the finalY for TTD placement.

  // ── Step 1: Render kop surat on page 1 ──────────────────────────────────
  kopEndY = renderKopSurat(doc, data, pageWidth, margin);

  // ── Step 2: Title block ──────────────────────────────────────────────────
  let curY = kopEndY + (isLandscape ? 4 : 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 10 : 11);
  doc.setTextColor(0, 0, 0);
  doc.text(
    'MATRIKS RUMUSAN TUJUAN PEMBELAJARAN (TP)',
    pageWidth / 2,
    curY,
    { align: 'center' }
  );
  curY += isLandscape ? 4 : 4.5;
  doc.text(
    'MATA PELAJARAN PRAKTIK KERJA LAPANGAN (PKL)',
    pageWidth / 2,
    curY,
    { align: 'center' }
  );
  curY += isLandscape ? 4 : 4.5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(isLandscape ? 8.5 : 9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tahun Pelajaran ${tp} • Fase F (Kelas XII)`, pageWidth / 2, curY, {
    align: 'center',
  });
  curY += isLandscape ? 3.5 : 4;

  // ── Step 3: Metadata box ─────────────────────────────────────────────────
  const metaBoxHeight = isLandscape ? 11 : 14;
  const metaBoxY = curY;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(margin, metaBoxY, contentWidth, metaBoxHeight, 'FD');

  const metaFontSize = isLandscape ? 7.5 : 8.5;
  const metaPad = 2.5;
  const metaLineH = isLandscape ? 3.8 : 4.5;
  const colMid = margin + contentWidth / 2 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(metaFontSize);
  doc.setTextColor(51, 65, 85);

  // Row 1
  const metaY1 = metaBoxY + metaPad + metaFontSize * 0.35;
  doc.text('Program / Konsentrasi Keahlian', margin + 2, metaY1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${data.jurusanNama}`, margin + 52, metaY1);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Total Mitra Industri (DUDI)', colMid, metaY1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${totalMitra} Perusahaan (${filledMitra} Terisi TP)`, colMid + 44, metaY1);

  // Row 2
  const metaY2 = metaY1 + metaLineH;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Mata Pelajaran / Elemen', margin + 2, metaY2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(': Praktik Kerja Lapangan (Teknis Kejuruan & Budaya Kerja)', margin + 52, metaY2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Total Peserta PKL', colMid, metaY2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`: ${totalSiswa} Siswa`, colMid + 44, metaY2);

  curY = metaBoxY + metaBoxHeight + (isLandscape ? 2 : 3);
  firstPageContentStartY = curY;

  // ── Step 4: Main autoTable ───────────────────────────────────────────────
  // We need an estimated total pages count for the running header.
  // We'll do a two-pass approach: first pass to count, second to render.
  // But jspdf-autotable doesn't easily support a pre-count.
  // Solution: track page in didDrawPage and patch the running headers post-hoc
  // using the simpler approach of just rendering page number as "…" then
  // a second pass. Instead: just render "Halaman X" and accept we don't know total.
  // Better solution: calculate total pages upfront.

  // Rough total-page estimate based on rows per page
  // (not perfect, but close enough for the running header label)
  const rowEstimate = bodyRows.length;
  // Approximate rows per page after first page
  const rowsFirstPage = isLandscape ? 5 : 8;
  const rowsPerPage = isLandscape ? 9 : 14;
  let estTotalPages = 1;
  if (rowEstimate > rowsFirstPage) {
    const remaining = rowEstimate - rowsFirstPage;
    estTotalPages += Math.ceil(remaining / rowsPerPage);
  }
  // Add 1 if last page also needs TTD block (always true) — if TTD fits on last table page, stays 1
  // This is approximate; the actual rendered pages may differ slightly.

  let renderedPageCount = 0;
  const pageNumbers: number[] = []; // actual page numbers drawn

  autoTable(doc, {
    startY: firstPageContentStartY,
    head: [
      [
        { content: 'No', styles: { halign: 'center' } },
        'Mitra Industri (DUDI) & Lokasi',
        'Rumusan Capaian & Tujuan Pembelajaran (TP) Khusus DUDI',
      ],
    ],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: isLandscape ? 7.5 : 8,
      cellPadding: isLandscape ? 1.5 : 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      valign: 'top',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: isLandscape ? 7.5 : 8.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: noColW, halign: 'center', valign: 'middle' },
      1: { cellWidth: dudiColW },
      // column 2 gets the remainder automatically
    },
    margin: { left: margin, right: margin, top: margin, bottom: margin },
    // Render kop / running header on each new page
    didDrawPage: (hookData) => {
      renderedPageCount = hookData.pageNumber;
      const pgNum = hookData.pageNumber;

      if (pgNum === 1) {
        // Page 1 already has kop + title + metadata rendered above;
        // nothing extra to draw here.
        return;
      }

      // Continuation pages: running header
      const newY = margin + 4;
      renderRunningHeader(doc, data, pageWidth, margin, pgNum, estTotalPages, newY);
    },
    // Ensure continuation pages start below the running header
    didParseCell: () => {},
    // Make row 2+ start further down so running header has room
    // We handle this via margin.top above
  });

  let tableEndY = (doc as any).lastAutoTable?.finalY ?? curY;

  // Patch page count label if we can now read actual page count
  const actualTotalPages = doc.getNumberOfPages();

  // ── Step 5: TTD block ────────────────────────────────────────────────────
  // Space needed for TTD block (note ~10mm + signatures ~45mm = ~55mm total)
  const ttdHeight = isLandscape ? 58 : 62;

  if (tableEndY + ttdHeight > pageHeight - margin) {
    doc.addPage();
    tableEndY = margin + 8;

    // Render running header on the new TTD page
    renderRunningHeader(
      doc,
      data,
      pageWidth,
      margin,
      doc.getNumberOfPages(),
      doc.getNumberOfPages(), // last page
      margin + 4
    );
    tableEndY = margin + 4 + 6; // after running header
  }

  renderTTD(doc, data, pageWidth, margin, tableEndY + 3);

  // ── Step 6: Page footer on all pages ────────────────────────────────────
  const footerText = `Matriks Capaian & Tujuan Pembelajaran PKL — ${data.jurusanNama} (${tp})`;
  const finalPageCount = doc.getNumberOfPages();

  for (let p = 1; p <= finalPageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(footerText, pageWidth / 2, pageHeight - 7, { align: 'center' });
    doc.text(`${p} / ${finalPageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const blobUrl = doc.output('bloburl').toString();
  return { doc, blobUrl };
}
