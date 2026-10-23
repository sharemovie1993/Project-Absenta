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
// Helper: parse print_header_lines (sama dengan pdfUkkRab.ts)
// ─────────────────────────────────────────────────────────────────────────────

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
      fontSize = line.fontSize
        ? line.fontSize * 0.85
        : idx === rawLines.length - 1
        ? 11.5
        : 9;
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper: render kop surat → returns Y after double rule
// ─────────────────────────────────────────────────────────────────────────────

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
    const alamatText = `${data.sekolah.alamat}${
      data.sekolah.telepon ? ' | Telp: ' + data.sekolah.telepon : ''
    }`;
    doc.text(alamatText, pageWidth / 2, curY, { align: 'center' });
    curY += 3.2;
  }
  if (data.sekolah.website || data.sekolah.email) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const contactText = [
      data.sekolah.website ? 'Website: ' + data.sekolah.website : '',
      data.sekolah.email ? 'Email: ' + data.sekolah.email : '',
    ]
      .filter(Boolean)
      .join(' | ');
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper: running header on continuation pages → returns Y after the line
// ─────────────────────────────────────────────────────────────────────────────

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
  doc.text(
    `Lanjutan (Halaman ${pageNum} dari ${totalPages})`,
    pageWidth - margin,
    startY,
    { align: 'right' }
  );

  const lineY = startY + 1.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  return lineY + 3; // Y after the divider line
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: TTD block 3-tier
// ─────────────────────────────────────────────────────────────────────────────

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
  const xLeft = margin + colHalfWidth / 2;
  const xRight = margin + colHalfWidth + colHalfWidth / 2;
  const xCenter = pageWidth / 2;

  let y = startY;

  // Catatan kepatuhan kurikulum
  const noteText =
    'Catatan Kepatuhan Kurikulum: Rumusan Tujuan Pembelajaran (TP) di atas diselaraskan ' +
    'berdasarkan Standard Operating Procedure (SOP) mitra dunia usaha/industri dan disahkan ' +
    'untuk dicetak pada buku Rapor PKL serta Sertifikat Praktik Kerja Lapangan siswa.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const noteLines = doc.splitTextToSize(noteText, contentWidth);
  doc.text(noteLines, margin, y);
  y += noteLines.length * 3.0 + 3;

  // Tanggal di atas kolom kanan (Kaprog)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${kota}, ${tglStr}`, xRight, y, { align: 'center' });
  y += 4;

  const yRow1Title = y;

  // Kolom Kiri: Waka Hubin
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Diverifikasi oleh,', xLeft, yRow1Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Wakil Kepala Sekolah Bidang Hubinmas', xLeft, yRow1Title + 4.5, {
    align: 'center',
  });

  // Kolom Kanan: Kaprog
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Dibuat oleh,', xRight, yRow1Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  // Wrap kaprog title if too long
  const kaprogTitle = `Ketua Program Keahlian ${data.jurusanNama}`;
  const kaprogTitleLines = doc.splitTextToSize(kaprogTitle, colHalfWidth - 4);
  doc.text(kaprogTitleLines, xRight, yRow1Title + 4.5, { align: 'center' });

  const yRow1Name = yRow1Title + 20; // 20mm ruang TTD

  // Nama & NIP Waka Hubin (kiri)
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
  doc.text(`NIP. ${data.wakasekHubin?.nip || '-'}`, xLeft, yRow1Name + 3.8, {
    align: 'center',
  });

  // Nama & NIP Kaprog (kanan)
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
  doc.text(`NIP. ${data.kaprog?.nip || '-'}`, xRight, yRow1Name + 3.8, {
    align: 'center',
  });

  // Baris 2: Kepala Sekolah (tengah bawah)
  const yRow2Title = yRow1Name + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Mengetahui / Mengesahkan,', xCenter, yRow2Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala Sekolah', xCenter, yRow2Title + 4.5, { align: 'center' });

  const yRow2Name = yRow2Title + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    data.kepsek?.nama ||
      data.sekolah.kepala_sekolah ||
      '.......................................',
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
    yRow2Name + 3.8,
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

  // A4 (mm): Portrait = 210×297, Landscape = 297×210
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const tp =
    data.tahunPelajaran ||
    `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const totalMitra = data.mitraList.length;
  const totalSiswa = data.mitraList.reduce((a, m) => a + (m.siswa_count || 0), 0);
  const filledMitra = data.mitraList.filter((m) => m.has_tp).length;

  // ── Column widths ────────────────────────────────────────────────────────
  const noColW = 8;
  const dudiColW = isLandscape ? 85 : 65;
  // Kolom 2 (TP) mendapatkan sisa lebar secara otomatis

  // ── Structured body rows ─────────────────────────────────────────────────
  // Kolom DUDI kita simpan sebagai object agar bisa dirender manual via didDrawCell.
  // Kolom lain tetap string biasa.
  interface DudiCellData {
    __type: 'dudi';
    nama: string;
    alamat?: string;
    meta: string; // "N Siswa PKL • Rombel • (Bidang)"
  }

  const bodyRows = data.mitraList.length > 0
    ? data.mitraList.map((mitra, idx) => {
        const metaParts: string[] = [`${mitra.siswa_count} Siswa PKL`];
        if (mitra.rombel_list && mitra.rombel_list.length > 0) {
          metaParts.push(mitra.rombel_list.join(', '));
        }
        if (mitra.bidang_usaha && mitra.bidang_usaha !== '-') {
          metaParts.push(`(${mitra.bidang_usaha})`);
        }

        const dudiCell: DudiCellData = {
          __type: 'dudi',
          nama: mitra.nama_mitra,
          alamat: mitra.alamat,
          meta: metaParts.join(' • '),
        };

        const tpText =
          mitra.has_tp && mitra.deskripsi_tp
            ? `"${mitra.deskripsi_tp}"`
            : 'Belum ada rumusan deskripsi capaian pembelajaran khusus yang ditetapkan.';

        // autoTable body rows support content + styles objects per cell.
        // We pass dudiCell as content (will be stringified to placeholder),
        // then override drawing manually in didDrawCell.
        return [
          idx + 1,
          // Placeholder text: autoTable will calculate row height based on this.
          // We provide the full text so autoTable sizes the row correctly.
          [mitra.nama_mitra, mitra.alamat || '', metaParts.join(' • ')]
            .filter(Boolean)
            .join('\n'),
          tpText,
        ] as [number, string, string];
      })
    : [
        [
          '-',
          'Belum ada mitra penempatan PKL pada tahun pelajaran ini.',
          '-',
        ] as any,
      ];

  // Store structured DUDI data parallel to bodyRows for custom rendering
  const dudiData =
    data.mitraList.length > 0
      ? data.mitraList.map((mitra) => {
          const metaParts: string[] = [`${mitra.siswa_count} Siswa PKL`];
          if (mitra.rombel_list && mitra.rombel_list.length > 0)
            metaParts.push(mitra.rombel_list.join(', '));
          if (mitra.bidang_usaha && mitra.bidang_usaha !== '-')
            metaParts.push(`(${mitra.bidang_usaha})`);
          return {
            nama: mitra.nama_mitra,
            alamat: mitra.alamat,
            meta: metaParts.join(' • '),
          };
        })
      : null;

  // ── Step 1: Kop surat (page 1) ───────────────────────────────────────────
  const kopEndY = renderKopSurat(doc, data, pageWidth, margin);

  // ── Step 2: Judul (disederhanakan, 1 baris utama + subtitle) ────────────
  const titleFontSize = isLandscape ? 10 : 11;
  let curY = kopEndY + (isLandscape ? 3 : 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleFontSize);
  doc.setTextColor(0, 0, 0);
  doc.text('MATRIKS RUMUSAN TP — PRAKTIK KERJA LAPANGAN (PKL)', pageWidth / 2, curY, {
    align: 'center',
  });
  curY += isLandscape ? 4 : 5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(isLandscape ? 8 : 9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Tahun Pelajaran ${tp} • Fase F (Kelas XII)`, pageWidth / 2, curY, {
    align: 'center',
  });
  curY += isLandscape ? 3 : 4;

  // ── Step 3: Metadata box ─────────────────────────────────────────────────
  // Layout 2 kolom simetris — setiap kolom lebar = contentWidth / 2
  // Label + nilai tidak boleh melewati batas kolom masing-masing.
  const metaBoxHeight = isLandscape ? 10 : 13;
  const metaBoxY = curY;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(margin, metaBoxY, contentWidth, metaBoxHeight, 'FD');

  const mFs = isLandscape ? 7.5 : 8;
  const mLH = isLandscape ? 3.8 : 4.5;

  // Batas kolom kiri: margin → midX | kolom kanan: midX → margin kanan
  const midX = margin + contentWidth / 2;
  const colHalf = contentWidth / 2;              // lebar per kolom (mm)
  const labelW = isLandscape ? 36 : 44;          // lebar label (mm)
  const colonGap = 2;                            // jarak setelah titik-dua
  // Posisi titik-dua & nilai
  const lColonX = margin + 2 + labelW;
  const lValueX = lColonX + colonGap;
  const lValueMaxW = midX - lValueX - 2;        // nilai kiri tidak boleh melewati midX

  const rLabelX = midX + 2;
  const rColonX = midX + 2 + labelW;
  const rValueX = rColonX + colonGap;
  const rValueMaxW = margin + contentWidth - rValueX - 2;

  const metaY1 = metaBoxY + 2.8;
  const metaY2 = metaY1 + mLH;

  // ── Baris 1 ──────────────────────────────────────────────────────────────
  // Kiri: Program Keahlian
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(mFs);
  doc.setTextColor(51, 65, 85);
  doc.text('Program Keahlian', margin + 2, metaY1);
  doc.setTextColor(100, 116, 139);
  doc.text(':', lColonX, metaY1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.jurusanNama, lValueX, metaY1, { maxWidth: lValueMaxW });

  // Kanan: Total Mitra
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Total DUDI', rLabelX, metaY1);
  doc.setTextColor(100, 116, 139);
  doc.text(':', rColonX, metaY1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${totalMitra} DUDI (${filledMitra} Terisi TP)`, rValueX, metaY1, {
    maxWidth: rValueMaxW,
  });

  // ── Baris 2 ──────────────────────────────────────────────────────────────
  // Kiri: Mata Pelajaran
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Mata Pelajaran', margin + 2, metaY2);
  doc.setTextColor(100, 116, 139);
  doc.text(':', lColonX, metaY2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Praktik Kerja Lapangan (PKL)', lValueX, metaY2, { maxWidth: lValueMaxW });

  // Kanan: Total Siswa
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Total Siswa PKL', rLabelX, metaY2);
  doc.setTextColor(100, 116, 139);
  doc.text(':', rColonX, metaY2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${totalSiswa} Siswa`, rValueX, metaY2, { maxWidth: rValueMaxW });

  curY = metaBoxY + metaBoxHeight + (isLandscape ? 2 : 3);
  const tableStartY = curY;

  // ── Running header height (reserved space on continuation pages) ─────────
  // running header = ~8mm (text 8pt) + 1.5mm line + 3mm gap = ~14mm
  const runningHeaderH = 14;

  // ── Estimate total pages for running header label ────────────────────────
  // We'll update after autoTable via doc.getNumberOfPages()
  let estTotalPages = 1; // will be patched in footer loop

  // ── Step 4: autoTable ────────────────────────────────────────────────────
  const tableFontSize = isLandscape ? 7.5 : 8;
  const cellPad = isLandscape ? 1.5 : 2;

  autoTable(doc, {
    startY: tableStartY,
    head: [
      [
        { content: 'No', styles: { halign: 'center', valign: 'middle' } },
        'Mitra Industri (DUDI) & Lokasi',
        'Rumusan Capaian & Tujuan Pembelajaran (TP) Khusus DUDI',
      ],
    ],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: tableFontSize,
      cellPadding: cellPad,
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
      fontSize: tableFontSize,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: noColW, halign: 'center', valign: 'middle' },
      1: { cellWidth: dudiColW },
      // kolom 2 otomatis
    },
    // margin.top digunakan autoTable sebagai topY saat addPage → harus cukup
    // untuk running header (margin + runningHeaderH)
    margin: {
      left: margin,
      right: margin,
      top: margin + runningHeaderH, // ruang untuk running header di halaman 2+
      bottom: margin + 8,           // ruang footer
    },
    showHead: 'everyPage',

    // ── Running header on continuation pages ─────────────────────────────
    didDrawPage: (hookData) => {
      const pgNum = hookData.pageNumber;
      if (pgNum === 1) return; // page 1 sudah ada kop + judul + metadata

      // Render running header di atas area tabel
      renderRunningHeader(
        doc,
        data,
        pageWidth,
        margin,
        pgNum,
        estTotalPages, // akan diupdate di footer loop
        margin + 2     // Y tepat di bawah top margin halaman
      );
    },

    // ── Custom rendering untuk kolom DUDI (bold nama + normal alamat + kecil meta) ──
    didDrawCell: (hookData) => {
      // Hanya kolom index 1 (DUDI), hanya body rows
      if (hookData.section !== 'body' || hookData.column.index !== 1) return;
      if (!dudiData) return;

      const rowIdx = hookData.row.index;
      const dudi = dudiData[rowIdx];
      if (!dudi) return;

      // Cell geometry
      const { x, y: cellY, width, height } = hookData.cell;
      const pad = cellPad;
      const innerW = width - pad * 2;

      // Hapus teks default yang sudah digambar autoTable dengan rect putih
      doc.setFillColor(
        hookData.row.index % 2 === 0 ? 255 : 255,
        255,
        255
      );
      doc.rect(x + 0.15, cellY + 0.15, width - 0.3, height - 0.3, 'F');

      // Re-draw border cell (agar tidak hilang setelah rect putih)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(x, cellY, width, height, 'S');

      let textY = cellY + pad + tableFontSize * 0.35;

      // 1. Nama DUDI — Bold
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(tableFontSize);
      doc.setTextColor(0, 0, 0);
      const namaLines = doc.splitTextToSize(dudi.nama, innerW);
      doc.text(namaLines, x + pad, textY);
      textY += namaLines.length * (tableFontSize * 0.37);

      // 2. Alamat — Normal, slate-700
      if (dudi.alamat) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tableFontSize - 1);
        doc.setTextColor(51, 65, 85);
        const alamatLines = doc.splitTextToSize(dudi.alamat, innerW);
        doc.text(alamatLines, x + pad, textY);
        textY += alamatLines.length * ((tableFontSize - 1) * 0.37);
      }

      // 3. Meta info — kecil, abu-abu
      if (dudi.meta) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tableFontSize - 1.5);
        doc.setTextColor(100, 116, 139);
        const metaLines = doc.splitTextToSize(dudi.meta, innerW);
        doc.text(metaLines, x + pad, textY + 0.5);
      }
    },
  });

  const tableEndY: number = (doc as any).lastAutoTable?.finalY ?? curY;

  // ── Step 5: TTD block ────────────────────────────────────────────────────
  // TTD butuh: catatan (≈10mm) + 3-tier ttd (≈58mm) = ≈68mm
  const ttdHeight = isLandscape ? 62 : 68;

  let ttdStartY = tableEndY + 4;
  if (ttdStartY + ttdHeight > pageHeight - margin) {
    doc.addPage();
    const ttdPageNum = doc.getNumberOfPages();
    ttdStartY = margin + runningHeaderH + 2;
    renderRunningHeader(
      doc,
      data,
      pageWidth,
      margin,
      ttdPageNum,
      ttdPageNum,
      margin + 2
    );
  }

  renderTTD(doc, data, pageWidth, margin, ttdStartY);

  // ── Step 6: Footer + page numbers ───────────────────────────────────────
  const finalPageCount = doc.getNumberOfPages();
  estTotalPages = finalPageCount; // update estimasi (dipakai running header sudah selesai render)

  const footerText = `Matriks Capaian & Tujuan Pembelajaran PKL — ${data.jurusanNama} (${tp})`;

  for (let p = 1; p <= finalPageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: 'center' });
    doc.text(`${p} / ${finalPageCount}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    });
  }

  const blobUrl = doc.output('bloburl').toString();
  return { doc, blobUrl };
}
