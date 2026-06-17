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
}
