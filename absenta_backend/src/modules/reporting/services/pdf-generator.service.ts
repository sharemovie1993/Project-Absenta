import puppeteer from 'puppeteer';
import { prisma } from '../../../utils/prisma';
import { getInvoicesByTenantQuery } from '../../billing/services/queries/subscription-overview.query';

export class PdfGeneratorService {
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

  static async generateInvoicePdf(tenantId: string, invoiceNumber: string) {
    const [invoices, tenant] = await Promise.all([
      getInvoicesByTenantQuery(tenantId),
      prisma.tenant.findUnique({ where: { id: tenantId } })
    ]);

    const invoice = invoices.find((inv: any) => String(inv.invoice_number) === invoiceNumber);
    if (!invoice) {
      throw new Error('Tagihan tidak ditemukan');
    }

    const schoolName = tenant?.name || 'Sekolah Mitra';
    const subtotal = invoice.amount;
    const tax = 0; // tax-inclusive
    const total = subtotal + tax;

    const issueDateStr = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : '-';

    const payDateStr = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : '-';

    // Status mapping: PAID, UNPAID, OVERDUE
    let statusText = 'BELUM BAYAR';
    let stampColor = '#6b7280';
    if (invoice.status === 'PAID') {
      statusText = 'LUNAS';
      stampColor = '#10b981';
    } else if (invoice.status === 'OVERDUE') {
      statusText = 'JATUH TEMPO';
      stampColor = '#ef4444';
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
          .invoice-box {
            position: relative;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10mm;
          }
          .logo-area {
            font-size: 24px;
            font-weight: bold;
            color: #1e3a8a;
          }
          .title-area {
            text-align: right;
            font-size: 28px;
            color: #9ca3af;
            letter-spacing: 1px;
          }
          .info-table {
            width: 100%;
            margin-bottom: 8mm;
          }
          .info-col {
            width: 50%;
            vertical-align: top;
          }
          .info-label {
            font-size: 11px;
            color: #777;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 1mm;
          }
          .info-val {
            font-size: 13px;
            color: #222;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5mm;
            margin-bottom: 10mm;
          }
          .items-table th {
            background: #1e3a8a;
            color: #fff;
            text-align: left;
            padding: 3mm;
            font-size: 12px;
            text-transform: uppercase;
          }
          .items-table td {
            padding: 4mm 3mm;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          .totals-table {
            width: 40%;
            margin-left: 60%;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 2mm 3mm;
            font-size: 13px;
          }
          .grand-total {
            font-weight: bold;
            font-size: 16px;
            color: #1e3a8a;
            border-top: 2px solid #1e3a8a;
          }
          .stamp {
            position: absolute;
            top: 25mm;
            right: 10mm;
            border: 4px double ${stampColor};
            color: ${stampColor};
            font-size: 24px;
            font-weight: bold;
            padding: 3mm 8mm;
            border-radius: 4px;
            transform: rotate(-12deg);
            opacity: 0.85;
            letter-spacing: 2px;
          }
          .footer-note {
            margin-top: 15mm;
            border-top: 1px solid #e5e7eb;
            padding-top: 4mm;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="stamp">${statusText}</div>

          <table class="header-table">
            <tr>
              <td class="logo-area">
                ABSENTA.ID
                <div style="font-size: 10px; font-weight: normal; color: #555;">Sistem Kelola & Absensi Sekolah Modular</div>
              </td>
              <td class="title-area">INVOICE</td>
            </tr>
          </table>

          <table class="info-table">
            <tr>
              <td class="info-col">
                <div class="info-label">Penerima Tagihan</div>
                <div class="info-val" style="font-weight: bold; font-size: 14px;">${schoolName}</div>
                <div class="info-val">Tenant ID: ${tenantId}</div>
              </td>
              <td class="info-col" style="text-align: right;">
                <div class="info-label">Detail Tagihan</div>
                <div class="info-val">Nomor: <b>#${invoice.invoice_number}</b></div>
                <div class="info-val">Tanggal: ${issueDateStr}</div>
                <div class="info-val">Metode: ${invoice.payment_method || 'TriPay / Transfer'}</div>
                ${invoice.paid_at ? `<div class="info-val">Dibayar: ${payDateStr}</div>` : ''}
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th>Deskripsi Layanan / Lisensi</th>
                <th style="text-align: right; width: 30mm;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>Langganan Plan: ${invoice.Subscription?.Plan?.name || 'Paket Sekolah'}</b>
                  <div style="font-size: 11px; color: #666; margin-top: 1mm;">
                    Siklus Lisensi Bulanan/Tahunan untuk modul ${invoice.Subscription?.service_code || 'ABSENSI'}.
                  </div>
                </td>
                <td style="text-align: right; font-weight: bold;">
                  Rp ${subtotal.toLocaleString('id-ID')}
                </td>
              </tr>
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">Rp ${subtotal.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td>PPN (0%):</td>
              <td style="text-align: right;">Rp 0</td>
            </tr>
            <tr class="grand-total">
              <td>Total Bayar:</td>
              <td style="text-align: right;">Rp ${total.toLocaleString('id-ID')}</td>
            </tr>
          </table>

          <div class="footer-note">
            Terima kasih atas kepercayaan Anda menggunakan layanan Absenta.id.<br/>
            Untuk pertanyaan atau kendala pembayaran, silakan hubungi tim kami di <b>support@absenta.id</b>.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
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

  static async generateIzinKeluarPdf(tenantId: string, izinId: string) {
    const izin = await prisma.izinKeluarSiswa.findFirst({
      where: { id: izinId, tenant_id: tenantId },
      include: {
        SiswaAkademik: {
          include: {
            siswa: true,
            kelas: true
          }
        },
        GuruPiket: true,
        Tenant: true
      }
    });

    if (!izin) {
      throw new Error('Data izin keluar tidak ditemukan');
    }

    const schoolName = izin.Tenant?.name || 'Sekolah Mitra Absenta';
    const studentName = izin.SiswaAkademik?.siswa?.nama_siswa || 'Siswa';
    const nis = izin.SiswaAkademik?.siswa?.nis || '-';
    const className = izin.SiswaAkademik?.kelas?.nama_kelas || '-';
    const dateStr = izin.jam_keluar.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const timeOutStr = izin.jam_keluar.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const maxIzinMenit = 45;
    let timeInStr = '-';
    if (izin.jam_kembali) {
      timeInStr = `${izin.jam_kembali.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
    } else if (izin.tipe_izin === 'PULANG_AWAL') {
      timeInStr = 'PULANG AWAL';
    } else if (izin.tipe_izin === 'DISPENSASI') {
      timeInStr = 'DISPENSASI';
    } else {
      const estimatedKembali = new Date(izin.jam_keluar.getTime() + maxIzinMenit * 60 * 1000);
      timeInStr = `${estimatedKembali.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: 80mm 150mm;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 4mm 0;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 2mm;
            margin-bottom: 3mm;
          }
          .title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .school {
            font-size: 10px;
            font-weight: bold;
          }
          .field-table {
            width: 100%;
            border-collapse: collapse;
          }
          .field-table td {
            padding: 1.5mm 0;
            vertical-align: top;
          }
          .label {
            width: 35%;
            font-weight: bold;
          }
          .separator {
            width: 5%;
          }
          .value {
            width: 60%;
          }
          .footer {
            text-align: center;
            border-top: 1px dashed #000;
            margin-top: 4mm;
            padding-top: 2mm;
            font-size: 9px;
          }
          .sig-row {
            margin-top: 6mm;
            display: flex;
            justify-content: space-between;
          }
          .sig-box {
            text-align: center;
            width: 45%;
          }
          .sig-space {
            height: 12mm;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">SURAT IZIN KELUAR</div>
          <div class="school">${schoolName}</div>
          <div>Tanggal: ${dateStr}</div>
        </div>
        <table class="field-table">
          <tr>
            <td class="label">Nama</td>
            <td class="separator">:</td>
            <td class="value">${studentName}</td>
          </tr>
          <tr>
            <td class="label">NIS</td>
            <td class="separator">:</td>
            <td class="value">${nis}</td>
          </tr>
          <tr>
            <td class="label">Kelas</td>
            <td class="separator">:</td>
            <td class="value">${className}</td>
          </tr>
          <tr>
            <td class="label">Tipe Izin</td>
            <td class="separator">:</td>
            <td class="value">${izin.tipe_izin}</td>
          </tr>
          <tr>
            <td class="label">Jam Keluar</td>
            <td class="separator">:</td>
            <td class="value">${timeOutStr} WIB</td>
          </tr>
          <tr>
            <td class="label">Jam Kembali</td>
            <td class="separator">:</td>
            <td class="value">${timeInStr} WIB</td>
          </tr>
          <tr>
            <td class="label">Alasan</td>
            <td class="separator">:</td>
            <td class="value">${izin.alasan}</td>
          </tr>
          <tr>
            <td class="label">Status</td>
            <td class="separator">:</td>
            <td class="value"><b>${izin.status}</b></td>
          </tr>
        </table>
        
        <div class="sig-row">
          <div class="sig-box">
            <div>Siswa,</div>
            <div class="sig-space"></div>
            <div>${studentName.split(' ')[0]}</div>
          </div>
          <div class="sig-box">
            <div>Guru Piket,</div>
            <div class="sig-space"></div>
            <div>${izin.GuruPiket?.nama_guru || 'Piket'}</div>
          </div>
        </div>

        <div class="footer">
          * Harap simpan surat ini untuk verifikasi saat kembali ke sekolah. *
        </div>
      </body>
      </html>
    `;

    return this.renderHtmlToPdf(html, 'portrait');
  }

  static async generateKesiswaanBulananPdf(tenantId: string, month: number, year: number) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const violations = await prisma.pelanggaranSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        Siswa: {
          include: {
            Kelas: true
          }
        }
      },
      orderBy: { tanggal: 'desc' }
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthStr = monthNames[month - 1];

    let rowsHtml = '';
    violations.forEach((v, index) => {
      const dateStr = new Date(v.tanggal).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short'
      });
      rowsHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${v.Siswa?.nama_siswa || '-'}</td>
          <td>${v.Siswa?.Kelas?.nama_kelas || '-'}</td>
          <td>${dateStr}</td>
          <td>${v.jenis_pelanggaran}</td>
          <td>${v.poin}</td>
          <td>${v.status}</td>
        </tr>
      `;
    });

    if (violations.length === 0) {
      rowsHtml = `<tr><td colspan="7" style="text-align: center; padding: 10px;">Tidak ada data pelanggaran bulan ini.</td></tr>`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            padding: 15mm;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 3mm;
            margin-bottom: 5mm;
          }
          .school-name {
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .title {
            font-size: 16px;
            margin: 2mm 0;
            text-transform: uppercase;
          }
          .period {
            font-size: 12px;
            color: #555;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5mm;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 2.5mm;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .total-section {
            margin-top: 5mm;
            text-align: right;
            font-size: 12px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">${tenant?.name || 'Sekolah Mitra Absenta'}</div>
          <div class="title">Laporan Bulanan Kedisiplinan Siswa</div>
          <div class="period">Periode: ${monthStr} ${year}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 25%;">Nama Siswa</th>
              <th style="width: 15%;">Kelas</th>
              <th style="width: 12%;">Tanggal</th>
              <th style="width: 25%;">Pelanggaran</th>
              <th style="width: 8%;">Poin</th>
              <th style="width: 10%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="total-section">
          Total Pelanggaran: ${violations.length} Kasus
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
