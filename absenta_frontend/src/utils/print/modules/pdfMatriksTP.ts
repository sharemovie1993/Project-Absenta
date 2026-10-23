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

  // Tanggal pengesahan = 1 Juli tahun awal tahun pelajaran
  // tp contoh: "2026/2027" → tahun = 2026
  const tp = data.tahunPelajaran || '';
  const tpYear = parseInt((tp.split('/')[0] || String(new Date().getFullYear())).trim(), 10);
  const pengesahanDate = new Date(tpYear, 6, 1); // bulan ke-7 (Juli), tanggal 1
  const tglStr = pengesahanDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const contentWidth = pageWidth - margin * 2;
  const colHalfWidth = contentWidth / 2;
  const xLeft   = margin + colHalfWidth / 2;                      // pusat kolom kiri
  const xRight  = margin + colHalfWidth + colHalfWidth / 2;       // pusat kolom kanan
  const xCenter = pageWidth / 2;

  // ── Helper: gambar teks bold + garis bawah (centered di xC) ─────────────
  const drawUnderlinedName = (
    text: string,
    xC: number,
    yPos: number,
    fontSize: number
  ) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(15, 23, 42);
    doc.text(text, xC, yPos, { align: 'center' });

    // Hitung lebar teks untuk underline tepat di bawah teks
    const tw = doc.getTextWidth(text);
    const lx = xC - tw / 2;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.25);
    doc.line(lx, yPos + 0.6, lx + tw, yPos + 0.6);
  };

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

  // Tanggal pengesahan (1 Juli tahun awal TP) — rata tengah kolom kanan (Kaprog)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${kota}, ${tglStr}`, xRight, y, { align: 'center' });
  y += 4;

  const yRow1Title = y;

  // ── Kolom Kiri: Waka Hubin ───────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Diverifikasi oleh,', xLeft, yRow1Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Wakil Kepala Sekolah Bidang Hubinmas', xLeft, yRow1Title + 4.5, {
    align: 'center',
  });

  // ── Kolom Kanan: Kaprog ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Dibuat oleh,', xRight, yRow1Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  const kaprogTitle = `Ketua Program Keahlian ${data.jurusanNama}`;
  const kaprogTitleLines = doc.splitTextToSize(kaprogTitle, colHalfWidth - 4);
  doc.text(kaprogTitleLines, xRight, yRow1Title + 4.5, { align: 'center' });

  const yRow1Name = yRow1Title + 20; // 20mm ruang tanda tangan

  // Nama Waka Hubin — bold + underline
  const hubinNama = data.wakasekHubin?.nama || '.......................................';
  drawUnderlinedName(hubinNama, xLeft, yRow1Name, 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${data.wakasekHubin?.nip || '-'}`, xLeft, yRow1Name + 4, {
    align: 'center',
  });

  // Nama Kaprog — bold + underline
  const kaprogNama = data.kaprog?.nama || '.......................................';
  drawUnderlinedName(kaprogNama, xRight, yRow1Name, 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${data.kaprog?.nip || '-'}`, xRight, yRow1Name + 4, {
    align: 'center',
  });

  // ── Baris 2: Kepala Sekolah (tengah bawah) ───────────────────────────────
  const yRow2Title = yRow1Name + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Mengetahui / Mengesahkan,', xCenter, yRow2Title, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala Sekolah', xCenter, yRow2Title + 4.5, { align: 'center' });

  const yRow2Name = yRow2Title + 20;
  const kepsekNama =
    data.kepsek?.nama ||
    data.sekolah.kepala_sekolah ||
    '.......................................';
  drawUnderlinedName(kepsekNama, xCenter, yRow2Name, 8.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `NIP. ${data.kepsek?.nip || data.sekolah.nip_kepala || '-'}`,
    xCenter,
    yRow2Name + 4,
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
  const tableFontSize = isLandscape ? 7.5 : 8;
  const cellPad = isLandscape ? 1.5 : 2;
  const innerDudiColW = dudiColW - cellPad * 2;
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

        // Hitung baris persis dengan font & lebar kolom riil agar autoTable
        // menghitung tinggi baris yang 100% akurat sebelum menentukan page break
        const measureLines: string[] = [];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(tableFontSize);
        measureLines.push(...doc.splitTextToSize(mitra.nama_mitra, innerDudiColW));

        if (mitra.alamat) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(tableFontSize - 1);
          measureLines.push(...doc.splitTextToSize(mitra.alamat, innerDudiColW));
        }

        if (metaParts.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(tableFontSize - 1.5);
          measureLines.push(...doc.splitTextToSize(metaParts.join(' • '), innerDudiColW));
        }

        return [
          idx + 1,
          measureLines.join('\n'),
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

  // ── Step 3: Metadata box — pakai autoTable agar auto-height saat nilai panjang ──
  // theme: 'plain' = tidak ada border antar sel; tableLineWidth = border luar saja
  const mFs = isLandscape ? 7.5 : 8;
  const mLH = isLandscape ? 3.8 : 4.2;
  const metaBoxY = curY;

  // Landscape: 4 kolom (label | nilai | label | nilai)
  // Portrait : 2 kolom (label | nilai) × 4 baris
  const metaBody = isLandscape
    ? [
        [
          { content: 'Program Keahlian', styles: { textColor: [51, 65, 85] as [number, number, number] } },
          { content: data.jurusanNama, styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number] } },
          { content: 'Total DUDI', styles: { textColor: [51, 65, 85] as [number, number, number] } },
          { content: `${totalMitra} DUDI (${filledMitra} Terisi TP)`, styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number] } },
        ],
        [
          { content: 'Mata Pelajaran', styles: { textColor: [51, 65, 85] as [number, number, number] } },
          { content: 'Praktik Kerja Lapangan (PKL)', styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number] } },
          { content: 'Total Siswa PKL', styles: { textColor: [51, 65, 85] as [number, number, number] } },
          { content: `${totalSiswa} Siswa`, styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number] } },
        ],
      ]
    : [
        [
          { content: 'Program Keahlian', styles: { textColor: [51, 65, 85] as [number, number, number] } },
          { content: data.jurusanNama, styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number] } },
        ],
        [
          { content: 'Mata Pelajaran', styles: { textColor: [51, 65, 85] as [number, number, number] } },
          { content: 'Praktik Kerja Lapangan (PKL)', styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number] } },
        ],
        [
          { content: 'Total DUDI', styles: { textColor: [51, 65, 85] as [number, number, number] } },
          { content: `${totalMitra} DUDI (${filledMitra} Terisi TP)`, styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number] } },
        ],
        [
          { content: 'Total Siswa PKL', styles: { textColor: [51, 65, 85] as [number, number, number] } },
          { content: `${totalSiswa} Siswa`, styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number] } },
        ],
      ];

  const metaColStyles = isLandscape
    ? {
        0: { cellWidth: 30 },   // label kiri
        1: { cellWidth: 'auto' as const }, // nilai kiri (nama jurusan dll)
        2: { cellWidth: 26 },   // label kanan
        3: { cellWidth: 40 },   // nilai kanan (fixed agar tidak overflow)
      }
    : {
        0: { cellWidth: 38 },   // label
        1: { cellWidth: 'auto' as const }, // nilai
      };

  autoTable(doc, {
    startY: metaBoxY,
    body: metaBody,
    theme: 'plain',
    styles: {
      fillColor: [248, 250, 252],
      font: 'helvetica',
      fontSize: mFs,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      overflow: 'linebreak',
      textColor: [0, 0, 0],
      lineWidth: 0,
    },
    columnStyles: metaColStyles,
    tableWidth: contentWidth,
    margin: { left: margin, right: margin },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.2,
  });

  curY = (doc as any).lastAutoTable.finalY + (isLandscape ? 2 : 3);
  const tableStartY = curY;

  // ── Running header height (reserved space on continuation pages) ─────────
  // running header = ~8mm (text 8pt) + 1.5mm line + 3mm gap = ~14mm
  const runningHeaderH = 14;

  // ── Estimate total pages for running header label ────────────────────────
  // We'll update after autoTable via doc.getNumberOfPages()
  let estTotalPages = 1; // will be patched in footer loop

  // ── Step 4: autoTable ────────────────────────────────────────────────────
  autoTable(doc, {
    startY: tableStartY,
    rowPageBreak: 'avoid',
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
      rowPageBreak: 'avoid',
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
      bottom: margin + 12,          // ruang aman footer (mencegah baris menempel/terpotong di footer)
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
