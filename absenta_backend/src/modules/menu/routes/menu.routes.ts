import { menuController } from '../controllers/menu.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function menuRoutes(fastify: any) {
  fastify.get('/', { preHandler: [requireCapability('core.menu.view.list'), determineDataScope()] }, async (req: any, reply: any) => menuController.list(req, reply));
  fastify.get('/tree', { preHandler: [requireCapability('core.menu.view.list'), determineDataScope()] }, async (req: any, reply: any) => menuController.tree(req, reply));
  fastify.get('/sidebar', async (req: any, reply: any) => menuController.sidebar(req, reply));
  fastify.get('/audit', { preHandler: [requireCapability('core.menu.audit'), determineDataScope()] }, async (req: any, reply: any) =>
    menuController.auditRequiredCapability(req, reply)
  );
  fastify.get('/:id', { preHandler: [requireCapability('core.menu.view.list'), determineDataScope()] }, async (req: any, reply: any) => menuController.get(req, reply));
  fastify.post('/', { preHandler: [requireCapability('core.menu.create'), determineDataScope()] }, async (req: any, reply: any) => menuController.create(req, reply));
  fastify.put('/:id', { preHandler: [requireCapability('core.menu.update'), determineDataScope()] }, async (req: any, reply: any) => menuController.update(req, reply));
  fastify.delete('/:id', { preHandler: [requireCapability('core.menu.delete'), determineDataScope()] }, async (req: any, reply: any) => menuController.remove(req, reply));

  // Roles management for a menu
  fastify.get('/:id/roles', { preHandler: [requireCapability('core.menu.roles.update'), determineDataScope()] }, async (req: any, reply: any) => menuController.getRoles(req, reply));
  fastify.put('/:id/roles', { preHandler: [requireCapability('core.menu.roles.update'), determineDataScope()] }, async (req: any, reply: any) => menuController.setRoles(req, reply));
}
