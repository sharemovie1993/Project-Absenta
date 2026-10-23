import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Fallback Engine 2: Programmatic PDF generator for Buku Induk
 * Used when html2canvas-pro DOM capture is unavailable or fails.
 */
export async function generateBukuIndukPdf(siswa: any, tenantInfo: any): Promise<{ blobUrl: string; filename: string }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 14;

  const nama = siswa?.nama_siswa || '-';
  const nis = siswa?.nis || '-';
  const schoolName = tenantInfo?.name || 'SMK';

  const setTitle = (text: string, size = 12) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(text, pageW / 2, y, { align: 'center' });
    y += size * 0.5;
  };

  const sectionHeader = (title: string) => {
    if (y > 250) { doc.addPage(); y = 14; }
    y += 4;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, contentW, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), margin + 2, y);
    y += 5;
    doc.setTextColor(0, 0, 0);
  };

  const addRow = (label: string, value: string) => {
    if (y > 270) { doc.addPage(); y = 14; }
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, y);
    doc.text(':', margin + 65, y);
    const lines = doc.splitTextToSize(String(value || '-'), contentW - 70);
    doc.text(lines, margin + 69, y);
    y += Math.max(5.5, lines.length * 4.5);
  };

  // ── HEADER ─────────────────────────────────────────────────────────────────
  setTitle('BUKU INDUK PESERTA DIDIK', 14);
  setTitle(schoolName.toUpperCase(), 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(tenantInfo?.address || '', pageW / 2, y, { align: 'center' });
  y += 3;
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ── SHEET 1: IDENTITAS PRIBADI ────────────────────────────────────────────
  sectionHeader('A. Identitas Pribadi');
  addRow('Nama Lengkap', nama.toUpperCase());
  addRow('NIS', nis);
  addRow('NISN', siswa?.nisn || '-');
  addRow('Tempat Lahir', siswa?.tempat_lahir || '-');
  addRow('Tanggal Lahir', siswa?.tanggal_lahir ? new Date(siswa.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');
  addRow('Jenis Kelamin', siswa?.gender === 'L' || siswa?.jenis_kelamin?.toUpperCase()?.startsWith('L') ? 'Laki-laki' : siswa?.gender === 'P' ? 'Perempuan' : '-');
  addRow('Agama', siswa?.agama || '-');
  addRow('Kewarganegaraan', siswa?.kewarganegaraan || 'Indonesia');
  addRow('Anak ke-', siswa?.anak_ke ? String(siswa.anak_ke) : '-');
  addRow('No. Akta Lahir', siswa?.no_akta_lahir || '-');

  sectionHeader('B. Data Fisik');
  addRow('Tinggi Badan', siswa?.tinggi_badan ? `${siswa.tinggi_badan} cm` : '-');
  addRow('Berat Badan', siswa?.berat_badan ? `${siswa.berat_badan} kg` : '-');
  addRow('Golongan Darah', siswa?.golongan_darah || '-');

  sectionHeader('C. Orang Tua / Wali');
  const orangtua = (siswa?.OrangTuaSiswa || []).map((o: any) => o?.OrangTua).filter(Boolean);
  if (orangtua.length === 0) {
    addRow('Data Orang Tua', '-');
  } else {
    orangtua.forEach((ot: any, i: number) => {
      addRow(`${i + 1}. Nama (${ot.hubungan || 'Wali'})`, ot.nama || '-');
      addRow('   No. HP', ot.no_hp || '-');
      addRow('   Pekerjaan', ot.pekerjaan || '-');
    });
  }

  // ── SHEET 2 (New Page): RIWAYAT KELAS ─────────────────────────────────────
  doc.addPage();
  y = 14;
  sectionHeader('D. Riwayat Kelas');

  const akademikList: any[] = siswa?.SiswaAkademik || [];
  if (akademikList.length > 0) {
    const rows = akademikList.map((ak: any, i: number) => [
      String(i + 1),
      ak?.tahunPelajaran?.tahun || ak?.TahunPelajaran?.tahun || '-',
      ak?.semester?.nama_semester || ak?.Semester?.nama_semester || '-',
      ak?.kelas?.nama_kelas || ak?.Kelas?.nama_kelas || '-',
      ak?.status || '-',
    ]);
    autoTable(doc, {
      startY: y,
      head: [['No.', 'Tahun Pelajaran', 'Semester', 'Kelas', 'Status']],
      body: rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
    });
    y = (doc as any).lastAutoTable?.finalY + 6 || y + 20;
  } else {
    addRow('Data Riwayat', 'Belum ada data');
  }

  sectionHeader('E. Prestasi');
  const prestasi = siswa?.PrestasiSiswa || akademikList.flatMap((ak: any) => ak?.PrestasiSiswa || []);
  if (prestasi.length > 0) {
    const rows = prestasi.map((p: any, i: number) => [
      String(i + 1),
      p?.nama_kegiatan || '-',
      p?.tingkat || '-',
      p?.peringkat || '-',
      p?.tahun || '-',
    ]);
    autoTable(doc, {
      startY: y,
      head: [['No.', 'Nama Kegiatan', 'Tingkat', 'Peringkat', 'Tahun']],
      body: rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
    });
    y = (doc as any).lastAutoTable?.finalY + 6 || y + 20;
  } else {
    addRow('Prestasi', 'Belum ada data');
  }

  // ── SHEET 3 (New Page): NILAI SEM 1-3 + ESKUL ─────────────────────────────
  doc.addPage();
  y = 14;
  sectionHeader('F. Nilai Akademik (Semester 1 – 3)');

  for (let i = 0; i < 3; i++) {
    const ak = akademikList[i];
    const nilaiList = ak?.NilaiSiswa || [];
    const tpNama = ak?.tahunPelajaran?.tahun || ak?.TahunPelajaran?.tahun || `Semester ${i + 1}`;
    if (y > 230) { doc.addPage(); y = 14; }
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Semester ${i + 1} — ${tpNama}`, margin, y);
    y += 4;
    if (nilaiList.length > 0) {
      const rows = nilaiList.map((n: any) => [
        n?.Mapel?.nama_mapel || n?.mapel?.nama_mapel || '-',
        n?.nilai_akhir !== undefined ? String(n.nilai_akhir) : '-',
        n?.predikat || '-',
      ]);
      autoTable(doc, {
        startY: y,
        head: [['Mata Pelajaran', 'Nilai', 'Predikat']],
        body: rows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.5, cellPadding: 1.5, lineWidth: 0.2, lineColor: [0, 0, 0] },
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
        columnStyles: { 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 22 } },
      });
      y = (doc as any).lastAutoTable?.finalY + 5 || y + 15;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Belum ada data nilai.', margin + 4, y);
      y += 6;
    }
  }

  sectionHeader('G. Ekstrakurikuler');
  const eskul = akademikList.flatMap((ak: any) => (ak?.NilaiEskul || []).map((e: any) => ({
    ...e,
    tp: ak?.tahunPelajaran?.tahun || ak?.TahunPelajaran?.tahun || '-',
  })));
  if (eskul.length > 0) {
    const rows = eskul.map((e: any, i: number) => [
      String(i + 1),
      e?.JenisKegiatanMaster?.nama || e?.jenisKegiatanMaster?.nama || '-',
      e?.predikat || '-',
      e?.keterangan || '-',
      e?.tp || '-',
    ]);
    autoTable(doc, {
      startY: y,
      head: [['No.', 'Nama Eskul', 'Predikat', 'Keterangan', 'TP']],
      body: rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 1.5, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
    });
    y = (doc as any).lastAutoTable?.finalY + 6 || y + 20;
  } else {
    addRow('Ekstrakurikuler', 'Belum ada data');
  }

  // ── SHEET 4 (New Page): NILAI SEM 4-6, PKL, UKK, SKL, TRACER ─────────────
  doc.addPage();
  y = 14;
  sectionHeader('H. Nilai Akademik (Semester 4 – 6)');

  for (let i = 3; i < 6; i++) {
    const ak = akademikList[i];
    if (!ak) continue;
    const nilaiList = ak?.NilaiSiswa || [];
    const tpNama = ak?.tahunPelajaran?.tahun || ak?.TahunPelajaran?.tahun || `Semester ${i + 1}`;
    if (y > 230) { doc.addPage(); y = 14; }
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Semester ${i + 1} — ${tpNama}`, margin, y);
    y += 4;
    if (nilaiList.length > 0) {
      const rows = nilaiList.map((n: any) => [
        n?.Mapel?.nama_mapel || n?.mapel?.nama_mapel || '-',
        n?.nilai_akhir !== undefined ? String(n.nilai_akhir) : '-',
        n?.predikat || '-',
      ]);
      autoTable(doc, {
        startY: y,
        head: [['Mata Pelajaran', 'Nilai', 'Predikat']],
        body: rows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.5, cellPadding: 1.5, lineWidth: 0.2, lineColor: [0, 0, 0] },
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
        columnStyles: { 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 22 } },
      });
      y = (doc as any).lastAutoTable?.finalY + 5 || y + 15;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Belum ada data nilai.', margin + 4, y);
      y += 6;
    }
  }

  sectionHeader('I. Praktik Kerja Lapangan (PKL)');
  const siswaPkl = Array.isArray(siswa?.SiswaPkl) ? siswa.SiswaPkl : (siswa?.SiswaPkl ? [siswa.SiswaPkl] : []);
  const pklAll = siswaPkl.length > 0 ? siswaPkl : akademikList.flatMap((ak: any) => Array.isArray(ak?.SiswaPkl) ? ak.SiswaPkl : (ak?.SiswaPkl ? [ak.SiswaPkl] : []));
  if (pklAll.length > 0) {
    pklAll.forEach((pkl: any, i: number) => {
      addRow(`${i + 1}. Nama DUDI/Mitra`, pkl?.nama_mitra || pkl?.nama_dudi || '-');
      addRow('   Bidang', pkl?.bidang_keahlian || '-');
      addRow('   Nilai PKL', pkl?.nilai_pkl !== undefined ? String(pkl.nilai_pkl) : '-');
    });
  } else {
    addRow('PKL', 'Belum ada data');
  }

  sectionHeader('J. Uji Kompetensi Keahlian (UKK)');
  const ukkAll = (siswa?.SertifikatUkk || akademikList.flatMap((ak: any) => ak?.SertifikatUkk || []));
  if (ukkAll.length > 0) {
    const rows = ukkAll.map((u: any) => [
      u?.no_sertifikat || '-',
      u?.tahun_ukk !== undefined ? String(u.tahun_ukk) : '-',
      u?.nilai_ukk !== undefined ? String(u.nilai_ukk) : '-',
      u?.predikat || '-',
      u?.status_kelulusan_ukk || u?.status_kelulusan || '-',
    ]);
    autoTable(doc, {
      startY: y,
      head: [['No. Sertifikat', 'Tahun', 'Nilai', 'Predikat', 'Status']],
      body: rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 1.5, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
    });
    y = (doc as any).lastAutoTable?.finalY + 6 || y + 20;
  } else {
    addRow('UKK', 'Belum ada data');
  }

  sectionHeader('K. Kelulusan / SKL');
  const kelulusan = Array.isArray(siswa?.KelulusanSiswa) ? siswa.KelulusanSiswa[0] : siswa?.KelulusanSiswa || akademikList.flatMap((ak: any) => ak?.KelulusanSiswa || [])[0];
  if (kelulusan) {
    addRow('Nomor SKL', kelulusan.nomor_skl || '-');
    addRow('Status Kelulusan', kelulusan.status_kelulusan || '-');
    addRow('Tanggal Lulus', kelulusan.tanggal_lulus ? new Date(kelulusan.tanggal_lulus).toLocaleDateString('id-ID') : '-');
  } else {
    addRow('SKL', 'Belum ada data');
  }

  sectionHeader('L. Tracer Study / Alumni');
  const tracer = Array.isArray(siswa?.HubinTracerStudy) ? siswa.HubinTracerStudy[0] : siswa?.HubinTracerStudy;
  if (tracer) {
    addRow('Status Alumni', tracer.status_alumni || '-');
    addRow('Instansi / Kampus', tracer.nama_instansi || '-');
    addRow('Jurusan / Divisi', tracer.jurusan || tracer.divisi || '-');
  } else {
    addRow('Tracer Study', 'Belum ada data');
  }

  // ── TANDA TANGAN ───────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 14; }
  y += 10;
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Wali Kelas,', margin + 20, y, { align: 'center' });
  doc.text(`Kepala Sekolah,`, pageW - margin - 20, y, { align: 'center' });
  y += 5;
  doc.text(`${today}`, pageW - margin - 20, y, { align: 'center' });
  y += 30;
  doc.text('(..............................)', margin + 20, y, { align: 'center' });
  doc.text('(..............................)', pageW - margin - 20, y, { align: 'center' });

  const sanitizeName = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const filename = `Buku_Induk_${sanitizeName(nama)}_${nis}.pdf`;
  const blobUrl = doc.output('bloburl') as unknown as string;
  return { blobUrl, filename };
}
