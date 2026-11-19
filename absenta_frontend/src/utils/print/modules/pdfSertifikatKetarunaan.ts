import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface SertifikatKetarunaanPrintData {
  nomor_sertifikat?: string;
  tanggal_terbit?: string;
  tempat_terbit?: string;
  mode_pelatihan?: 'FULL_TARUNA' | 'SEMI_TARUNA';
  tahun_pelajaran?: string;
  semester?: string;
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
    nama_dinas_atas?: string;
    nama_dinas_bawah?: string;
    nama_cabang_dinas?: string;
    print_header_lines?: any[];
  };
  siswa: {
    id: string;
    nama_siswa: string;
    nis?: string;
    nisn?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string | Date;
    foto?: string | null;
    jenis_kelamin?: string;
    nama_kelas?: string;
    jurusan_nama?: string;
  };
  penilaian: {
    nilai_samapta: number;
    nilai_pbb: number;
    nilai_disiplin: number;
    nilai_mental: number;
    nilai_akhir: number;
    predikat: string;
    deskripsi_rapor?: string;
    bobot_samapta: number;
    bobot_pbb: number;
    bobot_disiplin: number;
    bobot_mental: number;
  };
  presensi_summary?: {
    total_sesi_terlaksana: number;
    hadir_disiplin: number;
    total_sesi_disiplin: number;
    persen_disiplin: number;
    hadir_duha: number;
    total_sesi_duha: number;
    persen_duha: number;
    terlambat_count: number;
  };
  signatories?: {
    master_training_nama?: string;
    master_training_nip?: string;
    master_training_jabatan?: string;
    pembina_nama?: string;
    pembina_nip?: string;
    pembina_jabatan?: string;
    kepsek_nama?: string;
    kepsek_nip?: string;
    ketua_pelaksana_nama?: string;
    ketua_pelaksana_nip?: string;
    ketua_pelaksana_jabatan?: string;
  };
}

export const getPredikatHuruf = (score: number | null | undefined): string => {
  if (score === null || score === undefined || isNaN(score)) return '-';
  if (score >= 86) return 'A';
  if (score >= 71) return 'B';
  if (score >= 56) return 'C';
  return 'D';
};

