import { BastIjazahController } from '../controllers/bast-ijazah.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';
import {
  updateClearanceSchema,
  previewBebasAdministrasiSchema,
  previewBastSchema,
  issueBastSchema,
  getBukuEkspedisiSchema,
} from '../services/bast-ijazah.schema';

export async function bastIjazahRoutes(fastify: any) {
  // ─── 1. GET /status-clearance/:siswaId ─────────────────────────────────────
  fastify.get(
    '/status-clearance/:siswaId',
    {
      preHandler: [
        requireCapability(['academic.students.view.list', 'academic.transitions.manage']),
        organizationalScopeMiddleware,
      ],
    },
    BastIjazahController.getStatusClearance
  );

  // ─── 2. POST /update-clearance ─────────────────────────────────────────────
  fastify.post(
    '/update-clearance',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'academic.students.manage']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = updateClearanceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data update clearance tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return BastIjazahController.updateClearance(request, reply);
    }
  );

  // ─── 3. POST /preview-bebas-administrasi ───────────────────────────────────
  fastify.post(
    '/preview-bebas-administrasi',
    {
      preHandler: [
        requireCapability(['academic.students.view.list', 'correspondence.outbox.create']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = previewBebasAdministrasiSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data permohonan surat bebas administrasi tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return BastIjazahController.previewBebasAdministrasi(request, reply);
    }
  );

  // ─── 4. POST /preview-bast ─────────────────────────────────────────────────
  fastify.post(
    '/preview-bast',
    {
      preHandler: [
        requireCapability(['academic.students.view.list', 'correspondence.outbox.create']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = previewBastSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data permohonan pratinjau BAST tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return BastIjazahController.previewBast(request, reply);
    }
  );

  // ─── 5. POST /issue-bast ───────────────────────────────────────────────────
  fastify.post(
    '/issue-bast',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'academic.students.manage', 'correspondence.outbox.create']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = issueBastSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data penerbitan BAST tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return BastIjazahController.issueBast(request, reply);
    }
  );

  // ─── 6. GET /buku-ekspedisi ────────────────────────────────────────────────
  fastify.get(
    '/buku-ekspedisi',
    {
      preHandler: [
        requireCapability(['academic.students.view.list', 'academic.transitions.manage']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getBukuEkspedisiSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter query buku ekspedisi tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.query = parsed.data;
      return BastIjazahController.getBukuEkspedisi(request, reply);
    }
  );
}
