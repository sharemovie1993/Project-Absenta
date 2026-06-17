import { prisma } from '../../../utils/prisma';
import { appendLog } from '../../../utils/logger';
import { cacheService } from '../../../utils/cache.service';
import { CACHE_KEYS } from '../../../constants/cache-keys';
import { createHash } from 'crypto';
import { InvoiceStatus } from '@prisma/client';
import { storageService } from '../../../infra/storage/storage.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { getSmartApiBaseUrl, resolveBaseUrlFromRequest } from '@/utils/url-helper';
import { paymentConfig } from '../../../config/payment.config';
import { systemConfigService } from '../../system-config/services/system-config.service';

const darkHtml = (content: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Absensi</title><style>body{background:#2f353a;color:#e4e7ea;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol;margin:0;padding:24px} .card{max-width:720px;margin:40px auto;background:#3a4149;border:1px solid #23282c;border-radius:12px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,0.35)} h3{margin:0 0 12px;font-size:18px} p{margin:8px 0} pre{background:#2f353a;border:1px solid #23282c;border-radius:8px;padding:12px;overflow:auto;color:#e4e7ea} a.button{display:inline-block;margin-top:12px;padding:8px 12px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none} .muted{color:#cbd1d6;font-size:12px}</style></head><body><div class="card">${content}<div class="muted">Absenta</div></div></body></html>`;

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

// Fungsi-fungsi resolusi URL di bawah ini telah dikonsolidasi ke src/utils/url-helper.ts
// Menghapus redundansi lokal.

const resolveExistingPdfStorageKey = async (invoiceId: string): Promise<string> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: String(invoiceId) },
    select: {
      pdf_path: true,
      pdf_storage_key: true,
      status: true,
      paid_at: true,
      pdf_generated_at: true,
    },
  });

  const status = String(invoice?.status || '');
  if (status === 'PAID' && invoice?.paid_at) {
    const paidAt = new Date(invoice.paid_at).getTime();
    const generatedAt = invoice.pdf_generated_at ? new Date(invoice.pdf_generated_at).getTime() : 0;
    if (generatedAt < paidAt - 5000) {
      return '';
    }
  }

  const key = String(invoice?.pdf_storage_key || '').trim();
  if (key) return key;

  const storedUrl = String(invoice?.pdf_path || '').trim();
  const marker = '/uploads/';
  const idx = storedUrl.indexOf(marker);
  if (idx >= 0) {
    const rel = storedUrl.slice(idx + marker.length).replace(/^\/+/, '');
    if (rel) return `uploads/${rel}`;
  }

  return '';
};

const sha256FromStream = async (stream: any): Promise<string> => {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk: any) => {
      try {
        hash.update(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      } catch {}
    });
    stream.on('error', reject);
    stream.on('end', () => resolve());
  });
  return hash.digest('hex');
};