export const getPredikatLabel = (predikatOrScore: string | number): string => {
  if (typeof predikatOrScore === 'number') {
    if (predikatOrScore >= 86) return 'SANGAT BAIK';
    if (predikatOrScore >= 71) return 'BAIK';
    if (predikatOrScore >= 56) return 'CUKUP';
    return 'KURANG';
  }
  const p = String(predikatOrScore || '').toUpperCase();
  if (p === 'A') return 'SANGAT BAIK';
  if (p === 'B') return 'BAIK';
  if (p === 'C') return 'CUKUP';
  return 'KURANG';
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

export const generateSertifikatKetarunaanPdf = (
  data: SertifikatKetarunaanPrintData,
  options?: {
    mode?: 'all' | 'front_only' | 'back_only';
    logoDaerahBase64?: string | null;
    logoSekolahBase64?: string | null;
    siswaFotoBase64?: string | null;
  }
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const mode = options?.mode || 'all';

  const namaSekolah = data.sekolah?.nama || 'SMK NEGERI 1 PLERED';
  const kotaSekolah = data.sekolah?.kota || data.tempat_terbit || 'Purwakarta';
  const tanggalResmi = data.tanggal_terbit || `${kotaSekolah}, ${formatTanggalIndonesia(new Date())}`;

  // =========================================================================
  // HALAMAN 1: DEPAN (SERTIFIKAT KETARUNAAN)
  // =========================================================================
  if (mode === 'all' || mode === 'front_only') {
    // 1. Ornamen Bingkai Sertifikat Modern
    doc.setDrawColor(30, 41, 59); // Slate-800
    doc.setLineWidth(1.2);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    doc.setDrawColor(14, 165, 233); // Sky-500
    doc.setLineWidth(0.4);
    doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

    // Dynamic Corner Accents (Modern Chevron/Geometric)
    doc.setFillColor(14, 165, 233); // Sky-500
    doc.triangle(12, 12, 28, 12, 12, 28, 'F');
    doc.triangle(pageWidth - 12, 12, pageWidth - 28, 12, pageWidth - 12, 28, 'F');
    doc.triangle(12, pageHeight - 12, 28, pageHeight - 12, 12, pageHeight - 28, 'F');
    doc.triangle(pageWidth - 12, pageHeight - 12, pageWidth - 28, pageHeight - 12, pageWidth - 12, pageHeight - 28, 'F');

    // 2. Logos (Kiri: Daerah, Kanan: Sekolah)
    const kopY = 16;
    const logoW = 22;
    const logoH = 22;

    if (options?.logoDaerahBase64) {
      try {
        doc.addImage(options.logoDaerahBase64, 'PNG', 18, kopY, logoW, logoH);
      } catch (e) {}
    }

    if (options?.logoSekolahBase64) {
      try {
        doc.addImage(options.logoSekolahBase64, 'PNG', pageWidth - 18 - logoW, kopY, logoW, logoH);
      } catch (e) {}
    }

    // 3. Kop Lembaga Sekolah
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(data.sekolah?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT', pageWidth / 2, kopY + 4, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(data.sekolah?.nama_dinas_bawah || 'DINAS PENDIDIKAN', pageWidth / 2, kopY + 9, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(namaSekolah.toUpperCase(), pageWidth / 2, kopY + 15, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const alamatStr = `${data.sekolah?.alamat || 'Jl. Raya Rawasari Kec. Plered'} | Telp: ${data.sekolah?.telepon || '(0264) 7504001'} | Web: ${data.sekolah?.website || 'smkn1plered.sch.id'}`;
    doc.text(alamatStr, pageWidth / 2, kopY + 20, { align: 'center' });

    // Garis Dobel Kop
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(16, kopY + 23, pageWidth - 16, kopY + 23);
    doc.setLineWidth(0.2);
    doc.line(16, kopY + 24.2, pageWidth - 16, kopY + 24.2);

    // 4. Judul Sertifikat (Modern Banner)
    const titleY = kopY + 33;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(14, 165, 233); // Sky-500
    doc.text('S E R T I F I K A T', pageWidth / 2, titleY, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    const modeLabel = data.mode_pelatihan === 'FULL_TARUNA'
      ? 'PENDIDIKAN & PEMBINAAN MURNI KETARUNAAN'
      : 'PENDIDIKAN KARAKTER & KETARUNAAN';
    doc.text(modeLabel, pageWidth / 2, titleY + 6, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Nomor: ${data.nomor_sertifikat || '421.5/KETARUNAAN/2026'}`, pageWidth / 2, titleY + 11, { align: 'center' });

    // 5. Intro Teks & Identitas Siswa
    const bodyY = titleY + 18;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Diberikan kepada:', pageWidth / 2, bodyY, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(15, 23, 42);
    doc.text((data.siswa.nama_siswa || '').toUpperCase(), pageWidth / 2, bodyY + 8, { align: 'center' });

    // Underline for student name
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.5);
    const textWidth = doc.getTextWidth((data.siswa.nama_siswa || '').toUpperCase());
    doc.line(pageWidth / 2 - textWidth / 2 - 4, bodyY + 10, pageWidth / 2 + textWidth / 2 + 4, bodyY + 10);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const identitasSub = `NIS / NISN: ${data.siswa.nis || '-'} / ${data.siswa.nisn || '-'}  •  Kelas: ${data.siswa.nama_kelas || '-'}  •  Kompetensi: ${data.siswa.jurusan_nama || 'Semua Program'}`;
    doc.text(identitasSub, pageWidth / 2, bodyY + 15, { align: 'center' });

    // 6. Narasi Kelulusan
    const narasiY = bodyY + 23;
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const predikatText = getPredikatLabel(data.penilaian.predikat);
    const narasi1 = `Telah mengikuti dan dinyatakan LULUS dalam seluruh rangkaian Program Pendidikan Ketarunaan`;
    const narasi2 = `(Pembinaan Kesamaptaan Jasmani, Peraturan Baris-Berbaris, Pembiasaan Dhuha & Kedisiplinan 5 Siklus)`;
    const narasi3 = `Tahun Pelajaran ${data.tahun_pelajaran || '2026/2027'} dengan predikat: ${predikatText} (Nilai Akhir: ${data.penilaian.nilai_akhir || 0})`;

    doc.text(narasi1, pageWidth / 2, narasiY, { align: 'center' });
    doc.text(narasi2, pageWidth / 2, narasiY + 5, { align: 'center' });
    doc.setFont('Helvetica', 'bold');
    doc.text(narasi3, pageWidth / 2, narasiY + 10, { align: 'center' });

    // 7. Blok Tanda Tangan 4 Kolom (Master of Training, Pembina, Kepala Sekolah, Ketua Pelaksana)
    const sigY = narasiY + 22;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    // Titimangsa di atas kepala sekolah
    doc.text(tanggalResmi, 218, sigY - 4, { align: 'center' });

    const sigs = [
      {
        colX: 42,
        role: 'Master of Training / Pelatih,',
        name: data.signatories?.master_training_nama || 'Sertu Dani Ramdani',
        idLabel: `NRP. ${data.signatories?.master_training_nip || '31080234190488'}`,
      },
      {
        colX: 100,
        role: 'Pembina Ketarunaan,',
        name: data.signatories?.pembina_nama || 'Asep Suryadi, S.Pd.',
        idLabel: `NIP. ${data.signatories?.pembina_nip || '198504122011011003'}`,
      },
      {
        colX: 160,
        role: 'Ketua Pelaksana / Kesiswaan,',
        name: data.signatories?.ketua_pelaksana_nama || 'H. Ahmad Syarifudin, M.Pd.',
        idLabel: `NIP. ${data.signatories?.ketua_pelaksana_nip || '197608142005011002'}`,
      },
      {
        colX: 220,
        role: 'Mengetahui,\nKepala Sekolah,',
        name: data.signatories?.kepsek_nama || data.sekolah?.kepala_sekolah || 'Wahyu Tamimbarkah, S.Pd.',
        idLabel: `NIP. ${data.signatories?.kepsek_nip || data.sekolah?.nip_kepala || '197111022008011001'}`,
      },
    ];

    sigs.forEach((s) => {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(s.role, s.colX, sigY, { align: 'center' });

      // Garis tanda tangan
      const ttdLineY = sigY + 21;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(s.name, s.colX, ttdLineY, { align: 'center' });

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.3);
      const nameW = doc.getTextWidth(s.name);
      doc.line(s.colX - nameW / 2 - 2, ttdLineY + 0.8, s.colX + nameW / 2 + 2, ttdLineY + 0.8);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(s.idLabel, s.colX, ttdLineY + 4.5, { align: 'center' });
    });
  }

  // =========================================================================
  // HALAMAN 2: BELAKANG (TRANSKRIP NILAI & CAPAIAN 4 PILAR KETARUNAAN)
  // =========================================================================
  if (mode === 'all' || mode === 'back_only') {
    if (mode === 'all') {
      doc.addPage('a4', 'landscape');
    }

    // Bingkai Halaman Belakang
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.8);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Judul Transkrip
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('TRANSKRIP CAPAIAN DAN DAFTAR NILAI KETARUNAAN', pageWidth / 2, 20, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Lampiran Sertifikat Nomor: ${data.nomor_sertifikat || '421.5/KETARUNAAN/2026'}`, pageWidth / 2, 25, { align: 'center' });

    // Biodata Siswa Singkat
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const bioY = 32;
    doc.text(`Nama Taruna   : ${data.siswa.nama_siswa || '-'}`, 18, bioY);
    doc.text(`NIS / NISN     : ${data.siswa.nis || '-'} / ${data.siswa.nisn || '-'}`, 18, bioY + 5);
    doc.text(`Kelas / Jurusan : ${data.siswa.nama_kelas || '-'} / ${data.siswa.jurusan_nama || '-'}`, pageWidth / 2 + 10, bioY);
    doc.text(`Tahun Pelajaran : ${data.tahun_pelajaran || '2026/2027'} - Semester ${data.semester || 'Ganjil'}`, pageWidth / 2 + 10, bioY + 5);

    // Tabel Transkrip 4 Pilar
    const p = data.penilaian;
    const pres = data.presensi_summary;

    const tableBody = [
      [
        '1',
        'KESAMAPTAAN JASMANI (SAMAPTA)\n• Lari 12 Menit & Daya Tahan Kardiovaskular\n• Push-up, Sit-up, & Shuttle Run Kelincahan',
        `${p.bobot_samapta}%`,
        String(p.nilai_samapta || 0),
        getPredikatHuruf(p.nilai_samapta),
        getPredikatLabel(p.nilai_samapta)
      ],
      [
        '2',
        'PERATURAN BARIS-BERBARIS (PBB)\n• PBB di Tempat, Langkah Tegap & Defile\n• Disiplin Barisan & Sikap Penghormatan',
        `${p.bobot_pbb}%`,
        String(p.nilai_pbb || 0),
        getPredikatHuruf(p.nilai_pbb),
        getPredikatLabel(p.nilai_pbb)
      ],
      [
        '3',
        `KEDISIPLINAN TARUNA (PRESENSI 5 SIKLUS)\n• Kehadiran Upacara Bendera, Apel & Latihan Ketarunaan Pagi\n• Apel Sore Pulang & Kepatuhan Atribut Seragam${pres ? `\n• Rekap Presensi Riil: ${pres.hadir_disiplin}/${pres.total_sesi_disiplin} Sesi (${pres.persen_disiplin}%)` : ''}`,
        `${p.bobot_disiplin}%`,
        String(p.nilai_disiplin || 0),
        getPredikatHuruf(p.nilai_disiplin),
        getPredikatLabel(p.nilai_disiplin)
      ],
      [
        '4',
        `MENTAL, KARAKTER & SPIRITUAL\n• Pembiasaan Ibadah Dhuha Jum'at Pagi & Kultum Karakter\n• Jiwa Korsa, Etos Kerja 5R & Ketangguhan Moral${pres && pres.total_sesi_duha > 0 ? `\n• Rekap Ibadah Dhuha: ${pres.hadir_duha}/${pres.total_sesi_duha} Sesi (${pres.persen_duha}%)` : ''}`,
        `${p.bobot_mental}%`,
        String(p.nilai_mental || 0),
        getPredikatHuruf(p.nilai_mental),
        getPredikatLabel(p.nilai_mental)
      ],
      [
        '',
        'NILAI AKHIR KOMPOSIT (RATA-RATA BERBOBOT)',
        '100%',
        String(p.nilai_akhir || 0),
        p.predikat || getPredikatHuruf(p.nilai_akhir),
        getPredikatLabel(p.predikat || p.nilai_akhir)
      ],
    ];

    autoTable(doc, {
      startY: bioY + 10,
      margin: { left: 18, right: 18 },
      head: [
        [
          { content: 'NO', styles: { halign: 'center', cellWidth: 10 } },
          { content: 'ASPEK PENILAIAN & KOMPONEN', styles: { halign: 'left' } },
          { content: 'BOBOT', styles: { halign: 'center', cellWidth: 18 } },
          { content: 'ANGKA', styles: { halign: 'center', cellWidth: 18 } },
          { content: 'HURUF', styles: { halign: 'center', cellWidth: 18 } },
          { content: 'KATEGORI', styles: { halign: 'center', cellWidth: 32 } },
        ],
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8.5,
        lineColor: [30, 41, 59],
        lineWidth: 0.2,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        lineColor: [148, 163, 184],
        lineWidth: 0.15,
        valign: 'middle',
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'left' },
        2: { halign: 'center', fontStyle: 'bold' },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'center', fontStyle: 'bold' },
        5: { halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (hookData) => {
        if (hookData.row.index === tableBody.length - 1) {
          hookData.cell.styles.fillColor = [248, 250, 252];
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 4;

    // Catatan Narasi Rapor Kokurikuler Box
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(18, finalY, pageWidth - 36, 16, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('Catatan Capaian Kokurikuler:', 22, finalY + 4.5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const narasiLines = doc.splitTextToSize(
      p.deskripsi_rapor || 'Menunjukkan komitmen kedisiplinan dan kebugaran fisik yang baik sesuai standar program ketarunaan sekolah.',
      pageWidth - 44
    );
    doc.text(narasiLines, 22, finalY + 8.5);

    // Tanda Tangan Belakang (Instruktur Ketarunaan & Pembina)
    const sigBackY = finalY + 22;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    doc.text(tanggalResmi, pageWidth - 65, sigBackY - 4, { align: 'center' });

    // Instruktur
    doc.text('Instruktur / Pelatih Jasmani,', 65, sigBackY, { align: 'center' });
    const nameInstruktur = data.signatories?.master_training_nama || 'Sertu Dani Ramdani';
    doc.setFont('Helvetica', 'bold');
    doc.text(nameInstruktur, 65, sigBackY + 16, { align: 'center' });
    doc.setDrawColor(15, 23, 42);
    doc.line(65 - 25, sigBackY + 16.8, 65 + 25, sigBackY + 16.8);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`NRP. ${data.signatories?.master_training_nip || '31080234190488'}`, 65, sigBackY + 20.5, { align: 'center' });

    // Pembina
    doc.setFontSize(8.5);
    doc.text('Pembina Ketarunaan,', pageWidth - 65, sigBackY, { align: 'center' });
    const namePembina = data.signatories?.pembina_nama || 'Asep Suryadi, S.Pd.';
    doc.setFont('Helvetica', 'bold');
    doc.text(namePembina, pageWidth - 65, sigBackY + 16, { align: 'center' });
    doc.line(pageWidth - 65 - 25, sigBackY + 16.8, pageWidth - 65 + 25, sigBackY + 16.8);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`NIP. ${data.signatories?.pembina_nip || '198504122011011003'}`, pageWidth - 65, sigBackY + 20.5, { align: 'center' });
  }

  return doc;
};
