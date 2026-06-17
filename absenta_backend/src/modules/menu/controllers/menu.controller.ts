import { menuService, MenuPayload, MenuRolePayload } from '../services/menu.service';
import { sidebarRenderingService } from '../services/sidebar-rendering.service';
import { appendLog } from '../../../utils/logger';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { tenantEntitlementService } from '@/modules/billing/services/tenant-entitlement.service';
import { prisma } from '@/utils/prisma';

export const menuController = {
  async list(request: any, reply: any) {
    appendLog({ type: 'menu_list', method: request.method, url: request.url, tenantId: request.tenantId, userId: request.user?.id });
    const data = await menuService.list();
    return reply.send({ success: true, message: 'OK', data });
  },

  async tree(request: any, reply: any) {
    const roleId = request.query?.role_id as string | undefined;
    const mode = request.query?.mode as string | undefined;

    // Management Mode: Return full tree with menuRoles for admin UI
    if (mode === 'management') {
      appendLog({ type: 'menu_tree_management', method: request.method, url: request.url, tenantId: request.tenantId, userId: request.user?.id });
      const data = await menuService.tree();
      return reply.send({ success: true, message: 'OK', data });
    }

    const context = { user: request.user, tenantId: request.tenantId };
    appendLog({ type: 'menu_tree', method: request.method, url: request.url, roleId, tenantId: request.tenantId, userId: request.user?.id });
    const roleName = request.user?.roleName || request.user?.Role?.name;
    const effectiveRoleId = roleId || request.user?.role_id || request.user?.roleId;
    const useSiswaContextTree = roleName === 'SISWA' && effectiveRoleId;
    const data = useSiswaContextTree
      ? await menuService.treeForRoleWithContext(effectiveRoleId, context)
      : await menuService.treeForUser(context);
    return reply.send({ success: true, message: 'OK', data });
  },

  async sidebar(request: any, reply: any) {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

    const userId = String(user.id ?? user.userId ?? user.user_id ?? '');
    const role = String(user.roleName || user.Role?.name || user.role?.name || '');
    const tenantId = request.tenantId || user.tenantId || user.tenant_id;

    const tenantFeatures = tenantId ? await tenantEntitlementService.resolveTenantFeatures(String(tenantId)) : ['CORE'];
    const isSuperAdmin = role.toUpperCase() === 'SUPERADMIN';
    const capabilities = isSuperAdmin ? [] : await authorizationService.resolveUserCapabilities(userId, { user });

    let petugasActive = role.toUpperCase() !== 'SISWA';
    if (!petugasActive && tenantId) {
      try {
        const now = new Date();
        const activePetugas = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: String(tenantId),
            user_id: userId,
            is_active: true,
            AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
            Position: { code: 'PETUGAS_KELAS' },
          },
          select: { id: true },
        });
        petugasActive = !!activePetugas;
      } catch {}
    }

    appendLog({ type: 'menu_sidebar', method: request.method, url: request.url, tenantId: request.tenantId, userId });

    const sidebar = await sidebarRenderingService.getSidebarForUser({
      userId,
      tenantId: String(tenantId || ''),
      role,
      capabilities,
      tenantFeatures,
      organizationalScope: {
        ...(request.organizationalScope || {}),
        petugasActive,
      },
    });

    return reply.send({ sidebar });
  },

  async auditRequiredCapability(request: any, reply: any) {
    appendLog({ type: 'menu_audit_required_capability', method: request.method, url: request.url, tenantId: request.tenantId, userId: request.user?.id });
    const query = (request.query || {}) as { status?: string; q?: string; sort?: string; order?: 'asc' | 'desc' };
    const data = await menuService.auditRequiredCapability({
      status: query.status,
      q: query.q,
      sort: query.sort,
      order: query.order
    });
    return reply.send({ success: true, message: 'OK', data });
  },

  async get(request: any, reply: any) {
    const { id } = request.params as { id: string };
    appendLog({ type: 'menu_get', method: request.method, url: request.url, id, tenantId: request.tenantId, userId: request.user?.id });
    const data = await menuService.getById(id);
    if (!data) {
      reply.code(404);
      return { success: false, message: 'Menu not found' };
    }
    return reply.send({ success: true, message: 'OK', data });
  },

  async create(request: any, reply: any) {
    const payload = request.body as MenuPayload;
    appendLog({ type: 'menu_create', method: request.method, url: request.url, payload, tenantId: request.tenantId, userId: request.user?.id });
    const data = await menuService.create(payload);
    return reply.code(201).send({ success: true, message: 'Created', data });
  },

  async update(request: any, reply: any) {
    const { id } = request.params as { id: string };
    const payload = request.body as Partial<MenuPayload>;
    appendLog({ type: 'menu_update', method: request.method, url: request.url, id, payload, tenantId: request.tenantId, userId: request.user?.id });
    const before = await menuService.getById(id);
    const data = await menuService.update(id, payload);

    try {
      const user = request.user;
      await menuService.logAdminUpdateMenu({
        tenantId: user?.tenantId || 'system',
        userId: user?.id || null,
        menuId: id,
        ip: request.ip,
        before,
        after: data
      });
    } catch (logError) {
      console.error('Failed to create ActivityLog for menu update:', logError);
    }

    return reply.send({ success: true, message: 'Updated', data });
  },

  async remove(request: any, reply: any) {
    const { id } = request.params as { id: string };
    appendLog({ type: 'menu_remove', method: request.method, url: request.url, id, tenantId: request.tenantId, userId: request.user?.id });
    await menuService.remove(id);
    return reply.send({ success: true, message: 'Deleted' });
  },

  async getRoles(request: any, reply: any) {
    const { id } = request.params as { id: string };
    appendLog({ type: 'menu_get_roles', method: request.method, url: request.url, id, tenantId: request.tenantId, userId: request.user?.id });
    const data = await menuService.getRoles(id);
    return reply.send({ success: true, message: 'OK', data });
  },

  async setRoles(request: any, reply: any) {
    const { id } = request.params as { id: string };
    const body = request.body as { roles: MenuRolePayload[] };
    appendLog({ type: 'menu_set_roles', method: request.method, url: request.url, id, roles: body.roles, tenantId: request.tenantId, userId: request.user?.id });
    const data = await menuService.upsertRoles(id, body.roles || []);

    try {
      const user = request.user;
      await menuService.logAdminSetMenuRoles({
        tenantId: user?.tenantId || 'system',
        userId: user?.id || null,
        menuId: id,
        ip: request.ip,
        roles: body.roles || []
      });
    } catch (logError) {
      console.error('Failed to create ActivityLog for menu roles update:', logError);
    }

    return reply.send({ success: true, message: 'Roles updated', data });
  },
};
