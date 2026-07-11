import { PerangkatAjarController } from '../controllers/perangkat-ajar.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function perangkatAjarRoutes(fastify: any) {
  // Guru mengunggah perangkat ajar
  fastify.post('/perangkat', { preHandler: requireCapability('academic.manage.kbm') }, PerangkatAjarController.upload);
  
  // Wakasek Kurikulum memverifikasi / merespon unggahan perangkat ajar
  fastify.post('/perangkat/:id/review', { preHandler: requireCapability('academic.manage.academic') }, PerangkatAjarController.review);
  
  // Mengambil daftar perangkat ajar (staf/guru)
  fastify.get('/perangkat', { preHandler: requireCapability('academic.teaching.view') }, PerangkatAjarController.getList);
  
  // Menghapus perangkat ajar
  fastify.delete('/perangkat/:id', { preHandler: requireCapability('academic.manage.kbm') }, PerangkatAjarController.delete);
}
