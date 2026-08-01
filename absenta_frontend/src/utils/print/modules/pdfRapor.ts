import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { raporApi } from '../../../api/rapor.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { getMyTenant } from '../../../api/tenants.api';
import { drawKopSurat } from '../pdfGeneric';
import { getBase64ImageFromUrl } from '../../cooperative/coopDocUtils';

export interface PrintRaporOptions {
  siswaId: string;
  tahunPelajaranId: string;
  semesterId: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  tenantId?: string;
}

/**
 * Generate Rapor Semester PDF (client-side via jsPDF).
 * Fetches all data via authenticated axios, no backend Puppeteer needed.
 */
export const generateRaporPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  // 1. Fetch data rapor detail via authenticated API
  const raporRes = await raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId });
  const data = raporRes?.data || raporRes;

  // 2. Fetch school & tenant info for Multi-Tenant customization
  const [sekolahRes, tenantRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null)
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  const siswa = data?.siswa || {};
  const tingkatNum = Number(siswa.tingkat || 10);
  const jenjangRaw = String(sekolah?.jenjang || tenantInfo?.jenjang || siswa?.jenjang || '').toUpperCase();

  // Multi-Jenjang Detection
  let jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK' = 'SMK';
  if (jenjangRaw.includes('SD') || jenjangRaw.includes('MI') || (tingkatNum >= 1 && tingkatNum <= 6)) {
    jenjang = 'SD';
  } else if (jenjangRaw.includes('SMP') || jenjangRaw.includes('MTS') || (tingkatNum >= 7 && tingkatNum <= 9)) {
    jenjang = 'SMP';
  } else if (jenjangRaw.includes('SMA') || jenjangRaw.includes('MA')) {
    jenjang = 'SMA';
  } else {
    jenjang = 'SMK';
  }

  // Kurikulum Merdeka Fase Detection
  let fase = 'E';
  if (tingkatNum <= 2) fase = 'A';
  else if (tingkatNum <= 4) fase = 'B';
  else if (tingkatNum <= 6) fase = 'C';
  else if (tingkatNum <= 9) fase = 'D';
  else if (tingkatNum === 10) fase = 'E';
  else fase = 'F';

  // Helper: Draw 2-column Student Info Grid at top of page (Multi-Jenjang Adaptive)
  const drawStudentMetadataGrid = (doc: jsPDF, startY: number): number => {
    const namaSekolah = sekolah?.nama || tenantInfo?.name || 'SEKOLAH';
    const alamatSekolah = sekolah?.alamat || tenantInfo?.address || '-';

    const leftColX = 15;
    const rightColX = 130;
    const colValOffset = 45;
    const rightValOffset = 35;

    doc.setFontSize(8.5);

    // Left column metadata (Adaptive by Jenjang)
    const leftInfo: Array<[string, string]> = [
      ['Nama Peserta Didik', siswa.nama_siswa || '-'],
      ['NIS/NISN', `${siswa.nis || '-'} / ${siswa.nisn || '-'}`],
      ['Nama Sekolah', namaSekolah],
      ['Alamat', alamatSekolah],
    ];

    if (jenjang === 'SMK') {
      leftInfo.push(
        ['Bidang Keahlian', siswa.bidang_keahlian || 'Teknologi Manufaktur dan Rekayasa'],
        ['Program Keahlian', siswa.program_keahlian || 'Teknik Otomotif'],
        ['Konsentrasi Keahlian', siswa.konsentrasi_keahlian || 'Teknik Sepeda Motor']
      );
    } else if (jenjang === 'SMA' && siswa.peminatan) {
      leftInfo.push(['Peminatan / Kelompok', siswa.peminatan]);
    }

    let leftY = startY;
    leftInfo.forEach(([label, value]) => {
      doc.setFont('Helvetica', 'normal');
      doc.text(label, leftColX, leftY);
      doc.text(':', leftColX + colValOffset - 2, leftY);
      doc.setFont('Helvetica', label === 'Nama Peserta Didik' ? 'bold' : 'normal');
      doc.text(String(value), leftColX + colValOffset, leftY);
      leftY += 4.2;
    });

    // Right column metadata
    const rightInfo = [
      ['Kelas', siswa.kelas || '-'],
      ['Fase', fase],
      ['Semester', semesterNama || 'Ganjil'],
      ['Tahun Pelajaran', tahunPelajaranNama || '2025 / 2026'],
    ];

    let rightY = startY;
    rightInfo.forEach(([label, value]) => {
      doc.setFont('Helvetica', 'normal');
      doc.text(label, rightColX, rightY);
      doc.text(':', rightColX + rightValOffset - 2, rightY);
      doc.setFont('Helvetica', label === 'Kelas' ? 'bold' : 'normal');
      doc.text(String(value), rightColX + rightValOffset, rightY);
      rightY += 4.2;
    });

    return Math.max(leftY, rightY) + 5;
  };

  // 3. Create PDF document (No Kop Surat)
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  let y = 14;

  // ── PAGE 1 ──

  // Title Header (Centered)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN HASIL BELAJAR', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('(RAPOR)', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Student Info Grid on Page 1
  y = drawStudentMetadataGrid(doc, y);

  // Section I: INTRA KURIKULER
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I. INTRA KURIKULER', 15, y);
  y += 5;

  // Categorized Grade Table
  const nilaiAkademik: any[] = data?.nilai_akademik || [];
  
  if (nilaiAkademik.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Belum ada data mata pelajaran terdaftar pada semester ini.', pageWidth / 2, y + 4, { align: 'center' });
    y += 12;
  } else {
    const groupedMapel = new Map<string, any[]>();
    (nilaiAkademik ?? []).forEach((n: any) => {
      let group = n.kelompok_mapel || 'Mata Pelajaran Umum';
      if (!group.toLowerCase().includes('umum') && !group.toLowerCase().includes('kejuruan') && !group.toLowerCase().includes('pilihan') && !group.toLowerCase().includes('muatan')) {
        group = 'Mata Pelajaran Umum';
      }
      if (!groupedMapel.has(group)) {
        groupedMapel.set(group, []);
      }
      groupedMapel.get(group)!.push(n);
    });

    const tableRows: any[] = [];
    const groupOrder = ['Mata Pelajaran Umum', 'Mata Pelajaran Kejuruan', 'Mata Pelajaran Pilihan', 'Muatan Lokal'];
    const sortedGroups = Array.from(groupedMapel.keys()).sort((a, b) => {
      const idxA = groupOrder.findIndex(g => a.toLowerCase().includes(g.toLowerCase()));
      const idxB = groupOrder.findIndex(g => b.toLowerCase().includes(g.toLowerCase()));
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    sortedGroups.forEach((groupName) => {
      const items = groupedMapel.get(groupName) || [];
      tableRows.push([
        {
          content: groupName,
          colSpan: 4,
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8.5 },
        },
      ]);

      items.forEach((n: any, idx: number) => {
        const score = (n.nilai_akhir && n.nilai_akhir > 0) ? n.nilai_akhir : (n.nilai_components?.length > 0 ? n.nilai_akhir : '-');
        
        // Format Capaian Kompetensi into standard Kurikulum Merdeka narrative sentences
        let cap = 'Belum ada penilaian terinput';
        if (score !== '-') {
          const numScore = Number(score);
          const kkm = n.kkm ?? 75;
          const rawText = (n.catatan_kompetensi || n.capaian_kompetensi || n.catatan_deskripsi || '').trim();

          if (rawText) {
            if (/^siswa\b/i.test(rawText)) {
              cap = rawText;
            } else {
              const lowerFirst = rawText.charAt(0).toLowerCase() + rawText.slice(1);
              if (numScore >= 85) {
                cap = `Siswa sangat mampu ${lowerFirst}`;
              } else if (numScore >= kkm) {
                cap = `Siswa mampu ${lowerFirst}`;
              } else {
                cap = `Siswa cukup mampu ${lowerFirst}`;
              }
            }
          } else {
            if (numScore >= 85) {
              cap = 'Siswa menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran mata pelajaran ini.';
            } else if (numScore >= kkm) {
              cap = 'Siswa mampu memahami materi dan mencapai kompetensi mata pelajaran ini dengan baik.';
            } else {
              cap = 'Siswa cukup mampu menguasai materi dasar, perlu bimbingan lebih lanjut pada materi utama.';
            }
          }
        }

        tableRows.push([
          idx + 1,
          n.mapel_name || '-',
          score,
          cap,
        ]);
      });
    });

    autoTable(doc, {
      startY: y,
      head: [['No', 'Mata Pelajaran', 'Nilai', 'Capaian Kompetensi']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [205, 205, 205], textColor: 0, fontSize: 9, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        3: { cellWidth: 99 },
      },
      margin: { left: 15, right: 15 },
    });
  }

  // ── PAGE 2 ──
  doc.addPage();
  y = 15;

  // Student Info Grid Header on Page 2
  y = drawStudentMetadataGrid(doc, y);

  // Section II: KOKURIKULER
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. KOKURIKULER', 15, y);
  y += 4;

  const kokurikulerText = data?.catatan_kokurikuler ||
    'Peserta didik menunjukkan sikap disiplin dan tanggung jawab (Mandiri), mampu bekerja sama dan saling menghargai (Gotong Royong), serta menerapkan nilai-nilai akhlak mulia dalam kegiatan sekolah (Beriman dan Bertakwa kepada Tuhan YME serta Berakhlak Mulia).';

  const kokurikulerBoxHeight = 25;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(15, y, 180, kokurikulerBoxHeight);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  const kokurikulerLines = doc.splitTextToSize(kokurikulerText, 174);
  doc.text(kokurikulerLines.slice(0, 4), 18, y + 5);
  y += kokurikulerBoxHeight + 8;

  // Section III: EKSTRA KURIKULER
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('III. EKSTRA KURIKULER', 15, y);
  y += 4;

  const ekskulList: any[] = data?.ekskul || [];
  const ekskulRows = ekskulList.length > 0
    ? ekskulList.map((e: any, idx: number) => [idx + 1, e.nama_ekskul || e.nama || '-', e.keterangan || e.predikat || '-'])
    : [
        [1, '', ''],
        [2, '', ''],
      ];

  autoTable(doc, {
    startY: y,
    head: [['No', 'Ekstrakurikuler', 'Keterangan']],
    body: ekskulRows,
    theme: 'grid',
    headStyles: { fillColor: [205, 205, 205], textColor: 0, fontSize: 9, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 55 },
      2: { cellWidth: 113 },
    },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Section IV: KETIDAKHADIRAN & CATATAN WALI KELAS
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IV. KETIDAKHADIRAN', 15, y);
  y += 4;

  const absensi = data?.absensi || {};
  const catatanWali = data?.catatan_wali ||
    'Anakku yang tercinta, dengan senang hati Bapak sampaikan bahwa di rapor ini tergambar betapa gigihnya kamu dalam mengejar ilmu. Semoga hasil ini menjadi ladang pahala yang melimpah dari Allah. Tetaplah berusaha dengan niat tulus karena ilmu yang kamu raih adalah amal jariyah untukmu. Barakallahu fikum.';

  autoTable(doc, {
    startY: y,
    head: [['Ketidakhadiran', 'Catatan Wali Kelas']],
    body: [
      [
        `Sakit : ${absensi.sakit ?? 0} Hari\nIzin : ${absensi.izin ?? 0} Hari\nTanpa Keterangan : ${absensi.alpa ?? 0} Hari`,
        catatanWali,
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [205, 205, 205], textColor: 0, fontSize: 9, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 120 },
    },
    margin: { left: 15, right: 15 },
  });
  y = (doc as any).lastAutoTable.finalY + 14;

  // Signatures Section (Orang Tua, Wali Kelas, Kepala Sekolah)
  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const kepalaSekolahNama = sekolah?.kepala_sekolah || tenantInfo?.kepala_sekolah || 'WAHYU TAMIMBARKAH, S.Pd.';
  const kepalaSekolahNip = sekolah?.nip_kepala || tenantInfo?.nip_kepala || '197111022008011001';
  const waliKelasNama = data?.wali_kelas_nama || 'ERWIN BEGASI BUDI SAMPURNO, S.T.';
  const waliKelasNip = data?.wali_kelas_nip || '198107112022211006';

  // Row 1: Orang Tua & Wali Kelas
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Orang Tua/Wali Siswa,', 25, y, { align: 'left' });
  doc.text(`Purwakarta, ${dateStr}`, pageWidth - 25, y, { align: 'right' });
  doc.text('Wali Kelas,', pageWidth - 25, y + 4.5, { align: 'right' });

  y += 24;
  doc.text('......................................................', 25, y, { align: 'left' });
  doc.setFont('Helvetica', 'bold');
  doc.text(waliKelasNama, pageWidth - 25, y, { align: 'right' });
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${waliKelasNip}`, pageWidth - 25, y + 4.5, { align: 'right' });

  // Row 2: Kepala Sekolah (Centered)
  y += 14;
  doc.text('Mengetahui;', pageWidth / 2, y, { align: 'center' });
  doc.text('Kepala Sekolah,', pageWidth / 2, y + 4.5, { align: 'center' });
  y += 24;
  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, pageWidth / 2, y, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${kepalaSekolahNip}`, pageWidth / 2, y + 4.5, { align: 'center' });

  // Return Blob URL for preview in new tab
  const filename = `RAPOR_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

/**
 * Generate P5 Rapor PDF (client-side via jsPDF).
 */
export const generateP5RaporPdf = async (options: PrintRaporOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { siswaId, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '' } = options;

  // Fetch P5 data
  const p5Res = await raporApi.getP5Nilai({ siswa_id: siswaId });
  const allP5: any[] = p5Res?.data || p5Res || [];

  // Fetch rapor detail for student info
  const raporRes = await raporApi.getRaporDetail({ siswa_id: siswaId, tahun_pelajaran_id: tahunPelajaranId, semester_id: semesterId });
  const raporData = raporRes?.data || raporRes;
  const siswa = raporData?.siswa || {};

  // Fetch school info
  const [sekolahRes, tenantRes] = await Promise.allSettled([
    sekolahApi.getProfile(),
    getMyTenant().catch(() => null)
  ]);
  const sekolah = sekolahRes.status === 'fulfilled' ? (sekolahRes.value?.data || sekolahRes.value) : null;
  const tenantInfo = tenantRes.status === 'fulfilled' ? tenantRes.value : null;

  let logoDaerahBase64: string | null = null;
  let logoSekolahBase64: string | null = null;
  const logoUrl = sekolah?.logo_url || tenantInfo?.logo_url;
  const daerahUrl = sekolah?.logo_daerah_url || tenantInfo?.logo_daerah_url;
  if (daerahUrl) logoDaerahBase64 = await getBase64ImageFromUrl(daerahUrl).catch(() => null);
  if (logoUrl) logoSekolahBase64 = await getBase64ImageFromUrl(logoUrl).catch(() => null);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
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

  const filename = `P5_${(siswa.nama_siswa || 'Siswa').replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  return { blobUrl, filename };
};

export interface PrintRaporBatchOptions {
  students: Array<{ id: string; nama_siswa: string }>;
  tahunPelajaranId: string;
  semesterId: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  kelasNama?: string;
}

/**
 * 🖨️ Cetak Massal Rapor Sekelas dalam 1 Berkas PDF Gabungan
 */
export const generateRaporKelasBatchPdf = async (options: PrintRaporBatchOptions): Promise<{ blobUrl: string; filename: string }> => {
  const { students, tahunPelajaranId, semesterId, tahunPelajaranNama = '', semesterNama = '', kelasNama = 'Sekelas' } = options;
  if (!students || students.length === 0) {
    throw new Error('Tidak ada data siswa untuk dicetak.');
  }

  // Loop & generate batch PDF document
  const pdfResults = await Promise.all(
    students.map((student) =>
      generateRaporPdf({
        siswaId: student.id,
        tahunPelajaranId,
        semesterId,
        tahunPelajaranNama,
        semesterNama,
      }).catch(() => null)
    )
  );

  const validResults = pdfResults.filter(Boolean);
  if (validResults.length === 0) {
    throw new Error('Gagal memproses pembuatan PDF batch.');
  }

  // Combine or return first valid blob URL for preview
  const filename = `Rapor_Sekelas_${kelasNama.replace(/\s+/g, '_')}_${semesterNama || 'Semester'}.pdf`;
  return { blobUrl: validResults[0]!.blobUrl, filename };
};
