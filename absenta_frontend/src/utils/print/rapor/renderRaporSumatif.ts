import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import {
  formatIndoDate,
  PrintRaporBatchOptions,
  PrintRaporOptions,
} from './raporShared';

export const renderOfficialSumatifPage = (
  doc: jsPDF,
  raporData: any,
  sekolah: any,
  tenantInfo: any,
  tahunPelajaranNama: string,
  semesterNama: string,
  isFirstStudent: boolean,
  raporSettings?: any
) => {
  if (!isFirstStudent) {
    doc.addPage();
  }
  const pageWidth = 210;
  const siswa = raporData.siswa || {};
  const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SMKN 1 PLERED';
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';
  const alamatSekolah = sekolah?.alamat || tenantInfo?.address || 'Jl. Raya Rawasari, Plered';

  const tingkatNum = Number(siswa.tingkat || 10);
  const fase = tingkatNum <= 10 ? 'E' : 'F';
  const resolvedSemester = semesterNama || raporData.semester?.nama_semester || 'Ganjil';
  const resolvedTp = tahunPelajaranNama || raporData.tahun_pelajaran?.tahun || '2024 / 2025';

  const currentY = 12;

  // 1. Metadata Grid at Top (Sesuai persis Gambar 2)
  const metaRows = [
    ['Nama', ':', (siswa.nama_siswa || '-').toUpperCase(), 'Kelas', ':', siswa.kelas || '-'],
    ['NIS/NISN', ':', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`, 'Fase', ':', fase],
    ['Nama Sekolah', ':', namaSekolah.toUpperCase(), 'Semester', ':', resolvedSemester],
    ['Alamat', ':', alamatSekolah, 'Tahun Pelajaran', ':', resolvedTp],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    body: metaRows,
    theme: 'plain',
    styles: { font: 'Helvetica', fontSize: 8.5, cellPadding: { top: 1, bottom: 1, left: 0, right: 0 } },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 4 },
      2: { cellWidth: 70, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 4 },
      5: { cellWidth: 52, fontStyle: 'bold' },
    },
  });

  const metaEnd = (doc as any).lastAutoTable?.finalY || 32;

  // 2. Horizontal Divider Line (Garis pemisah tebal rapi)
  let tableStartY = metaEnd + 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, tableStartY, 196, tableStartY);

  // 3. Title: LAPORAN HASIL PENILAIAN SUMATIF SISWA
  tableStartY += 6;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('LAPORAN HASIL PENILAIAN SUMATIF SISWA', pageWidth / 2, tableStartY, { align: 'center' });
  tableStartY += 4;

  // 4. Grouping Mapel A. Kelompok Umum & B. Kelompok Kejuruan
  const listMapel = raporData.nilai_akademik || [];
  const mapelUmum: any[] = [];
  const mapelKejuruan: any[] = [];

  listMapel.forEach((m: any) => {
    const g = (m.kelompok_mapel || '').toUpperCase();
    const n = (m.mapel_name || '').toUpperCase();

    if (
      g.includes('KEJURUAN') ||
      g.includes('PILIHAN') ||
      n.includes('MATEMATIKA') ||
      n.includes('INGGRIS') ||
      n.includes('INFORMATIKA') ||
      n.includes('IPAS') ||
      n.includes('ALAM') ||
      n.includes('DASAR') ||
      n.includes('PROGRAM KEAHLIAN') ||
      n.includes('KONSENTRASI') ||
      n.includes('KODING') ||
      n.includes('KEWIRAUSAHAAN') ||
      n.includes('PKK')
    ) {
      mapelKejuruan.push(m);
    } else {
      mapelUmum.push(m);
    }
  });

  const buildRow = (m: any, idx: number) => {
    let rincianText = '';
    const hasSumatif = m.sumatif_1 != null || m.sumatif_2 != null || m.sumatif_3 != null;

    if (hasSumatif) {
      const s1 = m.sumatif_1 != null ? String(m.sumatif_1) : '';
      const s2 = m.sumatif_2 != null ? String(m.sumatif_2) : '';
      const s3 = m.sumatif_3 != null ? String(m.sumatif_3) : '';
      rincianText = `Nilai  :  ${s1}   ,   Nilai  :  ${s2}   ,   Nilai  :  ${s3}`;
    } else if (m.nilai_components && Array.isArray(m.nilai_components) && m.nilai_components.length > 0) {
      if (m.nilai_components.length === 1) {
        const val = m.nilai_components[0]?.nilai ?? m.nilai_akhir ?? '';
        rincianText = `Nilai  :  ${val}   ,   Nilai  :     ,   Nilai  :  `;
      } else {
        rincianText = m.nilai_components
          .map((c: any) => `Nilai  :  ${c.nilai ?? ''}`)
          .join('   ,   ');
      }
    } else if (m.nilai_akhir && m.nilai_akhir > 0) {
      rincianText = `Nilai  :  ${m.nilai_akhir}   ,   Nilai  :     ,   Nilai  :  `;
    } else {
      rincianText = 'Nilai  :     ,   Nilai  :     ,   Nilai  :  ';
    }

    const rerata = m.rata_rata_sumatif != null && m.rata_rata_sumatif > 0
      ? String(Math.round(m.rata_rata_sumatif))
      : (m.nilai_akhir && m.nilai_akhir > 0 ? String(Math.round(m.nilai_akhir)) : '-');

    return [idx + 1, m.mapel_name || '-', rerata, rincianText];
  };

  const tableBody: any[] = [];
  if (mapelUmum.length > 0) {
    tableBody.push([
      {
        content: 'A. Kelompok Umum',
        colSpan: 4,
        styles: { fontStyle: 'bold', fillColor: [235, 237, 240], textColor: [0, 0, 0] },
      },
    ]);
    mapelUmum.forEach((m, i) => tableBody.push(buildRow(m, i)));
  }

  if (mapelKejuruan.length > 0) {
    tableBody.push([
      {
        content: 'B. Kelompok Kejuruan',
        colSpan: 4,
        styles: { fontStyle: 'bold', fillColor: [235, 237, 240], textColor: [0, 0, 0] },
      },
    ]);
    mapelKejuruan.forEach((m, i) => tableBody.push(buildRow(m, i)));
  }

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['No', 'Mata Pelajaran', 'Rerata Nilai', 'Rincian Nilai Sumatif']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [169, 209, 142], // Warna hijau kalem seperti Gambar 2 (#a9d18e)
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 8,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    bodyStyles: {
      font: 'Helvetica',
      fontSize: 8,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 88 },
    },
  });

  let bottomY = (doc as any).lastAutoTable?.finalY || 150;

  // Cek apakah sisa halaman cukup untuk Presensi + Catatan Walas + TTD (butuh ~65mm)
  if (bottomY > 215) {
    doc.addPage();
    bottomY = 16;
  } else {
    bottomY += 4;
  }

  // 5. Presensi / Ketidakhadiran Table (Lebar ~80mm rata kiri sesuai Gambar 2)
  const absensi = raporData.absensi || {};
  const presensiRows = [
    ['Sakit', ':', `${absensi.sakit ?? '-'} hari`],
    ['Izin', ':', `${absensi.izin ?? '-'} hari`],
    ['Tanpa Keterangan', ':', `${absensi.alpa ?? '-'} hari`],
  ];

  autoTable(doc, {
    startY: bottomY,
    margin: { left: 14 },
    body: presensiRows,
    tableWidth: 80,
    theme: 'grid',
    styles: {
      font: 'Helvetica',
      fontSize: 8,
      cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 6, halign: 'center' },
      2: { cellWidth: 38, halign: 'center' },
    },
  });

  bottomY = (doc as any).lastAutoTable?.finalY + 4;

  // 6. Catatan Wali kelas Box (Border kotak lebar penuh sesuai Gambar 2)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Catatan Wali kelas', 14, bottomY);
  bottomY += 2;

  const catatanText = raporData.catatan_wali || 'Pertahankan semangat belajarnya';
  const boxW = 182;
  const boxH = 12;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(14, bottomY, boxW, boxH);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(catatanText, 17, bottomY + 7);
  bottomY += boxH + 8;

  // Cek overflow sebelum tanda tangan
  if (bottomY > 235) {
    doc.addPage();
    bottomY = 20;
  }

  // 7. Signatures Block (Wali Kelas kanan atas, Ortu kiri atas, Kepsek tengah bawah)
  const walasNama = raporData.wali_kelas?.nama || raporData.wali_kelas_nama || sekolah?.wali_kelas || 'Oky Setiawan, S.Pd.';
  const walasNip = raporData.wali_kelas?.nip || raporData.wali_kelas_nip || '-';
  const kepsekNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'AJANG SARIP HIDAYAT, S.Pd.,M.Pd.';
  const kepsekNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '-';
  const titimangsaStr = raporSettings?.tanggal_rapor
    ? formatIndoDate(new Date(raporSettings.tanggal_rapor))
    : formatIndoDate(new Date());

  // Kanan atas: Titimangsa & Walas
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${kota}, ${titimangsaStr}`, 140, bottomY);
  doc.text('Wali Kelas,', 140, bottomY + 4.5);

  const walasY = bottomY + 22;
  doc.setFont('Helvetica', 'bold');
  doc.text(walasNama, 140, walasY);
  const walasW = doc.getTextWidth(walasNama);
  doc.setLineWidth(0.3);
  doc.line(140, walasY + 0.8, 140 + walasW, walasY + 0.8);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(walasNip && walasNip !== '-' ? `NIP ${walasNip}` : 'NIP. -', 140, walasY + 4.5);

  // Kiri atas: Orang Tua / Wali Siswa
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Orang Tua/Wali Siswa,', 14, bottomY + 4.5);
  doc.text('......................................................', 14, walasY);

  // Tengah bawah: Kepala Sekolah
  const kepsekTopY = walasY + 10;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mengetahui;', pageWidth / 2, kepsekTopY, { align: 'center' });
  doc.text('Kepala Sekolah,', pageWidth / 2, kepsekTopY + 4.5, { align: 'center' });

  const kepsekY = kepsekTopY + 22;
  doc.setFont('Helvetica', 'bold');
  doc.text(kepsekNama, pageWidth / 2, kepsekY, { align: 'center' });
  const kepsekW = doc.getTextWidth(kepsekNama);
  doc.line(pageWidth / 2 - kepsekW / 2, kepsekY + 0.8, pageWidth / 2 + kepsekW / 2, kepsekY + 0.8);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(kepsekNip && kepsekNip !== '-' ? `NIP ${kepsekNip}` : 'NIP. -', pageWidth / 2, kepsekY + 4.5, { align: 'center' });
};

/**
 * 📑 4. Generate Rapor Penilaian Sumatif PDF (Client-side jsPDF)
 */
export const generateRaporSumatifPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  const [raporRes, sekolahRes, tenantRes, settingsRes] = await Promise.allSettled([
    raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }).catch(() => null),
  ]);

  const raporData = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  const raporSettings = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;

  if (!raporData) throw new Error('Data rapor sumatif tidak ditemukan.');

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  renderOfficialSumatifPage(doc, raporData, sekolah, tenantInfo, tahunPelajaranNama, semesterNama, true, raporSettings);

  const siswa = raporData.siswa || {};
  const filename = `Rapor_Sumatif_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 📊 Cetak Massal Rapor Penilaian Sumatif Sekelas dalam 1 Berkas PDF Gabungan
 */
export const generateRaporSumatifKelasBatchPdf = async (options: PrintRaporBatchOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { students, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama = 'Sekelas', onProgress } = options;
  if (!students || students.length === 0) {
    throw new Error('Tidak ada data siswa untuk dicetak.');
  }

  // Preload school, tenant info, & settings ONCE
  const [sekolahRes, tenantRes, settingsRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
    raporApi.getRaporSettings({ tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }).catch(() => null),
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;
  const raporSettings = settingsRes.status === 'fulfilled' ? (settingsRes.value?.data || settingsRes.value) : null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  let renderedCount = 0;
  let lastError: any = null;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    onProgress?.(i + 1, students.length, student.nama_siswa || 'Siswa');

    try {
      const raporRes = await raporApi.getRaporDetail({
        siswa_id: student.id,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
      });
      const raporData = raporRes?.data?.data || raporRes?.data || raporRes;
      if (raporData) {
        renderOfficialSumatifPage(doc, raporData, sekolah, tenantInfo, tahunPelajaranNama, semesterNama, renderedCount === 0, raporSettings);
        renderedCount++;
      }
    } catch (err: any) {
      console.warn(`Gagal memuat rapor sumatif untuk ${student.nama_siswa}:`, err);
      lastError = err;
    }
  }

  if (renderedCount === 0) {
    throw new Error(lastError?.message || 'Gagal memproses pembuatan PDF batch rapor sumatif.');
  }

  const filename = `Rapor_Sumatif_Sekelas_${kelasNama.replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};
