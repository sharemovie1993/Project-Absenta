import { waliKelasController } from '../controllers/wali-kelas.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';

export async function waliKelasRoutes(fastify: any) {
  fastify.get('/struktur', {
    preHandler: [
      requireCapability('academic.homeroom.manage'),
      organizationalScopeMiddleware
    ],
    handler: waliKelasController.getStrukturAssignments
  });

  fastify.post('/struktur/assign', {
    preHandler: [
      requireCapability('academic.homeroom.manage'),
      organizationalScopeMiddleware
    ],
    handler: waliKelasController.assignStrukturWaliKelas
  });

  fastify.put('/struktur/:id/nonaktif', {
    preHandler: [
      requireCapability('academic.homeroom.manage'),
      organizationalScopeMiddleware
    ],
    handler: waliKelasController.nonaktifStrukturAssignment
  });

  fastify.get('/by-siswa/:siswaId', {
    preHandler: [
      requireCapability('academic.homeroom.manage'),
      organizationalScopeMiddleware
    ],
    handler: waliKelasController.bySiswa
  });
}
