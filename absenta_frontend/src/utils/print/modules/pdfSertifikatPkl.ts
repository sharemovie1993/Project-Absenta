import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface SertifikatPklPrintData {
  nomor_sertifikat?: string;
  durasi_jp?: number | string;
  tanggal_terbit?: string;
  sekolah?: {
    nama?: string;
    alamat?: string;
    kota?: string;
    kode_pos?: string;
    telepon?: string;
    email?: string;
    website?: string;
    kepala_sekolah?: string;
    nip_kepala?: string;
    logo_url?: string;
    logo_daerah?: string;
  };
  siswa: {
    nama_siswa: string;
    nis?: string;
    nisn?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string | Date;
    foto?: string | null;
    program_keahlian?: string;
    konsentrasi_keahlian?: string;
    nama_kelas?: string;
  };
  mitra: {
    nama: string;
    alamat?: string;
    penanggung_jawab_nama?: string;
    instruktur_nama?: string;
  };
  penilaian: {
    hard_kompetensi_teknis?: number | null;
    hard_sop_k3lh?: number | null;
    hard_alur_bisnis?: number | null;
    soft_kedisiplinan?: number | null;
    soft_kerajinan_inisiatif?: number | null;
    soft_kerjasama?: number | null;
    soft_kejujuran?: number | null;
    soft_tanggung_jawab?: number | null;
    nilai_akhir_pkl?: number | null;
    predikat_pkl?: string | null;
  };
}

export const getPredikatHuruf = (score: number | null | undefined): string => {
  if (score === null || score === undefined || isNaN(score)) return '-';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
};

export const getPredikatLabel = (score: number | null | undefined): string => {
  if (score === null || score === undefined || isNaN(score)) return '-';
  if (score >= 90) return 'AMAT BAIK';
  if (score >= 80) return 'BAIK';
  if (score >= 70) return 'CUKUP BAIK';
  if (score >= 60) return 'KURANG BAIK';
  return 'SANGAT KURANG';
};

export const formatTanggalIndonesia = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateVal);
  }
};

export const getImageNaturalDimensions = (src?: string | null): Promise<{ width: number; height: number; aspect: number } | null> => {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const width = img.naturalWidth || img.width || 1;
        const height = img.naturalHeight || img.height || 1;
        resolve({ width, height, aspect: width / height });
      };
      img.onerror = () => resolve(null);
      img.src = src;
    } else {
      resolve(null);
    }
  });
};

