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

  // ── SK Wali Kelas Arsip ──
  fastify.post('/sk-arsip', {
    handler: waliKelasController.saveSkArsip
  });

  fastify.get('/sk-arsip', {
    handler: waliKelasController.getSkArsipList
  });

  fastify.get('/sk-arsip/:id', {
    handler: waliKelasController.getSkArsipById
  });

  fastify.delete('/sk-arsip/:id', {
    preHandler: [requireCapability('academic.homeroom.manage')],
    handler: waliKelasController.deleteSkArsip
  });
}
