import { DocumentAction, DocumentCategory } from '@prisma/client';
import { MultipartFile } from '@fastify/multipart';
import { prisma } from '../../../utils/prisma';
import { DocumentStorageService } from './document-storage.service';
import { cacheService } from '../../../utils/cache.service';
import { CACHE_KEYS } from '../../../constants/cache-keys';
import * as crypto from 'crypto';
import puppeteer from 'puppeteer';
import { systemConfigService } from '../../system-config/services/system-config.service';

function parseCategory(raw: unknown): DocumentCategory {
  const value = String(raw || '').toUpperCase();
  const allowed = Object.values(DocumentCategory) as string[];
  if (allowed.includes(value)) return value as DocumentCategory;
  return DocumentCategory.OTHER;
}

function parseCategoryFilter(raw: unknown): DocumentCategory | null {
  const token = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (!token) return null;
  if (
    token === 'ALL' ||
    token === 'SEMUA' ||
    token === 'SEMUA_DOKUMEN' ||
    token === 'SEMUA_DOKUMENT' ||
    token === 'SEMUA_DOCUMENT' ||
    token === 'SEMUA_DOCUMENTS'
  ) {
    return null;
  }

  const aliasMap: Record<string, DocumentCategory> = {
    ADMIN: DocumentCategory.ADMINISTRATIVE,
    ADMINISTRASI: DocumentCategory.ADMINISTRATIVE,
    COMPANY: DocumentCategory.ADMINISTRATIVE,
    COMPANY_DOCUMENT: DocumentCategory.ADMINISTRATIVE,
    COMPANY_DOCUMENTS: DocumentCategory.ADMINISTRATIVE,
    COMPANY_DOC: DocumentCategory.ADMINISTRATIVE,
    COMPANY_DOCS: DocumentCategory.ADMINISTRATIVE,
    LEGAL_DOCUMENT: DocumentCategory.LEGAL,
    LEGAL_DOCUMENTS: DocumentCategory.LEGAL,
    LEGAL_DOC: DocumentCategory.LEGAL,
    LEGAL_DOCS: DocumentCategory.LEGAL,
    MANUALS: DocumentCategory.MANUAL,
    MANUAL_DOCUMENT: DocumentCategory.MANUAL,
    MANUAL_DOCUMENTS: DocumentCategory.MANUAL,
    SOP: DocumentCategory.MANUAL,
    LAINNYA: DocumentCategory.OTHER,
  };

  const aliased = aliasMap[token];
  if (aliased) return aliased;

  const allowed = Object.values(DocumentCategory) as string[];
  if (allowed.includes(token)) return token as DocumentCategory;
  return null;
}

