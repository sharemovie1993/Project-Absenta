import { RoleName } from '../../../constants/enums';
import { DocumentsService } from '../services/documents.service';
import { enqueueMouPdfGeneration, waitForMouPdfJobResult } from '../mou-pdf.queue';

const documentsService = new DocumentsService();

function normalizeFileNameForHeader(fileName: string) {
  const cleaned = String(fileName || '').replace(/["\\r\\n]/g, '_').trim();
  return cleaned || 'document';
}

function resolveRequestIp(request: any): string {
  const forwarded = request?.headers?.['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = String(raw || '').split(',')[0].trim();
  if (first) return first;
  return String(request?.ip || '').trim();
}

export const documentsController = {
  async upload(request: any, reply: any) {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, message: 'File wajib diupload' });
    }

    const getFieldValue = (field: any) => {
      if (!field) return undefined;
      if (typeof field === 'object' && 'value' in field) return field.value;
      return field;
    };

    const title = String(getFieldValue(file.fields?.title) || file.filename || 'Dokumen').trim();
    const category = getFieldValue(file.fields?.category) || 'LEGAL';
    const description = getFieldValue(file.fields?.description);

    const document = await documentsService.upload({
      tenantId: request.tenantId,
      actorUserId: request.user?.id,
      title,
      category,
      description: typeof description === 'undefined' ? null : String(description),
      file,
    });

    return reply.status(201).send({
      success: true,
      message: 'Dokumen berhasil diupload',
      data: document,
    });
  },

  async generateMou(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const body = request.body || {};
    const tenantId = request.tenantId;

    const document = await (async () => {
      try {
        const resolvedTenantId = String(tenantId || '').trim();
        if (!resolvedTenantId) {
          throw new Error('tenant_id wajib diisi');
        }
        const job = await enqueueMouPdfGeneration(
          {
            tenantId: resolvedTenantId,
            actorUserId: request.user?.id,
            title: typeof body.title === 'undefined' ? undefined : body.title,
            description: typeof body.description === 'undefined' ? undefined : body.description,
            tanggal: typeof body.tanggal === 'undefined' ? undefined : body.tanggal,
            nomor: typeof body.nomor === 'undefined' ? undefined : body.nomor,
            pihak_kedua_nama: typeof body.pihak_kedua_nama === 'undefined' ? undefined : body.pihak_kedua_nama,
            pihak_kedua_alamat: typeof body.pihak_kedua_alamat === 'undefined' ? undefined : body.pihak_kedua_alamat,
          },
          { priority: 1 }
        );
        const waitMs = (() => {
          const raw = parseInt(String(process.env.MOU_PDF_WAIT_MS || '').trim() || '');
          return Number.isFinite(raw) && raw > 0 ? raw : 30000;
        })();
        return await waitForMouPdfJobResult(job, waitMs);
      } catch {}
      return await documentsService.generateMouPdfDocument({
        tenantId,
        isSuperAdmin,
        actorUserId: request.user?.id,
        title: typeof body.title === 'undefined' ? undefined : body.title,
        description: typeof body.description === 'undefined' ? undefined : body.description,
        tanggal: typeof body.tanggal === 'undefined' ? undefined : body.tanggal,
        nomor: typeof body.nomor === 'undefined' ? undefined : body.nomor,
        pihak_kedua_nama: typeof body.pihak_kedua_nama === 'undefined' ? undefined : body.pihak_kedua_nama,
        pihak_kedua_alamat: typeof body.pihak_kedua_alamat === 'undefined' ? undefined : body.pihak_kedua_alamat,
      });
    })();

    return reply.status(201).send({
      success: true,
      message: 'MoU berhasil digenerate',
      data: document,
    });
  },

  async list(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const allowedCategories = request.documentCenterAllowedCategories ?? null;
    const result = await documentsService.list({
      tenantId: request.tenantId,
      isSuperAdmin,
      allowedCategories,
      query: request.query,
    });

    return reply.send({
      success: true,
      message: 'OK',
      data: result.items,
      pagination: result.pagination,
    });
  },

  async listActivities(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const result = await documentsService.listActivities({
      tenantId: request.tenantId,
      isSuperAdmin,
      query: request.query,
    });

    return reply.send({
      success: true,
      message: 'OK',
      data: result.items,
      pagination: result.pagination,
    });
  },

  async download(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const { id } = request.params as any;
    const allowedCategories = request.documentCenterAllowedCategories ?? null;

    const { document, stream } = await documentsService.getForDownload({
      tenantId: request.tenantId,
      isSuperAdmin,
      allowedCategories,
      documentId: String(id),
      actorUserId: request.user?.id,
    });

    reply.header('Content-Type', document.mime_type);
    reply.header('Content-Disposition', `attachment; filename="${normalizeFileNameForHeader(document.file_original_name)}"`);
    return reply.send(stream);
  },

  async createSignedDownloadUrl(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const { id } = request.params as any;
    const allowedCategories = request.documentCenterAllowedCategories ?? null;
    const ip = resolveRequestIp(request);
    const userAgent = String(request?.headers?.['user-agent'] || '');
    const version = typeof request.query?.version === 'undefined' ? undefined : Number(request.query.version);

    const result = await documentsService.createSignedDownloadToken({
      tenantId: request.tenantId,
      isSuperAdmin,
      allowedCategories,
      documentId: String(id),
      actorUserId: request.user?.id,
      version,
      ip,
      userAgent,
    });

    return reply.send({
      success: true,
      message: 'OK',
      data: result,
    });
  },

  async listVersions(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const { id } = request.params as any;
    const allowedCategories = request.documentCenterAllowedCategories ?? null;

    const result = await documentsService.listVersions({
      tenantId: request.tenantId,
      isSuperAdmin,
      allowedCategories,
      documentId: String(id),
    });

    return reply.send({
      success: true,
      message: 'OK',
      data: result.items,
    });
  },

  async uploadVersion(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const { id } = request.params as any;

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, message: 'File wajib diupload' });
    }

    const document = await documentsService.uploadNewVersion({
      tenantId: request.tenantId,
      isSuperAdmin,
      documentId: String(id),
      actorUserId: request.user?.id,
      file,
    });

    return reply.status(201).send({
      success: true,
      message: 'Versi dokumen berhasil diupload',
      data: document,
    });
  },

  async publicDownload(request: any, reply: any) {
    const { token } = request.params as any;
    const ip = resolveRequestIp(request);
    const userAgent = String(request?.headers?.['user-agent'] || '');

    const { document, stream } = await documentsService.getForSignedTokenDownload({
      token: String(token),
      ip,
      userAgent,
    });

    reply.header('Content-Type', document.mime_type);
    reply.header('Content-Disposition', `attachment; filename="${normalizeFileNameForHeader(document.file_original_name)}"`);
    return reply.send(stream);
  },

  async updateMetadata(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const { id } = request.params as any;
    const { title, category, description } = request.body || {};

    const document = await documentsService.updateMetadata({
      tenantId: request.tenantId,
      isSuperAdmin,
      documentId: String(id),
      title,
      category,
      description,
    });

    return reply.send({
      success: true,
      message: 'Dokumen berhasil diupdate',
      data: document,
    });
  },

  async softDelete(request: any, reply: any) {
    const isSuperAdmin = request.user?.roleName === RoleName.SUPERADMIN;
    const { id } = request.params as any;

    const document = await documentsService.softDelete({
      tenantId: request.tenantId,
      isSuperAdmin,
      documentId: String(id),
      actorUserId: request.user?.id,
    });

    return reply.send({
      success: true,
      message: 'Dokumen berhasil dihapus',
      data: document,
    });
  },
};
