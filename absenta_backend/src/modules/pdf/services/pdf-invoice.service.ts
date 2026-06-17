import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { prisma } from '../../../utils/prisma';
import { createHash } from 'crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { appendLog } from '../../../utils/logger';
import { storageService } from '../../../infra/storage/storage.service';

type S3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
  presignExpiresSeconds: number;
};

const getS3Config = (): S3Config | null => {
  const enabled =
    String(process.env.STORAGE_DRIVER || '').trim().toLowerCase() === 's3' ||
    String(process.env.INVOICE_PDF_STORAGE || '').trim().toLowerCase() === 's3';
  if (!enabled) return null;

  const bucket = String(process.env.S3_BUCKET || '').trim();
  const region = String(process.env.S3_REGION || '').trim() || 'us-east-1';
  const endpoint = String(process.env.S3_ENDPOINT || '').trim() || undefined;
  const accessKeyId =
    String(process.env.S3_ACCESS_KEY || '').trim() ||
    String(process.env.S3_ACCESS_KEY_ID || '').trim();
  const secretAccessKey =
    String(process.env.S3_SECRET_KEY || '').trim() ||
    String(process.env.S3_SECRET_ACCESS_KEY || '').trim();
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || '').trim().toLowerCase() === 'true';
  const publicBaseUrl = String(process.env.S3_PUBLIC_BASE_URL || '').trim() || undefined;
  const presignExpiresSeconds = (() => {
    const raw = parseInt(String(process.env.S3_PRESIGN_EXPIRES_SECONDS || '').trim() || '');
    return Number.isFinite(raw) && raw > 0 ? raw : 3600;
  })();

  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    publicBaseUrl,
    presignExpiresSeconds,
  };
};

const createS3Client = (cfg: S3Config): S3Client => {
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
};

const sha256FromStream = async (body: any): Promise<string> => {
  if (!body) throw new Error('Missing object body');

  if (Buffer.isBuffer(body)) {
    return createHash('sha256').update(body).digest('hex');
  }

  if (body instanceof Uint8Array) {
    return createHash('sha256').update(Buffer.from(body)).digest('hex');
  }

  const isReadable =
    typeof body === 'object' &&
    body !== null &&
    (body instanceof Readable ||
      typeof (body as any).pipe === 'function' ||
      typeof (body as any)[Symbol.asyncIterator] === 'function');

  if (!isReadable) {
    return createHash('sha256').update(Buffer.from(String(body))).digest('hex');
  }

  const hash = createHash('sha256');
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
    if (typeof chunk === 'string') hash.update(Buffer.from(chunk));
    else hash.update(Buffer.from(chunk as any));
  }
  return hash.digest('hex');
};

const sha256OfFile = async (filePath: string): Promise<string> => {
  const stream = fs.createReadStream(filePath);
  try {
    return await sha256FromStream(stream);
  } finally {
    try {
      stream.close();
    } catch {}
  }
};

export class PdfInvoiceService {
  async resolveExistingPdfStorageKey(input: { invoiceId: string }): Promise<string> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
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
    if (key) {
      if (await storageService.exists(key)) {
        return key;
      }
    }

    const storedUrl = String(invoice?.pdf_path || '').trim();
    const marker = '/uploads/';
    const idx = storedUrl.indexOf(marker);
    if (idx >= 0) {
      const rel = storedUrl.slice(idx + marker.length).replace(/^\/+/, '');
      if (rel) {
        const potentialKey = `uploads/${rel}`;
        if (await storageService.exists(potentialKey)) {
          return potentialKey;
        }
      }
    }

