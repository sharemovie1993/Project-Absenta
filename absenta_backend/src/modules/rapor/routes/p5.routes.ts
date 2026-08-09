import { P5Controller } from '../controllers/p5.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function p5Routes(fastify: any) {
  // Projek Master (Kurikulum level)
  fastify.post('/projek', { preHandler: requireCapability('academic.manage.academic') }, P5Controller.createProjek);
  fastify.put('/projek/:id', { preHandler: requireCapability('academic.manage.academic') }, P5Controller.updateProjek);
  fastify.get('/projek', { preHandler: requireCapability('academic.subjects.view.list') }, P5Controller.getProjek);
  fastify.delete('/projek/:id', { preHandler: requireCapability('academic.manage.academic') }, P5Controller.deleteProjek);

  // Nilai Projek (Guru / KBM level)
  fastify.post('/nilai', { preHandler: requireCapability('academic.schedules.manage') }, P5Controller.upsertNilai);
  fastify.post('/nilai/bulk', { preHandler: requireCapability('academic.schedules.manage') }, P5Controller.upsertBulkNilai);
  fastify.get('/nilai', { preHandler: requireCapability('academic.teaching.view') }, P5Controller.getNilai);
}
