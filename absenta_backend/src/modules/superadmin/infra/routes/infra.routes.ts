import { InfraController } from '../controllers/infra.controller';
import { requireCapability } from '@/middlewares/requireCapability';

export async function infraRoutes(fastify: any) {
  const infraController = new InfraController();

  fastify.get('/socket/global', {
    preHandler: [requireCapability("superadmin.infra.view.socket.global")],
    handler: infraController.getGlobalStats.bind(infraController),
  });

  fastify.get('/socket/tenants', {
    preHandler: [requireCapability("superadmin.infra.view.socket.tenants")],
    handler: infraController.getTenantStats.bind(infraController),
  });
}
