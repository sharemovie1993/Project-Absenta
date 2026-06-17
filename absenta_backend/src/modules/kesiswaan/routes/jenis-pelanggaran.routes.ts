import { JenisPelanggaranController } from '../controllers/jenis-pelanggaran.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function jenisPelanggaranRoutes(fastify: any) {
  // Use the same capabilities as violations for now, or assume Admin/Kesiswaan access
  fastify.get('/', { preHandler: requireCapability("affairs.violation.types.view.list") }, JenisPelanggaranController.getAll);
  fastify.post('/', { preHandler: requireCapability("affairs.violation.types.create") }, JenisPelanggaranController.create);
  fastify.put('/:id', { preHandler: requireCapability("affairs.violation.types.update") }, JenisPelanggaranController.update);
  fastify.delete('/:id', { preHandler: requireCapability("affairs.violation.types.delete") }, JenisPelanggaranController.delete);
  
  // Seed endpoint
  fastify.post('/seed', { preHandler: requireCapability("affairs.violation.types.create") }, JenisPelanggaranController.seedDefaults);
}
