import { RaporController } from '../controllers/rapor.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function raporRoutes(fastify: any) {
  fastify.post('/', { preHandler: [requireCapability('academic.manage.wali.kelas'), determineDataScope()]}, RaporController.upsert);
  fastify.get('/detail', { preHandler: [requireCapability('academic.view.wali.kelas'), determineDataScope()]}, RaporController.getDetail);
  fastify.get('/leger', { preHandler: [requireCapability('academic.view.wali.kelas'), determineDataScope()]}, RaporController.getLeger);
  fastify.get('/leger/export', { preHandler: [requireCapability('academic.view.wali.kelas'), determineDataScope()]}, RaporController.exportLeger);
  fastify.get('/transkrip', { preHandler: [requireCapability('academic.view.wali.kelas'), determineDataScope()]}, RaporController.getTranskrip);
}
