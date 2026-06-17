import type { DomainEvent } from '@/infra/event-bus';
import { getEmailQueue } from '@/queue/email.queue';
import { getNotificationQueue } from '../../notification.queue';
import { WhatsAppService } from '../whatsapp.service';
import { getSmartApiBaseUrl } from '@/utils/url-helper';

async function acquireLock(conn: any, idempotencyKey: string): Promise<boolean> {
  try {
    const key = `domain-event:processed:notification:tenant:${idempotencyKey}`;
    const ok = await (conn as any).set(key, '1', 'EX', 6 * 60 * 60, 'NX');
    return Boolean(ok);
  } catch {
    return false;
  }
}

function buildTenantBaseUrl(domain: string): string {
  const scheme = String(process.env.PUBLIC_APP_SCHEME || 'https').trim() || 'https';
  const d = String(domain || '').trim().toLowerCase();
  if (d.includes('.')) return `${scheme}://${d}`;
  const basesRaw = String(process.env.CORS_WILDCARD_BASES || '').toLowerCase();
  const base = basesRaw.split(',').map((s) => s.trim()).filter(Boolean)[0] || '';
  return `${scheme}://${d}${base ? `.${base}` : ''}`;
}

function escapeHtml(v: any): string {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    if (ch === "'") return '&#39;';
    return ch;
  });
}

export async function handleTenantCreatedDomainEvent(input: {
  evt: DomainEvent<any>;
  conn: any;
  eventType: string;
  tenantId: string;
  correlationId: string;
  idempotencyKey: string;
}): Promise<boolean> {
  const { evt, conn, eventType, tenantId, correlationId, idempotencyKey } = input;

  if (eventType !== 'tenant.created') return false;

  const locked = await acquireLock(conn, idempotencyKey);
  if (!locked) return true;

  const p = (evt.payload || {}) as any;
  const adminEmail = String(p.admin_email || p.adminEmail || '').trim();
  const adminName = String(p.admin_name || p.adminName || '').trim();
  const adminPhone = String(p.admin_phone || p.adminPhone || '').trim();
  const tenantName = String(p.tenant_name || p.tenantName || '').trim();
  const tenantDomain = String(p.tenant_domain || p.tenantDomain || '').trim();
  const verifyUrl = String(p.fallback_verify_url || p.fallbackVerifyUrl || '').trim();

  if (adminEmail && verifyUrl) {
    const to = adminEmail;
    const subject = 'Verifikasi Email Akun Absenta';
    const safeVerifyUrl = escapeHtml(verifyUrl);
    const safeName = escapeHtml(adminName || 'Admin');
    const safeTenant = escapeHtml(tenantName || 'Sekolah');
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;background:#f3f4f6;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <div style="background:#0ea5e9;color:#fff;padding:16px 20px;">
            <h2 style="margin:0;font-size:18px;">Verifikasi Email</h2>
          </div>
          <div style="padding:18px 20px;color:#111827;">
            <p style="margin:0 0 12px;">Yth. Bapak/Ibu <strong>${safeName}</strong>,</p>
            <p style="margin:0 0 12px;">Akun Administrator untuk <strong>${safeTenant}</strong> telah dibuat.</p>
            <p style="margin:0 0 16px;">Silakan verifikasi email melalui tombol berikut:</p>
            <p style="margin:0 0 16px;">
              <a href="${safeVerifyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Verifikasi Email</a>
            </p>
            <p style="margin:0 0 8px;color:#374151;">Jika tombol tidak dapat diakses, gunakan tautan ini:</p>
            <p style="margin:0 0 16px;"><a href="${safeVerifyUrl}" style="color:#2563eb;text-decoration:none;">${safeVerifyUrl}</a></p>
          </div>
          <div style="padding:12px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
            Email ini dikirim otomatis oleh sistem.
          </div>
        </div>
      </div>
    `;
    try {
      await getEmailQueue().add('SEND_EMAIL', {
        to,
        subject,
        html,
        tenantId,
        event: 'TENANT_EMAIL_VERIFICATION',
        relatedId: `tenant:${tenantId}`,
        correlationId: correlationId || undefined,
      });
    } catch {}
  }

  if (adminPhone) {
    const wa = new WhatsAppService();
    const phone = wa.formatPhoneNumber(adminPhone);
    const tenantBase = tenantDomain ? buildTenantBaseUrl(tenantDomain) : getSmartApiBaseUrl();
    const message = `Halo Bapak/Ibu ${String(adminName || '').trim() || 'Admin'}\n\n` +
      `Pendaftaran tenant *${String(tenantName || '').trim() || 'Sekolah'}* berhasil.\n` +
      (verifyUrl ? `\nVerifikasi email: ${verifyUrl}\n` : '\n') +
      `Login: ${tenantBase}\n\n` +
      `Jika membutuhkan bantuan, balas pesan ini.`;

    if (phone) {
      try {
        await getNotificationQueue().add('tenant-created-wa', {
          kind: 'whatsapp',
          tenantId,
          eventType: 'notification.whatsapp.send-requested',
          payload: {
            phoneNumber: phone,
            message,
            tenantId,
            relatedId: `tenant:${tenantId}`,
            event: 'TENANT_CREATED',
            subject: 'Registrasi Tenant',
            force: true,
          },
        } as any);
      } catch {}
    }
  }

  return true;
}
