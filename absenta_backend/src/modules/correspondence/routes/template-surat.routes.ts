import { TemplateSuratController } from '../controllers/template-surat.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function templateSuratRoutes(fastify: any) {
  // Daftar variabel sistem (referensi untuk UI builder)
  fastify.get('/system-variables', {
    preHandler: [requireCapability('correspondence.template.view')]
  }, TemplateSuratController.getSystemVariables);

  // CRUD Template
  fastify.get('/', {
    preHandler: [requireCapability('correspondence.template.view')]
  }, TemplateSuratController.getAll);

  fastify.get('/:id', {
    preHandler: [requireCapability('correspondence.template.view')]
  }, TemplateSuratController.getById);

  fastify.post('/', {
    preHandler: [requireCapability('correspondence.template.manage')]
  }, TemplateSuratController.create);

  fastify.put('/:id', {
    preHandler: [requireCapability('correspondence.template.manage')]
  }, TemplateSuratController.update);

  fastify.delete('/:id', {
    preHandler: [requireCapability('correspondence.template.manage')]
  }, TemplateSuratController.delete);

  // Render template dengan variabel
  fastify.post('/render', {
    preHandler: [requireCapability('correspondence.template.view')]
  }, TemplateSuratController.render);
}
