import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface UkkRabItem {
  id: string;
  nama_barang: string;
  kategori: 'ALAT' | 'BAHAN';
  spesifikasi?: string;
  rasio_per_siswa?: number;
  jumlah_total: number;
  satuan: string;
  harga_satuan: number;
  total_harga: number;
  status_ketersediaan: 'TERSEDIA' | 'PERLU_PENGADAAN' | 'PINJAM';
  keterangan?: string;
}

export interface UkkRabData {
  id?: string;
  jurusanId: string;
  jurusanNama: string;
  tahunPelajaran: string;
  judulPenugasan?: string;
  jumlahPeserta: number;
  statusPengajuan: 'DRAFT' | 'DIAJUKAN_KE_SARPRAS' | 'DISETUJUI_SARPRAS' | 'DITOLAK_SARPRAS';
  tanggalPengajuan: string;
  catatanPengantar?: string;
  catatanSarpras?: string;
  items: UkkRabItem[];
}

export interface UkkRabPrintData {
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
  kaprog?: {
    nama: string;
    nip?: string;
  };
  wakasekSarpras?: {
    nama: string;
    nip?: string;
  };
  rab: UkkRabData;
}

export const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export const generatePdfUkkRab = (data: UkkRabPrintData): { doc: jsPDF; blobUrl: string } => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // 1. Kop Surat Resmi Terpusat (Sesuai Standar Komponen PrintHeader.tsx)
  const rawLines =
    data.sekolah?.print_header_lines && data.sekolah.print_header_lines.length > 0
      ? data.sekolah.print_header_lines
      : [
          data.sekolah?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
          data.sekolah?.nama_dinas_bawah || 'DINAS PENDIDIKAN',
          data.sekolah?.nama_cabang_dinas || 'CABANG DINAS PENDIDIKAN WILAYAH IV',
          data.sekolah?.nama || 'SEKOLAH MENENGAH KEJURUAN',
        ];

  const parsedHeaderLines = rawLines.map((line: any, idx: number) => {
    let textStr = '';
    let bold = true;
    let fontSize = 9;
    if (typeof line === 'object' && line !== null) {
      textStr = line.text || '';
      bold = line.bold !== false;
      fontSize = line.fontSize ? line.fontSize * 0.85 : (idx === rawLines.length - 1 ? 11.5 : 9);
    } else {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object' && 'text' in parsed) {
          textStr = parsed.text || '';
          bold = parsed.bold !== false;
          fontSize = parsed.fontSize ? parsed.fontSize * 0.85 : (idx === rawLines.length - 1 ? 11.5 : 9);
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

  let curKopY = 13;

  // Logos on Left and Right (matching PrintHeader.tsx)
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

  parsedHeaderLines.forEach((item: { text: string; bold: boolean; fontSize: number }) => {
    doc.setFont('times', item.bold ? 'bold' : 'normal');
    doc.setFontSize(item.fontSize);
    doc.setTextColor(0, 0, 0);
    doc.text(item.text.toUpperCase(), pageWidth / 2, curKopY, { align: 'center' });
    curKopY += item.fontSize > 11 ? 4.5 : 3.8;
  });

  // Alamat & Kontak
  if (data.sekolah.alamat) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const alamatText = `${data.sekolah.alamat}${data.sekolah.telepon ? ' | Telp: ' + data.sekolah.telepon : ''}`;
    doc.text(alamatText, pageWidth / 2, curKopY, { align: 'center' });
    curKopY += 3.2;
  }
  if (data.sekolah.website || data.sekolah.email) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const contactText = `${data.sekolah.website ? 'Website: ' + data.sekolah.website : ''}${data.sekolah.email ? ' | Email: ' + data.sekolah.email : ''}`;
    doc.text(contactText, pageWidth / 2, curKopY, { align: 'center' });
    curKopY += 3.2;
  }

  // Double rule
  curKopY += 1;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(margin, curKopY, pageWidth - margin, curKopY);
  doc.setLineWidth(0.3);
  doc.line(margin, curKopY + 0.8, pageWidth - margin, curKopY + 0.8);

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  curKopY += 7;
  doc.text('RENCANA ANGGARAN BIAYA (RAB) & DAFTAR KEBUTUHAN ALAT/BAHAN', pageWidth / 2, curKopY, {
    align: 'center',
  });
  doc.setFontSize(10);
  curKopY += 5;
  doc.text(`UJI KOMPETENSI KEAHLIAN (UKK) TAHUN PELAJARAN ${data.rab.tahunPelajaran || '-'}`, pageWidth / 2, curKopY, {
    align: 'center',
  });

  // Metadata Box
  let currentY = curKopY + 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Program Keahlian : ${data.rab.jurusanNama || '-'}`, margin, currentY);
  doc.text(`Jumlah Peserta  : ${data.rab.jumlahPeserta || 0} Siswa`, margin + 110, currentY);
  currentY += 4.5;

  if (data.rab.judulPenugasan) {
    doc.text(`Judul Penugasan  : ${data.rab.judulPenugasan}`, margin, currentY, { maxWidth: contentWidth });
    currentY += 5;
  }
  doc.text(`Tanggal Pengajuan: ${data.rab.tanggalPengajuan || '-'}`, margin, currentY);
  doc.text(`Status Verifikasi: ${data.rab.statusPengajuan.replace(/_/g, ' ')}`, margin + 110, currentY);
  currentY += 6;

  // Group items
  const alatList = (data.rab.items || []).filter((i) => i.kategori === 'ALAT');
  const bahanList = (data.rab.items || []).filter((i) => i.kategori === 'BAHAN');

  const totalBiayaAlat = alatList.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
  const totalBiayaBahan = bahanList.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
  const grandTotal = totalBiayaAlat + totalBiayaBahan;

  // Table A: Kebutuhan Peralatan
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('A. DAFTAR KEBUTUHAN ALAT PRAKTIK & PERANGKAT UTAMA', margin, currentY);
  currentY += 2;

  const alatRows = alatList.map((item, idx) => [
    idx + 1,
    item.nama_barang,
    item.spesifikasi || '-',
    `${item.jumlah_total} ${item.satuan}`,
    item.status_ketersediaan === 'TERSEDIA'
      ? 'Tersedia di Lab'
      : item.status_ketersediaan === 'PINJAM'
      ? 'Pinjam/Mitra'
      : 'Pengadaan Baru',
    formatRupiah(item.harga_satuan),
    formatRupiah(item.total_harga),
  ]);

  if (alatRows.length === 0) {
    alatRows.push(['-', 'Tidak ada pengajuan alat baru', '-', '-', '-', '-', 'Rp 0'] as any);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Nama Alat / Perangkat', 'Spesifikasi', 'Kebutuhan', 'Ketersediaan', 'Estimasi Harga', 'Total Biaya']],
    body: alatRows,
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 42 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Table B: Bahan Habis Pakai (BHP)
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text('B. DAFTAR BAHAN PRAKTIK HABIS PAKAI (BHP)', margin, currentY);
  currentY += 2;

  const bahanRows = bahanList.map((item, idx) => [
    idx + 1,
    item.nama_barang,
    item.spesifikasi || '-',
    item.rasio_per_siswa ? `${item.rasio_per_siswa} /siswa` : '-',
    `${item.jumlah_total} ${item.satuan}`,
    formatRupiah(item.harga_satuan),
    formatRupiah(item.total_harga),
  ]);

  if (bahanRows.length === 0) {
    bahanRows.push(['-', 'Tidak ada pengajuan bahan praktik', '-', '-', '-', '-', 'Rp 0'] as any);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Nama Bahan Habis Pakai (BHP)', 'Spesifikasi', 'Rasio', 'Total Vol', 'Harga Satuan', 'Total Biaya']],
    body: bahanRows,
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 42 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Grand Total Box
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text(`TOTAL REKAPITULASI ANGGARAN KEBUTUHAN UKK: ${formatRupiah(grandTotal)}`, pageWidth - margin, currentY, {
    align: 'right',
  });
  currentY += 10;

  // Check page overflow for 2-tier signature block
  if (currentY > 215) {
    doc.addPage();
    currentY = 25;
  }

  // Tanda Tangan: Baris 1 Sejajar (Wakasek Sarpras Kiri, Kaprog Kanan), Baris 2 Kepala Sekolah di Tengah Bawah
  const kota = data.sekolah.kota || 'Purwakarta';
  const tglStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const colHalfWidth = contentWidth / 2;
  const xLeft = margin + colHalfWidth / 2;
  const xRight = margin + colHalfWidth + colHalfWidth / 2;
  const xCenter = pageWidth / 2;

  // Tanggal di atas Kaprog (Kanan)
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`${kota}, ${tglStr}`, xRight, currentY, { align: 'center' });
  currentY += 4.5;

  const yRow1Title = currentY;

  // Kolom Kiri: Verifikator (Wakasek Sarpras)
  doc.text('Diverifikasi oleh,\nWakasek Bidang Sarpras', xLeft, yRow1Title, { align: 'center' });

  // Kolom Kanan: Pemohon (Kaprog)
  doc.text('Dibuat oleh,\nKetua Program Keahlian', xRight, yRow1Title, { align: 'center' });

  const yRow1Name = currentY + 22;

  // Nama & NIP Wakasek Sarpras (Kiri)
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(data.wakasekSarpras?.nama || '...........................................', xLeft, yRow1Name, {
    align: 'center',
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${data.wakasekSarpras?.nip || '-'}`, xLeft, yRow1Name + 4, { align: 'center' });

  // Nama & NIP Kaprog (Kanan)
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(data.kaprog?.nama || '...........................................', xRight, yRow1Name, {
    align: 'center',
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${data.kaprog?.nip || '-'}`, xRight, yRow1Name + 4, { align: 'center' });

  // --- BARIS 2: KEPALA SEKOLAH (TENGAH DI BAWAH) ---
  currentY = yRow1Name + 10;
  const yRow2Title = currentY;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('Mengetahui / Menyetujui,\nKepala Sekolah', xCenter, yRow2Title, { align: 'center' });

  const yRow2Name = currentY + 22;
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(data.sekolah.kepala_sekolah || '...........................................', xCenter, yRow2Name, {
    align: 'center',
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${data.sekolah.nip_kepala || '-'}`, xCenter, yRow2Name + 4, { align: 'center' });

  const blobUrl = doc.output('bloburl').toString();
  return { doc, blobUrl };
};
