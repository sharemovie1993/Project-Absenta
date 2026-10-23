import { SuratKeteranganController } from '../controllers/surat-keterangan.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';
import {
  previewSuratKeteranganSchema,
  issueSuratKeteranganSchema,
  getSuratKeteranganHistorySchema,
} from '../services/surat-keterangan.schema';

export async function suratKeteranganRoutes(fastify: any) {
  // POST /correspondence/surat-keterangan/preview
  fastify.post(
    '/preview',
    {
      preHandler: [
        requireCapability(['correspondence.outbox.create', 'academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = previewSuratKeteranganSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data permohonan pratinjau surat tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return SuratKeteranganController.preview(request, reply);
    }
  );

  // POST /correspondence/surat-keterangan/issue
  fastify.post(
    '/issue',
    {
      preHandler: [
        requireCapability(['correspondence.outbox.create', 'academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = issueSuratKeteranganSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Data penerbitan surat tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.body = parsed.data;
      return SuratKeteranganController.issue(request, reply);
    }
  );

  // GET /correspondence/surat-keterangan/history
  fastify.get(
    '/history',
    {
      preHandler: [
        requireCapability(['correspondence.outbox.create', 'academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getSuratKeteranganHistorySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter riwayat tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.query = parsed.data;
      return SuratKeteranganController.getHistory(request, reply);
    }
  );
}
