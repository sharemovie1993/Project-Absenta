import { NilaiController } from '../controllers/nilai.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function nilaiRoutes(fastify: any) {
  // Jenis Penilaian Master (Admin / Kurikulum level)
  fastify.get('/jenis', { preHandler: requireCapability('academic.subjects.view.list') }, NilaiController.getAllJenis);
  fastify.post('/jenis', { preHandler: requireCapability('academic.manage.academic') }, NilaiController.createJenis);
  fastify.put('/jenis/:id', { preHandler: requireCapability('academic.manage.academic') }, NilaiController.updateJenis);
  fastify.delete('/jenis/:id', { preHandler: requireCapability('academic.manage.academic') }, NilaiController.deleteJenis);

  // Nilai Siswa (Guru level / KBM)
  fastify.get('/', { preHandler: requireCapability('academic.teaching.view') }, NilaiController.getNilai);
  fastify.post('/', { preHandler: requireCapability('academic.schedules.manage') }, NilaiController.upsertNilai);
  fastify.post('/bulk', { preHandler: requireCapability('academic.schedules.manage') }, NilaiController.upsertBulkNilai);
  fastify.post('/sumatif-batch', { preHandler: requireCapability('academic.schedules.manage') }, NilaiController.upsertBatchSumatif);
  fastify.get('/export-erafor', { preHandler: requireCapability('academic.teaching.view') }, NilaiController.exportErapor);
  fastify.get('/export-erapor-kemendikbud', { preHandler: requireCapability('academic.teaching.view') }, NilaiController.exportEraporKemendikbud);
  fastify.get('/progress', { preHandler: requireCapability('academic.teaching.view') }, NilaiController.getTeacherProgress);
  fastify.post('/import', { preHandler: requireCapability('academic.schedules.manage') }, NilaiController.importNilai);
  fastify.get('/import/template', { preHandler: requireCapability('academic.teaching.view') }, NilaiController.downloadTemplate);
}
