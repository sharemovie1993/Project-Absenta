import { SuratKeluarController } from '../controllers/surat-keluar.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { organizationalScopeMiddleware } from '../../../middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export async function suratKeluarRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('correspondence.outbox.view'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratKeluarController.getAll);

  fastify.get('/:id', {
    preHandler: [requireCapability('correspondence.outbox.view'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratKeluarController.getById);

  fastify.post('/', {
    preHandler: [requireCapability('correspondence.outbox.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratKeluarController.create);

  fastify.put('/:id', {
    preHandler: [requireCapability('correspondence.outbox.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratKeluarController.update);

  fastify.delete('/:id', {
    preHandler: [requireCapability('correspondence.outbox.manage'), organizationalScopeMiddleware, determineDataScope()]
  }, SuratKeluarController.delete);

  fastify.post('/:id/sign', {
    preHandler: [requireCapability('correspondence.outbox.sign'), organizationalScopeMiddleware, determineDataScope()]
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