import { uploadController } from '../controllers/upload.controller';
import { requireCapability } from '@/middlewares/requireCapability';

export async function uploadRoutes(fastify: any) {
  fastify.post('/', {
    preHandler: [requireCapability('documents.upload')],
    handler: uploadController.uploadFile
  });
}
