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
    kepala_sekolah?: string;
    nip_kepala?: string;
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

  // Kop Sekolah
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text((data.sekolah.nama || 'SEKOLAH MENENGAH KEJURUAN').toUpperCase(), pageWidth / 2, 16, {
    align: 'center',
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  if (data.sekolah.alamat) {
    doc.text(data.sekolah.alamat, pageWidth / 2, 21, { align: 'center' });
  }

  doc.setLineWidth(0.8);
  doc.line(margin, 25, pageWidth - margin, 25);
  doc.setLineWidth(0.3);
  doc.line(margin, 26, pageWidth - margin, 26);

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.text('RENCANA ANGGARAN BIAYA (RAB) & DAFTAR KEBUTUHAN ALAT/BAHAN', pageWidth / 2, 33, {
    align: 'center',
  });
  doc.setFontSize(10.5);
  doc.text(`UJI KOMPETENSI KEAHLIAN (UKK) TAHUN PELAJARAN ${data.rab.tahunPelajaran || '-'}`, pageWidth / 2, 38, {
    align: 'center',
  });

  // Metadata Box
  let currentY = 44;
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

  // Check page overflow for signature block
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  }

  // Tanda Tangan 3 Kolom: Kaprog (Pemohon), Wakasek Sarpras (Verifikator), Kepala Sekolah (Menyetujui)
  const kota = data.sekolah.kota || 'Purwakarta';
  const tglStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`${kota}, ${tglStr}`, pageWidth - margin, currentY, { align: 'right' });
  currentY += 5;

  const colWidth = contentWidth / 3;
  const ySignTitle = currentY;

  // Kolom 1: Pemohon (Kaprog)
  doc.text('Dibuat oleh,\nKetua Program Keahlian', margin + colWidth / 2, ySignTitle, { align: 'center' });

  // Kolom 2: Verifikator (Wakasek Sarpras)
  doc.text('Diverifikasi oleh,\nWakasek Bidang Sarpras', margin + colWidth * 1.5, ySignTitle, { align: 'center' });

  // Kolom 3: Mengetahui (Kepala Sekolah)
  doc.text('Mengetahui / Menyetujui,\nKepala Sekolah', margin + colWidth * 2.5, ySignTitle, { align: 'center' });

  const ySignName = currentY + 22;
  doc.setFont('times', 'bold');
  doc.text(data.kaprog?.nama || '...........................................', margin + colWidth / 2, ySignName, {
    align: 'center',
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${data.kaprog?.nip || '-'}`, margin + colWidth / 2, ySignName + 4, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(data.wakasekSarpras?.nama || '...........................................', margin + colWidth * 1.5, ySignName, {
    align: 'center',
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${data.wakasekSarpras?.nip || '-'}`, margin + colWidth * 1.5, ySignName + 4, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(data.sekolah.kepala_sekolah || '...........................................', margin + colWidth * 2.5, ySignName, {
    align: 'center',
  });
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${data.sekolah.nip_kepala || '-'}`, margin + colWidth * 2.5, ySignName + 4, { align: 'center' });

  const blobUrl = doc.output('bloburl').toString();
  return { doc, blobUrl };
};
