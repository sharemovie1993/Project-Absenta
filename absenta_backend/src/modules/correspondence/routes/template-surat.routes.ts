import { TemplateSuratController } from '../controllers/template-surat.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function templateSuratRoutes(fastify: any) {
  // Daftar variabel sistem (referensi untuk UI builder)
  fastify.get('/system-variables', {
    preHandler: [requireCapability('correspondence.template.view'), determineDataScope()]
  }, TemplateSuratController.getSystemVariables);

  // CRUD Template
  fastify.get('/', {
    preHandler: [requireCapability('correspondence.template.view'), determineDataScope()]
  }, TemplateSuratController.getAll);

  fastify.get('/:id', {
    preHandler: [requireCapability('correspondence.template.view'), determineDataScope()]
  }, TemplateSuratController.getById);

  fastify.post('/', {
    preHandler: [requireCapability('correspondence.template.manage'), determineDataScope()]
  }, TemplateSuratController.create);

  fastify.put('/:id', {
    preHandler: [requireCapability('correspondence.template.manage'), determineDataScope()]
  }, TemplateSuratController.update);

  fastify.delete('/:id', {
    preHandler: [requireCapability('correspondence.template.manage'), determineDataScope()]
  }, TemplateSuratController.delete);

  // Render template dengan variabel
  fastify.post('/render', {
    preHandler: [requireCapability('correspondence.template.view'), determineDataScope()]
  }, TemplateSuratController.render);
}
