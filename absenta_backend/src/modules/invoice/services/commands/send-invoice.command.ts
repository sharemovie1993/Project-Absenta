import { InvoiceStatus } from '@prisma/client';
import type { RoleName } from '../../../../constants/enums';
import { emitDomainEvent } from '@/infra/event-bus';
import { buildPublicInvoiceUrl } from '@/modules/notification/services/whatsapp.service';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { invoiceDb as prisma } from '../repositories/invoice.db';
import { getSmartFrontendBaseUrl } from '@/utils/url-helper';

export async function sendInvoiceCommand(input: {
  invoiceId: string;
  userRole: RoleName;
  userTenantId: string;
  sendOptions?: { recipient_email?: string; subject?: string; message?: string; attach_pdf?: boolean };
  validateAccess: (invoiceId: string, userRole: RoleName, userTenantId: string) => Promise<any>;
  formatInvoiceResponse: (invoice: any) => any;
}) {
  const { invoiceId, userRole, userTenantId, sendOptions, validateAccess, formatInvoiceResponse } = input;

  const invoice = await validateAccess(invoiceId, userRole, userTenantId);
  let updatedInvoice: any = invoice;
  let isResend = false;

  if (invoice.status === InvoiceStatus.PAID) {
    throw new Error('Cannot resend PAID invoice');
  }

  if (invoice.status === InvoiceStatus.DRAFT) {
    updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.SENT,
        sent_at: new Date(),
        email_sent: true,
        updated_at: new Date(),
      },
      include: {
        payments: true,
        Billing: {
          include: {
            Subscription: {
              include: {
                Tenant: true,
                Plan: true,
              },
            },
          },
        },
      },
    });
  } else if (invoice.status === InvoiceStatus.SENT) {
    isResend = true;
  } else {
    throw new Error('Only DRAFT or SENT invoices can be sent');
  }

  try {
    const recipient = sendOptions?.recipient_email;
    if (recipient) {
      const invoiceNumber = updatedInvoice.invoice_number;
      const amountIdr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(updatedInvoice.total_amount || updatedInvoice.amount);
      const subject = sendOptions?.subject || `Invoice ${invoiceNumber} - ${amountIdr}`;
      const dueDateStr = updatedInvoice.due_date
        ? new Date(updatedInvoice.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        : '-';
      const tenantName = updatedInvoice.Billing?.Subscription?.Tenant?.name || updatedInvoice.tenant?.name || 'Sistem';
      const tenantId = updatedInvoice.tenant_id || updatedInvoice.Billing?.Subscription?.tenant_id || updatedInvoice.tenant?.id;
      const resolvedTenantId = String(tenantId || userTenantId || '').trim();
      const publicInvoiceUrl = resolvedTenantId.length > 0 ? await buildPublicInvoiceUrl(invoiceId, resolvedTenantId) : null;
      const systemConfig = await systemConfigService.getActive(resolvedTenantId.length > 0 ? resolvedTenantId : null);
      const appName = String(systemConfig?.app_name || '').trim() || 'Sistem';
      const supportEmail = String(systemConfig?.support_email || systemConfig?.company_email_billing || '').trim();
      const supportPhone = String(systemConfig?.support_phone || systemConfig?.company_phone_billing || '').trim();
      const companyLegalName = String(systemConfig?.company_legal_name || '').trim();
      const publicWebsiteUrl = getSmartFrontendBaseUrl();
      const planName = String(updatedInvoice.Billing?.Subscription?.Plan?.name || '').trim() || 'Paket';

      const escapeHtml = (v: any): string => {
        return String(v ?? '').replace(/[&<>"']/g, (ch) => {
          if (ch === '&') return '&amp;';
          if (ch === '<') return '&lt;';
          if (ch === '>') return '&gt;';
          if (ch === '"') return '&quot;';
          if (ch === "'") return '&#39;';
          return ch;
        });
      };

      const isHttpUrl = (v: any): boolean => {
        const s = String(v ?? '').trim();
        return /^https?:\/\//i.test(s);
      };

      const safePublicInvoiceUrl = publicInvoiceUrl && isHttpUrl(publicInvoiceUrl) ? String(publicInvoiceUrl).trim() : null;
      const safePublicInvoiceUrlEsc = safePublicInvoiceUrl ? escapeHtml(safePublicInvoiceUrl) : null;

      const safePublicWebsiteUrl = isHttpUrl(publicWebsiteUrl) ? String(publicWebsiteUrl).trim() : getSmartFrontendBaseUrl();
      const safePublicWebsiteUrlEsc = escapeHtml(safePublicWebsiteUrl);

      const safeTenantName = escapeHtml(tenantName);
      const safeAppName = escapeHtml(appName);
      const safePlanName = escapeHtml(planName);
      const safeInvoiceNumber = escapeHtml(invoiceNumber);
      const safeDueDateStr = escapeHtml(dueDateStr);
      const safeAmountIdr = escapeHtml(amountIdr);

      const safeSupportEmail = (() => {
        const v = String(supportEmail || '').trim();
        if (!v) return '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '';
        return v;
      })();
      const safeSupportEmailEsc = safeSupportEmail ? escapeHtml(safeSupportEmail) : '';
      const safeSupportPhoneEsc = supportPhone ? escapeHtml(supportPhone) : '';

      const renderOptionalMessage = (raw: any): string => {
        const v = String(raw ?? '').trim();
        if (!v) return '';
        const hasHtml = /<\s*\w+[^>]*>/.test(v);
        const content = hasHtml ? v : escapeHtml(v).replace(/\r?\n/g, '<br/>');
        return `<div class="section"><div class="note">${content}</div></div>`;
      };

      const html = `
          <!DOCTYPE html>
          <html lang="id">
          <head>
            <meta charset="utf-8" />
            <title>Invoice ${safeInvoiceNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #0ea5e9; color: white; padding: 16px; border-radius: 8px; }
              .section { background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 12px; }
              .footer { color: #6b7280; font-size: 12px; text-align: center; margin-top: 16px; }
              .amount { font-size: 18px; font-weight: bold; }
              .label { color: #6b7280; }
              .cta { display: inline-block; background: #2563eb; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none; }
              .cta:hover { background: #1d4ed8; }
              .muted { color: #6b7280; font-size: 13px; }
              .note { font-size: 14px; color: #111827; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin:0;">${safeTenantName} — Invoice</h2>
              </div>
              <div class="section">
                <p style="margin:0 0 10px;">Halo <strong>${safeTenantName}</strong>,</p>
                <p style="margin:0;">Terima kasih telah menggunakan layanan <strong>${safeAppName}</strong>.</p>
              </div>
              <div class="section">
                <p style="margin:0 0 8px;"><strong>Detail tagihan:</strong></p>
                <p style="margin:0;"><span class="label">Nomor Invoice:</span> <strong>${safeInvoiceNumber}</strong></p>
                <p style="margin:0;"><span class="label">Jatuh Tempo:</span> <strong>${safeDueDateStr}</strong></p>
                <p style="margin:0;"><span class="label">Total Tagihan:</span> <span class="amount">${safeAmountIdr}</span></p>
              </div>
              ${
                safePublicInvoiceUrlEsc
                  ? `<div class="section">
                       <p style="margin:0 0 10px;">
                         <a class="cta" href="${safePublicInvoiceUrlEsc}" target="_blank" rel="noopener">Lihat & Bayar Invoice</a>
                       </p>
                       <p class="muted" style="margin:0;">
                         Jika tombol tidak berfungsi, salin tautan berikut ke peramban Anda:<br/>
                         <a href="${safePublicInvoiceUrlEsc}" target="_blank" rel="noopener">${safePublicInvoiceUrlEsc}</a>
                       </p>
                     </div>`
                  : `<div class="section"><p class="muted" style="margin:0;">Tautan pembayaran tidak tersedia. Silakan login untuk melihat detail invoice.</p></div>`
              }
              <div class="section">
                <p style="margin:0;">Tagihan ini untuk paket <strong>${safePlanName}</strong>.</p>
                <p class="muted" style="margin:8px 0 0;">Pembayaran sebelum tanggal jatuh tempo akan memastikan layanan tetap aktif tanpa gangguan.</p>
              </div>
              ${renderOptionalMessage(sendOptions?.message)}
              ${
                safeSupportEmailEsc || safeSupportPhoneEsc
                  ? `<div class="section">
                       <p style="margin:0 0 8px;"><strong>Bantuan & dukungan</strong></p>
                       ${safeSupportEmailEsc ? `<p style="margin:0;">Email: <a href="mailto:${safeSupportEmailEsc}">${safeSupportEmailEsc}</a></p>` : ''}
                       ${safeSupportPhoneEsc ? `<p style="margin:6px 0 0;">WhatsApp: ${safeSupportPhoneEsc}</p>` : ''}
                     </div>`
                  : ''
              }
              <div class="section">
                <p style="margin:0;">Salam hormat,</p>
                <p style="margin:6px 0 0;"><strong>Tim ${safeAppName}</strong></p>
                ${companyLegalName ? `<p class="muted" style="margin:6px 0 0;">${escapeHtml(companyLegalName)}</p>` : ''}
                <p class="muted" style="margin:6px 0 0;"><a href="${safePublicWebsiteUrlEsc}" target="_blank" rel="noopener">${safePublicWebsiteUrlEsc}</a></p>
              </div>
              <div class="footer">
                <p>Email ini dikirim otomatis oleh sistem. Silakan lakukan pembayaran sesuai petunjuk yang diberikan.</p>
              </div>
            </div>
          </body>
          </html>
        `;

      const relatedId = isResend ? `${invoiceId}_resend_${Date.now()}` : invoiceId;

      await emitDomainEvent({
        event_type: 'notification.email.send-requested',
        tenant_id: resolvedTenantId.length > 0 ? resolvedTenantId : null,
        source_service: 'invoice',
        payload: {
          to: recipient,
          subject,
          html,
          event: 'INVOICE_SENT',
          relatedId,
          tenantId: resolvedTenantId.length > 0 ? resolvedTenantId : undefined,
        },
      });
    }
  } catch (e) {
    console.error('Failed to send invoice email:', e);
  }

  return formatInvoiceResponse(updatedInvoice);
}