function parseAction(raw: unknown): DocumentAction | null {
  const value = String(raw || '').toUpperCase();
  const allowed = Object.values(DocumentAction) as string[];
  if (allowed.includes(value)) return value as DocumentAction;
  return null;
}

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseVersion(raw: unknown): number | null {
  if (typeof raw === 'undefined' || raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const v = Math.trunc(n);
  if (v < 1) return null;
  return v;
}

function resolveSignedUrlTtlSeconds() {
  const raw = parseInt(String(process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS || '').trim() || '');
  const ttl = Number.isFinite(raw) && raw > 0 ? raw : 60;
  return Math.min(600, Math.max(10, ttl));
}

function hashUserAgent(userAgent: string) {
  const cleaned = String(userAgent || '').trim();
  if (!cleaned) return null;
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

function escapeHtml(raw: unknown): string {
  const s = String(raw ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function joinNonEmpty(parts: Array<string | null | undefined>, sep = ', ') {
  const cleaned = parts.map((p) => String(p || '').trim()).filter((p) => p.length > 0);
  return cleaned.join(sep);
}

export class DocumentsService {
  constructor(private readonly storage: DocumentStorageService = new DocumentStorageService()) {}

  async upload(params: {
    tenantId: string | null | undefined;
    actorUserId: string | null | undefined;
    title: string;
    category: unknown;
    description?: string | null;
    file: MultipartFile;
  }) {
    const title = String(params.title || '').trim();
    if (!title) {
      const error = new Error('title wajib diisi');
      (error as any).statusCode = 400;
      throw error;
    }

    const category = parseCategory(params.category);
    if (category === DocumentCategory.BILLING) {
      const error = new Error('Kategori BILLING tidak didukung di Document Center');
      (error as any).statusCode = 400;
      throw error;
    }
    const stored = await this.storage.saveFile({
      tenantId: params.tenantId,
      category,
      file: params.file,
    });

    const result = await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          tenant_id: params.tenantId ?? null,
          title,
          category,
          description: params.description ?? null,
          file_original_name: stored.originalName,
          file_storage_path: stored.relativePath,
          mime_type: stored.mimeType,
          size_bytes: stored.sizeBytes,
          current_version: 1,
          created_by_user_id: params.actorUserId ?? null,
        },
      });

      await tx.documentVersion.create({
        data: {
          document_id: document.id,
          version: 1,
          file_original_name: stored.originalName,
          file_storage_path: stored.relativePath,
          mime_type: stored.mimeType,
          size_bytes: stored.sizeBytes,
          created_by_user_id: params.actorUserId ?? null,
        },
      });

      await tx.documentActivity.create({
        data: {
          document_id: document.id,
          action: DocumentAction.UPLOAD,
          actor_user_id: params.actorUserId ?? null,
          actor_tenant_id: params.tenantId ?? null,
        },
      });

      return document;
    });

    return result;
  }

  async list(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    allowedCategories?: DocumentCategory[] | null;
    query: any;
  }) {
    const page = Math.max(1, Number(params.query?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.query?.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (!params.isSuperAdmin || params.tenantId) {
      where.tenant_id = params.tenantId ?? null;
    }
    if (typeof params.query?.is_active !== 'undefined') {
      const isActive = String(params.query.is_active).toLowerCase();
      where.is_active = isActive === 'true' || isActive === '1';
    }
    const categoryFromQuery = parseCategoryFilter(params.query?.category);
    if (categoryFromQuery) {
      if (params.allowedCategories && !params.allowedCategories.includes(categoryFromQuery)) {
        const error = new Error('Forbidden: kategori dokumen tidak diizinkan');
        (error as any).statusCode = 403;
        throw error;
      }
      where.category = categoryFromQuery;
    } else if (params.allowedCategories) {
      where.category = { in: params.allowedCategories };
    }

    const [total, items] = await prisma.$transaction([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          tenant_id: true,
          title: true,
          category: true,
          description: true,
          file_original_name: true,
          mime_type: true,
          size_bytes: true,
          current_version: true,
          is_active: true,
          created_by_user_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getForDownload(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    allowedCategories?: DocumentCategory[] | null;
    documentId: string;
    actorUserId: string | null | undefined;
  }) {
    const where: any = { id: params.documentId, is_active: true };
    if (!params.isSuperAdmin || params.tenantId) {
      where.tenant_id = params.tenantId ?? null;
    }

    const document = await prisma.document.findFirst({ where });
    if (!document) {
      const error = new Error('Dokumen tidak ditemukan');
      (error as any).statusCode = 404;
      throw error;
    }
    if (params.allowedCategories && !params.allowedCategories.includes(document.category)) {
      const error = new Error('Forbidden: kategori dokumen tidak diizinkan');
      (error as any).statusCode = 403;
      throw error;
    }

    await prisma.documentActivity.create({
      data: {
        document_id: document.id,
        action: DocumentAction.DOWNLOAD,
        actor_user_id: params.actorUserId ?? null,
        actor_tenant_id: params.tenantId ?? null,
      },
    });

    const stream = this.storage.createReadStream(document.file_storage_path);
    return { document, stream };
  }

  async createSignedDownloadToken(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    allowedCategories?: DocumentCategory[] | null;
    documentId: string;
    actorUserId: string | null | undefined;
    version?: number | null | undefined;
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
  }) {
    const where: any = { id: params.documentId, is_active: true };
    if (!params.isSuperAdmin || params.tenantId) {
      where.tenant_id = params.tenantId ?? null;
    }

    const document = await prisma.document.findFirst({ where });
    if (!document) {
      const error = new Error('Dokumen tidak ditemukan');
      (error as any).statusCode = 404;
      throw error;
    }
    if (params.allowedCategories && !params.allowedCategories.includes(document.category)) {
      const error = new Error('Forbidden: kategori dokumen tidak diizinkan');
      (error as any).statusCode = 403;
      throw error;
    }

    const version = parseVersion(params.version);
    if (version) {
      const exists = await prisma.documentVersion.findFirst({
        where: { document_id: document.id, version },
        select: { id: true },
      });
      if (!exists) {
        const error = new Error('Versi dokumen tidak ditemukan');
        (error as any).statusCode = 404;
        throw error;
      }
    }

    const ttlSeconds = resolveSignedUrlTtlSeconds();
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + ttlSeconds * 1000;

    await cacheService.set(
      CACHE_KEYS.DOCUMENT.SIGNED_TOKEN(token),
      {
        document_id: document.id,
        tenant_id: document.tenant_id ?? null,
        actor_user_id: params.actorUserId ?? null,
        version: version ?? null,
        expiry,
        ip: params.ip ? String(params.ip).trim() : null,
        ua_hash: hashUserAgent(String(params.userAgent || '')),
      },
      ttlSeconds
    );

    return {
      token,
      expires_at: new Date(expiry).toISOString(),
    };
  }

  async getForSignedTokenDownload(params: { token: string; ip?: string | null | undefined; userAgent?: string | null | undefined }) {
    const t = String(params.token || '').trim();
    if (!t || t.length < 32) {
      const error = new Error('Tautan tidak valid');
      (error as any).statusCode = 400;
      throw error;
    }

    const mapping = await cacheService.get<{
      document_id: string;
      tenant_id: string | null;
      actor_user_id: string | null;
      version?: number | null;
      expiry?: number;
      ip?: string | null;
      ua_hash?: string | null;
    }>(CACHE_KEYS.DOCUMENT.SIGNED_TOKEN(t));

    if (mapping?.expiry && Number.isFinite(mapping.expiry) && Date.now() > Number(mapping.expiry)) {
      await cacheService.delete(CACHE_KEYS.DOCUMENT.SIGNED_TOKEN(t));
    }
    if (!mapping?.document_id) {
      const error = new Error('Tautan kedaluwarsa atau tidak valid');
      (error as any).statusCode = 404;
      throw error;
    }

    const reqIp = params.ip ? String(params.ip).trim() : '';
    if (mapping.ip && reqIp && String(mapping.ip).trim() !== reqIp) {
      const error = new Error('Tautan tidak valid');
      (error as any).statusCode = 403;
      throw error;
    }
    const reqUaHash = hashUserAgent(String(params.userAgent || ''));
    if (mapping.ua_hash && reqUaHash && mapping.ua_hash !== reqUaHash) {
      const error = new Error('Tautan tidak valid');
      (error as any).statusCode = 403;
      throw error;
    }

    await cacheService.delete(CACHE_KEYS.DOCUMENT.SIGNED_TOKEN(t));

    const document = await prisma.document.findFirst({
      where: {
        id: mapping.document_id,
        tenant_id: mapping.tenant_id ?? null,
        is_active: true,
      },
    });
    if (!document) {
      const error = new Error('Dokumen tidak ditemukan');
      (error as any).statusCode = 404;
      throw error;
    }

    let resolved: any = document;
    if (mapping.version) {
      const v = await prisma.documentVersion.findFirst({
        where: { document_id: document.id, version: Number(mapping.version) },
      });
      if (!v) {
        const error = new Error('Versi dokumen tidak ditemukan');
        (error as any).statusCode = 404;
        throw error;
      }
      resolved = {
        ...document,
        file_original_name: v.file_original_name,
        file_storage_path: v.file_storage_path,
        mime_type: v.mime_type,
        size_bytes: v.size_bytes,
      };
    }

    await prisma.documentActivity.create({
      data: {
        document_id: document.id,
        action: DocumentAction.DOWNLOAD,
        actor_user_id: mapping.actor_user_id ?? null,
        actor_tenant_id: mapping.tenant_id ?? null,
      },
    });

    const stream = this.storage.createReadStream(resolved.file_storage_path);
    return { document: resolved, stream };
  }

  async listVersions(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    allowedCategories?: DocumentCategory[] | null;
    documentId: string;
  }) {
    const where: any = { id: params.documentId, is_active: true };
    if (!params.isSuperAdmin || params.tenantId) {
      where.tenant_id = params.tenantId ?? null;
    }

    const document = await prisma.document.findFirst({ where });
    if (!document) {
      const error = new Error('Dokumen tidak ditemukan');
      (error as any).statusCode = 404;
      throw error;
    }
    if (params.allowedCategories && !params.allowedCategories.includes(document.category)) {
      const error = new Error('Forbidden: kategori dokumen tidak diizinkan');
      (error as any).statusCode = 403;
      throw error;
    }

    const items = await prisma.documentVersion.findMany({
      where: { document_id: document.id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        document_id: true,
        version: true,
        file_original_name: true,
        mime_type: true,
        size_bytes: true,
        created_by_user_id: true,
        created_at: true,
      },
    });

    return { document, items };
  }

  async uploadNewVersion(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    documentId: string;
    actorUserId: string | null | undefined;
    file: MultipartFile;
  }) {
    const where: any = { id: params.documentId, is_active: true };
    if (!params.isSuperAdmin || params.tenantId) {
      where.tenant_id = params.tenantId ?? null;
    }

    const document = await prisma.document.findFirst({ where });
    if (!document) {
      const error = new Error('Dokumen tidak ditemukan');
      (error as any).statusCode = 404;
      throw error;
    }
    if (document.category === DocumentCategory.BILLING) {
      const error = new Error('Kategori BILLING tidak didukung di Document Center');
      (error as any).statusCode = 400;
      throw error;
    }

    const stored = await this.storage.saveFile({
      tenantId: params.tenantId,
      category: document.category,
      file: params.file,
    });

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.document.findFirst({ where });
        if (!current) {
          const error = new Error('Dokumen tidak ditemukan');
          (error as any).statusCode = 404;
          throw error;
        }

        const nextVersion = Math.max(1, Number(current.current_version || 1)) + 1;

        await tx.documentVersion.create({
          data: {
            document_id: current.id,
            version: nextVersion,
            file_original_name: stored.originalName,
            file_storage_path: stored.relativePath,
            mime_type: stored.mimeType,
            size_bytes: stored.sizeBytes,
            created_by_user_id: params.actorUserId ?? null,
          },
        });

        const d = await tx.document.update({
          where: { id: current.id },
          data: {
            file_original_name: stored.originalName,
            file_storage_path: stored.relativePath,
            mime_type: stored.mimeType,
            size_bytes: stored.sizeBytes,
            current_version: nextVersion,
          },
        });

        await tx.documentActivity.create({
          data: {
            document_id: current.id,
            action: DocumentAction.UPLOAD,
            actor_user_id: params.actorUserId ?? null,
            actor_tenant_id: params.tenantId ?? null,
          },
        });

        return d;
      });

      return updated;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('constraint')) {
        const error = new Error('Gagal mengunggah versi dokumen, silakan coba lagi');
        (error as any).statusCode = 409;
        throw error;
      }
      throw e;
    }
  }

  async generateMouPdfDocument(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    actorUserId: string | null | undefined;
    title?: string | null | undefined;
    description?: string | null | undefined;
    tanggal?: string | null | undefined;
    nomor?: string | null | undefined;
    pihak_kedua_nama?: string | null | undefined;
    pihak_kedua_alamat?: string | null | undefined;
  }) {
    const tenantId = params.tenantId ?? null;
    if (!tenantId) {
      const error = new Error('tenant_id wajib diisi');
      (error as any).statusCode = 400;
      throw error;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });
    if (!tenant) {
      const error = new Error('Tenant tidak ditemukan');
      (error as any).statusCode = 404;
      throw error;
    }

    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { updated_at: 'desc' },
      select: {
        nama: true,
        alamat: true,
        kelurahan: true,
        kecamatan: true,
        kota: true,
        provinsi: true,
        kode_pos: true,
        kepala_sekolah: true,
      },
    });

    const cfg = await systemConfigService.getActive(tenantId);
    const issuerName =
      String(cfg?.company_legal_name || cfg?.company_trade_name || '').trim() || 'Pihak Pertama';
    const issuerAddress = String(cfg?.company_address || '').trim();
    const issuerSignName = String(cfg?.company_signature_name || '').trim();
    const issuerSignTitle = String(cfg?.company_signature_title || '').trim();

    const pihakKeduaNama =
      String(params.pihak_kedua_nama || '').trim() ||
      String(sekolah?.nama || '').trim() ||
      String(tenant.name || '').trim();
    const pihakKeduaAlamat =
      String(params.pihak_kedua_alamat || '').trim() ||
      joinNonEmpty(
        [
          sekolah?.alamat,
          sekolah?.kelurahan ? `Kel. ${sekolah.kelurahan}` : null,
          sekolah?.kecamatan ? `Kec. ${sekolah.kecamatan}` : null,
          sekolah?.kota,
          sekolah?.provinsi,
          sekolah?.kode_pos,
        ],
        ', '
      );

    const tanggal = (() => {
      const raw = String(params.tanggal || '').trim();
      if (!raw) return new Date().toISOString().slice(0, 10);
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
      return d.toISOString().slice(0, 10);
    })();

    const nomor = String(params.nomor || '').trim();
    const title = String(params.title || '').trim() || `MoU - ${pihakKeduaNama}`;
    const description = typeof params.description === 'undefined' ? null : (params.description === null ? null : String(params.description));

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 32px; }
      h1 { font-size: 18px; margin: 0 0 8px; text-align: center; }
      .meta { text-align: center; margin-bottom: 20px; }
      .meta div { margin: 2px 0; }
      .section { margin-top: 14px; }
      .label { font-weight: 700; }
      .para { margin: 8px 0; line-height: 1.55; text-align: justify; }
      .sig { display: flex; gap: 24px; margin-top: 36px; }
      .sig .col { flex: 1; text-align: center; }
      .sig .name { margin-top: 64px; font-weight: 700; }
      .sig .title { margin-top: 6px; }
      .box { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
    </style>
  </head>
  <body>
    <h1>MEMORANDUM OF UNDERSTANDING (MoU)</h1>
    <div class="meta">
      ${nomor ? `<div><span class="label">Nomor:</span> ${escapeHtml(nomor)}</div>` : ''}
      <div><span class="label">Tanggal:</span> ${escapeHtml(tanggal)}</div>
    </div>

    <div class="section box">
      <div class="para"><span class="label">PIHAK PERTAMA</span>: ${escapeHtml(issuerName)}${issuerAddress ? `, beralamat di ${escapeHtml(issuerAddress)}` : ''}.</div>
      <div class="para"><span class="label">PIHAK KEDUA</span>: ${escapeHtml(pihakKeduaNama)}${pihakKeduaAlamat ? `, beralamat di ${escapeHtml(pihakKeduaAlamat)}` : ''}.</div>
    </div>

    <div class="section">
      <div class="para">
        Para pihak sepakat untuk menjalin kerja sama terkait kebutuhan operasional dan administrasi yang relevan, sesuai ketentuan yang akan disepakati lebih lanjut oleh kedua belah pihak.
      </div>
      <div class="para">
        MoU ini berlaku sejak tanggal ditandatangani dan dapat ditinjau kembali berdasarkan kesepakatan para pihak.
      </div>
    </div>

    <div class="sig">
      <div class="col">
        <div class="label">PIHAK PERTAMA</div>
        <div class="name">${escapeHtml(issuerSignName || issuerName)}</div>
        <div class="title">${escapeHtml(issuerSignTitle || '')}</div>
      </div>
      <div class="col">
        <div class="label">PIHAK KEDUA</div>
        <div class="name">${escapeHtml(sekolah?.kepala_sekolah || pihakKeduaNama)}</div>
        <div class="title">${escapeHtml(sekolah?.kepala_sekolah ? 'Kepala Sekolah' : '')}</div>
      </div>
    </div>
  </body>
</html>`;

    let browser: any;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      });

      const fileName = `${String(title).replace(/[^\w.\- ]+/g, '_').trim() || 'mou'}_${tanggal}.pdf`;
      const stored = await this.storage.saveBuffer({
        tenantId,
        category: DocumentCategory.LEGAL,
        originalName: fileName,
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      });

      const document = await prisma.$transaction(async (tx) => {
        const d = await tx.document.create({
          data: {
            tenant_id: tenantId,
            title,
            category: DocumentCategory.LEGAL,
            description,
            file_original_name: stored.originalName,
            file_storage_path: stored.relativePath,
            mime_type: stored.mimeType,
            size_bytes: stored.sizeBytes,
            current_version: 1,
            created_by_user_id: params.actorUserId ?? null,
          },
        });

        await tx.documentVersion.create({
          data: {
            document_id: d.id,
            version: 1,
            file_original_name: stored.originalName,
            file_storage_path: stored.relativePath,
            mime_type: stored.mimeType,
            size_bytes: stored.sizeBytes,
            created_by_user_id: params.actorUserId ?? null,
          },
        });

        await tx.documentActivity.create({
          data: {
            document_id: d.id,
            action: DocumentAction.UPLOAD,
            actor_user_id: params.actorUserId ?? null,
            actor_tenant_id: tenantId,
          },
        });

        return d;
      });

      return document;
    } finally {
      try {
        if (browser) await browser.close();
      } catch {}
    }
  }

  async updateMetadata(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    documentId: string;
    title?: string | null;
    category?: unknown;
    description?: string | null;
  }) {
    const where: any = { id: params.documentId };
    if (!params.isSuperAdmin || params.tenantId) {
      where.tenant_id = params.tenantId ?? null;
    }

    const existing = await prisma.document.findFirst({ where });
    if (!existing) {
      const error = new Error('Dokumen tidak ditemukan');
      (error as any).statusCode = 404;
      throw error;
    }

    const data: any = {};
    if (typeof params.title !== 'undefined') {
      const title = String(params.title || '').trim();
      if (!title) {
        const error = new Error('title wajib diisi');
        (error as any).statusCode = 400;
        throw error;
      }
      data.title = title;
    }
    if (typeof params.description !== 'undefined') {
      data.description = params.description === null ? null : String(params.description);
    }
    if (typeof params.category !== 'undefined') {
      const category = parseCategory(params.category);
      if (category === DocumentCategory.BILLING) {
        const error = new Error('Kategori BILLING tidak didukung di Document Center');
        (error as any).statusCode = 400;
        throw error;
      }
      data.category = category;
    }

    const updated = await prisma.document.update({
      where: { id: existing.id },
      data,
    });

    return updated;
  }

  async softDelete(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    documentId: string;
    actorUserId: string | null | undefined;
  }) {
    const where: any = { id: params.documentId };
    if (!params.isSuperAdmin || params.tenantId) {
      where.tenant_id = params.tenantId ?? null;
    }

    const document = await prisma.document.findFirst({ where });
    if (!document) {
      const error = new Error('Dokumen tidak ditemukan');
      (error as any).statusCode = 404;
      throw error;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.document.update({
        where: { id: document.id },
        data: { is_active: false },
      });

      await tx.documentActivity.create({
        data: {
          document_id: document.id,
          action: DocumentAction.DELETE,
          actor_user_id: params.actorUserId ?? null,
          actor_tenant_id: params.tenantId ?? null,
        },
      });

      return d;
    });

    return updated;
  }

  async listActivities(params: {
    tenantId: string | null | undefined;
    isSuperAdmin: boolean;
    query: any;
  }) {
    const page = Math.max(1, Number(params.query?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.query?.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (!params.isSuperAdmin || params.tenantId) {
      where.actor_tenant_id = params.tenantId ?? null;
    } else if (params.query?.tenant_id) {
      where.actor_tenant_id = String(params.query.tenant_id);
    }

    if (params.query?.document_id) {
      where.document_id = String(params.query.document_id);
    }
    if (params.query?.actor_user_id) {
      where.actor_user_id = String(params.query.actor_user_id);
    }
    const action = params.query?.action ? parseAction(params.query.action) : null;
    if (action) {
      where.action = action;
    }

    const dateFrom = parseDate(params.query?.date_from);
    const dateTo = parseDate(params.query?.date_to);
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = dateFrom;
      if (dateTo) where.created_at.lte = dateTo;
    }

    const [total, items] = await prisma.$transaction([
      prisma.documentActivity.count({ where }),
      prisma.documentActivity.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          document_id: true,
          action: true,
          actor_user_id: true,
          actor_tenant_id: true,
          created_at: true,
          Document: {
            select: {
              id: true,
              title: true,
              category: true,
              tenant_id: true,
            },
          },
          ActorUser: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
