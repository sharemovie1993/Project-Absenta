import { SuratMasukController } from '../controllers/surat-masuk.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';

export async function suratMasukRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('correspondence.inbox.view'), organizationalScopeMiddleware]
  }, SuratMasukController.getAll);

  fastify.get('/:id', {
    preHandler: [requireCapability('correspondence.inbox.view'), organizationalScopeMiddleware]
  }, SuratMasukController.getById);

  fastify.post('/', {
    preHandler: [requireCapability('correspondence.inbox.manage'), organizationalScopeMiddleware]
  }, SuratMasukController.create);

  fastify.put('/:id', {
    preHandler: [requireCapability('correspondence.inbox.manage'), organizationalScopeMiddleware]
  }, SuratMasukController.update);

  fastify.delete('/:id', {
    preHandler: [requireCapability('correspondence.inbox.manage'), organizationalScopeMiddleware]
  }, SuratMasukController.delete);

  fastify.post('/:id/disposisi', {
    preHandler: [requireCapability('correspondence.inbox.manage'), organizationalScopeMiddleware]
  }, SuratMasukController.disposisi);
}