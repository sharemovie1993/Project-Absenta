import bcrypt from 'bcrypt';
import { prisma } from '@/utils/prisma';
import { RoleName } from '../../../constants/enums';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { exportPoliciesCommand, importPoliciesCommand, resetPoliciesCommand } from './commands/policy.command';
import { logAdminResetUserPasswordCommand, logAdminUpdateRolePermissionsCommand } from './commands/audit-log.command';
import { sidebarRenderingService } from '@/modules/menu/services/sidebar-rendering.service';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: string;
  tenant_id?: string;
}

export interface UpdateUserInput {
  email?: string;
  full_name?: string;
  role?: string;
  tenant_id?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  password?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: {
    id: string;
    name: string;
  };
  tenant_id: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
  tenant?: string;
}

export interface PaginatedUserResponse {
  data: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UserService {
  async getAllUsers(
    requestingUserRole: RoleName,
    requestingUserTenantId?: string,
    params?: PaginationParams
  ): Promise<PaginatedUserResponse> {
    let whereClause: any = {};

    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    } else if (params?.tenant) {
      whereClause.tenant_id = params.tenant;
    }

    if (params?.search) {
      whereClause.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { full_name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params?.role) {
      whereClause.Role = { is: { name: params.role } };
    }

    if (params?.status) {
      whereClause.status = params.status;
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    const total = await prisma.user.count({ where: whereClause });

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        Role: true,
        Tenant: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    }) as any[];

    const data = users.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: {
        id: user.Role.id,
        name: user.Role.name,
      },
      tenant_id: user.tenant_id,
      tenant: user.Tenant ? {
        id: user.Tenant.id,
        name: user.Tenant.name,
      } : null,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async completeOnboarding(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { has_completed_onboarding: true },
    });
  }

  async createUser(input: CreateUserInput): Promise<UserResponse> {
    const { email, password, full_name, role, tenant_id } = input;

    // Check if user already exists in the same tenant
    const whereClause: any = { email };
    if (tenant_id) {
      whereClause.tenant_id = tenant_id;
    }
    
    const existingUser = await prisma.user.findFirst({
      where: whereClause,
    });

    if (existingUser) {
      throw new Error('User already exists in this tenant');
    }

    // Get role record
    const roleRecord = await prisma.role.findFirst({
      where: { name: role },
    });

    if (!roleRecord) {
      throw new Error('Invalid role');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userData: any = {
      email,
      password: hashedPassword,
      full_name,
      role_id: roleRecord.id,
    };
    
    if (role === 'SUPERADMIN') {
      userData.tenant_id = null;
    } else if (tenant_id) {
      userData.tenant_id = tenant_id;
    }
    
    const user = await prisma.user.create({
      data: userData,
      include: {
        Role: true,
        Tenant: true,
      },
    }) as any;

    if (user.tenant_id) {
      await cacheInvalidationService.invalidateUserCache(user.tenant_id, user.id);
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: {
        id: user.Role.id,
        name: user.Role.name,
      },
      tenant_id: user.tenant_id,
      tenant: user.Tenant ? {
        id: user.Tenant.id,
        name: user.Tenant.name,
      } : null,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async updateUser(userId: string, input: UpdateUserInput, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<UserResponse> {
    // First, get the user to check permissions
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { Role: true },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Only system SUPERADMIN can update across tenants; others must match tenant
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId) && existingUser.tenant_id !== requestingUserTenantId) {
      throw new Error('Insufficient permissions');
    }

    // Prepare update data
    const updateData: any = {};
    
    if (input.email) updateData.email = input.email;
    if (input.full_name) updateData.full_name = input.full_name;
    
    if (input.role) {
      // ADMIN cannot elevate or set role to SUPERADMIN
      if (requestingUserRole === RoleName.ADMIN && input.role === 'SUPERADMIN') {
        throw new Error('Insufficient permissions');
      }
      const roleRecord = await prisma.role.findFirst({
        where: { name: input.role },
      });
      if (!roleRecord) {
        throw new Error('Invalid role');
      }
      updateData.role_id = roleRecord.id;
    }

    if (input.tenant_id !== undefined) {
      // ADMIN cannot move users to a different tenant
      if (requestingUserRole === RoleName.ADMIN && requestingUserTenantId && input.tenant_id !== requestingUserTenantId) {
        throw new Error('Insufficient permissions');
      }
      updateData.tenant_id = input.tenant_id;
    }

    if (input.status) {
      const normalized = input.status.toUpperCase();
      if (normalized !== 'ACTIVE' && normalized !== 'INACTIVE') {
        throw new Error('Invalid status');
      }
      updateData.status = normalized;
    }

    if (input.password && input.password.length >= 8) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        Role: true,
        Tenant: true,
      },
    }) as any;

    await sidebarRenderingService.invalidateUser(updatedUser.id);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      role: {
        id: updatedUser.Role.id,
        name: updatedUser.Role.name,
      },
      tenant_id: updatedUser.tenant_id,
      tenant: updatedUser.Tenant ? {
        id: updatedUser.Tenant.id,
        name: updatedUser.Tenant.name,
      } : null,
      status: updatedUser.status,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    };
  }

  /**
   * Allow authenticated user to change their own email.
   * - Validates email format
   * - Verifies current password
   * - Ensures uniqueness within the same tenant
   */
  async updateMyEmail(userId: string, newEmail: string, currentPassword: string): Promise<UserResponse> {
    // Get user with password for verification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { Role: true, Tenant: true },
    }) as any;

    if (!user) {
      throw new Error('User not found');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new Error('Invalid email format');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid current password');
    }

    // Ensure uniqueness within tenant (or globally for system users)
    const whereClause: any = { email: newEmail };
    if (user.tenant_id) {
      whereClause.tenant_id = user.tenant_id;
    }

    const conflict = await prisma.user.findFirst({
      where: {
        ...whereClause,
        id: { not: userId },
      },
    });

    if (conflict) {
      throw new Error('Email already exists in this tenant');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      include: { Role: true, Tenant: true },
    }) as any;

    return {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      role: {
        id: updated.Role.id,
        name: updated.Role.name,
      },
      tenant_id: updated.tenant_id,
      tenant: updated.Tenant ? {
        id: updated.Tenant.id,
        name: updated.Tenant.name,
      } : null,
      status: updated.status,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }
  async deleteUser(userId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<void> {
    // First, get the user to check permissions
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { Role: true },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Only system SUPERADMIN can delete across tenants; others must match tenant
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId) && existingUser.tenant_id !== requestingUserTenantId) {
      throw new Error('Insufficient permissions');
    }

    // ADMIN cannot delete SUPERADMIN
    if (requestingUserRole === RoleName.ADMIN && existingUser.Role?.name === 'SUPERADMIN') {
      throw new Error('Insufficient permissions');
    }

    // Delete user
    // Note: Siswa or Guru records associated with this user are NOT automatically deleted.
    // They will remain with user_id = null (if optional) or fail if foreign key constraints are restricted.
    // In our schema, Siswa.user_id is optional (String?), so the Siswa record will remain but become "orphaned" from a login account.
    await prisma.user.delete({
      where: { id: userId },
    });
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Role: true,
        Tenant: true,
      },
    }) as any;

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: {
        id: user.Role.id,
        name: user.Role.name,
      },
      tenant_id: user.tenant_id,
      tenant: user.Tenant ? {
        id: user.Tenant.id,
        name: user.Tenant.name,
      } : null,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async getAllRoles(): Promise<{ id: string; name: string; description?: string | null; permission_count: number; permissions: string[] }[]> {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        rolePermissions: {
          select: {
            Permission: {
              select: {
                id: true
              }
            }
          }
        },
        _count: {
          select: { rolePermissions: true }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Remove duplicates by role name, keeping the first occurrence
    const uniqueRoles = roles.filter((role, index, self) => 
      index === self.findIndex(r => r.name === role.name)
    );

    return uniqueRoles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permission_count: r._count.rolePermissions,
      permissions: r.rolePermissions.map(rp => rp.Permission.id)
    }));
  }

  async getAllPermissions(): Promise<{ id: string; description?: string | null; group?: string | null; module?: string | null; scope_template?: unknown }[]> {
    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        description: true,
        group: true,
        module: true,
        scope_template: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    return permissions;
  }

  async getUserEffectiveCapabilities(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return [];
    return authorizationService.resolveUserCapabilities(userId);
  }

  async updateRolePermissions(id: string, permissions: string | null): Promise<{ id: string; name: string; description?: string | null; permissions?: string[] }> {
    const role = await prisma.role.findUnique({
      where: { id }
    });
    if (!role) {
      throw new Error('Role not found');
    }
    // if (role.is_system) {
    //   throw new Error('System role permissions cannot be modified via UI');
    // }

    let permArray: string[] = [];
    if (permissions) {
      try {
        permArray = JSON.parse(permissions);
      } catch (e) {
        permArray = [permissions];
      }
    }

    // Transaction to update permissions
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete existing
      await tx.rolePermission.deleteMany({ where: { role_id: id } });
      
      // 2. Insert new
      if (permArray.length > 0) {
        // Ensure permissions exist in Permission table first?
        // For now, assume they exist or ignore errors? 
        // Better: Find existing permissions first
        const validPerms = await tx.permission.findMany({
          where: { id: { in: permArray } },
          select: { id: true }
        });
        
        if (validPerms.length > 0) {
            await tx.rolePermission.createMany({
            data: validPerms.map(p => ({
                role_id: id,
                permission_id: p.id
            }))
            });
        }
      }

      return await tx.role.findUnique({
        where: { id },
        include: {
            rolePermissions: {
                include: { Permission: true }
            }
        }
      });
    });

    if (!updated) throw new Error('Role not found');

    await sidebarRenderingService.invalidateAll();

    return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        permissions: updated.rolePermissions.map(rp => rp.Permission.id)
    };
  }

  async getRoleById(id: string): Promise<{ id: string; name: string; description?: string | null; permissions?: string[] }> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
            include: { Permission: true }
        }
      }
    });
    if (!role) {
      throw new Error('Role not found');
    }
    
    return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.rolePermissions.map(rp => rp.Permission.id)
    };
  }

  async createRole(name: string, description?: string | null, permissions?: string | null): Promise<{ id: string; name: string; description?: string | null; permissions?: string[] }> {
    const existing = await prisma.role.findFirst({ where: { name } });
    if (existing) {
      throw new Error('Role name already exists');
    }

    let permArray: string[] = [];
    if (permissions) {
        try {
            permArray = JSON.parse(permissions);
        } catch (e) {
            permArray = [permissions];
        }
    }

    const created = await prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
            data: { name, description: description ?? null }
        });

        if (permArray.length > 0) {
            const validPerms = await tx.permission.findMany({
                where: { id: { in: permArray } },
                select: { id: true }
            });

            if (validPerms.length > 0) {
                await tx.rolePermission.createMany({
                    data: validPerms.map(p => ({
                        role_id: role.id,
                        permission_id: p.id
                    }))
                });
            }
        }
        
        return await tx.role.findUnique({
            where: { id: role.id },
            include: { rolePermissions: { include: { Permission: true } } }
        });
    });

    if (!created) throw new Error('Failed to create role');

    return {
        id: created.id,
        name: created.name,
        description: created.description,
        permissions: created.rolePermissions.map(rp => rp.Permission.id)
    };
  }

  async updateRole(id: string, payload: { name?: string; description?: string | null; permissions?: string | null }): Promise<{ id: string; name: string; description?: string | null; permissions?: string[] }> {
    if (payload.name) {
      const dup = await prisma.role.findFirst({ where: { name: payload.name, id: { not: id } } });
      if (dup) {
        throw new Error('Role name already exists');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
        await tx.role.update({
            where: { id },
            data: {
                name: payload.name ?? undefined,
                description: payload.description ?? undefined,
            }
        });

        if (payload.permissions !== undefined) {
            // Delete old
            await tx.rolePermission.deleteMany({ where: { role_id: id } });

            // Parse new
            let permArray: string[] = [];
            if (payload.permissions) {
                try {
                    permArray = JSON.parse(payload.permissions);
                } catch (e) {
                    permArray = [payload.permissions];
                }
            }

            // Insert new
            if (permArray.length > 0) {
                 const validPerms = await tx.permission.findMany({
                    where: { id: { in: permArray } },
                    select: { id: true }
                });

                if (validPerms.length > 0) {
                    await tx.rolePermission.createMany({
                        data: validPerms.map(p => ({
                            role_id: id,
                            permission_id: p.id
                        }))
                    });
                }
            }
        }

        return await tx.role.findUnique({
            where: { id },
            include: { rolePermissions: { include: { Permission: true } } }
        });
    });

    if (!updated) throw new Error('Role not found');

    await sidebarRenderingService.invalidateAll();

    return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        permissions: updated.rolePermissions.map(rp => rp.Permission.id)
    };
  }

  async deleteRole(id: string): Promise<void> {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new Error('Role not found');
    }
    const core = ['SUPERADMIN', 'ADMIN', 'GURU', 'SISWA', 'PLATFORM_FINANCE', 'PLATFORM_SUPPORT', 'PLATFORM_INFRASTRUCTURE'];
    if (core.includes(role.name)) {
      throw new Error('Cannot delete core role');
    }
    const usage = await prisma.user.count({ where: { role_id: id } });
    if (usage > 0) {
      throw new Error('Role is in use');
    }
    await prisma.role.delete({ where: { id } });
  }

  async resetPassword(userId: string, newPassword: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<UserResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { Role: true, Tenant: true },
    }) as any;

    if (!existingUser) {
      throw new Error('User not found');
    }

    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId) && existingUser.tenant_id !== requestingUserTenantId) {
      throw new Error('Insufficient permissions');
    }

    if (requestingUserRole === RoleName.ADMIN && existingUser.Role?.name === 'SUPERADMIN') {
      throw new Error('Insufficient permissions');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
      include: { Role: true, Tenant: true },
    }) as any;

    return {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      role: { id: updated.Role.id, name: updated.Role.name },
      tenant_id: updated.tenant_id,
      tenant: updated.Tenant ? { id: updated.Tenant.id, name: updated.Tenant.name } : null,
      status: updated.status,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async exportPolicies(generatedBy: string | null) {
    return exportPoliciesCommand(generatedBy);
  }

  async importPolicies(input: { roles?: any[]; structures?: any[] }) {
    return importPoliciesCommand(input);
  }

  async resetPolicies(type: string | undefined, actor: { tenantId: string; userId: string; roleName: string; ip?: string }) {
    return resetPoliciesCommand(type, actor);
  }

  async logAdminResetUserPassword(params: { tenantId: string; userId: string; targetUserId: string; adminRole: string; ip?: string }) {
    await logAdminResetUserPasswordCommand(params);
  }

  async logAdminUpdateRolePermissions(params: {
    tenantId: string;
    userId: string;
    roleId: string;
    roleName: string;
    previousPermissions: any[];
    newPermissions: any[];
    actorRole: string;
    actorTenantId?: string | null;
    ip?: string;
  }) {
    await logAdminUpdateRolePermissionsCommand(params);
  }
}

export const userService = new UserService();
