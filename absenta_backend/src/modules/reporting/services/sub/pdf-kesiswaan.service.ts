// @ts-nocheck
import puppeteer from 'puppeteer';
import { prisma } from '@/utils/prisma';
import { getInvoicesByTenantQuery } from '@/modules/billing/services/queries/subscription-overview.query';

export class PdfKesiswaanService {
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

}
