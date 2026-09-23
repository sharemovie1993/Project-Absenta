import puppeteer from 'puppeteer';
import { prisma } from '../../../utils/prisma';
import { RaporService } from '../../rapor/services/rapor.service';

export class PdfRaporService {
  // Helper render HTML to PDF Buffer
  private static async renderHtmlToPdf(html: string, orientation: 'portrait' | 'landscape') {
    let browser: any;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: orientation === 'landscape',
        printBackground: true,
        preferCSSPageSize: true
      });
      return pdfBuffer;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // 1. GENERATE RAPOR SEMESTER PDF
  static async generateRaporPdf(
    tenantId: string,
    params: {
      siswa_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const data = await RaporService.getRaporDetail(tenantId, params);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schoolName = tenant?.name || 'Sekolah Mitra Absenta';

    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Detect Jenjang (SD, SMP, SMA, SMK)
    const tingkat = data.siswa.tingkat || 10;
    const isSd = tingkat <= 6;
    const isSmp = tingkat >= 7 && tingkat <= 9;
    const isSmk = tingkat >= 10 && Boolean((data.siswa as any).jurusan || (data.siswa as any).jurusan_id);

    const jenjangTitle = isSd ? 'SEKOLAH DASAR (SD)' : isSmp ? 'SEKOLAH MENENGAH PERTAMA (SMP)' : isSmk ? 'SEKOLAH MENENGAH KEJURUAN (SMK)' : 'SEKOLAH MENENGAH ATAS (SMA)';

    // Grouping Mata Pelajaran (Umum vs Kejuruan/Pilihan)
    const mapelUmum = data.nilai_akademik.filter((n: any) => (n.kelompok_mapel || 'UMUM').toUpperCase() === 'UMUM');
    const mapelKhusus = data.nilai_akademik.filter((n: any) => (n.kelompok_mapel || 'UMUM').toUpperCase() !== 'UMUM');

    const renderRows = (list: any[], startNo: number = 1) => {
      let htmlRows = '';
      list.forEach((n: any, idx: number) => {
        const cpNarasi = n.capaian_kompetensi || n.catatan_deskripsi || (n.nilai_akhir >= (n.kkm || 75) ? 'Menunjukkan penguasaan kompetensi yang baik.' : 'Memerlukan bimbingan lebih lanjut.');
        htmlRows += `
          <tr>
            <td style="text-align: center;">${startNo + idx}</td>
            <td style="font-weight: bold;">${n.mapel_name}</td>
            <td style="text-align: center;">${n.kkm || 75}</td>
            <td style="text-align: center; font-weight: bold; font-size: 14px;">${n.nilai_akhir}</td>
            <td style="text-align: center; font-weight: bold;">${n.predikat || '-'}</td>
            <td style="font-size: 11px; text-align: justify; padding: 6px;">${cpNarasi}</td>
          </tr>
        `;
      });
      return htmlRows;
    };

    let rowsHtml = '';
    if (mapelKhusus.length > 0) {
      rowsHtml += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="6" style="padding: 6px 8px;">A. KELOMPOK MATA PELAJARAN UMUM</td>
        </tr>
        ${renderRows(mapelUmum, 1)}
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="6" style="padding: 6px 8px;">B. KELOMPOK MATA PELAJARAN ${isSmk ? 'KEJURUAN' : 'PILIKAN / KONSENTRASI'}</td>
        </tr>
        ${renderRows(mapelKhusus, mapelUmum.length + 1)}
      `;
    } else {
      rowsHtml = renderRows(data.nilai_akademik, 1);
    }

    if (data.nilai_akademik.length === 0) {
      rowsHtml = `<tr><td colspan="6" style="text-align: center; font-style: italic; padding: 12px;">Belum ada nilai terinput semester ini</td></tr>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { font-family: 'Arial', sans-serif; font-size: 13px; line-height: 1.5; color: #333; margin: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 20px; }
          .school-info { text-align: right; }
          .school-name { font-size: 16px; font-weight: bold; }
          .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; }
          .student-meta { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
          .student-meta td { padding: 4px 8px; vertical-align: top; }
          .grade-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .grade-table th { background-color: #f2f2f2; border: 1px solid #000; padding: 8px; font-weight: bold; text-align: center; }
          .grade-table td { border: 1px solid #000; padding: 8px; }
          .summary-container { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .attendance-box { width: 45%; border: 1px solid #000; padding: 10px; box-sizing: border-box; }
          .attendance-title { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
          .catatan-box { width: 50%; border: 1px solid #000; padding: 10px; box-sizing: border-box; }
          .catatan-title { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 8px; }
          .decision-box { border: 1px solid #000; padding: 10px; margin-bottom: 30px; font-weight: bold; text-align: center; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-box { text-align: center; width: 60mm; }
          .sig-space { height: 20mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="school-name">RAPOR SISWA</div>
            <div style="font-size: 11px; font-weight: bold; color: #444;">${jenjangTitle} - KURIKULUM MERDEKA</div>
          </div>
          <div class="school-info">
            <div style="font-weight: bold;">${schoolName}</div>
            <div style="font-size: 11px; color: #555;">Sistem Informasi Akademik Absenta</div>
          </div>
        </div>

        <div class="title">Laporan Hasil Belajar (Rapor)</div>

        <table class="student-meta">
          <tr>
            <td style="width: 15%;">Nama Siswa</td>
            <td style="width: 2%;">:</td>
            <td style="width: 33%; font-weight: bold;">${data.siswa.nama_siswa}</td>
            <td style="width: 15%;">Kelas</td>
            <td style="width: 2%;">:</td>
            <td style="width: 33%;">${data.siswa.kelas}</td>
          </tr>
          <tr>
            <td>NIS / NISN</td>
            <td>:</td>
            <td>${data.siswa.nis} / ${data.siswa.nisn || '-'}</td>
            <td>Tingkat</td>
            <td>:</td>
            <td>${data.siswa.tingkat}</td>
          </tr>
        </table>

        <table class="grade-table">
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 45%;">Mata Pelajaran</th>
              <th style="width: 10%;">KKM</th>
              <th style="width: 10%;">Nilai</th>
              <th style="width: 10%;">Predikat</th>
              <th style="width: 20%;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-container">
          <div class="attendance-box">
            <div class="attendance-title">Ketidakhadiran</div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 3px 0;">Sakit</td><td>:</td><td style="text-align: right; font-weight: bold;">${data.absensi.sakit} Hari</td></tr>
              <tr><td style="padding: 3px 0;">Izin</td><td>:</td><td style="text-align: right; font-weight: bold;">${data.absensi.izin} Hari</td></tr>
              <tr><td style="padding: 3px 0;">Tanpa Keterangan (Alpa)</td><td>:</td><td style="text-align: right; font-weight: bold;">${data.absensi.alpa} Hari</td></tr>
            </table>
          </div>

          <div class="catatan-box">
            <div class="catatan-title">Catatan Wali Kelas</div>
            <div style="font-style: italic;">"${data.catatan_wali || 'Pertahankan prestasi belajarmu, teruslah belajar dengan tekun.'}"</div>
          </div>
        </div>

        ${
          data.keputusan_transisi
            ? `<div class="decision-box">KEPUTUSAN: ${data.keputusan_transisi.replace('_', ' ')}</div>`
            : ''
        }

        <div class="signature-section">
          <div class="sig-box">
            <div>Orang Tua / Wali</div>
            <div class="sig-space"></div>
            <div>________________________</div>
          </div>
          <div class="sig-box">
            <div>Ditetapkan di: Purwakarta</div>
            <div>Tanggal: ${dateStr}</div>
            <div style="margin-top: 5px;">Wali Kelas</div>
            <div class="sig-space"></div>
            <div>________________________</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }

  // 2. GENERATE SURAT KETERANGAN LULUS (SKL) PDF
  static async generateSklPdf(tenantId: string, siswaId: string) {
    let skl: any = await prisma.kelulusanSiswa.findFirst({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { Siswa: { include: { Kelas: true } } }
    });

    if (!skl) {
      const student = await prisma.siswa.findFirst({
        where: { id: siswaId, tenant_id: tenantId },
        include: { Kelas: true }
      });
      if (!student) {
        throw new Error('Siswa tidak ditemukan');
      }
      skl = {
        id: 'draft',
        tenant_id: tenantId,
        siswa_id: siswaId,
        nomor_skl: `SKL/${new Date().getFullYear()}/${student.nis}`,
        status: 'LULUS',
        rata_rata_nilai: '85.00',
        keterangan: 'Memenuhi Kriteria Kelulusan Satuan Pendidikan',
        created_at: new Date(),
        updated_at: new Date(),
        Siswa: student
      };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schoolName = tenant?.name || 'Sekolah Mitra Absenta';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 20mm 20mm; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 14px; line-height: 1.6; color: #000; margin: 0; }
          .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 25px; text-transform: uppercase; }
          .kop-school { font-size: 18px; font-weight: bold; }
          .kop-desc { font-size: 12px; font-style: italic; }
          .title { text-align: center; font-size: 16px; font-weight: bold; text-decoration: underline; margin-bottom: 5px; text-transform: uppercase; }
          .doc-num { text-align: center; font-size: 13px; margin-bottom: 25px; }
          .opening { text-align: justify; margin-bottom: 20px; }
          .meta-table { width: 90%; margin: 0 auto 25px auto; border-collapse: collapse; }
          .meta-table td { padding: 5px 10px; vertical-align: top; }
          .verdict { text-align: justify; margin-bottom: 25px; }
          .score-box { border: 1px solid #000; padding: 15px; margin: 0 auto 30px auto; width: 60%; text-align: center; font-weight: bold; font-size: 16px; background-color: #f9f9f9; }
          .signature-box { float: right; text-align: center; width: 70mm; margin-top: 30px; }
          .sig-space { height: 25mm; }
        </style>
      </head>
      <body>
        <div class="kop">
          <div class="kop-school">${schoolName}</div>
          <div class="kop-desc">Kabupaten Purwakarta - Provinsi Jawa Barat</div>
          <div style="font-size: 10px;">Email: info@sekolah.sch.id | Web: www.sekolah.sch.id</div>
        </div>

        <div class="title">Surat Keterangan Lulus</div>
        <div class="doc-num">Nomor: ${skl.nomor_skl}</div>

        <div class="opening">
          Yang bertanda tangan di bawah ini, Kepala Sekolah ${schoolName}, menerangkan bahwa siswa berikut:
        </div>

        <table class="meta-table">
          <tr><td style="width: 30%;">Nama Lengkap</td><td style="width: 3%;">:</td><td style="font-weight: bold; text-transform: uppercase;">${skl.Siswa.nama_siswa}</td></tr>
          <tr><td>Nomor Induk Siswa (NIS)</td><td>:</td><td>${skl.Siswa.nis}</td></tr>
          <tr><td>NISN</td><td>:</td><td>${skl.Siswa.nisn || '-'}</td></tr>
          <tr><td>Kelas / Tingkat</td><td>:</td><td>${skl.Siswa.Kelas?.nama_kelas || '-'} / ${skl.Siswa.Kelas?.tingkat || '-'}</td></tr>
        </table>

        <div class="verdict">
          Berdasarkan Kriteria Kelulusan Siswa yang telah ditetapkan oleh satuan pendidikan dan hasil rapat pleno dewan guru, dinyatakan:
        </div>

        <div style="text-align: center; font-size: 24px; font-weight: bold; color: #155724; background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px 0; margin-bottom: 25px; text-transform: uppercase;">
          L U L U S
        </div>

        <div class="opening">
          Dengan perolehan rata-rata nilai Ujian / Rapor sekolah sebagai berikut:
        </div>

        <div class="score-box">
          RATA-RATA NILAI AKHIR: ${skl.rata_rata_nilai}
        </div>

        <div class="opening" style="font-style: italic;">
          Surat keterangan ini diterbitkan secara resmi sebagai pengganti Ijazah sementara untuk digunakan sebagaimana mestinya.
        </div>

        <div class="signature-box">
          <div>Purwakarta, ${dateStr}</div>
          <div>Kepala Sekolah,</div>
          <div class="sig-space"></div>
          <div style="font-weight: bold; text-decoration: underline;">........................................</div>
          <div>NIP. ........................................</div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }

  // 3. GENERATE SERTIFIKAT UKK PDF (LANDSCAPE)
  static async generateUkkPdf(tenantId: string, siswaId: string) {
    let ukk: any = await prisma.sertifikatUkk.findFirst({
      where: { siswa_id: siswaId, tenant_id: tenantId },
      include: { Siswa: { include: { Kelas: true } }, MitraIndustri: true }
    });

    if (!ukk) {
      const student = await prisma.siswa.findFirst({
        where: { id: siswaId, tenant_id: tenantId },
        include: { Kelas: true }
      });
      if (!student) {
        throw new Error('Siswa tidak ditemukan');
      }
      ukk = {
        id: 'draft',
        tenant_id: tenantId,
        siswa_id: siswaId,
        nomor_sertifikat: `UKK/${new Date().getFullYear()}/${student.nis}`,
        predikat: 'SANGAT BAIK',
        asesor_internal: 'Tim Asesor Sekolah',
        asesor_eksternal: 'Penguji Asosiasi Industri',
        Siswa: student,
        MitraIndustri: { nama: 'Mitra Industri / DU-DI' }
      };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schoolName = tenant?.name || 'Sekolah Mitra Absenta';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 landscape; margin: 0; }
          body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; }
          .border-double { width: 277mm; height: 190mm; padding: 15mm; border: 12px double #c5a059; background: #fff; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
          .header { text-align: center; }
          .logo { font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #555; text-transform: uppercase; }
          .title { font-size: 32px; font-weight: bold; color: #1c2d42; margin: 3mm 0; letter-spacing: 3px; }
          .doc-num { font-size: 13px; font-style: italic; color: #444; }
          .content-text { text-align: center; font-size: 15px; max-width: 210mm; margin: 10px 0; line-height: 1.6; }
          .name { font-size: 26px; font-weight: bold; border-bottom: 2px solid #c5a059; padding-bottom: 1mm; margin: 5px 0; font-family: 'Georgia', serif; color: #111; }
          .table-score { width: 50%; border-collapse: collapse; margin: 15px 0; }
          .table-score th, .table-score td { border: 1px solid #000; padding: 6px 12px; text-align: center; font-size: 13px; }
          .table-score th { background-color: #f5f5f5; }
          .footer { width: 100%; display: flex; justify-content: space-between; padding: 0 10mm; box-sizing: border-box; margin-top: 15px; }
          .sig-box { text-align: center; width: 65mm; font-size: 13px; }
          .sig-space { height: 18mm; }
        </style>
      </head>
      <body>
        <div class="border-double">
          <div class="header">
            <div class="logo">${schoolName}</div>
            <div class="title">SERTIFIKAT KOMPETENSI KEAHLIAN</div>
            <div class="doc-num">Nomor: ${ukk.nomor_sertifikat}</div>
          </div>

          <div class="content-text">
            Kepala Sekolah ${schoolName} menyatakan bahwa:
          </div>

          <div class="name">${ukk.Siswa.nama_siswa}</div>
          <div style="font-size: 13px; color: #555; margin-bottom: 5px;">NIS: ${ukk.Siswa.nis} / NISN: ${ukk.Siswa.nisn || '-'} | Kelas: ${ukk.Siswa.Kelas?.nama_kelas || '-'}</div>

          <div class="content-text" style="font-weight: bold;">
            Telah mengikuti Uji Kompetensi Keahlian (UKK) dan dinyatakan berkualifikasi:
            <br>
            <span style="font-size: 20px; color: #c5a059; text-transform: uppercase;">"${ukk.predikat}"</span>
          </div>

          <table class="table-score">
            <thead>
              <tr><th>Aspek Pengujian</th><th>Nilai</th></tr>
            </thead>
            <tbody>
              <tr><td>Nilai Praktik Kejuruan</td><td style="font-weight: bold;">${ukk.nilai_praktik}</td></tr>
              ${ukk.nilai_teori ? `<tr><td>Nilai Teori Kejuruan</td><td style="font-weight: bold;">${ukk.nilai_teori}</td></tr>` : ''}
            </tbody>
          </table>

          <div class="footer">
            <div class="sig-box">
              <div>Asesor Internal (Sekolah),</div>
              <div class="sig-space"></div>
              <div style="font-weight: bold; text-decoration: underline;">${ukk.asesor_internal || '........................................'}</div>
              <div>Penguji Kejuruan</div>
            </div>
            <div style="text-align: center; font-size: 12px; align-self: flex-end; margin-bottom: 5px;">
              Diterbitkan di: Purwakarta
              <br>
              Tanggal: ${dateStr}
            </div>
            <div class="sig-box">
              <div>Asesor Eksternal (${ukk.MitraIndustri?.nama || 'Dunia Industri'}),</div>
              <div class="sig-space"></div>
              <div style="font-weight: bold; text-decoration: underline;">${ukk.asesor_eksternal}</div>
              <div>Penguji Eksternal / Asosiasi</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'landscape');
  }

  // 4. GENERATE RAPOR / SERTIFIKAT PKL PDF
  static async generatePklPdf(tenantId: string, siswaPklId: string) {
    const pkl = await prisma.siswaPkl.findFirst({
      where: { id: siswaPklId, tenant_id: tenantId },
      include: { Siswa: { include: { Kelas: true } }, Mitra: true, Pembimbing: true }
    });

    if (!pkl) {
      throw new Error('Data penempatan PKL tidak ditemukan');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const schoolName = tenant?.name || 'Sekolah Mitra Absenta';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // Parse nilai PKL dari JSON
    const scoresRaw: any = pkl.nilai_json || {};
    let scoreRowsHtml = '';
    let totalScore = 0;
    let aspectCount = 0;

    Object.keys(scoresRaw).forEach((aspect) => {
      const score = Number(scoresRaw[aspect]);
      if (!isNaN(score)) {
        scoreRowsHtml += `
          <tr>
            <td>${aspect}</td>
            <td style="text-align: center; font-weight: bold;">${score}</td>
          </tr>
        `;
        totalScore += score;
        aspectCount++;
      }
    });

    const averageScore = aspectCount > 0 ? (totalScore / aspectCount).toFixed(2) : '-';

    if (aspectCount === 0) {
      scoreRowsHtml = `<tr><td colspan="2" style="text-align: center; font-style: italic; padding: 10px;">Nilai PKL belum diinputkan oleh pembimbing industri</td></tr>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { font-family: 'Arial', sans-serif; font-size: 13px; line-height: 1.5; color: #333; margin: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 20px; }
          .school-name { font-size: 16px; font-weight: bold; }
          .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; }
          .meta-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
          .meta-table td { padding: 4px 8px; vertical-align: top; }
          .score-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .score-table th, .score-table td { border: 1px solid #000; padding: 8px; }
          .score-table th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
          .footer { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-box { text-align: center; width: 65mm; }
          .sig-space { height: 20mm; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="school-name">RAPOR PKL SISWA</div>
            <div>Praktek Kerja Lapangan (Magang)</div>
          </div>
          <div style="text-align: right; font-weight: bold;">
            ${schoolName}
          </div>
        </div>

        <div class="title">Laporan Penilaian Kinerja Industri</div>

        <table class="meta-table">
          <tr>
            <td style="width: 20%;">Nama Siswa</td><td style="width: 2%;">:</td><td style="width: 28%; font-weight: bold;">${pkl.Siswa.nama_siswa}</td>
            <td style="width: 20%;">Mitra DU/DI</td><td style="width: 2%;">:</td><td style="width: 28%;">${pkl.Mitra.nama}</td>
          </tr>
          <tr>
            <td>Kelas</td><td>:</td><td>${pkl.Siswa.Kelas?.nama_kelas || '-'}</td>
            <td>Alamat Industri</td><td>:</td><td>${pkl.Mitra.alamat || '-'}</td>
          </tr>
          <tr>
            <td>NIS</td><td>:</td><td>${pkl.Siswa.nis}</td>
            <td>Periode Magang</td><td>:</td><td>${new Date(pkl.tanggal_mulai).toLocaleDateString('id-ID')} s.d ${pkl.tanggal_selesai ? new Date(pkl.tanggal_selesai).toLocaleDateString('id-ID') : 'Selesai'}</td>
          </tr>
        </table>

        <table class="score-table">
          <thead>
            <tr>
              <th style="width: 70%;">Aspek Penilaian (Teknis & Kepribadian)</th>
              <th style="width: 30%;">Nilai Akhir (0-100)</th>
            </tr>
          </thead>
          <tbody>
            ${scoreRowsHtml}
            ${
              aspectCount > 0
                ? `
              <tr style="background-color: #fafafa; font-weight: bold;">
                <td style="text-align: right;">RATA-RATA NILAI PKL</td>
                <td style="text-align: center; font-size: 14px; color: #1c2d42;">${averageScore}</td>
              </tr>
              `
                : ''
            }
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">
            <div>Pembimbing Sekolah,</div>
            <div class="sig-space"></div>
            <div style="font-weight: bold; text-decoration: underline;">${pkl.Pembimbing?.nama_guru || '........................................'}</div>
            <div>Guru Pembimbing</div>
          </div>
          <div class="sig-box">
            <div>Purwakarta, ${dateStr}</div>
            <div>Pembimbing DU/DI (Industri),</div>
            <div class="sig-space"></div>
            <div style="font-weight: bold; text-decoration: underline;">${pkl.Mitra.pic_nama || '........................................'}</div>
            <div>${pkl.Mitra.pic_jabatan || 'Supervisor / Instruktur'}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }

  static async generateP5RaporPdf(
    tenantId: string,
    params: {
      siswa_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    const [student, semester, sekolah, raporSettings] = await Promise.all([
      prisma.siswa.findFirst({
        where: { id: params.siswa_id, tenant_id: tenantId },
        include: { 
          Kelas: {
            include: {
              Jurusan: true,
            }
          }
        }
      }),
      prisma.semester.findFirst({
        where: { id: params.semester_id }
      }),
      prisma.sekolah.findFirst({
        where: { tenant_id: tenantId }
      }),
      RaporService.getSettings(tenantId, {
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
      })
    ]);

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    const schoolName = sekolah?.nama || 'SMK';
    const effectiveDate = raporSettings?.tanggal_rapor_p5 || raporSettings?.tanggal_rapor;
    const dateStr = effectiveDate
      ? new Date(effectiveDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const listNilai = await prisma.p5NilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: params.siswa_id,
        Projek: {
          tahun_pelajaran_id: params.tahun_pelajaran_id,
          semester_id: params.semester_id,
        },
      },
      include: { Projek: true },
    });

    const projekMap = new Map<string, {
      judul: string;
      deskripsi: string | null;
      scores: Array<{ dimensi: string; sub_elemen: string; kualifikasi: string; catatan: string | null }>;
    }>();

    listNilai.forEach((n) => {
      if (!projekMap.has(n.projek_id)) {
        projekMap.set(n.projek_id, {
          judul: n.Projek.judul,
          deskripsi: n.Projek.deskripsi,
          scores: [],
        });
      }
      projekMap.get(n.projek_id)!.scores.push({
        dimensi: n.dimensi,
        sub_elemen: n.sub_elemen,
        kualifikasi: n.kualifikasi,
        catatan: n.catatan_proses,
      });
    });

    const projekList = Array.from(projekMap.values());

    const kualifikasiFullText: Record<string, string> = {
      'SB': 'Sangat Berkembang',
      'BSH': 'Berkembang Sesuai Harapan',
      'MB': 'Mulai Berkembang',
      'BB': 'Belum Berkembang'
    };

    const defaultNotes: Record<string, string> = {
      'SB': 'Siswa mengembangkan kemampuannya melampaui harapan',
      'BSH': 'Siswa telah mengembangkan kemampuan hingga berada dalam tahap ajek',
      'MB': 'Siswa mulai menunjukkan peningkatan kemampuan pada aspek ini',
      'BB': 'Siswa masih membutuhkan bimbingan dalam mengembangkan kemampuannya'
    };

    const P5_STANDARD_SUB_ELEMEN: Record<string, string[]> = {
      'Mandiri': [
        'Mengenali kualitas dan minat diri serta tantangan yang dihadapi & Mengembangkan refleksi diri',
        'Regulasi emosi, penetapan tujuan dan rencana strategis pengembangan diri dan prestasi serta memiliki inisiatif dan bekerja secara mandiri, mengembangkan kendali dan disiplin diri, percaya diri, resilien dan adaptif'
      ],
      'Kreatif': [
        'Menghasilkan gagasan yang beragam dan tepat sesuai dengan kebutuhan masyarakat terhadap sebuah permasalahan yang ada.',
        'Mengeksplorasi dan mengekspresikan pikiran dan perasaannya kedalam sebuah karya.',
        'Mampu mengevaluasi tindakan dan gagasan yang sudah dimiliki serta mengetahui kesesuaian dengan kebutuhan masyarakat umum'
      ],
      'Gotong Royong': [
        'Kerjasama, komunikasi untuk mencapai tujuan bersama, saling ketergantungan positif dan koordinasi sosial',
        'Tanggap terhadap lingkungan, persepsi sosial',
        'Membagi peran dan menyelaraskan tindakan dalam kelompok supaya tercipta keselarasan dan keterbukaan dalam berbagi dengan kelompok.'
      ],
      'Bergotong Royong': [
        'Kerjasama, komunikasi untuk mencapai tujuan bersama, saling ketergantungan positif dan koordinasi sosial',
        'Tanggap terhadap lingkungan, persepsi sosial',
        'Membagi peran dan menyelaraskan tindakan dalam kelompok supaya tercipta keselarasan dan keterbukaan dalam berbagi dengan kelompok.'
      ],
      'Bernalar Kritis': [
        'Mengajukan pertanyaan, mengidentifikasi, mengklarifikasi, dan mengolah informasi dan gagasan',
        'Menganalisis dan mengevaluasi penalaran serta prosedur yang digunakan dalam penyelesaian masalah',
        'Merefleksi dan mengevaluasi pemikirannya sendiri serta mempertimbangkan berbagai perspektif'
      ],
      'Berkebinekaan Global': [
        'Mendalami budaya dan identitas budaya serta mengeksplorasi dinamika budaya yang majemuk',
        'Berkomunikasi dan berinteraksi secara efektif dan santun dengan orang dari latar budaya yang berbeda',
        'Menghilangkan stereotip, prasangka, dan menyelaraskan perbedaan dalam pergaulan sosial'
      ],
      'Beriman & Bertakwa': [
        'Memahami nilai-nilai agama dan mempraktikkannya dalam kehidupan sehari-hari dengan akhlak mulia',
        'Integritas dan merawat diri secara fisik, mental, dan spiritual dengan penuh rasa syukur',
        'Mengutamakan persamaan dengan orang lain dan menghargai perbedaan demi persatuan bangsa',
        'Menjaga kelestarian lingkungan hidup dan alam sekitar sebagai amanah Tuhan'
      ]
    };

    let projekHtml = '';

    projekList.forEach((p) => {
      // Parse metadata from deskripsi
      let tema = 'Kewirausahaan';
      let fase = student.Kelas?.tingkat === 10 ? 'E' : 'F';
      let cleanDesc = p.deskripsi || '';

      const temaMatch = cleanDesc.match(/\[Tema:\s*([^\]]+)\]/i);
      if (temaMatch && temaMatch[1]) {
        tema = temaMatch[1].trim();
        cleanDesc = cleanDesc.replace(temaMatch[0], '');
      }

      const faseMatch = cleanDesc.match(/\[Fase:\s*([^\]]+)\]/i);
      if (faseMatch && faseMatch[1]) {
        fase = faseMatch[1].replace(/Fase\s*/i, '').trim();
        cleanDesc = cleanDesc.replace(faseMatch[0], '');
      }

      const dimensiMatch = cleanDesc.match(/\[Dimensi:\s*([^\]]+)\]/i);
      if (dimensiMatch) {
        cleanDesc = cleanDesc.replace(dimensiMatch[0], '');
      }

      // Group scores by dimension
      const dimMap = new Map<string, Array<{ sub_elemen: string; kualifikasi: string; catatan: string | null }>>();
      p.scores.forEach((s) => {
        if (!dimMap.has(s.dimensi)) {
          dimMap.set(s.dimensi, []);
        }
        dimMap.get(s.dimensi)!.push({
          sub_elemen: s.sub_elemen,
          kualifikasi: s.kualifikasi,
          catatan: s.catatan
        });
      });

      let rowsHtml = '';
      dimMap.forEach((subItems, dimName) => {
        // Dimension Header Row
        rowsHtml += `
          <tr style="background-color: #f3f4f6;">
            <td colspan="4" style="font-weight: bold; font-size: 11px; padding: 6px 10px; border: 1px solid #1f2937; text-transform: uppercase;">
              ${dimName}
            </td>
          </tr>
        `;

        const standardSubs = P5_STANDARD_SUB_ELEMEN[dimName] || P5_STANDARD_SUB_ELEMEN[dimName.replace(/^Ber/i, '')];
        const subElementsToRender: string[] = (subItems.length > 1 || !standardSubs)
          ? subItems.map(item => item.sub_elemen)
          : standardSubs;

        // Sub elements list with letters a., b., c.
        const subListHtml = subElementsToRender.map((subText, idx) => {
          const letter = String.fromCharCode(97 + idx);
          return `
            <div style="display: flex; gap: 6px; margin-bottom: 6px; font-size: 10px; line-height: 1.4;">
              <span style="font-weight: bold; min-width: 14px;">${letter}.</span>
              <span style="text-align: justify;">${subText}</span>
            </div>
          `;
        }).join('');

        // Pick representative kualifikasi & note for this dimension
        const primaryScore = subItems[0];
        const kode = primaryScore?.kualifikasi || 'BSH';
        const fullDesc = primaryScore?.catatan || defaultNotes[kode] || '-';

        rowsHtml += `
          <tr>
            <td style="width: 40%; vertical-align: top; padding: 8px 10px; border: 1px solid #1f2937;">
              ${subListHtml}
            </td>
            <td style="width: 8%; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle; border: 1px solid #1f2937;">
              ${kode}
            </td>
            <td style="width: 22%; text-align: center; font-size: 11px; vertical-align: middle; border: 1px solid #1f2937; padding: 6px;">
              ${kualifikasiFullText[kode] || kode}
            </td>
            <td style="width: 30%; font-size: 10.5px; line-height: 1.4; vertical-align: middle; border: 1px solid #1f2937; padding: 8px 10px; text-align: justify;">
              ${fullDesc}
            </td>
          </tr>
        `;
      });

      projekHtml += `
        <div style="margin-bottom: 25px; page-break-inside: avoid;">
          <!-- Top Information Box -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
            <tr>
              <td style="width: 18%; padding: 2px 0;">Nama Peserta Didik</td>
              <td style="width: 2%;">:</td>
              <td style="width: 38%; font-weight: bold; text-transform: uppercase;">${student.nama_siswa}</td>
              <td style="width: 18%; padding: 2px 0;">Fase</td>
              <td style="width: 2%;">:</td>
              <td style="width: 22%; font-weight: bold;">${fase}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">NIS/NISN</td>
              <td>:</td>
              <td>${student.nis} / ${student.nisn || '-'}</td>
              <td style="padding: 2px 0;">Satuan Pendidikan</td>
              <td>:</td>
              <td>${schoolName}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Kelas</td>
              <td>:</td>
              <td>${student.Kelas?.nama_kelas || '-'}</td>
              <td style="padding: 2px 0;">Program Keahlian</td>
              <td>:</td>
              <td>${student.Kelas?.Jurusan?.nama || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Semester</td>
              <td>:</td>
              <td>${semester?.nama_semester || 'Ganjil'}</td>
              <td style="padding: 2px 0;">Konsentrasi Keahlian</td>
              <td>:</td>
              <td>${student.Kelas?.Jurusan?.nama || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0 2px 0; font-weight: bold;">Tema Projek</td>
              <td style="padding-top: 6px;">:</td>
              <td style="padding-top: 6px; font-weight: bold;">${tema}</td>
              <td colspan="3"></td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-weight: bold;">Judul Projek</td>
              <td>:</td>
              <td colspan="4" style="font-weight: bold;">${p.judul}</td>
            </tr>
          </table>

          <!-- Matrix Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #1f2937; margin-bottom: 15px;">
            <thead>
              <tr style="background-color: #d1d5db; font-size: 11px; font-weight: bold;">
                <th style="width: 40%; text-align: left; padding: 8px 10px; border: 1px solid #1f2937;">
                  ${cleanDesc.trim() || p.judul}
                </th>
                <th colspan="3" style="width: 60%; text-align: center; padding: 8px 10px; border: 1px solid #1f2937;">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    if (projekList.length === 0) {
      projekHtml = `<div style="text-align: center; font-style: italic; padding: 40px; border: 1px dashed #777; border-radius: 8px; margin: 30px 0;">Siswa belum memiliki penilaian Projek P5 pada semester ini</div>`;
    }

    let waliKelasNama = '...................................................';
    let waliKelasNip = 'NIP. ...................................................';
    if (student.kelas_id) {
      const waliAssignment = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: student.kelas_id,
          is_active: true,
          Position: { code: 'WALIKELAS' }
        },
        include: {
          User: {
            include: {
              Guru: true
            }
          }
        }
      });
      if (waliAssignment?.User?.Guru) {
        waliKelasNama = waliAssignment.User.Guru.nama_guru;
        waliKelasNip = waliAssignment.User.Guru.nip ? `NIP. ${waliAssignment.User.Guru.nip}` : 'NIP. -';
      } else if (waliAssignment?.User?.full_name) {
        waliKelasNama = waliAssignment.User.full_name;
        waliKelasNip = 'NIP. -';
      }
    }

    const kepsekNama = raporSettings?.kepsek_nama || sekolah?.kepala_sekolah || '...................................................';
    const kepsekNip = raporSettings?.kepsek_nip ? `NIP. ${raporSettings.kepsek_nip}` : (sekolah?.nip_kepala ? `NIP. ${sekolah.nip_kepala}` : 'NIP. ...................................................');
    const kepsekJabatan = raporSettings?.kepsek_status === 'PLT' ? 'Plt. Kepala Sekolah,' : 'Kepala Sekolah,';
    const tempatTanggal = `${raporSettings?.tempat_terbit || sekolah?.kota || 'Purwakarta'}, ${dateStr}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 11px; line-height: 1.4; color: #111; margin: 0; }
          .main-title { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer-container { margin-top: 30px; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="main-title">PROJEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)</div>

        ${projekHtml}

        <div class="footer-container">
          <div style="text-align: right; margin-bottom: 10px; font-size: 11px; padding-right: 20px;">
            ${tempatTanggal}
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center;">
            <tr>
              <td style="width: 50%; padding-bottom: 60px;">Orang Tua/Wali Siswa,</td>
              <td style="width: 50%; padding-bottom: 60px;">Wali Kelas,</td>
            </tr>
            <tr>
              <td>...................................................</td>
              <td style="font-weight: bold; text-decoration: underline;">${waliKelasNama}</td>
            </tr>
            <tr>
              <td></td>
              <td style="font-size: 10px; color: #444;">${waliKelasNip}</td>
            </tr>
          </table>

          <div style="margin-top: 25px; text-align: center; font-size: 11px;">
            <div>Mengetahui;</div>
            <div style="margin-bottom: 60px;">${kepsekJabatan}</div>
            <div style="font-weight: bold; text-decoration: underline;">${kepsekNama}</div>
            <div style="font-size: 10px; color: #444;">${kepsekNip}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }
}
