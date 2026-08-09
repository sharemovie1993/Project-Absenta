import { SupervisiController } from '../controllers/supervisi.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function supervisiRoutes(fastify: any) {
  fastify.post('/', { preHandler: [requireCapability('curriculum.supervision.create.record'), determineDataScope()]}, SupervisiController.create);
  fastify.put('/:id', { preHandler: [requireCapability('curriculum.supervision.update.record'), determineDataScope()]}, SupervisiController.update);
  fastify.delete('/:id', { preHandler: [requireCapability('curriculum.supervision.delete.record'), determineDataScope()]}, SupervisiController.delete);
  fastify.get('/analytics', { preHandler: [requireCapability('curriculum.supervision.view.report'), determineDataScope()]}, SupervisiController.getAnalytics);
  fastify.get('/rekomendasi', { preHandler: [requireCapability('curriculum.supervision.create.record'), determineDataScope()]}, SupervisiController.getRecommendations);
  fastify.put('/:id/self-assessment', { preHandler: [requireCapability('curriculum.supervision.view.schedule'), determineDataScope()]}, SupervisiController.submitSelfAssessment);
  fastify.get('/', { preHandler: [requireCapability('curriculum.supervision.view.schedule'), determineDataScope()]}, SupervisiController.getAll);
  fastify.get('/:id', { preHandler: [requireCapability('curriculum.supervision.view.report'), determineDataScope()]}, SupervisiController.getById);
}
