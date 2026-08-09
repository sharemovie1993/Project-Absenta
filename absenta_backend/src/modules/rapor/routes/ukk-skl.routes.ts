import { UkkSklController } from '../controllers/ukk-skl.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function ukkSklRoutes(fastify: any) {
  // UKK (Uji Kompetensi Keahlian)
  fastify.post('/ukk', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, UkkSklController.upsertUkk);
  fastify.get('/ukk', { preHandler: [requireCapability('academic.subjects.view.list'), determineDataScope()]}, UkkSklController.getUkk);
  fastify.delete('/ukk/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, UkkSklController.deleteUkk);

  // SKL (Surat Keterangan Lulus)
  fastify.post('/skl', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, UkkSklController.upsertSkl);
  fastify.get('/skl', { preHandler: [requireCapability('academic.students.view.list'), determineDataScope()]}, UkkSklController.getSkl);
  fastify.delete('/skl/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, UkkSklController.deleteSkl);
}
