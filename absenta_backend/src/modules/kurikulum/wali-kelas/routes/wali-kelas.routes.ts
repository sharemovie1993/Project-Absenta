import { waliKelasController } from '../controllers/wali-kelas.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export async function waliKelasRoutes(fastify: any) {
  fastify.get('/struktur', {
    preHandler: [
      requireCapability(['academic.homeroom.manage', 'academic.structures.view.list', 'academic.classes.view.list', 'academic.teaching.view', 'academic.teachers.view.list', 'dashboard.view.guru']),
      organizationalScopeMiddleware,
      determineDataScope(),
  ],
    handler: waliKelasController.getStrukturAssignments
  });

  fastify.post('/struktur/assign', {
    preHandler: [
      requireCapability('academic.homeroom.manage'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ],
    handler: waliKelasController.assignStrukturWaliKelas
  });

  fastify.put('/struktur/:id/nonaktif', {
    preHandler: [
      requireCapability('academic.homeroom.manage'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ],
    handler: waliKelasController.nonaktifStrukturAssignment
  });

  fastify.get('/by-siswa/:siswaId', {
    preHandler: [
      requireCapability('academic.homeroom.manage'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ],
    handler: waliKelasController.bySiswa
  });

  // ── SK Wali Kelas Arsip ──
  fastify.post('/sk-arsip', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.saveSkArsip
  });

  fastify.get('/sk-arsip', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.getSkArsipList
  });

  fastify.get('/sk-arsip/:id', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.getSkArsipById
  });

  fastify.delete('/sk-arsip/:id', {
    preHandler: [requireCapability('academic.homeroom.manage'), determineDataScope()],
    handler: waliKelasController.deleteSkArsip
  });

  // ── Jurnal Wali Kelas ──
  fastify.get('/jurnal', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.getJurnal
  });

  fastify.post('/jurnal', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.createJurnal
  });

  fastify.delete('/jurnal/:id', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.deleteJurnal
  });

  // ── Permohonan Izin Siswa ──
  fastify.get('/permohonan-izin', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.getPermohonanIzin
  });

  fastify.post('/permohonan-izin', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.createPermohonanIzin
  });

  fastify.patch('/permohonan-izin/:id/status', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.updatePermohonanIzinStatus
  });

  // ── EWS Per Kelas ──
  fastify.get('/ews', {
    preHandler: [determineDataScope()],
    handler: waliKelasController.getEwsPerKelas
  });
}

