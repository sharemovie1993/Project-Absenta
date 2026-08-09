import { NilaiController } from '../controllers/nilai.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function nilaiRoutes(fastify: any) {
  // Jenis Penilaian Master (Admin / Kurikulum level)
  fastify.get('/jenis', { preHandler: [requireCapability('academic.subjects.view.list'), determineDataScope()]}, NilaiController.getAllJenis);
  fastify.post('/jenis', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, NilaiController.createJenis);
  fastify.put('/jenis/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, NilaiController.updateJenis);
  fastify.delete('/jenis/:id', { preHandler: [requireCapability('academic.manage.academic'), determineDataScope()]}, NilaiController.deleteJenis);

  // Nilai Siswa (Guru level / KBM)
  fastify.get('/', { preHandler: [requireCapability('academic.teaching.view'), determineDataScope()]}, NilaiController.getNilai);
  fastify.post('/', { preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()]}, NilaiController.upsertNilai);
  fastify.post('/bulk', { preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()]}, NilaiController.upsertBulkNilai);
  fastify.post('/sumatif-batch', { preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()]}, NilaiController.upsertBatchSumatif);
  fastify.get('/export-erafor', { preHandler: [requireCapability('academic.teaching.view'), determineDataScope()]}, NilaiController.exportErapor);
  fastify.get('/export-erapor-kemendikbud', { preHandler: [requireCapability('academic.teaching.view'), determineDataScope()]}, NilaiController.exportEraporKemendikbud);
  fastify.get('/progress', { preHandler: [requireCapability('academic.teaching.view'), determineDataScope()]}, NilaiController.getTeacherProgress);
  fastify.post('/import', { preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()]}, NilaiController.importNilai);
  fastify.get('/import/template', { preHandler: [requireCapability('academic.teaching.view'), determineDataScope()]}, NilaiController.downloadTemplate);
}
