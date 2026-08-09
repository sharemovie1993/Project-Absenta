import { SuratMasukController } from '../controllers/surat-masuk.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export async function suratMasukRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('correspondence.inbox.view'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratMasukController.getAll);

  fastify.get('/:id', {
    preHandler: [requireCapability('correspondence.inbox.view'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratMasukController.getById);

  fastify.post('/', {
    preHandler: [requireCapability('correspondence.inbox.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratMasukController.create);

  fastify.put('/:id', {
    preHandler: [requireCapability('correspondence.inbox.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratMasukController.update);

  fastify.delete('/:id', {
    preHandler: [requireCapability('correspondence.inbox.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratMasukController.delete);

  fastify.post('/:id/disposisi', {
    preHandler: [requireCapability('correspondence.inbox.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratMasukController.disposisi);
}