import { JenisPelanggaranController } from '../controllers/jenis-pelanggaran.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function jenisPelanggaranRoutes(fastify: any) {
  // Use the same capabilities as violations for now, or assume Admin/Kesiswaan access
  fastify.get('/', { preHandler: [requireCapability("affairs.violation.types.view.list"), determineDataScope()]}, JenisPelanggaranController.getAll);
  fastify.post('/', { preHandler: [requireCapability("affairs.violation.types.create"), determineDataScope()]}, JenisPelanggaranController.create);
  fastify.put('/:id', { preHandler: [requireCapability("affairs.violation.types.update"), determineDataScope()]}, JenisPelanggaranController.update);
  fastify.delete('/:id', { preHandler: [requireCapability("affairs.violation.types.delete"), determineDataScope()]}, JenisPelanggaranController.delete);
  
  // Seed endpoint
  fastify.post('/seed', { preHandler: [requireCapability("affairs.violation.types.create"), determineDataScope()]}, JenisPelanggaranController.seedDefaults);
}
