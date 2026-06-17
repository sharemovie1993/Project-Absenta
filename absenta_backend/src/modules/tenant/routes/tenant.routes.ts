import { tenantController } from '../controllers/tenant.controller';
import { determineDataScope } from '../../../middlewares/dataScope';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function tenantRoutes(fastify: any) {
  // GET /tenants - Get all tenants (SUPERADMIN sees all, ADMIN sees only their own)
  fastify.get('/', {
    preHandler: [requireCapability('core.tenants.view.list'), determineDataScope()],
    handler: tenantController.getAllTenants.bind(tenantController),
  });

  // GET /tenants/:id - Get tenant by ID (Authenticated users can view their own tenant)
  fastify.get('/:id', {
    preHandler: [
      requireCapability('core.tenants.view.detail'),
      determineDataScope()
    ],
    handler: tenantController.getTenantById.bind(tenantController),
  });

  // POST /tenants - Create a new tenant (only SUPERADMIN)
  fastify.post('/', {
    preHandler: [requireCapability('core.tenants.create'), determineDataScope()],
    handler: tenantController.createTenant.bind(tenantController),
  });

  // PUT /tenants/:id - Update a tenant (SUPERADMIN can update any, ADMIN can update their own)
  fastify.put('/:id', {
    preHandler: [
      requireCapability(['core.tenants.update', 'core.sekolah.update.profile']),
      determineDataScope()
    ],
    handler: tenantController.updateTenant.bind(tenantController),
  });

  // DELETE /tenants/:id - Delete a tenant (only SUPERADMIN)
  fastify.delete('/:id', {
    preHandler: [requireCapability('core.tenants.delete'), determineDataScope()],
    handler: tenantController.deleteTenant.bind(tenantController),
  });

  // POST /tenants/:id/request-deletion - Request deletion (SUPERADMIN or Tenant ADMIN)
  fastify.post('/:id/request-deletion', {
    preHandler: [requireCapability("core.tenants.request.deletion"), determineDataScope()],
    handler: tenantController.requestDeletion.bind(tenantController),
  });

  // POST /tenants/:id/cancel-deletion - Cancel deletion (SUPERADMIN or Tenant ADMIN)
  fastify.post('/:id/cancel-deletion', {
    preHandler: [requireCapability("core.tenants.cancel.deletion"), determineDataScope()],
    handler: tenantController.cancelDeletion.bind(tenantController),
  });
}
