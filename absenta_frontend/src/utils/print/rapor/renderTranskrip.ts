import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import { formatIndoDate } from './raporShared';

/**
 * 🎓 5. Generate Transkrip Nilai Kumulatif PDF (Client-side jsPDF)
 */
export const generateTranskripPdf = async (options: {
  siswaId: string;
}): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId } = options;

  const [transkripRes, sekolahRes, tenantRes] = await Promise.allSettled([
    raporApi.getTranskripNilai(siswaId),
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);

  const transkripData = transkripRes.status === 'fulfilled' ? (transkripRes.value?.data || transkripRes.value) : null;
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = 210;
  const siswa = transkripData?.siswa || {};
  const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SEKOLAH';
  const kota = sekolah?.kota || tenantInfo?.city || 'Purwakarta';

  let currentY = 16;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TRANSKRIP NILAI PRESTASI BELAJAR', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFontSize(10);
  doc.text(namaSekolah.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 7;

  // Metadata Table
  const metaRows = [
    ['Nama Peserta Didik', ':', (siswa.nama_siswa || '-').toUpperCase(), 'NIS / NISN', ':', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
    ['Kelas / Tingkat', ':', `${siswa.kelas || '-'} (${siswa.tingkat || 12})`, 'Konsentrasi Keahlian', ':', siswa.konsentrasi_keahlian || siswa.jurusan || '-'],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    body: metaRows,
    theme: 'plain',
    styles: { font: 'Helvetica', fontSize: 8.5, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 4 },
      2: { cellWidth: 65, fontStyle: 'bold' },
      3: { cellWidth: 30 },
      4: { cellWidth: 4 },
      5: { cellWidth: 44 },
    },
  });

  const metaEnd = (doc as any).lastAutoTable?.finalY || 45;
  const mapelList: any[] = transkripData?.nilai_kumulatif || [];

  const tableRows = mapelList.map((m, idx) => [
    idx + 1,
    m.nama_mapel,
    m.kelompok_mapel || 'Umum',
    m.rata_rata || m.nilai_akhir || '-',
    m.predikat || 'B',
  ]);

  autoTable(doc, {
    startY: metaEnd + 4,
    margin: { left: 14, right: 14 },
    head: [['NO', 'MATA PELAJARAN', 'KELOMPOK', 'NILAI AKHIR', 'PREDIKAT']],
    body: tableRows.length > 0 ? tableRows : [['-', 'Belum ada data nilai transkrip', '-', '-', '-']],
    theme: 'grid',
    styles: { font: 'Helvetica', fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 50 },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'center' },
    },
  });

  const tableEnd = (doc as any).lastAutoTable?.finalY || 180;
  const signY = tableEnd > 240 ? 240 : tableEnd + 10;
  if (signY > 245) doc.addPage();
  const targetSignY = signY > 245 ? 25 : signY;
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'Drs. H. Mulyadi, M.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala_sekolah || tenantInfo?.nip_kepala_sekolah || '-';

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${kota}, ${formatIndoDate(new Date())}`, 140, targetSignY);
  doc.text('Kepala Sekolah,', 140, targetSignY + 4.5);
  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, 140, targetSignY + 24);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${kepalaSekolahNip}`, 140, targetSignY + 28);

  const filename = `Transkrip_Nilai_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};
