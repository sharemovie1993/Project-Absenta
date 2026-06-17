import { userController } from '../controllers/user.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function userRoutes(fastify: any) {
  // PUT /users/me/onboarding - Mark onboarding as completed
  fastify.put('/me/onboarding', {
    preHandler: [requireCapability("core.users.complete.onboarding")],
    handler: userController.completeOnboarding.bind(userController),
  });

  // GET /users - Get all users
  fastify.get('/', {
    preHandler: [requireCapability('core.users.view.list')],
    handler: userController.getAllUsers.bind(userController),
  });

  // POST /users - Create a new user
  fastify.post('/', {
    preHandler: [requireCapability('core.users.create')],
    handler: userController.createUser.bind(userController),
  });

  // PUT /users/:id - Update a user
  fastify.put('/:id', {
    preHandler: [requireCapability('core.users.update')],
    handler: userController.updateUser.bind(userController),
  });

  // DELETE /users/:id - Delete a user
  fastify.delete('/:id', {
    preHandler: [requireCapability('core.users.delete')],
    handler: userController.deleteUser.bind(userController),
  });

  // GET /users/roles - Get all roles
  fastify.get('/roles', {
    preHandler: [requireCapability('core.users.view.roles')],
    handler: userController.getRoles.bind(userController),
  });

  // GET /users/roles/export - Export policies
  fastify.get('/roles/export', {
    preHandler: [requireCapability('core.users.policies.export')],
    handler: userController.exportPolicies.bind(userController),
  });

  // POST /users/roles/import - Import policies
  fastify.post('/roles/import', {
    preHandler: [requireCapability('core.users.policies.import')],
    handler: userController.importPolicies.bind(userController),
  });

  // DELETE /users/roles/policies - Reset policies
  fastify.delete('/roles/policies', {
    preHandler: [requireCapability('core.users.policies.reset')],
    handler: userController.resetPolicies.bind(userController),
  });

  fastify.get('/permissions', {
    preHandler: [requireCapability('core.users.permissions.view')],
    handler: userController.getPermissions.bind(userController),
  });

  fastify.get('/effective-capabilities/:id', {
    preHandler: [requireCapability("core.users.effective.capabilities.view")],
    handler: userController.getEffectiveCapabilities.bind(userController),
  });

  fastify.put('/roles/:id/permissions', {
    preHandler: [requireCapability('core.users.roles.permissions.update')],
    handler: userController.updateRolePermissions.bind(userController),
  });

  fastify.get('/roles/:id', {
    preHandler: [requireCapability('core.users.view.roles')],
    handler: userController.getRoleById.bind(userController),
  });
  
  fastify.post('/roles', {
    preHandler: [requireCapability('core.users.roles.create')],
    handler: userController.createRole.bind(userController),
  });
  
  fastify.put('/roles/:id', {
    preHandler: [requireCapability('core.users.roles.update')],
    handler: userController.updateRole.bind(userController),
  });
  
  fastify.delete('/roles/:id', {
    preHandler: [requireCapability('core.users.roles.delete')],
    handler: userController.deleteRole.bind(userController),
  });

  // PUT /users/me/email - Update own email
  fastify.put('/me/email', {
    preHandler: [requireCapability('core.users.update.email')],
    handler: userController.updateMyEmail.bind(userController),
  });

  fastify.put('/:id/reset-password', {
    preHandler: [requireCapability("core.users.reset.password")],
    handler: userController.resetPassword.bind(userController),
  });
}
