// @ts-nocheck
import puppeteer from 'puppeteer';
import { prisma } from '@/utils/prisma';
import { getInvoicesByTenantQuery } from '@/modules/billing/services/queries/subscription-overview.query';

export class PdfFinancialService {
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

}