const verifyStoredInvoicePdf = async (invoiceId: string): Promise<{
  verified: boolean;
  provider: string | null;
  key: string | null;
  expected_sha256: string | null;
  actual_sha256: string | null;
  generated_at: Date | null;
  size_bytes: number | null;
  invoice_number: string | null;
  reason: string | null;
}> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: String(invoiceId) },
    select: {
      id: true,
      invoice_number: true,
      pdf_storage_provider: true,
      pdf_storage_key: true,
      pdf_sha256: true,
      pdf_generated_at: true,
      pdf_size_bytes: true,
    },
  });

  if (!invoice) {
    return {
      verified: false,
      provider: null,
      key: null,
      expected_sha256: null,
      actual_sha256: null,
      generated_at: null,
      size_bytes: null,
      invoice_number: null,
      reason: 'Invoice not found',
    };
  }

  const provider = invoice.pdf_storage_provider ? String(invoice.pdf_storage_provider).trim().toLowerCase() : '';
  const key = invoice.pdf_storage_key ? String(invoice.pdf_storage_key).trim() : '';
  const expected = invoice.pdf_sha256 ? String(invoice.pdf_sha256).trim().toLowerCase() : '';

  if (!provider || !key) {
    return {
      verified: false,
      provider: invoice.pdf_storage_provider,
      key: invoice.pdf_storage_key,
      expected_sha256: invoice.pdf_sha256,
      actual_sha256: null,
      generated_at: invoice.pdf_generated_at,
      size_bytes: invoice.pdf_size_bytes ?? null,
      invoice_number: invoice.invoice_number ?? null,
      reason: 'PDF metadata is missing',
    };
  }

  if (!expected) {
    return {
      verified: false,
      provider: invoice.pdf_storage_provider,
      key: invoice.pdf_storage_key,
      expected_sha256: invoice.pdf_sha256,
      actual_sha256: null,
      generated_at: invoice.pdf_generated_at,
      size_bytes: invoice.pdf_size_bytes ?? null,
      invoice_number: invoice.invoice_number ?? null,
      reason: 'PDF hash is missing',
    };
  }

  try {
    const stream = storageService.createReadStream(key);
    const actual = await sha256FromStream(stream);
    const verified = actual.toLowerCase() === expected.toLowerCase();
    return {
      verified,
      provider: invoice.pdf_storage_provider,
      key: invoice.pdf_storage_key,
      expected_sha256: invoice.pdf_sha256,
      actual_sha256: actual,
      generated_at: invoice.pdf_generated_at,
      size_bytes: invoice.pdf_size_bytes ?? null,
      invoice_number: invoice.invoice_number ?? null,
      reason: verified ? null : 'Hash mismatch',
    };
  } catch (e: any) {
    return {
      verified: false,
      provider: invoice.pdf_storage_provider,
      key: invoice.pdf_storage_key,
      expected_sha256: invoice.pdf_sha256,
      actual_sha256: null,
      generated_at: invoice.pdf_generated_at,
      size_bytes: invoice.pdf_size_bytes ?? null,
      invoice_number: invoice.invoice_number ?? null,
      reason: String(e?.message || 'Verification failed'),
    };
  }
};

