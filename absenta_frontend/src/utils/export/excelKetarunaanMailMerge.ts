import { KetarunaanNilaiExportRow } from '@/api/kesiswaan/programKetarunaan.api';

export interface ExportMailMergeOptions {
  filename?: string;
  kelasNama?: string;
  tahunPelajaran?: string;
  semester?: string;
}

/**
 * Utility untuk mengekspor data nilai ketarunaan ke dalam format Excel (.xlsx)
 * yang 100% kompatibel dan siap pakai untuk Microsoft Word Mail Merge
 * (Pencetakan Sertifikat, Piagam, dan Transkrip Nilai Ketarunaan secara massal).
 */
export async function exportKetarunaanMailMerge(
  data: KetarunaanNilaiExportRow[],
  options: ExportMailMergeOptions = {}
) {
  if (!data || data.length === 0) {
    throw new Error('Tidak ada data nilai ketarunaan untuk diekspor.');
  }

  // Dynamic import exceljs & file-saver untuk menjaga bundle size tetap optimal
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver'),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Absenta Education Platform';
  workbook.lastModifiedBy = 'Absenta Ketarunaan System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 1: DATA_MAIL_MERGE (Row 1 langsung Header untuk Microsoft Word)
  // ══════════════════════════════════════════════════════════════════════════════
  const sheet = workbook.addWorksheet('DATA_MAIL_MERGE', {
    views: [{ state: 'frozen', ySplit: 1 }], // Freeze header row
  });

  const columns = [
    { header: 'NO', key: 'no', width: 6, align: 'center' },
    { header: 'NIS', key: 'nis', width: 14, align: 'center', isText: true },
    { header: 'NISN', key: 'nisn', width: 16, align: 'center', isText: true },
    { header: 'NAMA_TARUNA', key: 'nama_taruna', width: 34, align: 'left', bold: true },
    { header: 'NAMA_LENGKAP', key: 'nama_lengkap', width: 34, align: 'left' },
    { header: 'NAMA_SISWA', key: 'nama_siswa', width: 34, align: 'left' },
    { header: 'JENIS_KELAMIN', key: 'jk_label', width: 14, align: 'center' },
    { header: 'JK', key: 'jk', width: 6, align: 'center' },
    { header: 'KELAS', key: 'kelas', width: 14, align: 'center' },
    { header: 'ROMBEL', key: 'rombel', width: 14, align: 'center' },
    { header: 'TINGKAT', key: 'tingkat', width: 9, align: 'center' },
    { header: 'JURUSAN', key: 'jurusan', width: 30, align: 'left' },
    { header: 'KODE_JURUSAN', key: 'kode_jurusan', width: 14, align: 'center' },
    { header: 'TAHUN_PELAJARAN', key: 'tahun_pelajaran', width: 18, align: 'center' },
    { header: 'SEMESTER', key: 'semester', width: 12, align: 'center' },
    { header: 'MODE_PELATIHAN', key: 'mode_pelatihan', width: 18, align: 'center' },
    { header: 'NILAI_SAMAPTA', key: 'nilai_samapta', width: 15, align: 'center', numFmt: '#,##0.0' },
    { header: 'NILAI_PBB', key: 'nilai_pbb', width: 12, align: 'center', numFmt: '#,##0.0' },
    { header: 'NILAI_DISIPLIN', key: 'nilai_disiplin', width: 15, align: 'center', numFmt: '#,##0.0' },
    { header: 'NILAI_MENTAL', key: 'nilai_mental', width: 14, align: 'center', numFmt: '#,##0.0' },
    { header: 'BOBOT_SAMAPTA', key: 'bobot_samapta', width: 15, align: 'center', numFmt: '0"%"' },
    { header: 'BOBOT_PBB', key: 'bobot_pbb', width: 12, align: 'center', numFmt: '0"%"' },
    { header: 'BOBOT_DISIPLIN', key: 'bobot_disiplin', width: 15, align: 'center', numFmt: '0"%"' },
    { header: 'BOBOT_MENTAL', key: 'bobot_mental', width: 14, align: 'center', numFmt: '0"%"' },
    { header: 'NILAI_AKHIR', key: 'nilai_akhir', width: 14, align: 'center', bold: true, numFmt: '#,##0.0' },
    { header: 'PREDIKAT', key: 'predikat', width: 11, align: 'center', bold: true },
    { header: 'PREDIKAT_LABEL', key: 'predikat_label', width: 24, align: 'left' },
    { header: 'KETERANGAN', key: 'keterangan', width: 20, align: 'center' },
    { header: 'DESKRIPSI_CAPAIAN', key: 'deskripsi_capaian', width: 65, align: 'left' },
    { header: 'DESKRIPSI_RAPOR', key: 'deskripsi_rapor', width: 65, align: 'left' },
    { header: 'NOMOR_SERTIFIKAT', key: 'nomor_sertifikat', width: 34, align: 'center', isText: true },
    { header: 'TEMPAT_TERBIT', key: 'tempat_terbit', width: 16, align: 'center' },
    { header: 'TANGGAL_TERBIT', key: 'tanggal_terbit', width: 26, align: 'center' },
    { header: 'TANGGAL_CETAK', key: 'tanggal_cetak', width: 18, align: 'center' },
    { header: 'NAMA_SEKOLAH', key: 'nama_sekolah', width: 32, align: 'left' },
    { header: 'NPSN', key: 'npsn', width: 14, align: 'center', isText: true },
    { header: 'ALAMAT_SEKOLAH', key: 'alamat_sekolah', width: 42, align: 'left' },
    { header: 'KOTA_SEKOLAH', key: 'kota_sekolah', width: 16, align: 'center' },
    { header: 'KEPALA_SEKOLAH', key: 'kepala_sekolah', width: 28, align: 'left' },
    { header: 'NIP_KEPALA_SEKOLAH', key: 'nip_kepala_sekolah', width: 24, align: 'center', isText: true },
  ];

  // Set worksheet columns
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // Style Header Row (Row 1) - Dark Navy Slate with White Bold Text
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Slate 800
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: false,
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Populate Data Rows
  data.forEach((item, index) => {
    const rowValues: Record<string, any> = {};
    columns.forEach((col) => {
      let val = (item as any)[col.key];
      if (val === undefined || val === null) val = '';
      if (col.isText && val !== '') {
        val = String(val);
      }
      rowValues[col.key] = val;
    });

    const addedRow = sheet.addRow(rowValues);
    addedRow.height = 20;

    // Apply Zebra striping and alignment
    const isEven = index % 2 === 1;
    addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      if (colDef) {
        cell.alignment = {
          vertical: 'middle',
          horizontal: (colDef.align as any) || 'left',
          wrapText: colDef.key.includes('deskripsi'),
        };
        if (colDef.numFmt && typeof cell.value === 'number') {
          cell.numFmt = colDef.numFmt;
        }
        if (colDef.isText) {
          cell.numFmt = '@';
        }
        if (colDef.bold) {
          cell.font = { name: 'Calibri', size: 10, bold: true };
        } else {
          cell.font = { name: 'Calibri', size: 10 };
        }
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' }, // Slate 50 / White
      };

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SHEET 2: PANDUAN_MAIL_MERGE (Panduan Resmi Penggunaan di MS Word)
  // ══════════════════════════════════════════════════════════════════════════════
  const guideSheet = workbook.addWorksheet('PANDUAN_MAIL_MERGE');
  guideSheet.views = [{ showGridLines: true }];

  // Column widths for guide sheet
  guideSheet.getColumn(1).width = 4;
  guideSheet.getColumn(2).width = 24;
  guideSheet.getColumn(3).width = 20;
  guideSheet.getColumn(4).width = 50;
  guideSheet.getColumn(5).width = 30;

  // Title
  guideSheet.mergeCells('B2:E2');
  const titleCell = guideSheet.getCell('B2');
  titleCell.value = 'PANDUAN PRAKTIS PENGGUNAAN MAIL MERGE MICROSOFT WORD';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E293B' } };
  titleCell.alignment = { vertical: 'middle' };

  guideSheet.mergeCells('B3:E3');
  const subCell = guideSheet.getCell('B3');
  subCell.value = 'Dokumen ini dirancang otomatis untuk pencetakan massal Sertifikat, Transkrip & Piagam Nilai Ketarunaan';
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF64748B' } };

  // Section 1: Langkah-langkah Mail Merge
  guideSheet.getCell('B5').value = '1. LANGKAH-LANGKAH MENGHUBUNGKAN DATA KE MICROSOFT WORD:';
  guideSheet.getCell('B5').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };

  const steps = [
    'Buka aplikasi Microsoft Word dan buka template Sertifikat atau Rapor Ketarunaan Anda.',
    'Pilih tab menu "Surat" (Mailings) di bilah atas Microsoft Word.',
    'Klik ikon "Pilih Penerima" (Select Recipients) lalu pilih "Gunakan Daftar yang Ada..." (Use an Existing List...).',
    'Cari dan pilih file Excel yang baru saja diunduh ini.',
    'Saat jendela pemilihan tabel muncul, pilih sheet "DATA_MAIL_MERGE$" dan klik OK.',
    'Pastikan opsi "Baris pertama data berisi judul kolom" (First row of data contains column headers) dalam keadaan TERCENTANG.',
    'Letakkan kursor Word di posisi yang ingin diisi, lalu klik "Sisipkan Bidang Gabungan" (Insert Merge Field).',
    'Pilih field yang sesuai, misalnya: <<NAMA_TARUNA>>, <<NIS>>, <<NILAI_AKHIR>>, <<PREDIKAT>>, dll.',
    'Klik "Pratinjau Hasil" (Preview Results) untuk memeriksa kesesuaian setiap halaman.',
    'Klik "Selesai & Gabungkan" (Finish & Merge) > "Cetak Dokumen..." (Print Documents) untuk mencetak langsung ke printer atau PDF!',
  ];

  steps.forEach((step, idx) => {
    const rowNum = 6 + idx;
    guideSheet.getCell(`B${rowNum}`).value = `Langkah ${idx + 1}`;
    guideSheet.getCell(`B${rowNum}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
    guideSheet.mergeCells(`C${rowNum}:E${rowNum}`);
    const c = guideSheet.getCell(`C${rowNum}`);
    c.value = step;
    c.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
  });

  // Section 2: Daftar Merge Fields
  const startFieldRow = 18;
  guideSheet.getCell(`B${startFieldRow}`).value = '2. DAFTAR BIDANG GABUNGAN (MERGE FIELDS) YANG DAPAT DIGUNAKAN:';
  guideSheet.getCell(`B${startFieldRow}`).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };

  // Header Table Kamus
  const tableHeaderRow = startFieldRow + 1;
  guideSheet.getCell(`B${tableHeaderRow}`).value = 'NAMA MERGE FIELD';
  guideSheet.getCell(`C${tableHeaderRow}`).value = 'TIPE DATA';
  guideSheet.getCell(`D${tableHeaderRow}`).value = 'DESKRIPSI / KEGUNAAN';
  guideSheet.getCell(`E${tableHeaderRow}`).value = 'CONTOH OUTPUT';

  ['B', 'C', 'D', 'E'].forEach((col) => {
    const cell = guideSheet.getCell(`${col}${tableHeaderRow}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const fieldGlossary = [
    { field: '<<NAMA_TARUNA>>', type: 'Teks', desc: 'Nama lengkap taruna (huruf besar/sesuai ijazah)', example: 'MUHAMMAD FADLI' },
    { field: '<<NIS>>', type: 'Teks', desc: 'Nomor Induk Siswa (tetap menjaga awalan 0)', example: '232410123' },
    { field: '<<NISN>>', type: 'Teks', desc: 'Nomor Induk Siswa Nasional', example: '0078129384' },
    { field: '<<KELAS>>', type: 'Teks', desc: 'Nama rombel / kelas taruna', example: 'X TO 1' },
    { field: '<<JURUSAN>>', type: 'Teks', desc: 'Program / Konsentrasi Keahlian', example: 'Teknik Otomotif' },
    { field: '<<TAHUN_PELAJARAN>>', type: 'Teks', desc: 'Tahun pelajaran yang dinilai', example: '2026/2027' },
    { field: '<<SEMESTER>>', type: 'Teks', desc: 'Semester penilaian', example: 'Ganjil' },
    { field: '<<NILAI_SAMAPTA>>', type: 'Angka', desc: 'Nilai tes kebugaran jasmani & fisik (0-100)', example: '85.0' },
    { field: '<<NILAI_PBB>>', type: 'Angka', desc: 'Nilai peraturan baris-berbaris (0-100)', example: '88.0' },
    { field: '<<NILAI_DISIPLIN>>', type: 'Angka', desc: 'Nilai kedisiplinan dan atribut (0-100)', example: '92.0' },
    { field: '<<NILAI_MENTAL>>', type: 'Angka', desc: 'Nilai pembinaan mental & spiritual (0-100)', example: '90.0' },
    { field: '<<NILAI_AKHIR>>', type: 'Angka', desc: 'Nilai komposit terbobot akhir', example: '88.9' },
    { field: '<<PREDIKAT>>', type: 'Huruf', desc: 'Predikat kelulusan (A / B / C / D)', example: 'A' },
    { field: '<<PREDIKAT_LABEL>>', type: 'Teks', desc: 'Predikat terbilang dalam bahasa Indonesia', example: 'Sangat Baik (Amat Baik)' },
    { field: '<<KETERANGAN>>', type: 'Teks', desc: 'Status kelulusan standar kompetensi', example: 'KOMPETEN / LULUS' },
    { field: '<<DESKRIPSI_CAPAIAN>>', type: 'Teks Panjang', desc: 'Narasi capaian resmi untuk lembar sertifikat/rapor', example: 'Menunjukkan keunggulan kesamaptaan jasmani yang prima...' },
    { field: '<<NOMOR_SERTIFIKAT>>', type: 'Teks', desc: 'Nomor registrasi resmi sertifikat', example: '421.5/KETARUNAAN/2026/232410123' },
    { field: '<<TANGGAL_TERBIT>>', type: 'Teks', desc: 'Tempat dan tanggal penerbitan dokumen', example: 'Purwakarta, 20 November 2026' },
    { field: '<<NAMA_SEKOLAH>>', type: 'Teks', desc: 'Nama resmi instansi sekolah', example: 'SMK NEGERI 1 PLERED' },
    { field: '<<KEPALA_SEKOLAH>>', type: 'Teks', desc: 'Nama Kepala Sekolah penandatangan', example: 'Wahyu Tamimbarkah, S.Pd.' },
    { field: '<<NIP_KEPALA_SEKOLAH>>', type: 'Teks', desc: 'NIP Kepala Sekolah', example: '197111022008011001' },
  ];

  fieldGlossary.forEach((item, i) => {
    const r = tableHeaderRow + 1 + i;
    guideSheet.getCell(`B${r}`).value = item.field;
    guideSheet.getCell(`B${r}`).font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };

    guideSheet.getCell(`C${r}`).value = item.type;
    guideSheet.getCell(`C${r}`).font = { name: 'Calibri', size: 10, italic: true };
    guideSheet.getCell(`C${r}`).alignment = { horizontal: 'center' };

    guideSheet.getCell(`D${r}`).value = item.desc;
    guideSheet.getCell(`D${r}`).font = { name: 'Calibri', size: 10 };

    guideSheet.getCell(`E${r}`).value = item.example;
    guideSheet.getCell(`E${r}`).font = { name: 'Consolas', size: 9, color: { argb: 'FF059669' } };

    const isEv = i % 2 === 1;
    ['B', 'C', 'D', 'E'].forEach((col) => {
      const cell = guideSheet.getCell(`${col}${r}`);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEv ? 'FFF8FAFC' : 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Generate binary and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const cleanFilename = options.filename
    ? options.filename.replace(/[^a-zA-Z0-9_-]/g, '_')
    : `Data_Nilai_Ketarunaan_MailMerge_${new Date().toISOString().slice(0, 10)}`;

  saveAs(blob, `${cleanFilename}.xlsx`);
}
