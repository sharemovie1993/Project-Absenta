import { JadwalValidationController } from '../controllers/jadwal-validation.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function jadwalValidationRoutes(fastify: any) {
  fastify.post('/validate', { preHandler: [requireCapability('academic.schedules.manage'), determineDataScope()]}, JadwalValidationController.validateConflict);
}
