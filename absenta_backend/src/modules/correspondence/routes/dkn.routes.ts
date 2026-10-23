import { DknController } from '../controllers/dkn.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';
import {
  getMatriksDknSchema,
  previewSuratPengantarSchema,
  issueSuratPengantarSchema,
  getArsipDknSchema,
} from '../services/dkn.schema';

export async function dknRoutes(fastify: any) {
  // ─── 1. GET /matriks ───────────────────────────────────────────────────────
  fastify.get(
    '/matriks',
    {
      preHandler: [
        requireCapability(['academic.students.view.list', 'academic.transitions.manage']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getMatriksDknSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter filter matriks DKN tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.query = parsed.data;
      return DknController.getMatriks(request, reply);
    }
  );

  // ─── 2. POST /preview-pengantar ────────────────────────────────────────────
  fastify.post(
    '/preview-pengantar',
    {
      preHandler: [
        requireCapability(['academic.students.view.list', 'correspondence.outbox.create', 'academic.transitions.manage']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = previewSuratPengantarSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter pratinjau surat pengantar tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return DknController.previewSuratPengantar(request, reply);
    }
  );

  // ─── 3. POST /issue-pengantar ──────────────────────────────────────────────
  fastify.post(
    '/issue-pengantar',
    {
      preHandler: [
        requireCapability(['academic.transitions.manage', 'correspondence.outbox.create']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = issueSuratPengantarSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter penerbitan surat pengantar tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return DknController.issueSuratPengantar(request, reply);
    }
  );

  // ─── 4. GET /arsip ─────────────────────────────────────────────────────────
  fastify.get(
    '/arsip',
    {
      preHandler: [
        requireCapability(['academic.students.view.list', 'correspondence.outbox.view', 'academic.transitions.manage']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getArsipDknSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter query arsip DKN tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.query = parsed.data;
      return DknController.getArsip(request, reply);
    }
  );
}
