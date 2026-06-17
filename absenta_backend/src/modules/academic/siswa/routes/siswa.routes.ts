import { siswaController } from '../controllers/siswa.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';
import { RoleName } from '../../../../constants/enums';

export default async function siswaRoutes(fastify: any) {
  // GET /siswa - Get all siswa (Scoped)
  fastify.get('/', {
    preHandler: [
        requireCapability('academic.students.view.list', { exemptRoles: [RoleName.SISWA] }),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.getAllSiswa(request, reply);
  });

  // GET /siswa/export - Export scoped siswa
  fastify.get('/export', {
    preHandler: [
        requireCapability('academic.students.view.list'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.exportToExcel(request, reply);
  });

  // GET /siswa/:id/history - Get siswa academic history
  fastify.get('/:id/history', {
    preHandler: [
        requireCapability('academic.students.view.history', { exemptRoles: [RoleName.SISWA] }),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.getSiswaHistory(request, reply);
  });

  // GET /siswa/:id - Get siswa by ID
  fastify.get('/:id', {
    preHandler: [
        requireCapability('academic.students.view.detail', { exemptRoles: [RoleName.SISWA] }),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.getSiswaById(request, reply);
  });

  // POST /siswa/:id/send-access - Send Parent App access
  fastify.post('/:id/send-access', {
    preHandler: [
        requireCapability("academic.students.send.access.token"),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.sendParentAccess(request, reply);
  });

  // POST /siswa - Create new siswa
  fastify.post('/', {
    preHandler: [
        requireCapability('academic.students.create'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.createSiswa(request, reply);
  });

  // PUT /siswa/:id - Update siswa
  fastify.put('/:id', {
    preHandler: [
        requireCapability('academic.students.update', { exemptRoles: [RoleName.SISWA] }),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.updateSiswa(request, reply);
  });

  // DELETE /siswa/all - Delete ALL siswa (Bulk)
  fastify.delete('/all', {
    preHandler: [
        requireCapability('academic.students.delete'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.deleteAll(request, reply);
  });

  // DELETE /siswa/:id - Delete siswa
  fastify.delete('/:id', {
    preHandler: [
        requireCapability('academic.students.delete'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.deleteSiswa(request, reply);
  });

  // POST /siswa/bulk-status - Bulk update siswa status
  fastify.post('/bulk-status', {
    preHandler: [
        requireCapability('academic.students.update'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.bulkUpdateStatus(request, reply);
  });

  // GET /siswa/import/template
  fastify.get('/import/template', {
    preHandler: [
        requireCapability('academic.students.create'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.getImportTemplate(request, reply);
  });

  // POST /siswa/import
  fastify.post('/import', {
    preHandler: [
        requireCapability('academic.students.create'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.importFromExcel(request, reply);
  });

  // POST /siswa/:id/rfid/generate
  fastify.post('/:id/rfid/generate', {
    preHandler: [
        requireCapability('academic.students.update'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.generateRfidForSiswa(request, reply);
  });

  // POST /siswa/rfid/generate-bulk
  fastify.post('/rfid/generate-bulk', {
    preHandler: [
        requireCapability('academic.students.update'),
        organizationalScopeMiddleware
    ]
  }, async (request: any, reply: any) => {
    return siswaController.generateRfidBulk(request, reply);
  });

  // POST /siswa/akademik/sync
  fastify.post('/akademik/sync', {
    preHandler: [
        requireCapability('academic.students.update'),
        organizationalScopeMiddleware,
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return siswaController.syncSiswaAkademik(request, reply);
  });

  // POST /siswa/akademik/check-status
  fastify.post('/akademik/check-status', {
    preHandler: [
        requireCapability('academic.students.view.detail', { exemptRoles: [RoleName.SISWA] }),
        organizationalScopeMiddleware,
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return siswaController.checkAcademicStatus(request, reply);
  });

  fastify.get('/akademik/stats', {
    preHandler: [
        requireCapability('academic.students.view.list'),
        organizationalScopeMiddleware,
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return siswaController.getAcademicRegistrationStats(request, reply);
  });
}
