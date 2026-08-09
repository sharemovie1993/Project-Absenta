import { P5Controller } from '../controllers/p5.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function p5Routes(fastify: any) {
  // Projek Master (Kurikulum level)
  fastify.post('/projek', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.createProjek);
  fastify.put('/projek/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.updateProjek);
  fastify.get('/projek', { preHandler: [requireCapability('academic.subjects.view.list'), determineDataScope()]}, P5Controller.getProjek);
  fastify.delete('/projek/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.deleteProjek);

  // Nilai Projek (Guru / KBM level)
  fastify.post('/nilai', { preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()]}, P5Controller.upsertNilai);
  fastify.post('/nilai/bulk', { preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()]}, P5Controller.upsertBulkNilai);
  fastify.get('/nilai', { preHandler: [requireCapability('academic.teaching.view'), determineDataScope()]}, P5Controller.getNilai);
}
