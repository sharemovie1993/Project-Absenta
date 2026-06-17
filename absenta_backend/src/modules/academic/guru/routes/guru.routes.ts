import { guruController } from '../controllers/guru.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../../middlewares/organizationalScope';
import { determineDataScope } from '../../../../middlewares/dataScope';
import { RoleName } from '../../../../constants/enums';

export default async function guruRoutes(fastify: any) {
  // GET /guru - Get all guru
  fastify.get('/', {
    preHandler: [
      requireCapability('academic.teachers.view.list', { exemptRoles: [RoleName.SISWA] }),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.getAllGuru(request, reply);
  });

  // GET /guru/me — Profil guru yang sedang login (HARUS sebelum /:id)
  fastify.get('/me', {
    preHandler: [
      requireCapability('academic.teachers.view.detail', { exemptRoles: [RoleName.GURU] }),
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.getGuruMe(request, reply);
  });

  // GET /guru/:id - Get guru by ID
  fastify.get('/:id', {
    preHandler: [
      requireCapability('academic.teachers.view.detail'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.getGuruById(request, reply);
  });


  // POST /guru - Create new guru
  fastify.post('/', {
    preHandler: [
      requireCapability('academic.teachers.create'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.createGuru(request, reply);
  });

  // PUT /guru/:id - Update guru
  fastify.put('/:id', {
    preHandler: [
      requireCapability('academic.teachers.update', { exemptRoles: [RoleName.GURU] }),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.updateGuru(request, reply);
  });

  // DELETE /guru/:id - Delete guru
  fastify.delete('/:id', {
    preHandler: [
      requireCapability('academic.teachers.delete'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.deleteGuru(request, reply);
  });

  // GET /guru/export - Export Guru to Excel
  fastify.get('/export', {
    preHandler: [
      requireCapability('academic.teachers.view.list'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.exportToExcel(request, reply);
  });

  // GET /guru/import/template - Download Excel import template
  fastify.get('/import/template', {
    preHandler: [
      requireCapability('academic.teachers.create'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.getImportTemplate(request, reply);
  });

  // POST /guru/import - Import Guru from Excel (xlsx)
  fastify.post('/import', {
    preHandler: [
      requireCapability('academic.teachers.create'),
      organizationalScopeMiddleware,
      determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return guruController.importFromExcel(request, reply);
  });
}

