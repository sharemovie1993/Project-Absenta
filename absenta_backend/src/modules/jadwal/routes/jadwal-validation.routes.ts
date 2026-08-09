import { JadwalValidationController } from '../controllers/jadwal-validation.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function jadwalValidationRoutes(fastify: any) {
  fastify.post('/validate', { preHandler: requireCapability('academic.schedules.manage') }, JadwalValidationController.validateConflict);
}