    return '';
  }

  async verifyStoredInvoicePdf(input: { invoiceId: string }): Promise<{
    verified: boolean;
    provider: string | null;
    key: string | null;
    expected_sha256: string | null;
    actual_sha256: string | null;
    generated_at: Date | null;
    size_bytes: number | null;
    invoice_number: string | null;
    reason: string | null;
  }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
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
      throw new Error('Invoice not found');
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

    const actual = await (async () => {
      if (provider === 'local') {
        const filePath = path.isAbsolute(key) ? key : path.join(process.cwd(), key);
        if (!fs.existsSync(filePath)) {
          throw new Error('PDF file not found');
        }
        return await sha256OfFile(filePath);
      }

      if (provider === 's3') {
        const cfg = getS3Config();
        if (!cfg) {
          throw new Error('S3 storage is not configured');
        }
        const client = createS3Client(cfg);
        const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
        return await sha256FromStream((res as any).Body);
      }

      throw new Error('Unsupported storage provider');
    })();

    return {
      verified: actual === expected,
      provider: invoice.pdf_storage_provider,
      key: invoice.pdf_storage_key,
      expected_sha256: invoice.pdf_sha256,
      actual_sha256: actual,
      generated_at: invoice.pdf_generated_at,
      size_bytes: invoice.pdf_size_bytes ?? null,
      invoice_number: invoice.invoice_number ?? null,
      reason: actual === expected ? null : 'PDF hash mismatch',
    };
  }

  async generateAndStoreInvoicePdf(input: {
    invoiceId: string;
    tenantId: string;
    publicBaseUrl: string;
  }): Promise<{ storageKey: string }> {
    void input.publicBaseUrl;
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      select: {
        id: true,
        invoice_number: true,
        tenant_id: true,
        pdf_generated_at: true,
        pdf_storage_key: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const existingKey = await this.resolveExistingPdfStorageKey({ invoiceId: input.invoiceId });
    if (existingKey && existingKey.trim().length > 0) return { storageKey: existingKey.trim() };

    const { buildPublicInvoiceUrl } = await import('../../notification/services/whatsapp.service');
    const publicInvoiceUrl = await buildPublicInvoiceUrl(input.invoiceId, input.tenantId);
    if (!publicInvoiceUrl) {
      throw new Error('Failed to resolve invoice URL');
    }

    const { getSmartFrontendBaseUrl } = await import('../../../utils/url-helper');
    const frontendBase = getSmartFrontendBaseUrl();
    const normalizedFront = String(frontendBase).replace(/\/+$/, '');
    
    // Extract token from publicInvoiceUrl (which is a backend URL)
    const token = publicInvoiceUrl.split('/').pop()?.split('?')[0] || '';

    const signedAt = invoice.pdf_generated_at ? new Date(invoice.pdf_generated_at) : new Date();
    // Use direct frontend path for rendering with the authentic token
    const renderUrl = `${normalizedFront}/invoice/public/${token}?pdf=1&signed_at=${encodeURIComponent(
      signedAt.toISOString()
    )}`;
    
    appendLog({ type: 'pdf_service', action: 'start', invoiceId: input.invoiceId, renderUrl });

    let browser: any;
    try {
      appendLog({ type: 'pdf_service', action: 'launch_puppeteer', invoiceId: input.invoiceId });
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
      
      appendLog({ type: 'pdf_service', action: 'navigate', invoiceId: input.invoiceId, url: renderUrl });
      await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 90000 });
      
      appendLog({ type: 'pdf_service', action: 'wait_ready', invoiceId: input.invoiceId });
      await page.waitForSelector('#invoice-pdf-root[data-ready="1"]', { timeout: 90000 });

      appendLog({ type: 'pdf_service', action: 'render_pdf', invoiceId: input.invoiceId });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        scale: 0.92,
      });

      appendLog({ type: 'pdf_service', action: 'render_success', invoiceId: input.invoiceId, size: pdfBuffer.length });
      const sha256 = createHash('sha256').update(pdfBuffer).digest('hex');
      const sizeBytes = pdfBuffer.length;

      const s3Cfg = getS3Config();
      const key = `uploads/invoices/${encodeURIComponent(String(invoice.id))}.pdf`.replace(/%2F/g, '/');
      
      appendLog({ type: 'pdf_service', action: 'upload', invoiceId: input.invoiceId, key });
      await storageService.uploadBuffer(key, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: 'private, max-age=31536000, immutable',
      });

      appendLog({ type: 'pdf_service', action: 'update_db', invoiceId: input.invoiceId });
      await prisma.invoice.update({
        where: { id: input.invoiceId },
        data: {
          pdf_path: null,
          pdf_storage_provider: s3Cfg ? 's3' : 'local',
          pdf_storage_key: key,
          pdf_sha256: sha256,
          pdf_generated_at: signedAt,
          pdf_size_bytes: sizeBytes,
        },
      });

      appendLog({ type: 'pdf_service', action: 'success', invoiceId: input.invoiceId });
      return { storageKey: key };
    } finally {
      try {
        if (browser) await browser.close();
      } catch {}
    }
  }
}
