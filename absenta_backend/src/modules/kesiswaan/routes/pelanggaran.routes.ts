import { PelanggaranController } from '../controllers/pelanggaran.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '../../../middlewares/dataScope';
import { organizationalScopeMiddleware, elevatedScopeMiddleware } from '@/middlewares/organizationalScope';

export async function pelanggaranRoutes(fastify: any) {
  fastify.post('/', { 
    preHandler: [
      requireCapability('affairs.violations.report'),
      elevatedScopeMiddleware // Allow reporting any student
    ] 
  }, PelanggaranController.create);

  fastify.put('/:id', { 
    preHandler: [
      requireCapability('affairs.violations.update'),
      organizationalScopeMiddleware
    ] 
  }, PelanggaranController.update);

  fastify.delete('/:id', { 
    preHandler: [
      requireCapability('affairs.violations.delete'),
      organizationalScopeMiddleware
    ] 
  }, PelanggaranController.delete);

  fastify.get('/', { 
    preHandler: [
      requireCapability('affairs.violations.view.list'), 
      organizationalScopeMiddleware,
      determineDataScope()
    ] 
  }, PelanggaranController.getAll);
  fastify.get('/:id', { 
    preHandler: [
      requireCapability('affairs.violations.view.detail'),
      organizationalScopeMiddleware
    ] 
  }, PelanggaranController.getById);

  fastify.get('/analytics', {
    preHandler: [
      requireCapability('affairs.violations.view.list'),
      organizationalScopeMiddleware
    ]
  }, PelanggaranController.getAnalytics);
}
