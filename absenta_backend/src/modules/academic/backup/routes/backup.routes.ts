
import { backupController } from '../controllers/backup.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';

export async function backupRoutes(fastify: any) {
  fastify.get('/export', {
    preHandler: [
      requireCapability('academic.backups.create'),
      determineDataScope()
    ]
  }, backupController.export);

  fastify.post('/import', {
    preHandler: [
      requireCapability('academic.backups.restore'),
      determineDataScope()
    ]
  }, backupController.import);
}
