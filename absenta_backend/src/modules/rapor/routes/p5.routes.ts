import { P5Controller } from '../controllers/p5.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';
import { RoleName } from '../../../constants/enums';

export default async function p5Routes(fastify: any) {
  // Projek Master (Kurikulum level)
  fastify.post('/projek', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.createProjek);
  fastify.get('/projek/my-projects', { preHandler: [requireCapability(['academic.teaching.view', 'academic.homeroom.manage', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.getMyProjects);
  fastify.put('/projek/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.updateProjek);
  fastify.get('/projek', { preHandler: [requireCapability(['academic.subjects.view.list', 'academic.teaching.view', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.getProjek);
  fastify.delete('/projek/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, P5Controller.deleteProjek);

  // Tim Fasilitator Projek
  fastify.get('/projek/:id/fasilitator', { preHandler: [requireCapability(['academic.manage.academic', 'academic.teaching.view', 'dashboard.view.kepsek'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.getFasilitator);
  fastify.post('/projek/:id/fasilitator', { preHandler: [requireCapability(['academic.manage.academic', 'dashboard.view.kepsek']), determineDataScope()]}, P5Controller.upsertFasilitator);
  fastify.delete('/projek/:id/fasilitator/:guru_id', { preHandler: [requireCapability(['academic.manage.academic', 'dashboard.view.kepsek']), determineDataScope()]}, P5Controller.removeFasilitator);

  // Nilai Projek (Guru / Wali Kelas / Kurikulum level)
  fastify.post('/nilai', { preHandler: [requireCapability(['academic.teaching.view', 'academic.homeroom.manage', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.upsertNilai);
  fastify.post('/nilai/bulk', { preHandler: [requireCapability(['academic.teaching.view', 'academic.homeroom.manage', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.upsertBulkNilai);
  fastify.get('/nilai', { preHandler: [requireCapability(['academic.teaching.view', 'academic.homeroom.manage', 'academic.manage.academic'], { exemptRoles: [RoleName.GURU] }), determineDataScope()]}, P5Controller.getNilai);
}
