import { activityLogController } from '../controllers/activity-log.controller';
import { requireCapability } from '@/middlewares/requireCapability';

export async function activityLogRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [
      requireCapability('core.sekolah.view.profile')
    ]
  }, async (request: any, reply: any) => {
    return activityLogController.getTenantLogs(request, reply);
  });
}
export default activityLogRoutes;
