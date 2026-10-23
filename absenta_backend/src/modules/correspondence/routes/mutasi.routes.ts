import { MutasiController } from '../controllers/mutasi.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';
import {
  previewMutasiKeluarSchema,
  issueMutasiKeluarSchema,
  previewMutasiMasukSchema,
  issueMutasiMasukSchema,
  getBukuRegisterSchema,
  getAgendaMutasiSchema,
} from '../services/mutasi.schema';

export async function mutasiRoutes(fastify: any) {
  // ─── 1. POST /preview-keluar ───────────────────────────────────────────────
  fastify.post(
    '/preview-keluar',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'academic.students.view.list', 'correspondence.outbox.create']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = previewMutasiKeluarSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data permohonan pratinjau mutasi keluar tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return MutasiController.previewKeluar(request, reply);
    }
  );

  // ─── 2. POST /issue-keluar ─────────────────────────────────────────────────
  fastify.post(
    '/issue-keluar',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'academic.students.manage', 'correspondence.outbox.create']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = issueMutasiKeluarSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data penerbitan surat mutasi keluar tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return MutasiController.issueKeluar(request, reply);
    }
  );

  // ─── 3. POST /preview-masuk ────────────────────────────────────────────────
  fastify.post(
    '/preview-masuk',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'academic.students.view.list', 'correspondence.outbox.create']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = previewMutasiMasukSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data permohonan pratinjau mutasi masuk tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return MutasiController.previewMasuk(request, reply);
    }
  );

  // ─── 4. POST /issue-masuk ──────────────────────────────────────────────────
  fastify.post(
    '/issue-masuk',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'academic.students.manage', 'correspondence.outbox.create']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = issueMutasiMasukSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data penerbitan surat mutasi masuk tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return MutasiController.issueMasuk(request, reply);
    }
  );

  // ─── 5. GET /buku-register ─────────────────────────────────────────────────
  fastify.get(
    '/buku-register',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'academic.students.view.list', 'correspondence.outbox.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getBukuRegisterSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter query buku register mutasi tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.query = parsed.data;
      return MutasiController.getBukuRegister(request, reply);
    }
  );

  // ─── 6. GET /agenda ────────────────────────────────────────────────────────
  fastify.get(
    '/agenda',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'academic.students.view.list', 'correspondence.outbox.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getAgendaMutasiSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter query agenda mutasi tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.query = parsed.data;
      return MutasiController.getAgenda(request, reply);
    }
  );
}
