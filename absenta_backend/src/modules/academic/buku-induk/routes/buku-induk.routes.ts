import { bukuIndukController } from '../controllers/buku-induk.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';

export async function bukuIndukRoutes(fastify: any) {
  // GET /buku-induk → getList
  fastify.get(
    '/buku-induk',
    {
      preHandler: [
        requireCapability(['academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    bukuIndukController.getList.bind(bukuIndukController)
  );

  // GET /buku-induk/:siswaId → getDetail
  fastify.get(
    '/buku-induk/:siswaId',
    {
      preHandler: [
        requireCapability(['academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    bukuIndukController.getDetail.bind(bukuIndukController)
  );

  // GET /buku-klapper → getKlapper
  fastify.get(
    '/buku-klapper',
    {
      preHandler: [
        requireCapability(['academic.students.view.list']),
        organizationalScopeMiddleware,
      ],
    },
    bukuIndukController.getKlapper.bind(bukuIndukController)
  );
}