export const renderSertifikatFront = (
  doc: jsPDF,
  data: SertifikatPklPrintData,
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
    logoDaerahAspect?: number | null;
    logoSekolahAspect?: number | null;
  }
) => {
  const pageWidth = 297;
  const namaSekolah = data.sekolah?.nama || 'SEKOLAH MENENGAH KEJURUAN NEGERI 1 PLERED';
  const alamatSekolah = data.sekolah?.alamat || 'Jl. Raya Rawasari Kec. Plered Kab. Purwakarta Telp. (0264) 7504001';
  const websiteSekolah = data.sekolah?.website || 'smknegeri1plered.sch.id';
  const emailSekolah = data.sekolah?.email || 'smkneple@gmail.com';
  const kotaSekolah = data.sekolah?.kota || 'Purwakarta';
  const kodePosSekolah = data.sekolah?.kode_pos || '41162';
  const kepalaSekolahNama = data.sekolah?.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.';
  const kepalaSekolahNip = data.sekolah?.nip_kepala || '197111022008011001';
  const nomorSertifikat = data.nomor_sertifikat || '425.1/0630/SMKN1PLD-KCD Wil.IV';

  const durasiJp = data.durasi_jp || '792';
  const tanggalTerbit = data.tanggal_terbit || `${kotaSekolah}, 22 Desember 2025`;

  const { siswa, mitra, penilaian } = data;

  const hardScores = [
    penilaian.hard_kompetensi_teknis ?? 88,
    penilaian.hard_sop_k3lh ?? 89,
    penilaian.hard_alur_bisnis ?? 87,
  ];
  const softScores = [
    penilaian.soft_kedisiplinan ?? 83,
    penilaian.soft_kerajinan_inisiatif ?? 84,
    penilaian.soft_kerjasama ?? 86,
    penilaian.soft_kejujuran ?? 88,
    penilaian.soft_tanggung_jawab ?? 85,
  ];
  const allScores = [...hardScores, ...softScores];
  const totalScore = allScores.reduce((acc, s) => acc + s, 0);
  const avgScore = totalScore / allScores.length;
  const finalPredikat = penilaian.predikat_pkl ? penilaian.predikat_pkl.toUpperCase() : getPredikatLabel(avgScore);

  // A. Kop Surat - Preserve exact aspect ratio (avoid lonjong)
  const kopStartY = 12.5;
  const maxBoxW = 26;
  const maxBoxH = 28;

  if (options?.logoDaerahBase64) {
    try {
      const aspect = options.logoDaerahAspect || (22 / 27);
      let targetW = maxBoxW;
      let targetH = maxBoxW / aspect;
      if (targetH > maxBoxH) {
        targetH = maxBoxH;
        targetW = maxBoxH * aspect;
      }
      const x = 18 + (maxBoxW - targetW) / 2;
      const y = kopStartY + (maxBoxH - targetH) / 2;
      doc.addImage(options.logoDaerahBase64, 'PNG', x, y, targetW, targetH);
    } catch (e) {
      console.warn('Failed to load logo daerah in PDF:', e);
    }
  }

  if (options?.logoSekolahBase64) {
    try {
      const aspect = options.logoSekolahAspect || 1.0;
      let targetW = maxBoxW;
      let targetH = maxBoxW / aspect;
      if (targetH > maxBoxH) {
        targetH = maxBoxH;
        targetW = maxBoxH * aspect;
      }
      const x = (pageWidth - 18 - maxBoxW) + (maxBoxW - targetW) / 2;
      const y = kopStartY + (maxBoxH - targetH) / 2;
      doc.addImage(options.logoSekolahBase64, 'PNG', x, y, targetW, targetH);
    } catch (e) {
      console.warn('Failed to load logo sekolah in PDF:', e);
    }
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('PEMERINTAH DAERAH PROVINSI JAWA BARAT', pageWidth / 2, kopStartY + 3, { align: 'center' });
  doc.text('DINAS PENDIDIKAN', pageWidth / 2, kopStartY + 7.5, { align: 'center' });
  doc.text('CABANG DINAS PENDIDIKAN WILAYAH IV', pageWidth / 2, kopStartY + 12, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(namaSekolah.toUpperCase(), pageWidth / 2, kopStartY + 17.5, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(alamatSekolah, pageWidth / 2, kopStartY + 22, { align: 'center' });
  doc.text(`Website : ${websiteSekolah}, email : ${emailSekolah}`, pageWidth / 2, kopStartY + 25.5, { align: 'center' });
  doc.text(`${kotaSekolah} (${kodePosSekolah})`, pageWidth / 2, kopStartY + 29, { align: 'center' });

  // Garis Kop Pembatas
  const lineY = kopStartY + 31.5;
  doc.setLineWidth(0.8);
  doc.line(20, lineY, pageWidth - 20, lineY);
  doc.setLineWidth(0.2);
  doc.line(20, lineY + 0.8, pageWidth - 20, lineY + 0.8);

  // B. Judul Sertifikat & Nomor
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  const titleY = lineY + 11;
  doc.text('SERTIFIKAT PRAKTIK KERJA LAPANGAN', pageWidth / 2, titleY, { align: 'center' });
  
  const titleWidth = doc.getTextWidth('SERTIFIKAT PRAKTIK KERJA LAPANGAN');
  doc.setLineWidth(0.4);
  doc.line((pageWidth - titleWidth) / 2, titleY + 1, (pageWidth + titleWidth) / 2, titleY + 1);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nomor : ${nomorSertifikat}`, pageWidth / 2, titleY + 5.5, { align: 'center' });

  // C. Pembuka
  let curY = titleY + 14;
  doc.setFontSize(9.5);
  doc.text(`Kepala ${namaSekolah.replace('SEKOLAH MENENGAH KEJURUAN', 'Sekolah Menengah Kejuruan (SMK)')} menerangkan bahwa :`, 20, curY);

  // D. Biodata Siswa
  const colLabelX = 35;
  const colColonX = 85;
  const colValX = 88;
  const lineSpacing = 5.2;

  curY += 7;
  doc.setFont('Helvetica', 'normal');
  doc.text('Nama', colLabelX, curY);
  doc.text(':', colColonX, curY);
  doc.setFont('Helvetica', 'bold');
  doc.text(siswa.nama_siswa.toUpperCase(), colValX, curY);

  curY += lineSpacing;
  doc.setFont('Helvetica', 'normal');
  doc.text('Tempat, Tanggal Lahir', colLabelX, curY);
  doc.text(':', colColonX, curY);
  const ttlStr = `${siswa.tempat_lahir || kotaSekolah}, ${formatTanggalIndonesia(siswa.tanggal_lahir)}`;
  doc.text(ttlStr, colValX, curY);

  curY += lineSpacing;
  doc.text('Nomor Induk Siswa', colLabelX, curY);
  doc.text(':', colColonX, curY);
  doc.text(siswa.nis || '-', colValX, curY);

  curY += lineSpacing;
  doc.text('Program Keahlian', colLabelX, curY);
  doc.text(':', colColonX, curY);
  doc.text(siswa.program_keahlian || 'Teknik Otomotif', colValX, curY);

  curY += lineSpacing;
  doc.text('Konsentrasi Keahlian', colLabelX, curY);
  doc.text(':', colColonX, curY);
  doc.text(siswa.konsentrasi_keahlian || 'Teknik Sepeda Motor', colValX, curY);

  // E. Data Pelaksanaan PKL
  curY += lineSpacing + 1;
  doc.text('Telah melaksanakan Praktik Kerja Lapangan di', 20, curY);
  doc.text(':', colColonX, curY);

  curY += lineSpacing;
  doc.text('Nama Perusahaan/Instansi', colLabelX, curY);
  doc.text(':', colColonX, curY);
  doc.setFont('Helvetica', 'bold');
  doc.text(mitra.nama.toUpperCase(), colValX, curY);

  curY += lineSpacing;
  doc.setFont('Helvetica', 'normal');
  doc.text('Alamat', colLabelX, curY);
  doc.text(':', colColonX, curY);
  doc.text(`(${mitra.alamat || 'Jl. Raya Citeko-Plered-Purwakarta'})`, colValX, curY);

  // F. Klausul Pemenuhan JP & Ijazah
  curY += 8;
  doc.setFont('Helvetica', 'normal');
  doc.text('dan telah memenuhi', 20, curY);
  doc.setFont('Helvetica', 'bold');
  doc.text(`  ${durasiJp} Jam Pelajaran (JP)`, 53, curY);
  doc.setFont('Helvetica', 'normal');
  doc.text('  dengan hasil', 97, curY);
  doc.setFont('Helvetica', 'bold');
  doc.text(`  ${finalPredikat}`, 118, curY);

  curY += 5.2;
  doc.setFont('Helvetica', 'normal');
  doc.text('Sertifikat ini merupakan bagian yang tidak terpisahkan dari IJAZAH siswa yang bersangkutan.', 20, curY);

  // G. Bagian Bawah: Pasfoto 3x4 & Tanda Tangan Kepsek
  const bottomY = curY + 12;

  doc.setLineWidth(0.3);
  doc.rect(35, bottomY, 28, 38);
  if (siswa.foto) {
    try {
      doc.addImage(siswa.foto, 'JPEG', 35, bottomY, 28, 38);
    } catch {
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('foto', 49, bottomY + 18, { align: 'center' });
      doc.text('3x4', 49, bottomY + 23, { align: 'center' });
    }
  } else {
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.text('foto', 49, bottomY + 18, { align: 'center' });
    doc.text('3x4', 49, bottomY + 23, { align: 'center' });
  }

  const sigX = 230;
  doc.setFontSize(9.5);
  doc.setFont('Helvetica', 'normal');
  doc.text(tanggalTerbit, sigX, bottomY + 4, { align: 'center' });
  doc.text('Kepala sekolah,', sigX, bottomY + 9, { align: 'center' });

  const kepsekNameY = bottomY + 33;
  doc.setFont('Helvetica', 'bold');
  doc.text(kepalaSekolahNama, sigX, kepsekNameY, { align: 'center' });
  const nameWidth = doc.getTextWidth(kepalaSekolahNama);
  doc.setLineWidth(0.3);
  doc.line(sigX - nameWidth / 2, kepsekNameY + 0.8, sigX + nameWidth / 2, kepsekNameY + 0.8);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`NIP. ${kepalaSekolahNip}`, sigX, kepsekNameY + 5, { align: 'center' });
};

export const renderSertifikatBack = (
  doc: jsPDF,
  data: SertifikatPklPrintData
) => {
  const pageWidth = 297;
  const { siswa, mitra, penilaian } = data;

  const hardScores = [
    penilaian.hard_kompetensi_teknis ?? 88,
    penilaian.hard_sop_k3lh ?? 89,
    penilaian.hard_alur_bisnis ?? 87,
  ];
  const softScores = [
    penilaian.soft_kedisiplinan ?? 83,
    penilaian.soft_kerajinan_inisiatif ?? 84,
    penilaian.soft_kerjasama ?? 86,
    penilaian.soft_kejujuran ?? 88,
    penilaian.soft_tanggung_jawab ?? 85,
  ];
  const allScores = [...hardScores, ...softScores];
  const totalScore = allScores.reduce((acc, s) => acc + s, 0);
  const avgScore = totalScore / allScores.length;
  const avgScoreFormatted = (Math.round(avgScore * 100) / 100).toFixed(2).replace('.', ',');
  const finalPredikat = penilaian.predikat_pkl ? penilaian.predikat_pkl.toUpperCase() : getPredikatLabel(avgScore);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DAFTAR NILAI PRAKTIK KERJA LAPANGAN', pageWidth / 2, 20, { align: 'center' });

  let curY = 32;
  const leftLabelX = 20;
  const leftColonX = 72;
  const leftValX = 75;
  const rowGap = 5;

  doc.setFontSize(9.5);
  doc.setFont('Helvetica', 'normal');
  doc.text('Nama', leftLabelX, curY);
  doc.text(':', leftColonX, curY);
  doc.setFont('Helvetica', 'bold');
  doc.text(siswa.nama_siswa.toUpperCase(), leftValX, curY);

  curY += rowGap;
  doc.setFont('Helvetica', 'normal');
  doc.text('Nomor Induk siswa', leftLabelX, curY);
  doc.text(':', leftColonX, curY);
  doc.text(siswa.nisn || siswa.nis || '-', leftValX, curY);

  curY += rowGap;
  doc.text('Konsentrasi Keahlian', leftLabelX, curY);
  doc.text(':', leftColonX, curY);
  doc.text(siswa.konsentrasi_keahlian || 'Teknik Sepeda Motor', leftValX, curY);

  curY += rowGap;
  doc.text('Nama Perusahaan/Instansi', leftLabelX, curY);
  doc.text(':', leftColonX, curY);
  doc.setFont('Helvetica', 'bold');
  doc.text(mitra.nama.toUpperCase(), leftValX, curY);

  const tableBody = [
    [
      { content: 'A', styles: { fontStyle: 'bold', halign: 'center' } },
      { content: 'HARD SKILL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'left' } }
    ],
    [
      { content: '1', styles: { halign: 'center' } },
      { content: 'Kompetensi Teknis', styles: { halign: 'left' } },
      { content: String(hardScores[0]), styles: { halign: 'center' } },
      { content: getPredikatHuruf(hardScores[0]), styles: { halign: 'center' } }
    ],
    [
      { content: '2', styles: { halign: 'center' } },
      { content: 'Penerapan SOP dan K3LH', styles: { halign: 'left' } },
      { content: String(hardScores[1]), styles: { halign: 'center' } },
      { content: getPredikatHuruf(hardScores[1]), styles: { halign: 'center' } }
    ],
    [
      { content: '3', styles: { halign: 'center' } },
      { content: 'Memahami Alur Bisnis', styles: { halign: 'left' } },
      { content: String(hardScores[2]), styles: { halign: 'center' } },
      { content: getPredikatHuruf(hardScores[2]), styles: { halign: 'center' } }
    ],
    [
      { content: 'B', styles: { fontStyle: 'bold', halign: 'center' } },
      { content: 'SOFT SKILL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'left' } }
    ],
    [
      { content: '1', styles: { halign: 'center' } },
      { content: 'Kedisiplinan', styles: { halign: 'left' } },
      { content: String(softScores[0]), styles: { halign: 'center' } },
      { content: getPredikatHuruf(softScores[0]), styles: { halign: 'center' } }
    ],
    [
      { content: '2', styles: { halign: 'center' } },
      { content: 'Kerajinan, Inisiatif & Kreatifitas', styles: { halign: 'left' } },
      { content: String(softScores[1]), styles: { halign: 'center' } },
      { content: getPredikatHuruf(softScores[1]), styles: { halign: 'center' } }
    ],
    [
      { content: '3', styles: { halign: 'center' } },
      { content: 'Kerjasama (Team Work)', styles: { halign: 'left' } },
      { content: String(softScores[2]), styles: { halign: 'center' } },
      { content: getPredikatHuruf(softScores[2]), styles: { halign: 'center' } }
    ],
    [
      { content: '4', styles: { halign: 'center' } },
      { content: 'Kejujuran', styles: { halign: 'left' } },
      { content: String(softScores[3]), styles: { halign: 'center' } },
      { content: getPredikatHuruf(softScores[3]), styles: { halign: 'center' } }
    ],
    [
      { content: '5', styles: { halign: 'center' } },
      { content: 'Tanggung Jawab', styles: { halign: 'left' } },
      { content: String(softScores[4]), styles: { halign: 'center' } },
      { content: getPredikatHuruf(softScores[4]), styles: { halign: 'center' } }
    ],
    [
      { content: 'JUMLAH NILAI', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: String(totalScore), styles: { fontStyle: 'bold', halign: 'center' } },
      { content: '', styles: { halign: 'center' } }
    ],
    [
      { content: 'NILAI AKHIR RATA-RATA', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: avgScoreFormatted, styles: { fontStyle: 'bold', halign: 'center' } },
      { content: finalPredikat, styles: { fontStyle: 'bold', halign: 'center' } }
    ]
  ];

  autoTable(doc, {
    startY: curY + 6,
    margin: { left: 20, right: 20 },
    head: [
      [
        { content: 'NO.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'ASPEK PENILAIAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'NILAI', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }
      ],
      [
        { content: 'ANGKA', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'HURUF', styles: { halign: 'center', fontStyle: 'bold' } }
      ]
    ],
    body: tableBody as any,
    theme: 'grid',
    styles: {
      font: 'Helvetica',
      fontSize: 8.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.25,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 32 },
      3: { cellWidth: 32 },
    },
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY ?? 150;
  const footerY = finalTableY + 8;

  // Kotak Keterangan Nilai
  doc.setLineWidth(0.25);
  doc.rect(20, footerY, 65, 34);

  doc.setFontSize(8.5);
  doc.setFont('Helvetica', 'normal');
  doc.text('Keterangan Nilai :', 22, footerY + 5);

  const legY = footerY + 11;
  doc.setFontSize(8);
  doc.text('90 - 100', 23, legY);
  doc.text('A', 44, legY);
  doc.text('Amat Baik', 54, legY);

  doc.text('80 - 89', 23, legY + 5.5);
  doc.text('B', 44, legY + 5.5);
  doc.text('Baik', 54, legY + 5.5);

  doc.text('70 - 79', 23, legY + 11);
  doc.text('C', 44, legY + 11);
  doc.text('Cukup Baik', 54, legY + 11);

  doc.text('60 - 69', 23, legY + 16.5);
  doc.text('D', 44, legY + 16.5);
  doc.text('Kurang Baik', 54, legY + 16.5);

  // TTD PIC DUDI
  const picSigX = 230;
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.text('Penanggung Jawab Perusahaan / Instansi', picSigX, footerY + 5, { align: 'center' });

  const linePicY = footerY + 32;
  doc.setLineWidth(0.3);
  doc.line(picSigX - 35, linePicY, picSigX + 35, linePicY);

  if (mitra.penanggung_jawab_nama) {
    doc.setFont('Helvetica', 'bold');
    doc.text(mitra.penanggung_jawab_nama, picSigX, linePicY - 1.5, { align: 'center' });
  }
};

export const generateSertifikatPdf = async (
  data: SertifikatPklPrintData,
  options?: {
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
    mode?: 'all' | 'front_only' | 'back_only';
  }
): Promise<jsPDF> => {
  const mode = options?.mode || 'all';
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297 x 210 mm
  });

  let isFirstPage = true;

  // Preload image natural aspect ratios to prevent lonjong/distortion in jsPDF
  const [logoDaerahInfo, logoSekolahInfo] = await Promise.all([
    options?.logoDaerahBase64 ? getImageNaturalDimensions(options.logoDaerahBase64) : Promise.resolve(null),
    options?.logoSekolahBase64 ? getImageNaturalDimensions(options.logoSekolahBase64) : Promise.resolve(null),
  ]);

  const resolvedFrontOptions = {
    ...options,
    logoDaerahAspect: logoDaerahInfo?.aspect,
    logoSekolahAspect: logoSekolahInfo?.aspect,
  };

  if (mode === 'all' || mode === 'front_only') {
    renderSertifikatFront(doc, data, resolvedFrontOptions);
    isFirstPage = false;
  }

  if (mode === 'all' || mode === 'back_only') {
    if (!isFirstPage) doc.addPage('a4', 'landscape');
    renderSertifikatBack(doc, data);
  }

  return doc;
};
