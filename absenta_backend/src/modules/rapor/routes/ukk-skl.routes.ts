import { UkkSklController } from '../controllers/ukk-skl.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function ukkSklRoutes(fastify: any) {
  // UKK (Uji Kompetensi Keahlian)
  fastify.post('/ukk', { preHandler: requireCapability('academic.manage.academic') }, UkkSklController.upsertUkk);
  fastify.get('/ukk', { preHandler: requireCapability('academic.subjects.view.list') }, UkkSklController.getUkk);
  fastify.delete('/ukk/:id', { preHandler: requireCapability('academic.manage.academic') }, UkkSklController.deleteUkk);

  // SKL (Surat Keterangan Lulus)
  fastify.post('/skl', { preHandler: requireCapability('academic.manage.academic') }, UkkSklController.upsertSkl);
  fastify.get('/skl', { preHandler: requireCapability('academic.students.view.list') }, UkkSklController.getSkl);
  fastify.delete('/skl/:id', { preHandler: requireCapability('academic.manage.academic') }, UkkSklController.deleteSkl);
}
