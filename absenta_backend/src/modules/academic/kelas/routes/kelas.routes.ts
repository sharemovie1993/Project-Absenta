import { kelasController } from '../controllers/kelas.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';
import { RoleName } from '../../../../constants/enums';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function kelasRoutes(fastify: any) {
  // GET /kelas/export - Export kelas to Excel
  fastify.get('/export', {
    preHandler: [
      requireCapability('academic.structures.view.list'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, async (request: any, reply: any) => {
    return kelasController.exportToExcel(request, reply);
  });

  // GET /kelas/import/template - Get import template
  fastify.get('/import/template', {
    preHandler: [
      requireCapability('academic.structures.create'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, async (request: any, reply: any) => {
    return kelasController.getImportTemplate(request, reply);
  });

  // POST /kelas/import - Import kelas from Excel
  fastify.post('/import', {
    preHandler: [
      requireCapability('academic.structures.create'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, async (request: any, reply: any) => {
    return kelasController.importFromExcel(request, reply);
  });

  // GET /kelas - Get all kelas
  fastify.get('/', {
    preHandler: [
      requireCapability('academic.structures.view.list', { exemptRoles: [RoleName.SISWA] }),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, async (request: any, reply: any) => {
    return kelasController.getAllKelas(request, reply);
  });

  // GET /kelas/:id - Get kelas by ID
  fastify.get('/:id', {
    preHandler: [
      requireCapability('academic.structures.view.detail', { exemptRoles: [RoleName.SISWA] }),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, async (request: any, reply: any) => {
    return kelasController.getKelasById(request, reply);
  });

  // POST /kelas - Create new kelas
  fastify.post('/', {
    preHandler: [
      requireCapability('academic.structures.create'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, async (request: any, reply: any) => {
    return kelasController.createKelas(request, reply);
  });

  // PUT /kelas/:id - Update kelas
  fastify.put('/:id', {
    preHandler: [
      requireCapability('academic.structures.update'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, async (request: any, reply: any) => {
    return kelasController.updateKelas(request, reply);
  });

  // DELETE /kelas/:id - Delete kelas
  fastify.delete('/:id', {
    preHandler: [
      requireCapability('academic.structures.delete'),
      organizationalScopeMiddleware,
      determineDataScope(),
  ]
  }, async (request: any, reply: any) => {
    return kelasController.deleteKelas(request, reply);
  });
}
