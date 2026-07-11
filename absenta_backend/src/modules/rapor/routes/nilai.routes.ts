import { NilaiController } from '../controllers/nilai.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function nilaiRoutes(fastify: any) {
  // Jenis Penilaian Master (Admin / Kurikulum level)
  fastify.get('/jenis', { preHandler: requireCapability('academic.view.mapel') }, NilaiController.getAllJenis);
  fastify.post('/jenis', { preHandler: requireCapability('academic.manage.academic') }, NilaiController.createJenis);
  fastify.put('/jenis/:id', { preHandler: requireCapability('academic.manage.academic') }, NilaiController.updateJenis);
  fastify.delete('/jenis/:id', { preHandler: requireCapability('academic.manage.academic') }, NilaiController.deleteJenis);

  // Nilai Siswa (Guru level / KBM)
  fastify.get('/', { preHandler: requireCapability('academic.teaching.view') }, NilaiController.getNilai);
  fastify.post('/', { preHandler: requireCapability('academic.manage.kbm') }, NilaiController.upsertNilai);
  fastify.post('/bulk', { preHandler: requireCapability('academic.manage.kbm') }, NilaiController.upsertBulkNilai);
  fastify.get('/export-erafor', { preHandler: requireCapability('academic.teaching.view') }, NilaiController.exportErafor);
  fastify.post('/import', { preHandler: requireCapability('academic.manage.kbm') }, NilaiController.importNilai);
  fastify.get('/import/template', { preHandler: requireCapability('academic.teaching.view') }, NilaiController.downloadTemplate);
}
