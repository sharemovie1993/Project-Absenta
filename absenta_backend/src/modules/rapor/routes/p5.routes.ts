import { P5Controller } from '../controllers/p5.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';
import { RoleName } from '../../../constants/enums';

export default async function p5Routes(fastify: any) {
  // Projek Master (Kurikulum level)
  fastify.post('/projek', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.createProjek);
  fastify.put('/projek/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.updateProjek);
  fastify.get('/projek', { preHandler: [requireCapability(['academic.subjects.view.list', 'academic.teaching.view', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.getProjek);
  fastify.delete('/projek/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.deleteProjek);

  // Nilai Projek (Guru / Wali Kelas / Kurikulum level)
  fastify.post('/nilai', { preHandler: [requireCapability(['academic.teaching.view', 'academic.homeroom.manage', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.upsertNilai);
  fastify.post('/nilai/bulk', { preHandler: [requireCapability(['academic.teaching.view', 'academic.homeroom.manage', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.upsertBulkNilai);
  fastify.get('/nilai', { preHandler: [requireCapability(['academic.teaching.view', 'academic.homeroom.manage', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.getNilai);
}
