import { uploadController } from '../controllers/upload.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { RoleName } from '../../../../constants/enums';

export async function uploadRoutes(fastify: any) {
  fastify.post('/', {
    preHandler: [requireCapability('documents.upload', { exemptRoles: [RoleName.GURU, RoleName.ADMIN_SEKOLAH, RoleName.STAF, RoleName.SISWA] })],
    handler: uploadController.uploadFile
  });
}
