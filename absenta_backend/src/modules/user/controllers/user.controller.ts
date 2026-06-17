import { userService, CreateUserInput, UpdateUserInput } from '../services/user.service';
import { RoleName } from '../../../constants/enums';

export const userController = {
  async getAllUsers(request: any, reply: any) {
    try {
      const user = request.user!;
      // const scope = request.dataScope; // scope not used here yet, keeping existing logic
      // Authorization handled by middleware

      const { page = 1, limit = 10, search = '', role = '', status = '', tenant = '' } = request.query || {};

      const result = await userService.getAllUsers(
        user.roleName,
        user.tenantId,
        {
          page: Number(page) || 1,
          limit: Number(limit) || 10,
          search,
          role: role || undefined,
          status: (status as string) ? String(status).toUpperCase() : undefined,
          tenant: tenant || undefined,
        }
      );

      reply.status(200);
      return {
        success: true,
        message: 'Users retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve users';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async completeOnboarding(request: any, reply: any) {
    try {
      const user = request.user!;
      // Authorization handled by middleware

      await userService.completeOnboarding(user.id);

      reply.status(200);
      return {
        success: true,
        message: 'Onboarding completed successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async createUser(request: any, reply: any) {
    try {
      const user = request.user!;
      const { email, password, full_name, role, tenant_id } = request.body;

      // Validate required fields
      if (!email || !password || !full_name || !role) {
        reply.status(400);
        return {
          success: false,
          message: 'Missing required fields: email, password, full_name, role',
        };
      }

      // Authorization handled by middleware

      // ADMIN cannot create SUPERADMIN users
      if (role === RoleName.SUPERADMIN) {
        reply.status(403);
        return {
          success: false,
          message: 'ADMIN cannot create SUPERADMIN users',
        };
      }

      // Determine tenant_id: SUPERADMIN users have no tenant, others inherit from creator or specified tenant
      const finalTenantId = role === RoleName.SUPERADMIN ? undefined : (tenant_id || user.tenantId);

      const createUserInput: CreateUserInput = {
        email,
        password,
        full_name,
        role,
        ...(finalTenantId && { tenant_id: finalTenantId }),
      };

      const newUser = await userService.createUser(createUserInput);

      reply.status(201);
      return {
        success: true,
        message: 'User created successfully',
        data: newUser,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      
      if (errorMessage === 'User already exists in this tenant') {
        reply.status(400);
        return {
          success: false,
          message: errorMessage,
        };
      }

      if (errorMessage === 'Invalid role') {
        reply.status(400);
        return {
          success: false,
          message: errorMessage,
        };
      }

      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async exportPolicies(request: any, reply: any) {
    try {
      const exportData = await userService.exportPolicies(request.user?.email || null);

      return {
        success: true,
        message: 'Policies exported successfully',
        data: exportData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export policies';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async importPolicies(request: any, reply: any) {
    try {
      const { roles, structures } = request.body;
      
      if (!roles && !structures) {
        reply.status(400);
        return { success: false, message: 'Invalid payload: roles or structures required' };
      }
      const results = await userService.importPolicies({ roles, structures });

      return {
        success: true,
        message: 'Policies imported successfully',
        data: results
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import policies';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async resetPolicies(request: any, reply: any) {
    try {
      const { type } = request.query || {}; // 'all', 'roles', 'structures'
      const user = request.user!;
      const results = await userService.resetPolicies(type, {
        tenantId: user.tenantId || 'system',
        userId: user.id,
        roleName: user.roleName,
        ip: request.ip
      });

      reply.status(200);
      return {
        success: true,
        message: 'Policies reset successfully',
        data: results
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset policies';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async updateUser(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      // Authorization handled by middleware

      const updateUserInput: UpdateUserInput = request.body;

      const updatedUser = await userService.updateUser(
        id,
        updateUserInput,
        user.roleName,
        user.tenantId
      );

      reply.status(200);
      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      
      if (errorMessage === 'User not found') {
        reply.status(404);
        return {
          success: false,
          message: errorMessage,
        };
      }

      if (errorMessage === 'Insufficient permissions') {
        reply.status(403);
        return {
          success: false,
          message: errorMessage,
        };
      }

      if (errorMessage === 'Invalid role') {
        reply.status(400);
        return {
          success: false,
          message: errorMessage,
        };
      }

      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async deleteUser(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;

      // Authorization handled by middleware

      // Safety rule: SUPERADMIN cannot delete their own account
      if (user.roleName === RoleName.SUPERADMIN && id === user.id) {
        reply.status(403);
        return {
          success: false,
          message: 'SUPERADMIN cannot delete own account',
        };
      }

      await userService.deleteUser(id, user.roleName, user.tenantId);

      reply.status(200);
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      
      if (errorMessage === 'User not found') {
        reply.status(404);
        return {
          success: false,
          message: errorMessage,
        };
      }

      if (errorMessage === 'Insufficient permissions') {
        reply.status(403);
        return {
          success: false,
          message: errorMessage,
        };
      }

      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getRoles(_request: any, reply: any) {
    try {
      // Get roles without requiring authentication (for dropdown usage)
      const roles = await userService.getAllRoles();

      reply.status(200);
      return {
        success: true,
        message: 'Roles retrieved successfully',
        data: roles,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve roles';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getEffectiveCapabilities(request: any, reply: any) {
    try {
      const id = String(request.params?.id || '').trim();
      if (!id) {
        reply.status(400);
        return {
          success: false,
          message: 'User id is required',
        };
      }

      const caps = await userService.getUserEffectiveCapabilities(id);

      reply.status(200);
      return {
        success: true,
        message: 'Effective capabilities retrieved successfully',
        data: caps,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch effective capabilities';
      
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getPermissions(_request: any, reply: any) {
    try {
      const permissions = await userService.getAllPermissions();
      reply.status(200);
      return {
        success: true,
        message: 'Permissions retrieved successfully',
        data: permissions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve permissions';
      reply.status(500);
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  async getRoleById(request: any, reply: any) {
    try {
      const { id } = request.params || {};
      if (!id) {
        reply.status(400);
        return { success: false, message: 'Role id is required' };
      }
      const role = await userService.getRoleById(String(id));
      reply.status(200);
      return { success: true, message: 'Role retrieved successfully', data: role };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve role';
      if (errorMessage === 'Role not found') {
        reply.status(404);
        return { success: false, message: errorMessage };
      }
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  },

  async resetPassword(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params;
      const { new_password } = request.body || {};

      if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
        reply.status(400);
        return { success: false, message: 'Password minimal 8 karakter' };
      }

      // Authorization handled by middleware

      const updated = await userService.resetPassword(id, new_password, user.roleName, user.tenantId);

      // SA-IS AUDIT LOG: Admin Reset Password
      try {
        await userService.logAdminResetUserPassword({
          tenantId: user.tenantId || 'system',
          userId: user.id,
          targetUserId: id,
          adminRole: user.roleName,
          ip: request.ip
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }

      reply.status(200);
      return { success: true, message: 'Password berhasil direset', data: updated };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      if (errorMessage === 'User not found') {
        reply.status(404);
        return { success: false, message: errorMessage };
      }
      if (errorMessage === 'Insufficient permissions') {
        reply.status(403);
        return { success: false, message: errorMessage };
      }
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  },

  async updateRolePermissions(request: any, reply: any) {
    try {
      const user = request.user!;
      const before = await userService.getRoleById(String(request.params?.id || ''));

      const { id } = request.params || {};
      const { permissions } = request.body || {};
      if (!id) {
        reply.status(400);
        return { success: false, message: 'Role id is required' };
      }
      const perms = typeof permissions === 'string' ? permissions : null;
      const updated = await userService.updateRolePermissions(String(id), perms);

      try {
        await userService.logAdminUpdateRolePermissions({
          tenantId: user.tenantId || 'system',
          userId: user.id,
          roleId: String(id),
          roleName: updated.name,
          previousPermissions: before.permissions ?? [],
          newPermissions: updated.permissions ?? [],
          actorRole: user.roleName,
          actorTenantId: user.tenantId,
          ip: request.ip
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
      }

      reply.status(200);
      return { success: true, message: 'Role permissions updated', data: updated };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role permissions';
      if (errorMessage.includes('Record')) {
        reply.status(404);
        return { success: false, message: 'Role not found' };
      }
      if (errorMessage === 'System role permissions cannot be modified via UI') {
        reply.status(400);
        return { success: false, message: errorMessage };
      }
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  },

  async createRole(request: any, reply: any) {
    try {
      // Authorization handled by middleware

      const { name, description, permissions } = request.body || {};
      if (!name || typeof name !== 'string') {
        reply.status(400);
        return { success: false, message: 'Role name is required' };
      }
      const created = await userService.createRole(String(name), description ?? null, typeof permissions === 'string' ? permissions : null);
      reply.status(201);
      return { success: true, message: 'Role created successfully', data: created };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create role';
      if (errorMessage === 'Role name already exists') {
        reply.status(400);
        return { success: false, message: errorMessage };
      }
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  },

  async updateRole(request: any, reply: any) {
    try {
      // Authorization handled by middleware

      const { id } = request.params || {};
      if (!id) {
        reply.status(400);
        return { success: false, message: 'Role id is required' };
      }
      const { name, description, permissions } = request.body || {};
      const updated = await userService.updateRole(String(id), {
        name: typeof name === 'string' ? name : undefined,
        description: description ?? null,
        permissions: typeof permissions === 'string' ? permissions : undefined,
      });
      reply.status(200);
      return { success: true, message: 'Role updated successfully', data: updated };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      if (errorMessage === 'Role name already exists') {
        reply.status(400);
        return { success: false, message: errorMessage };
      }
      if (errorMessage === 'Role not found') {
        reply.status(404);
        return { success: false, message: errorMessage };
      }
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  },

  async deleteRole(request: any, reply: any) {
    try {
      // Authorization handled by middleware

      const { id } = request.params || {};
      if (!id) {
        reply.status(400);
        return { success: false, message: 'Role id is required' };
      }
      await userService.deleteRole(String(id));
      reply.status(200);
      return { success: true, message: 'Role deleted successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete role';
      if (errorMessage === 'Role not found') {
        reply.status(404);
        return { success: false, message: errorMessage };
      }
      if (errorMessage === 'Cannot delete core role' || errorMessage === 'Role is in use') {
        reply.status(400);
        return { success: false, message: errorMessage };
      }
      reply.status(500);
      return { success: false, message: errorMessage };
    }
  },

  async updateMyEmail(request: any, reply: any) {
    try {
      const user = request.user!;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const { new_email, current_password } = request.body || {};
      if (!new_email || !current_password) {
        reply.status(400);
        return { success: false, message: 'new_email and current_password are required' };
      }

      // Attempt update via service
      const updated = await userService.updateMyEmail(user.id, new_email, current_password);

      reply.status(200);
      return {
        success: true,
        message: 'Email updated successfully',
        data: updated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update email';

      if (errorMessage === 'Unauthorized') {
        reply.status(401);
        return { success: false, message: errorMessage };
      }

      if (errorMessage === 'Invalid current password') {
        reply.status(401);
        return { success: false, message: errorMessage };
      }

      if (errorMessage === 'Invalid email format') {
        reply.status(400);
        return { success: false, message: errorMessage };
      }

      if (errorMessage === 'Email already exists in this tenant' || errorMessage === 'User not found') {
        reply.status(400);
        return { success: false, message: errorMessage };
      }

      reply.status(500);
      return { success: false, message: errorMessage };
    }
  }
}
