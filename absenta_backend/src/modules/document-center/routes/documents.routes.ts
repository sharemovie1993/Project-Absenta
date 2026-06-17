import { documentsController } from '../controllers/documents.controller';
import { RoleName } from '../../../constants/enums';
import { requireCapability } from '../../../middlewares/requireCapability';
import { authorizationService } from '../../auth/services/authorization.service';
import { prisma } from '../../../utils/prisma';
import { DocumentCategory } from '@prisma/client';

const CATEGORY_CAPABILITIES: Record<DocumentCategory, string | null> = {
  ADMINISTRATIVE: 'documents.view.list',
  BILLING: null,
  LEGAL: 'documents.view.list',
  MANUAL: 'documents.view.list',
  OTHER: 'documents.view.list',
};

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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((v) => String(v).trim()).filter(Boolean)));
}

async function getAdminEffectiveCapabilities(user: any): Promise<string[]> {
  const userId = String(user?.id || '').trim();
  if (!userId) return [];
  return uniqueStrings(await authorizationService.resolveUserCapabilities(userId, { user }));
}

async function getUserDocumentCapabilities(user: any): Promise<string[]> {
  const roleName = user?.roleName || user?.Role?.name || user?.role?.name;
  if (roleName === RoleName.ADMIN) {
    return await getAdminEffectiveCapabilities(user);
  }
  if (roleName === RoleName.GURU) {
    return await authorizationService.resolveUserCapabilities(String(user.id), { user });
  }
  return [];
}

function resolveAllowedCategoriesFromCapabilities(capabilities: string[]) {
  const allowed: DocumentCategory[] = [];
  (Object.keys(CATEGORY_CAPABILITIES) as Array<keyof typeof CATEGORY_CAPABILITIES>).forEach((category) => {
    const cap = CATEGORY_CAPABILITIES[category];
    if (!cap) return;
    if (capabilities.includes(cap)) {
      allowed.push(category as DocumentCategory);
    }
  });
  return allowed;
}

async function attachAllowedCategories(request: any, reply: any) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  const roleName = user?.roleName || user?.Role?.name || user?.role?.name;
  if (roleName === RoleName.SUPERADMIN) {
    request.documentCenterAllowedCategories = null;
    return;
  }

  const capabilities = await getUserDocumentCapabilities(user);
  const allowedCategories = resolveAllowedCategoriesFromCapabilities(capabilities);
  if (allowedCategories.length === 0) {
    return reply.status(403).send({
      code: 'FORBIDDEN',
      message: 'Forbidden: tidak memiliki capability untuk mengakses Document Center',
    });
  }

  request.documentCenterAllowedCategories = allowedCategories;
}

async function enforceCategoryQuery(request: any, reply: any) {
  const allowed: DocumentCategory[] | null | undefined = request.documentCenterAllowedCategories;
  if (!allowed) return;
  const desired = parseCategoryFilter(request.query?.category);
  if (desired && !allowed.includes(desired)) {
    return reply.status(403).send({
      code: 'FORBIDDEN',
      message: 'Forbidden: kategori dokumen tidak diizinkan',
    });
  }
}

async function enforceDocumentAccessById(request: any, reply: any) {
  const allowed: DocumentCategory[] | null | undefined = request.documentCenterAllowedCategories;
  if (!allowed) return;

  const id = String(request.params?.id || '').trim();
  if (!id) {
    return reply.status(400).send({ code: 'BAD_REQUEST', message: 'document id wajib diisi' });
  }

  const doc = await prisma.document.findFirst({
    where: { id, is_active: true, tenant_id: request.tenantId ?? null },
    select: { id: true, category: true },
  });

  if (!doc) {
    return reply.status(404).send({ code: 'NOT_FOUND', message: 'Dokumen tidak ditemukan' });
  }

  if (!allowed.includes(doc.category)) {
    return reply.status(403).send({ code: 'FORBIDDEN', message: 'Forbidden: kategori dokumen tidak diizinkan' });
  }
}

export async function documentsRoutes(fastify: any) {
  fastify.post('/', {
    preHandler: [requireCapability('documents.upload')],
    handler: documentsController.upload,
  });

  fastify.post('/mou', {
    preHandler: [requireCapability('documents.upload')],
    handler: documentsController.generateMou,
  });

  fastify.get('/', {
    preHandler: [requireCapability('documents.view.list'), attachAllowedCategories, enforceCategoryQuery],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          is_active: { type: ['boolean', 'string'] },
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100 },
        },
      },
    },
    handler: documentsController.list,
  });

  fastify.get('/activities', {
    preHandler: [requireCapability('documents.view.list')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          document_id: { type: 'string' },
          actor_user_id: { type: 'string' },
          action: { type: 'string' },
          date_from: { type: 'string' },
          date_to: { type: 'string' },
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100 },
        },
      },
    },
    handler: documentsController.listActivities,
  });

  fastify.get('/:id/download', {
    preHandler: [requireCapability('documents.view.detail'), attachAllowedCategories, enforceDocumentAccessById],
    handler: documentsController.download,
  });

  fastify.get('/:id/signed-url', {
    preHandler: [requireCapability('documents.view.detail'), attachAllowedCategories, enforceDocumentAccessById],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          version: { type: 'number', minimum: 1 },
        },
      },
    },
    handler: documentsController.createSignedDownloadUrl,
  });

  fastify.get('/:id/versions', {
    preHandler: [requireCapability('documents.view.detail'), attachAllowedCategories, enforceDocumentAccessById],
    handler: documentsController.listVersions,
  });

  fastify.post('/:id/versions', {
    preHandler: [requireCapability('documents.upload')],
    handler: documentsController.uploadVersion,
  });

  fastify.patch('/:id', {
    preHandler: [requireCapability('documents.upload')],
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: { type: 'string' },
          description: { type: ['string', 'null'] },
        },
      },
    },
    handler: documentsController.updateMetadata,
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability('documents.delete')],
    handler: documentsController.softDelete,
  });
}

export async function documentsPublicRoutes(fastify: any) {
  fastify.get('/:token/download', {
    config: { skipAuth: true, public: true },
    handler: documentsController.publicDownload,
  });
}