export async function registerInvoicePublicRoutes(fastify: any) {
  fastify.addHook('onRoute', (routeOptions: any) => {
    routeOptions.config = { ...(routeOptions.config || {}), skipAuth: true, public: true };
  });

  const publicRateLimit = {
    max: (() => {
      const raw = parseInt(String(process.env.INVOICE_PUBLIC_RATELIMIT_MAX || '').trim() || '');
      return Number.isFinite(raw) && raw > 0 ? raw : 100;
    })(),
    timeWindow: String(process.env.INVOICE_PUBLIC_RATELIMIT_WINDOW || '1 minute')
  };

  fastify.get('/:token/download', {
    config: {
      rateLimit: publicRateLimit
    }
  }, async (request: any, reply: any) => {
    try {
      const isView = request.query.view === '1';
      const { token } = request.params || {};
      const t = String(token || '').trim();
      const tokenEncoded = encodeURIComponent(t);
      const accept = String(request.headers['accept'] || '').toLowerCase();
      const wantsJson = accept.includes('application/json') && !request.query.download;

      if (!t || t.length < 32) {
        if (!wantsJson) {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(400);
          return darkHtml(`<h3>Token tidak valid</h3><p>Silakan minta tautan terbaru.</p>`);
        }
        reply.status(400);
        return { success: false, message: 'Invalid token' };
      }

      let mapping = await cacheService.get<{ invoice_id: string; tenant_id?: string; expiry?: number }>(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t));
      if (mapping?.expiry && Number.isFinite(mapping.expiry) && Date.now() > mapping.expiry) {
        await Promise.all([
          cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t)),
          mapping.invoice_id ? cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(mapping.invoice_id)) : Promise.resolve(),
        ]);
      }
      if (!mapping) {
        try {
          const { getMappingByToken } = await import('../../../utils/publicInvoiceToken');
          const dbMap = await getMappingByToken(t);
          if (dbMap) {
            mapping = dbMap;
            const ttl = dbMap.expiry ? Math.max(1, Math.floor((dbMap.expiry - Date.now()) / 1000)) : (24 * 60 * 60);
            await Promise.all([
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(dbMap.invoice_id)), t, ttl)
            ]);
          }
        } catch {}
      }
      if (!mapping) {
        try {
          const { getMappingByToken } = await import('../../../utils/publicInvoiceToken');
          const dbMap = await getMappingByToken(t);
          if (dbMap) {
            mapping = dbMap;
            const ttl = dbMap.expiry ? Math.max(1, Math.floor((dbMap.expiry - Date.now()) / 1000)) : (24 * 60 * 60);
            await Promise.all([
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(dbMap.invoice_id)), t, ttl)
            ]);
          }
        } catch {}
      }
      // Fallback recovery via activity log (token hash) to survive restarts without Redis
      if ((!mapping || !mapping.invoice_id) && t.length >= 32) {
        try {
          const tokenHash = createHash('sha256').update(t).digest('hex');
          const act = await prisma.activityLog.findFirst({
            where: {
              action: { in: ['INVOICE_PUBLIC_VIEW', 'INVOICE_PUBLIC_PDF_DOWNLOAD'] as any },
              metadata: { contains: tokenHash }
            },
            orderBy: { created_at: 'desc' }
          });
          if (act?.entity_id) {
            const ttl = 24 * 60 * 60;
            mapping = { invoice_id: String(act.entity_id), tenant_id: (act as any).tenant_id || undefined, expiry: Date.now() + ttl * 1000 };
            await Promise.all([
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(act.entity_id)), t, ttl),
            ]);
          }
        } catch {}
      }
      // Second fallback: accept query ?i=<invoice_id> to rebuild mapping (dev/HA safety)
      if ((!mapping || !mapping.invoice_id) && request?.query?.i) {
        try {
          const invId = String(request.query.i || '').trim();
          if (invId.length > 0) {
            const inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { id: true, tenant_id: true } });
            if (inv?.id) {
              const ttl = 24 * 60 * 60;
              mapping = { invoice_id: inv.id, tenant_id: inv.tenant_id || undefined, expiry: Date.now() + ttl * 1000 };
              await Promise.all([
                cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
                cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(inv.id)), t, ttl),
              ]);
            }
          }
        } catch {}
      }
      if (!mapping || !mapping.invoice_id) {
        if (!wantsJson) {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(404);
          return darkHtml(`<h3>Tautan kedaluwarsa atau tidak valid</h3><p>Silakan minta tautan baru.</p>`);
        }
        reply.status(404);
        return { success: false, message: 'Invalid or expired token' };
      }

      const { InvoiceService } = await import('../services/invoice.service');
      const svc = new InvoiceService();
      const result = await svc.getInvoicePublicById(mapping.invoice_id, t);
      const internal = result.internal;
      const tenantId = String(mapping.tenant_id || internal?.tenant_id || '').trim();

      if (!tenantId) {
        reply.status(400);
        return { success: false, message: 'Tenant context is missing' };
      }

      const publicBaseUrl = resolveBaseUrlFromRequest(request);
      console.log(`[public.routes] Download requested for: ${mapping.invoice_id}`);
      let storageKey = await resolveExistingPdfStorageKey(mapping.invoice_id);
      if (storageKey && !(await storageService.exists(storageKey))) {
        console.log(`[public.routes] storageKey "${storageKey}" found in DB but missing from storage. Triggering regeneration...`);
        storageKey = '';
      }

      console.log(`[public.routes] storageKey resolved: "${storageKey}"`);
       if (!storageKey) {
         try {
           // REDUNDANCY CHECK: Don't emit event if we already did recently (within 30s)
           const emissionLockKey = `lock:invoice_pdf_emit:${String(mapping.invoice_id)}`;
           const alreadyEmitted = await cacheService.get(emissionLockKey);
           
           if (!alreadyEmitted) {
             await cacheService.set(emissionLockKey, '1', 30); // 30s lock
             appendLog({ type: 'public_routes', action: 'emit_pdf_request', invoiceId: mapping.invoice_id });
             await emitDomainEvent({
               event_type: 'invoice.pdf.requested',
               tenant_id: tenantId,
               source_service: 'invoice-public',
               metadata: { idempotency_key: `invoice_pdf_${String(mapping.invoice_id)}` },
               payload: {
                 invoice_id: String(mapping.invoice_id),
                 tenant_id: tenantId,
                 public_base_url: String(publicBaseUrl || '').trim() || getSmartApiBaseUrl(),
               },
             });
           }
         } catch {}

        const downloadUrl = `/api/invoice/public/${tokenEncoded}/download`;
        if (wantsJson) {
          reply.status(202);
          return { success: false, message: 'PDF sedang diproses', data: { pdf_url: downloadUrl } };
        }
        reply.header('Content-Type', 'text/html; charset=utf-8');
        const refreshMeta = isView ? `<meta http-equiv="refresh" content="3">` : '';
        return reply.status(200).send(darkHtml(
          `${refreshMeta}<h3>PDF sedang diproses</h3><p>Silakan tunggu beberapa saat (sekitar 5-10 detik) sampai pratinjau muncul otomatis.</p><a class="button" href="${escapeHtml(downloadUrl)}">Coba Download Manual</a>`,
        ));
      }

      try {
        const tokenHash = createHash('sha256').update(t).digest('hex');
        const ip = (request.headers['x-forwarded-for'] as string) || request.ip;
        const ua = request.headers['user-agent'] || '';
        await prisma.activityLog.create({
          data: {
            tenant_id: (mapping.tenant_id || internal.tenant_id) as string,
            user_id: null,
            action: 'INVOICE_PUBLIC_PDF_DOWNLOAD',
            entity: 'invoice',
            entity_id: mapping.invoice_id,
            metadata: JSON.stringify({
              token_hash: tokenHash,
              accessed_at: new Date().toISOString(),
              ip,
              user_agent: ua,
              storage_key: storageKey,
            })
          }
        });
      } catch {}

      if (wantsJson) {
        reply.status(200);
        const downloadUrl = `/api/invoice/public/${tokenEncoded}/download`;
        return { success: true, message: 'OK', data: { pdf_url: downloadUrl } };
      }

      const invNum = String((result?.data as any)?.invoice_number || mapping.invoice_id).replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `Invoice-${invNum}.pdf`;

      const stream = storageService.createReadStream(storageKey);
      stream.on('error', () => {
        if (reply.sent || reply.raw.headersSent) {
          try {
            reply.raw.destroy();
          } catch {}
          return;
        }
        reply.status(404);
        reply.header('Content-Type', 'text/plain; charset=utf-8');
        void reply.send('PDF file not found');
      });
      reply.header('Content-Type', 'application/pdf');
      if (isView) {
        reply.header('Content-Disposition', `inline; filename="${fileName}"`);
      } else {
        reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      }
      return reply.send(stream);
    } catch (e: any) {
      const accept = String(request.headers['accept'] || '').toLowerCase();
      const wantsJson = accept.includes('application/json');
      if (!wantsJson) {
        reply.header('Content-Type', 'text/html; charset=utf-8');
        reply.status(500);
        return reply.status(500).send(darkHtml(`<h3>Gagal menyiapkan PDF</h3><p>${String(e?.message || 'Internal server error')}</p>`));
      }
      reply.status(500);
      return { success: false, message: e?.message || 'Internal server error' };
    }
  });

  fastify.get('/:token/verify', {
    config: {
      rateLimit: publicRateLimit
    }
  }, async (request: any, reply: any) => {
    try {
      const { token } = request.params || {};
      const t = String(token || '').trim();
      const accept = String(request.headers['accept'] || '').toLowerCase();
      const wantsJson = accept.includes('application/json');

      if (!t || t.length < 32) {
        if (!wantsJson) {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(400);
          return darkHtml(`<h3>Token tidak valid</h3><p>Silakan minta tautan terbaru.</p>`);
        }
        reply.status(400);
        return { success: false, message: 'Invalid token' };
      }

      let mapping = await cacheService.get<{ invoice_id: string; tenant_id?: string; expiry?: number }>(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t));
      if (mapping?.expiry && Number.isFinite(mapping.expiry) && Date.now() > mapping.expiry) {
        await Promise.all([
          cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t)),
          mapping.invoice_id ? cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(mapping.invoice_id)) : Promise.resolve(),
        ]);
      }
      if (!mapping) {
        try {
          const { getMappingByToken } = await import('../../../utils/publicInvoiceToken');
          const dbMap = await getMappingByToken(t);
          if (dbMap) {
            mapping = dbMap;
            const ttl = dbMap.expiry ? Math.max(1, Math.floor((dbMap.expiry - Date.now()) / 1000)) : (24 * 60 * 60);
            await Promise.all([
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(dbMap.invoice_id)), t, ttl)
            ]);
          }
        } catch {}
      }
      if ((!mapping || !mapping.invoice_id) && t.length >= 32) {
        try {
          const tokenHash = createHash('sha256').update(t).digest('hex');
          const act = await prisma.activityLog.findFirst({
            where: {
              action: { in: ['INVOICE_PUBLIC_VIEW', 'INVOICE_PUBLIC_PDF_DOWNLOAD'] as any },
              metadata: { contains: tokenHash }
            },
            orderBy: { created_at: 'desc' }
          });
          if (act?.entity_id) {
            const ttl = 24 * 60 * 60;
            mapping = { invoice_id: String(act.entity_id), tenant_id: (act as any).tenant_id || undefined, expiry: Date.now() + ttl * 1000 };
            await Promise.all([
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(act.entity_id)), t, ttl),
            ]);
          }
        } catch {}
      }
      if ((!mapping || !mapping.invoice_id) && request?.query?.i) {
        try {
          const invId = String(request.query.i || '').trim();
          if (invId.length > 0) {
            const inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { id: true, tenant_id: true } });
            if (inv?.id) {
              const ttl = 24 * 60 * 60;
              mapping = { invoice_id: inv.id, tenant_id: inv.tenant_id || undefined, expiry: Date.now() + ttl * 1000 };
              await Promise.all([
                cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
                cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(inv.id)), t, ttl),
              ]);
            }
          }
        } catch {}
      }
      if (!mapping || !mapping.invoice_id) {
        if (!wantsJson) {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(404);
          return darkHtml(`<h3>Tautan kedaluwarsa atau tidak valid</h3><p>Silakan minta tautan baru.</p>`);
        }
        reply.status(404);
        return { success: false, message: 'Invalid or expired token' };
      }

      const result = await verifyStoredInvoicePdf(mapping.invoice_id);

      try {
        const tokenHash = createHash('sha256').update(t).digest('hex');
        const ip = (request.headers['x-forwarded-for'] as string) || request.ip;
        const ua = request.headers['user-agent'] || '';
        await prisma.activityLog.create({
          data: {
            tenant_id: (mapping.tenant_id || null) as any,
            user_id: null,
            action: 'INVOICE_PUBLIC_PDF_VERIFY',
            entity: 'invoice',
            entity_id: mapping.invoice_id,
            metadata: JSON.stringify({
              token_hash: tokenHash,
              accessed_at: new Date().toISOString(),
              ip,
              user_agent: ua,
              verified: result.verified,
              reason: result.reason,
              provider: result.provider,
              key: result.key,
              expected_sha256: result.expected_sha256,
              actual_sha256: result.actual_sha256,
            })
          }
        });
      } catch {}

      if (wantsJson) {
        reply.status(200);
        return { success: true, message: 'OK', data: result };
      }

      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.status(result.verified ? 200 : 400);
      const publicBaseUrl = resolveBaseUrlFromRequest(request, { fallbackVar: 'API_URL' });
      const tokenEncoded = encodeURIComponent(String(t || ''));
      const downloadUrl = `${String(publicBaseUrl || '').replace(/\/+$/, '')}/invoice/public/${tokenEncoded}/download`;
      const invoiceLabel = escapeHtml(String(result.invoice_number || mapping.invoice_id || '-'));
      const reason = escapeHtml(String(result.reason || ''));
      const generatedAt = result.generated_at ? escapeHtml(new Date(result.generated_at).toISOString()) : '-';
      const sizeBytes = result.size_bytes !== null && result.size_bytes !== undefined ? escapeHtml(String(result.size_bytes)) : '-';
      const provider = escapeHtml(String(result.provider || '-'));
      const key = escapeHtml(String(result.key || '-'));
      const expected = escapeHtml(String(result.expected_sha256 || '-'));
      const actual = escapeHtml(String(result.actual_sha256 || '-'));

      const details = [
        `Status: ${result.verified ? 'VALID' : 'TIDAK VALID'}`,
        `Invoice: ${invoiceLabel}`,
        `Signed At: ${generatedAt}`,
        `Size (bytes): ${sizeBytes}`,
        `Storage: ${provider}`,
        `Object Key: ${key}`,
        `Expected SHA256: ${expected}`,
        `Actual SHA256: ${actual}`,
      ].join('\n');

      if (result.verified) {
        return darkHtml(
          `<h3>Verifikasi PDF: Valid</h3><p>Invoice: <strong>${invoiceLabel}</strong></p><p class="muted">Jika nomor invoice cocok dan status VALID, maka PDF resmi dan tidak berubah.</p><pre>${details}</pre><a class="button" href="${escapeHtml(downloadUrl)}">Download PDF</a>`
        );
      }
      return darkHtml(
        `<h3>Verifikasi PDF: Tidak valid</h3><p>${reason || 'PDF tidak dapat diverifikasi'}</p><p>Invoice: <strong>${invoiceLabel}</strong></p><p class="muted">Jika Anda menerima PDF dari pihak lain, pastikan verifikasi menunjukkan VALID. Hubungi admin bila ada perbedaan.</p><pre>${details}</pre><a class="button" href="${escapeHtml(downloadUrl)}">Download PDF</a>`
      );
    } catch (e: any) {
      const accept = String(request.headers['accept'] || '').toLowerCase();
      const wantsJson = accept.includes('application/json');
      if (!wantsJson) {
        reply.header('Content-Type', 'text/html; charset=utf-8');
        reply.status(500);
        return darkHtml(`<h3>Gagal memverifikasi PDF</h3><p>${String(e?.message || 'Internal server error')}</p>`);
      }
      reply.status(500);
      return { success: false, message: e?.message || 'Internal server error' };
    }
  });

  fastify.get('/:token', {
    config: {
      rateLimit: publicRateLimit
    }
  }, async (request: any, reply: any) => {
    try {
      const { token } = request.params || {};
      const t = String(token || '').trim();
      console.log(`[public.routes] GET /:token requested. Token: ${t.substring(0, 8)}... (len: ${t.length})`);
      if (!t || t.length < 32) {
        const accept = String(request.headers['accept'] || '');
        if (accept.includes('text/html')) {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(400);
          return darkHtml(`<h3>Token tidak valid</h3><p>Silakan minta tautan terbaru.</p>`);
        } else {
          reply.status(400);
          return { success: false, message: 'Invalid token' };
        }
      }
      let mapping = await cacheService.get<{ invoice_id: string; tenant_id?: string; expiry?: number }>(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t));
      if (mapping?.expiry && Number.isFinite(mapping.expiry) && Date.now() > mapping.expiry) {
        await Promise.all([
          cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t)),
          mapping.invoice_id ? cacheService.delete(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(mapping.invoice_id)) : Promise.resolve(),
        ]);
        mapping = null;
      }

      if (!mapping) {
        try {
          const { getMappingByToken } = await import('../../../utils/publicInvoiceToken');
          const dbMap = await getMappingByToken(t);
          if (dbMap) {
            mapping = dbMap;
            const ttl = dbMap.expiry ? Math.max(1, Math.floor((dbMap.expiry - Date.now()) / 1000)) : (24 * 60 * 60);
            await Promise.all([
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(dbMap.invoice_id)), t, ttl)
            ]);
          }
        } catch {}
      }
      if ((!mapping || !mapping.invoice_id) && t.length >= 32) {
        try {
          const tokenHash = createHash('sha256').update(t).digest('hex');
          const act = await prisma.activityLog.findFirst({
            where: {
              action: { in: ['INVOICE_PUBLIC_VIEW', 'INVOICE_PUBLIC_PDF_DOWNLOAD'] as any },
              metadata: { contains: tokenHash }
            },
            orderBy: { created_at: 'desc' }
          });
          if (act?.entity_id) {
            const ttl = 24 * 60 * 60;
            mapping = { invoice_id: String(act.entity_id), tenant_id: (act as any).tenant_id || undefined, expiry: Date.now() + ttl * 1000 };
            await Promise.all([
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
              cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(act.entity_id)), t, ttl),
            ]);
          }
        } catch {}
      }
      if ((!mapping || !mapping.invoice_id) && request?.query?.i) {
        try {
          const invId = String(request.query.i || '').trim();
          if (invId.length > 0) {
            const inv = await prisma.invoice.findUnique({ where: { id: invId }, select: { id: true, tenant_id: true } });
            if (inv?.id) {
              const ttl = 24 * 60 * 60;
              mapping = { invoice_id: inv.id, tenant_id: inv.tenant_id || undefined, expiry: Date.now() + ttl * 1000 };
              await Promise.all([
                cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_TOKEN(t), mapping, ttl),
                cacheService.set(CACHE_KEYS.INVOICE.PUBLIC_BY_INVOICE(String(inv.id)), t, ttl),
              ]);
            }
          }
        } catch {}
      }
      if (!mapping || !mapping.invoice_id) {
        console.log(`[public.routes] Mapping NOT found for token: ${t.substring(0, 8)}...`);
        const accept = String(request.headers['accept'] || '');
        if (accept.includes('text/html')) {
          reply.header('Content-Type', 'text/html; charset=utf-8');
          reply.status(404);
          return darkHtml(`<h3>Tautan kedaluwarsa atau tidak valid</h3><p>Silakan minta tautan baru.</p>`);
        } else {
          reply.status(404);
          return { success: false, message: 'Invalid or expired token' };
        }
      }
      const { InvoiceService } = await import('../services/invoice.service');
      const svc = new InvoiceService();
      const result = await svc.getInvoicePublicById(mapping.invoice_id, t);
      const data = result.data;
      const internal = result.internal;

      try {
        await prisma.invoice.updateMany({
          where: {
            id: mapping.invoice_id,
            status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT] },
          },
          data: {
            status: InvoiceStatus.VIEWED,
            viewed_at: new Date(),
            updated_at: new Date(),
          },
        });
      } catch {}

      try {
        const tokenHash = createHash('sha256').update(t).digest('hex');
        const ip = (request.headers['x-forwarded-for'] as string) || request.ip;
        const ua = request.headers['user-agent'] || '';
        await prisma.activityLog.create({
          data: {
            tenant_id: (mapping.tenant_id || internal.tenant_id) as string,
            user_id: null,
            action: 'INVOICE_PUBLIC_VIEW',
            entity: 'invoice',
            entity_id: mapping.invoice_id,
            metadata: JSON.stringify({
              token_hash: tokenHash,
              accessed_at: new Date().toISOString(),
              ip,
              user_agent: ua
            })
          }
        });
      } catch {}

      const accept = String(request.headers['accept'] || '').toLowerCase();
      const wantsJson = accept.includes('application/json');
      let supportedGateways: string[] = [];
      let tripayChannels: any[] = [];
      let ongoingPayment: any = null;
      let gracePeriodDays: number = parseInt(String(process.env.GRACE_PERIOD_DAYS || '7'));
      try {
        const { paymentConfig: pCfg } = await import('../../../config/payment.config');
        if (pCfg.tripay.apiKey && pCfg.tripay.merchantCode) supportedGateways.push('TRIPAY');
        supportedGateways.push('MANUAL');
      } catch {
        supportedGateways = ['TRIPAY', 'MANUAL'];
      }
      try {
        const { PaymentService } = await import('../../payment/services/payment.service');
        const paySvc = new PaymentService();
        const ch = await paySvc.getTripayMerchantChannels();
        tripayChannels = Array.isArray(ch) ? ch : [];
      } catch {}
      try {
        if (internal.billing_id) {
          const p = await prisma.payment.findFirst({
            where: {
              billing_id: internal.billing_id
            },
            orderBy: { created_at: 'desc' },
            select: {
              id: true,
              status: true,
              gateway: true,
              gateway_payment_url: true,
              gateway_transaction_id: true,
              expired_at: true,
              created_at: true,
              paid_at: true
            }
          });
          if (p) {
            ongoingPayment = {
              id: p.id,
              status: p.status,
              gateway: p.gateway,
              payment_url: p.gateway_payment_url || undefined,
              ref: p.gateway_transaction_id || undefined,
              expires_at: p.expired_at || undefined,
              created_at: p.created_at,
              paid_at: p.paid_at || undefined
            };
          }
        }
      } catch {}

      if (!wantsJson) {
        const statusStr = String(ongoingPayment?.status || '').toUpperCase();
        if (ongoingPayment && (statusStr === 'PENDING' || statusStr === 'PROCESSING' || statusStr === 'SUCCESS' || statusStr === 'COMPLETED' || statusStr === 'PAID') && ongoingPayment?.ref) {
          try {
            const base = resolveBaseUrlFromRequest(request);
            const dest = `${String(base || '').replace(/\/+$/, '')}/payment/status/${encodeURIComponent(String(ongoingPayment.ref))}`;
            const currentBase = resolveBaseUrlFromRequest(request);
            if (dest === `${String(currentBase).replace(/\/+$/, '')}/payment/status/${encodeURIComponent(String(ongoingPayment.ref))}`) {
              reply.header('Content-Type', 'text/html; charset=utf-8');
              reply.status(200);
              return reply.status(200).send(darkHtml(`<h3>Mengalihkan ke status pembayaran</h3><p>Silakan buka <a class="button" href="${escapeHtml(dest)}">halaman status pembayaran</a> jika tidak teralihkan otomatis.</p>`));
            }
            reply.redirect(dest);
            return;
          } catch {}
          const fallback = `/payment/return?ref=${encodeURIComponent(String(ongoingPayment.ref))}&gateway=${encodeURIComponent(String(ongoingPayment.gateway || ''))}`;
          reply.redirect(fallback);
          return;
        } else {
          try {
            const base = resolveBaseUrlFromRequest(request);
            const dest = `${String(base || '').replace(/\/+$/, '')}/invoice/public/${encodeURIComponent(t)}`;
            const currentBase = resolveBaseUrlFromRequest(request);
            if (dest === `${String(currentBase).replace(/\/+$/, '')}/invoice/public/${encodeURIComponent(t)}`) {
              // Hindari redirect ke URL yang sama (infinite loop via proxy)
              reply.header('Content-Type', 'text/html; charset=utf-8');
              reply.status(200);
              return reply.status(200).send(darkHtml(`<h3>Invoice Publik</h3><p>Tautan valid. Jika halaman tidak termuat otomatis, klik <a class="button" href="${escapeHtml(dest)}">buka invoice</a>.</p>`));
            }
            reply.redirect(dest);
            return;
          } catch {}
        }
      }

      const tenantId = internal?.tenant_id || (mapping as any)?.tenant_id || null;
      const tenantConfig = await systemConfigService.getActive(tenantId);
      
      const manualPayment = {
        ...(paymentConfig.manual || {}),
        bankName: (tenantConfig as any)?.company_bank_name || paymentConfig.manual?.bankName || 'BANK MANDIRI',
        accountNumber: (tenantConfig as any)?.company_bank_account || paymentConfig.manual?.accountNumber || '1234567890',
        accountHolder: (tenantConfig as any)?.company_bank_holder || paymentConfig.manual?.accountHolder || 'PT BARAYA TEKNOLOGI INDONESIA'
      };

      reply.status(200);
      return { 
        success: true, 
        message: 'OK', 
        data, 
        gateways: supportedGateways,
        tripay_channels: tripayChannels,
        contact: {
          company_name: data.issuer.name || 'PT BARAYA TEKNOLOGI INDONESIA',
          address: data.issuer.address || 'Jl. Buah Batu No. 123, Bandung',
          email: data.issuer.email || 'finance@baraya.co.id',
          phone: (tenantConfig as any)?.company_phone_billing || data.issuer.phone || '+62 812-3456-7890',
          website: undefined
        },
        manual_payment: manualPayment,
        ongoing_payment: ongoingPayment, 
        grace_period_days: gracePeriodDays 
      };
    } catch (e: any) {
      reply.status(500);
      return { success: false, message: e?.message || 'Internal server error' };
    }
  });

  fastify.post('/:token/upgrade/cancel', {
    config: {
      rateLimit: publicRateLimit
    }
  }, async (request: any, reply: any) => {
    try {
      const { token } = request.params || {};
      const t = String(token || '').trim();
      
      if (!t || t.length < 32) {
        reply.status(400);
        return { success: false, message: 'Invalid token' };
      }

      // 1. Resolve mapping
      const { getMappingByToken } = await import('../../../utils/publicInvoiceToken');
      const mapping = await getMappingByToken(t);
      
      if (!mapping || !mapping.invoice_id) {
        reply.status(404);
        return { success: false, message: 'Invalid or expired token' };
      }

      // 2. Get Invoice & Subscription ID
      const invoice = await prisma.invoice.findUnique({
        where: { id: mapping.invoice_id },
        select: { id: true, subscription_id: true, tenant_id: true }
      });

      if (!invoice) {
        reply.status(404);
        return { success: false, message: 'Invoice not found' };
      }

      // 3. Execute Command
      const { cancelPendingUpgradeCommand } = await import('../../billing/services/commands/cancel-pending-upgrade.command');
      const result = await cancelPendingUpgradeCommand(
        invoice.subscription_id,
        null, // No user ID (public action)
        request.correlationId
      );

      if (result.success) {
        // Log public cancellation
        try {
          const tokenHash = createHash('sha256').update(t).digest('hex');
          await prisma.activityLog.create({
            data: {
              tenant_id: invoice.tenant_id,
              user_id: null,
              action: 'INVOICE_PUBLIC_UPGRADE_CANCEL',
              entity: 'subscription',
              entity_id: invoice.subscription_id,
              metadata: JSON.stringify({
                token_hash: tokenHash,
                invoice_id: invoice.id,
                ip: (request.headers['x-forwarded-for'] as string) || request.ip,
                ts: new Date().toISOString()
              })
            }
          });
        } catch {}
        
        return result;
      } else {
        reply.status(400);
        return result;
      }
    } catch (e: any) {
      reply.status(500);
      return { success: false, message: e?.message || 'Internal server error' };
    }
  });
}
