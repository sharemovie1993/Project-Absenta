import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import { drawKopSurat } from '../pdfGeneric';
import { getBase64ImageFromUrl } from '../../cooperative/coopDocUtils';
import {
  PrintRaporBatchOptions,
  PrintRaporOptions,
} from './raporShared';

/**
 * 🌟 Render Halaman Rapor P5 untuk 1 Siswa
 */
export const renderOfficialP5Page = (
  doc: jsPDF,
  allP5: any[],
  siswa: any,
  sekolah: any,
  tenantInfo: any,
  tahunPelajaranNama: string,
  semesterNama: string,
  logoDaerahBase64: string | null,
  logoSekolahBase64: string | null,
  isFirstStudent: boolean
) => {
  if (!isFirstStudent) {
    doc.addPage();
  }
  const pageWidth = 210;
  let y = drawKopSurat(doc, pageWidth, sekolah, tenantInfo, logoDaerahBase64, logoSekolahBase64, true);

  y += 4;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RAPOR PROJEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${tahunPelajaranNama ? `TP ${tahunPelajaranNama}` : ''} ${semesterNama ? `| ${semesterNama}` : ''}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Student info
  doc.setFontSize(9);
  [
    ['Nama Siswa', siswa.nama_siswa || '-'],
    ['NIS / NISN', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
    ['Kelas', siswa.kelas || '-'],
  ].forEach(([label, value]) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(label, 15, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(`: ${value}`, 55, y);
    y += 5;
  });
  y += 2;

  // Legend
  doc.setFontSize(7.5);
  doc.setFont('Helvetica', 'bold');
  doc.text('Keterangan: ', 15, y);
  doc.setFont('Helvetica', 'normal');
  doc.text('BB = Belum Berkembang  |  MB = Mulai Berkembang  |  BSH = Berkembang Sesuai Harapan  |  SB = Sangat Berkembang', 38, y);
  y += 5;

  // Group by projek_id
  const projekMap = new Map<string, { judul: string; scores: any[] }>();
  allP5.forEach((n: any) => {
    const pid = n.projek_id || n.Projek?.id || 'unknown';
    if (!projekMap.has(pid)) {
      projekMap.set(pid, { judul: n.Projek?.judul || n.projek_judul || 'Projek P5', scores: [] });
    }
    projekMap.get(pid)!.scores.push(n);
  });

  if (projekMap.size === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Belum ada penilaian P5 pada semester ini.', pageWidth / 2, y + 6, { align: 'center' });
  } else {
    let pIdx = 1;
    projekMap.forEach((projek) => {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`Projek ${pIdx}: ${projek.judul}`, 15, y);
      y += 2;

      const rows = projek.scores.map((s: any) => [
        s.dimensi || '-',
        s.sub_elemen || '-',
        s.kualifikasi === 'BB' ? '✓' : '',
        s.kualifikasi === 'MB' ? '✓' : '',
        s.kualifikasi === 'BSH' ? '✓' : '',
        s.kualifikasi === 'SB' ? '✓' : '',
        s.catatan_proses || '-',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Dimensi', 'Sub-Elemen', 'BB', 'MB', 'BSH', 'SB', 'Catatan Proses']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [80, 50, 150], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 40 },
          2: { halign: 'center', cellWidth: 10 },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'center', cellWidth: 10 },
          6: { cellWidth: 45 },
        },
        margin: { left: 15, right: 15 },
      });
      y = (doc as any).lastAutoTable.finalY + 5;
      pIdx++;
    });
  }
};

/**
 * Generate P5 Rapor PDF (client-side via jsPDF).
 */
export const generateP5RaporPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  const p5Res = await raporApi.getP5Nilai({ siswa_id: siswaId });
  const allP5: any[] = p5Res?.data || p5Res || [];

  const raporRes = await raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId });
  const raporData = raporRes?.data || raporRes;
  const siswa = raporData?.siswa || {};

  const [sekolahRes, tenantRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null)
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;

  let logoDaerahBase64: string | null = null;
  let logoSekolahBase64: string | null = null;
  const logoUrl = sekolah?.logo_url || tenantInfo?.logo_url;
  const daerahUrl = sekolah?.logo_daerah_url || tenantInfo?.logo_daerah_url;
  if (daerahUrl) logoDaerahBase64 = await getBase64ImageFromUrl(daerahUrl).catch(() => null);
  if (logoUrl) logoSekolahBase64 = await getBase64ImageFromUrl(logoUrl).catch(() => null);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  renderOfficialP5Page(
    doc,
    allP5,
    siswa,
    sekolah,
    tenantInfo,
    tahunPelajaranNama,
    semesterNama,
    logoDaerahBase64,
    logoSekolahBase64,
    true
  );

  const filename = `P5_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * 🌟 Cetak Massal Rapor P5 Sekelas dalam 1 Berkas PDF Gabungan
 */
export const generateP5KelasBatchPdf = async (options: PrintRaporBatchOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { students, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama = 'Sekelas', onProgress } = options;
  if (!students || students.length === 0) {
    throw new Error('Tidak ada data siswa untuk dicetak.');
  }

  const [sekolahRes, tenantRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null),
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? ((tenantRes.value as any)?.data || tenantRes.value) : null;

  let logoDaerahBase64: string | null = null;
  let logoSekolahBase64: string | null = null;
  const logoUrl = sekolah?.logo_url || tenantInfo?.logo_url;
  const daerahUrl = sekolah?.logo_daerah_url || tenantInfo?.logo_daerah_url;
  if (daerahUrl) logoDaerahBase64 = await getBase64ImageFromUrl(daerahUrl).catch(() => null);
  if (logoUrl) logoSekolahBase64 = await getBase64ImageFromUrl(logoUrl).catch(() => null);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  let renderedCount = 0;
  let lastError: any = null;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    onProgress?.(i + 1, students.length, student.nama_siswa || 'Siswa');

    try {
      const [p5Res, raporRes] = await Promise.allSettled([
        raporApi.getP5Nilai({ siswa_id: student.id }),
        raporApi.getRaporDetail({ siswa_id: student.id, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId }),
      ]);
      const allP5 = p5Res.status === 'fulfilled' ? (p5Res.value?.data || p5Res.value || []) : [];
      const raporData = raporRes.status === 'fulfilled' ? (raporRes.value?.data || raporRes.value) : null;
      const siswa = raporData?.siswa || student;

      renderOfficialP5Page(
        doc,
        allP5,
        siswa,
        sekolah,
        tenantInfo,
        tahunPelajaranNama,
        semesterNama,
        logoDaerahBase64,
        logoSekolahBase64,
        renderedCount === 0
      );
      renderedCount++;
    } catch (err: any) {
      console.warn(`Gagal memuat rapor P5 untuk ${student.nama_siswa}:`, err);
      lastError = err;
    }
  }

  if (renderedCount === 0) {
    throw new Error(lastError?.message || 'Gagal memproses pembuatan PDF batch P5.');
  }

  const filename = `Rapor_P5_Sekelas_${kelasNama.replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};
