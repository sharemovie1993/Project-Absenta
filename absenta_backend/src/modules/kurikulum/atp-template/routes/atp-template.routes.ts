import { atpTemplateController } from '../controllers/atp-template.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function atpTemplateRoutes(fastify: any) {
  const guruExempt = { exemptRoles: ['GURU', 'ADMIN', 'SUPERADMIN', 'KURIKULUM', 'STAFF'] as any[] };

  // ── GET / — List templates (semua guru bisa lihat PUBLISHED; SUPERADMIN lihat semua) ──
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpTemplateController.list(request, reply);
    }
  );

  // ── GET /:id — Detail template ──────────────────────────────────────────────
  fastify.get(
    '/:id',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpTemplateController.getById(request, reply);
    }
  );

  // ── POST / — Buat template baru (SUPERADMIN only) ───────────────────────────
  fastify.post(
    '/',
    {
      preHandler: [
        requireCapability(['superadmin.infra.monitoring.view', 'superadmin.tenants.manage']),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpTemplateController.upsert(request, reply);
    }
  );

  // ── PUT /:id — Update template (SUPERADMIN only) ────────────────────────────
  fastify.put(
    '/:id',
    {
      preHandler: [
        requireCapability(['superadmin.infra.monitoring.view', 'superadmin.tenants.manage']),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpTemplateController.upsert(request, reply);
    }
  );

  // ── PATCH /:id/status — Publish / Unpublish (SUPERADMIN only) ───────────────
  fastify.patch(
    '/:id/status',
    {
      preHandler: [
        requireCapability(['superadmin.infra.monitoring.view', 'superadmin.tenants.manage']),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpTemplateController.setStatus(request, reply);
    }
  );

  // ── DELETE /:id — Hapus template (SUPERADMIN only) ──────────────────────────
  fastify.delete(
    '/:id',
    {
      preHandler: [
        requireCapability(['superadmin.infra.monitoring.view', 'superadmin.tenants.manage']),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpTemplateController.delete(request, reply);
    }
  );

  // ── POST /:id/import — Clone template ke ATP personal guru ──────────────────
  fastify.post(
    '/:id/import',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structures.view.list', 'academic.schedules.manage'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpTemplateController.importTemplate(request, reply);
    }
  );
}
