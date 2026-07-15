import { jurusanController } from '../controllers/jurusan.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';

export default async function jurusanRoutes(fastify: any) {
  // GET /jurusan/export - Export to Excel
  fastify.get('/export', {
    preHandler: [
        requireCapability('academic.structures.view.list'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.exportToExcel(request, reply);
  });

  // GET /jurusan/import/template - Get import template
  fastify.get('/import/template', {
    preHandler: [
        requireCapability('academic.structures.create'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.getImportTemplate(request, reply);
  });

  // POST /jurusan/import - Import from Excel
  fastify.post('/import', {
    preHandler: [
        requireCapability('academic.structures.create'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.importFromExcel(request, reply);
  });

  // POST /jurusan/bulk-wizard - Bulk create ProgramKeahlian and Jurusan
  fastify.post('/bulk-wizard', {
    preHandler: [
        requireCapability('academic.structures.create'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.bulkWizardCreate(request, reply);
  });

  // GET /jurusan - Get all jurusan
  fastify.get('/', {
    preHandler: [
        requireCapability('academic.structures.view.list'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.getAllJurusan(request, reply);
  });

  // GET /jurusan/:id - Get jurusan by ID
  fastify.get('/:id', {
    preHandler: [
        requireCapability('academic.structures.view.detail'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.getJurusanById(request, reply);
  });

  // POST /jurusan - Create new jurusan
  fastify.post('/', {
    preHandler: [
        requireCapability('academic.structures.create'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.createJurusan(request, reply);
  });

  // PUT /jurusan/:id - Update jurusan
  fastify.put('/:id', {
    preHandler: [
        requireCapability('academic.structures.update'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.updateJurusan(request, reply);
  });

  // DELETE /jurusan/:id - Delete jurusan
  fastify.delete('/:id', {
    preHandler: [
        requireCapability('academic.structures.delete'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.removeJurusan(request, reply);
  });

  // =========================================================================
  // GLOBAL PRESETS (SUPERADMIN ONLY)
  // =========================================================================

  // GET /jurusan/presets - Get all global presets (superadmin or tenant admin)
  fastify.get('/presets', {
    preHandler: [
        requireCapability(['superadmin.tenants.manage', 'academic.structures.create', 'academic.structures.view.list']),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.getGlobalPresets(request, reply);
  });

  // POST /jurusan/presets - Create program preset (superadmin only)
  fastify.post('/presets', {
    preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.createGlobalProgramPreset(request, reply);
  });

  // PUT /jurusan/presets/:id - Update program preset (superadmin only)
  fastify.put('/presets/:id', {
    preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.updateGlobalProgramPreset(request, reply);
  });

  // DELETE /jurusan/presets/:id - Delete program preset (superadmin only)
  fastify.delete('/presets/:id', {
    preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.deleteGlobalProgramPreset(request, reply);
  });

  // POST /jurusan/presets/jurusans - Create child jurusan preset (superadmin only)
  fastify.post('/presets/jurusans', {
    preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.createGlobalJurusanPreset(request, reply);
  });

  // PUT /jurusan/presets/jurusans/:id - Update child jurusan preset (superadmin only)
  fastify.put('/presets/jurusans/:id', {
    preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.updateGlobalJurusanPreset(request, reply);
  });

  // DELETE /jurusan/presets/jurusans/:id - Delete child jurusan preset (superadmin only)
  fastify.delete('/presets/jurusans/:id', {
    preHandler: [
        requireCapability('superadmin.tenants.manage'),
        determineDataScope()
    ]
  }, async (request: any, reply: any) => {
    return jurusanController.deleteGlobalJurusanPreset(request, reply);
  });
}
