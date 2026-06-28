import { SuratKeluarController } from '../controllers/surat-keluar.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';

export async function suratKeluarRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('correspondence.outbox.view'), organizationalScopeMiddleware]
  }, SuratKeluarController.getAll);

  fastify.get('/:id', {
    preHandler: [requireCapability('correspondence.outbox.view'), organizationalScopeMiddleware]
  }, SuratKeluarController.getById);

  fastify.post('/', {
    preHandler: [requireCapability('correspondence.outbox.manage'), organizationalScopeMiddleware]
  }, SuratKeluarController.create);

  fastify.put('/:id', {
    preHandler: [requireCapability('correspondence.outbox.manage'), organizationalScopeMiddleware]
  }, SuratKeluarController.update);

  fastify.delete('/:id', {
    preHandler: [requireCapability('correspondence.outbox.manage'), organizationalScopeMiddleware]
  }, SuratKeluarController.delete);

  fastify.post('/:id/sign', {
    preHandler: [requireCapability('correspondence.outbox.sign'), organizationalScopeMiddleware]
  }, SuratKeluarController.sign);

  // Public Quick Approval (No login required, secure token validated)
  fastify.get('/quick-approve/:token/detail', {
    config: { skipAuth: true, public: true }
  }, SuratKeluarController.getQuickApproveDetail);

  fastify.post('/quick-approve/:token/approve', {
    config: { skipAuth: true, public: true }
  }, SuratKeluarController.postQuickApprove);

  // Public Parent Letter View (No login required, secure token validated)
  fastify.get('/public-view/:token/detail', {
    config: { skipAuth: true, public: true }
  }, SuratKeluarController.getParentPublicViewDetail);
}