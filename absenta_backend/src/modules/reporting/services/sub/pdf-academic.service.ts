// @ts-nocheck
import puppeteer from 'puppeteer';
import { prisma } from '@/utils/prisma';
import { getInvoicesByTenantQuery } from '@/modules/billing/services/queries/subscription-overview.query';

export class PdfAcademicService {
  static async generateCertificatePdf(tenantId: string, siswaId: string) {
    const student = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      include: { Tenant: true }
    });

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    const schoolName = student.Tenant?.name || 'Sekolah Mitra Absenta';
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
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            font-family: 'Georgia', serif;
            margin: 0;
            padding: 0;
            background: #fbf9f4;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            box-sizing: border-box;
          }
          .certificate-container {
            width: 277mm;
            height: 190mm;
            padding: 20mm;
            border: 15px double #c5a059;
            background: #fff;
            position: relative;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .ornament-tl, .ornament-tr, .ornament-bl, .ornament-br {
            position: absolute;
            width: 50px;
            height: 50px;
            border: 2px solid #c5a059;
          }
          .ornament-tl { top: 15px; left: 15px; border-right: none; border-bottom: none; }
          .ornament-tr { top: 15px; right: 15px; border-left: none; border-bottom: none; }
          .ornament-bl { bottom: 15px; left: 15px; border-right: none; border-top: none; }
          .ornament-br { bottom: 15px; right: 15px; border-left: none; border-top: none; }
          
          .header {
            text-align: center;
            margin-top: 10mm;
          }
          .school-title {
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 2px;
            color: #555;
            text-transform: uppercase;
          }
          .main-title {
            font-size: 38px;
            font-weight: normal;
            color: #1c2d42;
            margin: 5mm 0;
            letter-spacing: 4px;
            font-family: 'Times New Roman', Times, serif;
          }
          .subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 8mm;
            font-style: italic;
          }
          .recipient-label {
            font-size: 16px;
            color: #777;
            margin-bottom: 2mm;
          }
          .recipient-name {
            font-size: 28px;
            font-weight: bold;
            color: #c5a059;
            border-bottom: 2px solid #c5a059;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
            min-width: 150mm;
            text-align: center;
            font-family: 'Times New Roman', Times, serif;
          }
          .recipient-meta {
            font-size: 13px;
            color: #666;
            margin-bottom: 8mm;
          }
          .award-text {
            font-size: 15px;
            line-height: 1.6;
            color: #444;
            text-align: center;
            max-width: 200mm;
            margin-bottom: 12mm;
          }
          .footer {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 0 15mm;
            box-sizing: border-box;
          }
          .sig-box {
            text-align: center;
            width: 60mm;
          }
          .sig-line {
            border-bottom: 1px solid #777;
            margin-bottom: 2mm;
            height: 15mm;
          }
          .sig-title {
            font-size: 12px;
            color: #555;
            font-weight: bold;
          }
          .sig-name {
            font-size: 13px;
            color: #222;
            font-weight: bold;
            margin-top: 1mm;
          }
          .date-box {
            font-size: 13px;
            color: #555;
            margin-bottom: 18mm;
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="ornament-tl"></div>
          <div class="ornament-tr"></div>
          <div class="ornament-bl"></div>
          <div class="ornament-br"></div>

          <div class="header">
            <div class="school-title">${schoolName}</div>
            <div class="main-title">SERTIFIKAT PENGHARGAAN</div>
            <div class="subtitle">Certificate of Achievement</div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
            <div class="recipient-label">Diberikan Kepada:</div>
            <div class="recipient-name">${student.nama_siswa}</div>
            <div class="recipient-meta">NIS: ${student.nis} / NISN: ${student.nisn || '-'}</div>
            <div class="award-text">
              Atas partisipasi aktif, dedikasi yang luar biasa, serta pencapaian akademik cemerlang
              selama menempuh proses kegiatan pembelajaran di lingkungan ${schoolName}.
            </div>
          </div>

          <div class="footer">
            <div class="sig-box">
              <div class="sig-title">Penerima Penghargaan</div>
              <div class="sig-line"></div>
              <div class="sig-name">${student.nama_siswa}</div>
            </div>
            <div class="date-box">
              Ditetapkan tanggal: ${dateStr}
            </div>
            <div class="sig-box">
              <div class="sig-title">Kepala Sekolah</div>
              <div class="sig-line"></div>
              <div class="sig-name">....................................</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'landscape');
  }


  static async generateSupervisionPdf(tenantId: string, supervisionId: string) {
    const supervisi = await prisma.supervisiGuru.findFirst({
      where: { id: supervisionId, tenant_id: tenantId },
      include: {
        Guru: true,
        Supervisor: true,
        Tenant: true
      }
    });

    if (!supervisi) {
      throw new Error('Data supervisi tidak ditemukan');
    }

    const schoolName = supervisi.Tenant?.name || 'Sekolah Mitra';
    const dateStr = supervisi.tanggal ? new Date(supervisi.tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : '-';

    const score = supervisi.nilai || 0;
    let grade = 'Perlu Pembinaan';
    let gradeColor = '#ef4444';
    if (score >= 90) {
      grade = 'SANGAT BAIK';
      gradeColor = '#10b981';
    } else if (score >= 80) {
      grade = 'BAIK';
      gradeColor = '#3b82f6';
    } else if (score >= 70) {
      grade = 'CUKUP';
      gradeColor = '#f59e0b';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.5;
            margin: 0;
            padding: 0;
          }
          .letterhead {
            text-align: center;
            border-bottom: 3px double #333;
            padding-bottom: 4mm;
            margin-bottom: 8mm;
          }
          .letterhead-title {
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .letterhead-school {
            font-size: 22px;
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            margin: 1mm 0;
          }
          .letterhead-subtitle {
            font-size: 11px;
            color: #555;
          }
          .doc-title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            text-decoration: underline;
            text-transform: uppercase;
            margin-bottom: 6mm;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8mm;
          }
          .meta-table td {
            padding: 1.5mm 0;
            font-size: 13px;
            vertical-align: top;
          }
          .stats-container {
            display: flex;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 5mm;
            background: #f9fafb;
            margin-bottom: 8mm;
            align-items: center;
          }
          .score-badge {
            width: 30mm;
            height: 30mm;
            border-radius: 50%;
            background: #1e3a8a;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 6mm;
          }
          .grade-box {
            font-size: 18px;
            font-weight: bold;
            color: ${gradeColor};
          }
          .content-title {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #333;
            padding-bottom: 1mm;
            margin-top: 6mm;
            margin-bottom: 3mm;
          }
          .content-text {
            font-size: 13px;
            line-height: 1.6;
            color: #444;
          }
          .signature-area {
            margin-top: 15mm;
            width: 100%;
          }
          .sig-table {
            width: 100%;
            border-collapse: collapse;
          }
          .sig-table td {
            width: 50%;
            text-align: center;
            font-size: 13px;
          }
          .sig-space {
            height: 20mm;
          }
        </style>
      </head>
      <body>
        <div class="letterhead">
          <div class="letterhead-title">Yayasan Pembina Pendidikan Nasional</div>
          <div class="letterhead-school">${schoolName}</div>
          <div class="letterhead-subtitle">Website: www.absenta.id | Email: info@absenta.id | Telp: (021) 1234567</div>
        </div>

        <div class="doc-title">Laporan Hasil Supervisi Akademik</div>

        <table class="meta-table">
          <tr>
            <td style="width: 35%;">Nama Guru</td>
            <td style="width: 3%;">:</td>
            <td><b>${supervisi.Guru?.nama_guru || '-'}</b></td>
          </tr>
          <tr>
            <td>Supervisor</td>
            <td>:</td>
            <td>${supervisi.Supervisor?.nama_guru || 'Kepala Sekolah'}</td>
          </tr>
          <tr>
            <td>Mata Pelajaran</td>
            <td>:</td>
            <td>${supervisi.mapel || '-'}</td>
          </tr>
          <tr>
            <td>Kelas / Jam Pelajaran</td>
            <td>:</td>
            <td>Kelas ${supervisi.kelas || '-'} / Jam ke-${supervisi.jam_ke || '-'}</td>
          </tr>
          <tr>
            <td>Tanggal Supervisi</td>
            <td>:</td>
            <td>${dateStr}</td>
          </tr>
        </table>

        <div class="stats-container">
          <div class="score-badge">
            <span style="font-size: 11px; font-weight: normal; margin-bottom: 1mm;">NILAI</span>
            <span style="font-size: 26px;">${score}</span>
          </div>
          <div>
            <div class="info-label" style="font-size: 11px; color: #777;">PREDIKAT EVALUASI:</div>
            <div class="grade-box">${grade}</div>
            <div style="font-size: 12px; color: #666; margin-top: 1mm;">
              Penilaian berdasarkan kriteria kesiapan RPP, metode pengajaran, penguasaan kelas, dan interaksi siswa.
            </div>
          </div>
        </div>

        <div class="content-title">Catatan dan Rekomendasi Supervisor</div>
        <div class="content-text">
          ${supervisi.catatan ? supervisi.catatan.replace(/\n/g, '<br/>') : 'Tidak ada catatan tambahan dari supervisor.'}
        </div>

        <div class="signature-area">
          <table class="sig-table">
            <tr>
              <td>Guru yang Disupervisi,</td>
              <td>Supervisor,</td>
            </tr>
            <tr>
              <td class="sig-space"></td>
              <td class="sig-space"></td>
            </tr>
            <tr>
              <td><b>${supervisi.Guru?.nama_guru || '-'}</b></td>
              <td><b>${supervisi.Supervisor?.nama_guru || 'Kepala Sekolah'}</b></td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }


  static async renderHtmlToPdf(html: string, orientation: 'portrait' | 'landscape') {
    let browser: any;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=none'
        ]
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: orientation === 'landscape',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '10mm', right: '12mm', bottom: '10mm', left: '12mm' }
      });
      return pdfBuffer;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }


}
