import { RaporController } from '../controllers/rapor.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function raporRoutes(fastify: any) {
  fastify.post('/', { preHandler: requireCapability('academic.manage.wali.kelas') }, RaporController.upsert);
  fastify.get('/detail', { preHandler: requireCapability('academic.view.wali.kelas') }, RaporController.getDetail);
  fastify.get('/leger', { preHandler: requireCapability('academic.view.wali.kelas') }, RaporController.getLeger);
  fastify.get('/leger/export', { preHandler: requireCapability('academic.view.wali.kelas') }, RaporController.exportLeger);
  fastify.get('/transkrip', { preHandler: requireCapability('academic.view.wali.kelas') }, RaporController.getTranskrip);
}
