import { userController } from '../controllers/user.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function userRoutes(fastify: any) {
  // PUT /users/me/onboarding - Mark onboarding as completed
  fastify.put('/me/onboarding', {
    preHandler: [requireCapability("core.users.complete.onboarding"), determineDataScope()],
    handler: userController.completeOnboarding.bind(userController),
  });

  // GET /users - Get all users
  fastify.get('/', {
    preHandler: [requireCapability('core.users.view.list'), determineDataScope()],
    handler: userController.getAllUsers.bind(userController),
  });

  // POST /users - Create a new user
  fastify.post('/', {
    preHandler: [requireCapability('core.users.create'), determineDataScope()],
    handler: userController.createUser.bind(userController),
  });

  // PUT /users/:id - Update a user
  fastify.put('/:id', {
    preHandler: [requireCapability('core.users.update'), determineDataScope()],
    handler: userController.updateUser.bind(userController),
  });

  // DELETE /users/:id - Delete a user
  fastify.delete('/:id', {
    preHandler: [requireCapability('core.users.delete'), determineDataScope()],
    handler: userController.deleteUser.bind(userController),
  });

  // GET /users/roles - Get all roles
  fastify.get('/roles', {
    preHandler: [requireCapability('core.users.view.roles'), determineDataScope()],
    handler: userController.getRoles.bind(userController),
  });

  // GET /users/roles/export - Export policies
  fastify.get('/roles/export', {
    preHandler: [requireCapability('core.users.policies.export'), determineDataScope()],
    handler: userController.exportPolicies.bind(userController),
  });

  // POST /users/roles/import - Import policies
  fastify.post('/roles/import', {
    preHandler: [requireCapability('core.users.policies.import'), determineDataScope()],
    handler: userController.importPolicies.bind(userController),
  });

  // DELETE /users/roles/policies - Reset policies
  fastify.delete('/roles/policies', {
    preHandler: [requireCapability('core.users.policies.reset'), determineDataScope()],
    handler: userController.resetPolicies.bind(userController),
  });

  fastify.get('/permissions', {
    preHandler: [requireCapability('core.users.permissions.view'), determineDataScope()],
    handler: userController.getPermissions.bind(userController),
  });

  fastify.get('/effective-capabilities/:id', {
    preHandler: [requireCapability("core.users.effective.capabilities.view"), determineDataScope()],
    handler: userController.getEffectiveCapabilities.bind(userController),
  });

  fastify.put('/roles/:id/permissions', {
    preHandler: [requireCapability('core.users.roles.permissions.update'), determineDataScope()],
    handler: userController.updateRolePermissions.bind(userController),
  });

  fastify.get('/roles/:id', {
    preHandler: [requireCapability('core.users.view.roles'), determineDataScope()],
    handler: userController.getRoleById.bind(userController),
  });
  
  fastify.post('/roles', {
    preHandler: [requireCapability('core.users.roles.create'), determineDataScope()],
    handler: userController.createRole.bind(userController),
  });
  
  fastify.put('/roles/:id', {
    preHandler: [requireCapability('core.users.roles.update'), determineDataScope()],
    handler: userController.updateRole.bind(userController),
  });
  
  fastify.delete('/roles/:id', {
    preHandler: [requireCapability('core.users.roles.delete'), determineDataScope()],
    handler: userController.deleteRole.bind(userController),
  });

  // PUT /users/me/email - Update own email
  fastify.put('/me/email', {
    preHandler: [requireCapability('core.users.update.email'), determineDataScope()],
    handler: userController.updateMyEmail.bind(userController),
  });

  fastify.put('/:id/reset-password', {
    preHandler: [requireCapability("core.users.reset.password"), determineDataScope()],
    handler: userController.resetPassword.bind(userController),
  });
}
