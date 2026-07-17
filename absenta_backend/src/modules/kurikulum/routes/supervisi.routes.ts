import { SupervisiController } from '../controllers/supervisi.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function supervisiRoutes(fastify: any) {
  fastify.post('/', { preHandler: requireCapability('curriculum.supervision.create.record') }, SupervisiController.create);
  fastify.put('/:id', { preHandler: requireCapability('curriculum.supervision.update.record') }, SupervisiController.update);
  fastify.delete('/:id', { preHandler: requireCapability('curriculum.supervision.delete.record') }, SupervisiController.delete);
  fastify.get('/analytics', { preHandler: requireCapability('curriculum.supervision.view.report') }, SupervisiController.getAnalytics);
  fastify.get('/rekomendasi', { preHandler: requireCapability('curriculum.supervision.create.record') }, SupervisiController.getRecommendations);
  fastify.put('/:id/self-assessment', { preHandler: requireCapability('curriculum.supervision.view.schedule') }, SupervisiController.submitSelfAssessment);
  fastify.get('/', { preHandler: requireCapability('curriculum.supervision.view.schedule') }, SupervisiController.getAll);
  fastify.get('/:id', { preHandler: requireCapability('curriculum.supervision.view.report') }, SupervisiController.getById);
}
