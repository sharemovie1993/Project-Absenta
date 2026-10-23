import { bukuIndukController } from '../controllers/buku-induk.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';
import {
  getBukuIndukListSchema,
  getKlapperListSchema,
  getBukuIndukDetailSchema,
} from '../services/buku-induk.schema';

export async function bukuIndukRoutes(fastify: any) {
  // GET /buku-induk → getList (Zod validated)
  fastify.get(
    '/buku-induk',
    {
      preHandler: [
        requireCapability(['academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getBukuIndukListSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.query = parsed.data;
      return bukuIndukController.getList(request, reply);
    }
  );

  // GET /buku-induk/:siswaId → getDetail (Zod validated)
  fastify.get(
    '/buku-induk/:siswaId',
    {
      preHandler: [
        requireCapability(['academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getBukuIndukDetailSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'ID siswa tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      return bukuIndukController.getDetail(request, reply);
    }
  );

  // GET /buku-klapper → getKlapper (Zod validated)
  fastify.get(
    '/buku-klapper',
    {
      preHandler: [
        requireCapability(['academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    async (request: any, reply: any) => {
      const parsed = getKlapperListSchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: 'Parameter tidak valid',
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      request.query = parsed.data;
      return bukuIndukController.getKlapper(request, reply);
    }
  );
}
