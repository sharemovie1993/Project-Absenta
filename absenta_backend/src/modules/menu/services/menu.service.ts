import { prisma } from '@/utils/prisma';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { sidebarRenderingService } from './sidebar-rendering.service';
import { organizationalAuthorizationEngine } from '@/modules/auth/services/organizational-authorization.engine';
import { tenantEntitlementService } from '@/modules/billing/services/tenant-entitlement.service';

interface MenuAuditFilter {
  status?: string;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface MenuPayload {
  parent_id?: string | null;
  name: string;
  icon?: string | null;
  path?: string | null;
  order?: number;
  is_active?: boolean;
  requires_petugas_active?: boolean;
  required_capability?: string | null;
}

export interface MenuRolePayload {
  role_id: string;
  can_view?: boolean;
  can_create?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
}

export const menuService = {
  async list() {
    return prisma.menu.findMany({
      orderBy: { order: 'asc' },
      include: { menuRoles: true },
    });
  },

  async getById(id: string) {
    return prisma.menu.findUnique({
      where: { id },
      include: {
        children: true,
        menuRoles: true,
      },
    });
  },

  async create(payload: MenuPayload) {
    const trimmedCapability = payload.required_capability ? payload.required_capability.trim() : '';
    let requiredCapability: string | null = null;
    if (trimmedCapability) {
      const permission = await prisma.permission.findUnique({ where: { id: trimmedCapability } });
      if (!permission) {
        throw new Error(`Permission dengan id ${trimmedCapability} tidak ditemukan`);
      }
      requiredCapability = permission.id;
    }
    const created = await prisma.menu.create({
      data: {
        parent_id: payload.parent_id ?? null,
        name: payload.name,
        icon: payload.icon ?? null,
        path: payload.path ?? null,
        order: payload.order ?? 0,
        is_active: payload.is_active ?? true,
        requires_petugas_active: payload.requires_petugas_active ?? false,
        required_capability: requiredCapability,
      },
    });
    await sidebarRenderingService.invalidateAll();
    return created;
  },

  async update(id: string, payload: Partial<MenuPayload>) {
    let requiredCapabilityValue: string | null | undefined = undefined;
    if ('required_capability' in payload) {
      const raw = payload.required_capability;
      const trimmed = raw ? raw.trim() : '';
      if (!trimmed) {
        requiredCapabilityValue = null;
      } else {
        const permission = await prisma.permission.findUnique({ where: { id: trimmed } });
        if (!permission) {
          throw new Error(`Permission dengan id ${trimmed} tidak ditemukan`);
        }
        requiredCapabilityValue = permission.id;
      }
    }
    const updated = await prisma.menu.update({
      where: { id },
      data: {
        parent_id: 'parent_id' in payload ? payload.parent_id : undefined,
        name: 'name' in payload ? payload.name : undefined,
        icon: 'icon' in payload ? payload.icon : undefined,
        path: 'path' in payload ? payload.path : undefined,
        order: 'order' in payload ? payload.order : undefined,
        is_active: 'is_active' in payload ? payload.is_active : undefined,
        requires_petugas_active: 'requires_petugas_active' in payload ? payload.requires_petugas_active : undefined,
        required_capability: 'required_capability' in payload ? requiredCapabilityValue : undefined,
      },
    });
    await sidebarRenderingService.invalidateAll();
    return updated;
  },

  async remove(id: string) {
    // Remove roles first due to FK constraint
    await prisma.menuRole.deleteMany({ where: { menu_id: id } });
    const deleted = await prisma.menu.delete({ where: { id } });
    await sidebarRenderingService.invalidateAll();
    return deleted;
  },

  async tree() {
    const items = await prisma.menu.findMany({
      orderBy: { order: 'asc' },
      include: { menuRoles: true },
    });
    const byId: Record<string, any> = {};
    const roots: any[] = [];
    items.forEach((m) => (byId[m.id] = { ...m, children: [] }));
    items.forEach((m) => {
      const node = byId[m.id];
      if (m.parent_id && byId[m.parent_id]) {
        byId[m.parent_id].children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  },

  /**
   * Build menu tree filtered by role permissions (can_view) and is_active.
   * - Defaults to visible when no explicit role record exists for a menu.
   * - Keeps parent nodes if any of their children are visible.
   */
  async treeForRole(roleId: string) {
    const items = await prisma.menu.findMany({ orderBy: { order: 'asc' } });
    const rolePerms = await prisma.menuRole.findMany({ where: { role_id: roleId } });
    const canViewMap = rolePerms.reduce<Record<string, boolean>>((acc, r) => {
      acc[r.menu_id] = r.can_view ?? false;
      return acc;
    }, {});

    const byId: Record<string, any> = {};
    const roots: any[] = [];
    items.forEach((m) => (byId[m.id] = { ...m, children: [] }));
    items.forEach((m) => {
      const node = byId[m.id];
      if (m.parent_id && byId[m.parent_id]) {
        byId[m.parent_id].children.push(node);
      } else {
        roots.push(node);
      }
    });

    function filterNodes(nodes: any[]): any[] {
      return nodes
        .map((node) => {
          const isActive = node.is_active !== false;
          const canView = canViewMap[node.id];
          // Default Deny: if canView is undefined (no record), default to false
          const visibleSelf = isActive && (canView === undefined ? false : !!canView);
          const filteredChildren = filterNodes(node.children || []);
          const keepNode = visibleSelf || filteredChildren.length > 0;
          if (!keepNode) return null;
          return { ...node, children: filteredChildren };
        })
        .filter(Boolean);
    }

    return filterNodes(roots);
  },

  async getRoles(menuId: string) {
    return prisma.menuRole.findMany({
      where: { menu_id: menuId },
      include: { Role: true },
      orderBy: { created_at: 'asc' },
    });
  },

  async upsertRoles(menuId: string, roles: MenuRolePayload[]) {
    const ops = roles.map((r) =>
      prisma.menuRole.upsert({
        where: { menu_id_role_id: { menu_id: menuId, role_id: r.role_id } },
        update: {
          can_view: r.can_view ?? true,
          can_create: r.can_create ?? false,
          can_update: r.can_update ?? false,
          can_delete: r.can_delete ?? false,
        },
        create: {
          menu_id: menuId,
          role_id: r.role_id,
          can_view: r.can_view ?? true,
          can_create: r.can_create ?? false,
          can_update: r.can_update ?? false,
          can_delete: r.can_delete ?? false,
        },
      })
    );
    await prisma.$transaction(ops);
    const res = await this.getRoles(menuId);
    await sidebarRenderingService.invalidateAll();
    return res;
  },

  /**
   * Build menu tree filtered by role permissions and contextual constraints.
   * Context-aware rules:
   * - For role SISWA: if a menu item has requires_petugas_active=true, it is visible only when
   *   the current user has an active Petugas record in the current tenant.
   */
  async treeForRoleWithContext(roleId: string, context?: { user?: any; tenantId?: string }) {
    const items = await prisma.menu.findMany({ orderBy: { order: 'asc' } });
    const rolePerms = await prisma.menuRole.findMany({ where: { role_id: roleId } });
    const canViewMap = rolePerms.reduce<Record<string, boolean>>((acc, r) => {
      acc[r.menu_id] = r.can_view ?? false;
      return acc;
    }, {});

    let isSiswaRole = false;
    let petugasActive = false;
    try {
      const roleName = context?.user?.roleName || context?.user?.Role?.name;
      isSiswaRole = roleName === 'SISWA';
      if (isSiswaRole && context?.tenantId && context?.user?.id) {
        const now = new Date();
        const activePetugas = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: context.tenantId,
            user_id: context.user.id,
            is_active: true,
            AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
            Position: { code: 'PETUGAS_KELAS' },
          },
          select: { id: true },
        });
        petugasActive = !!activePetugas;
      }
    } catch {}

    const byId: Record<string, any> = {};
    const roots: any[] = [];
    items.forEach((m) => (byId[m.id] = { ...m, children: [] }));
    items.forEach((m) => {
      const node = byId[m.id];
      if (m.parent_id && byId[m.parent_id]) {
        byId[m.parent_id].children.push(node);
      } else {
        roots.push(node);
      }
    });

    const filterNodes = (nodes: any[]): any[] => {
      const result: any[] = [];
      nodes.forEach((n) => {
        const children = filterNodes(n.children || []);
        // Default Deny: if no record, default to false
        const baseCanView = (canViewMap[n.id] ?? false) && !!n.is_active;
        const requiresPetugas = !!n.requires_petugas_active;
        const contextOk = !requiresPetugas || (isSiswaRole ? petugasActive : true);
        const effective = baseCanView && contextOk;
        if (effective || children.length > 0) {
          result.push({ ...n, children });
        }
      });
      return result;
    };
    return filterNodes(roots);
  },

  /**
   * Build menu tree filtered by USER capabilities.
   * This is the PRIMARY way to get menu for a user (replacing role-based only).
   */
  async treeForUser(context: { user: any; tenantId?: string }) {
    const items = await prisma.menu.findMany({ orderBy: { order: 'asc' } });
    
    // Get tenant features for SaaS gating
    const tenantId = context.tenantId || context.user.tenant_id;
    const tenantFeatures = await tenantEntitlementService.resolveTenantFeatures(tenantId);
    
    // Get user capabilities
    let capabilities: string[] = [];
    const user = context.user;
    
    // Check if SUPERADMIN
    const roleName = user.roleName || user.Role?.name;
    const isSuperAdmin = roleName === 'SUPERADMIN';
    
    if (!isSuperAdmin) {
      capabilities = await authorizationService.resolveUserCapabilities(user.id, { user });
    }
    
    // Prepare fallback Role-based map
    const roleId = user.role_id || user.roleId;
    let canViewMap: Record<string, boolean> = {};
        if (roleId) {
            const rolePerms = await prisma.menuRole.findMany({ where: { role_id: roleId } });
            canViewMap = rolePerms.reduce<Record<string, boolean>>((acc, r) => {
              acc[r.menu_id] = r.can_view ?? true;
              return acc;
            }, {});
        }
    
        // Determine positions (for context-aware filtering like GERBANG)
        let isGerbang = false;
        try {
          const orgCtx = await organizationalAuthorizationEngine.resolveOrganizationalContext(user.id);
          isGerbang = orgCtx.positions.some(p => p.code === 'GERBANG');
        } catch (e) {
          // fail safe
        }
    
        // Determine Petugas Active Status (for SISWA only)
    const isSiswaRole = roleName === 'SISWA';
    const isGuruRole = roleName === 'GURU';
    let petugasActive = false;
    if (isSiswaRole && context.tenantId && user.id) {
      try {
        const now = new Date();
        const activePetugas = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: context.tenantId,
            user_id: user.id,
            is_active: true,
            AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
            Position: { code: 'PETUGAS_KELAS' },
          },
          select: { id: true },
        });
        petugasActive = !!activePetugas;
      } catch (e) {
        // fail safe
      }
    }

    // ── Cooperative Member Gating ──────────────────────────────────────────
    // Cek apakah GURU/SISWA terdaftar sebagai anggota koperasi aktif.
    // Jika bukan anggota, menu koperasi personal (simpanan, pinjaman, dll)
    // disembunyikan dari sidebar. Dashboard & Pengumuman tetap tersedia
    // agar mereka bisa melihat info koperasi dan mendaftar sebagai anggota.
    // Role pengurus koperasi (ANGGOTA_KOPERASI_EXTERNAL, dll) tidak terkena
    // filter ini karena mereka bukan GURU/SISWA secara role.
    // Jika user adalah pengurus koperasi (memiliki jabatan struktural koperasi), maka bypass gating.
    let isCoopMember = false;
    if ((isGuruRole || isSiswaRole) && !isSuperAdmin && tenantId && user.id) {
      try {
        const coopAssignment = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: tenantId,
            user_id: user.id,
            is_active: true,
            Position: {
              code: {
                in: [
                  'KETUA_KOPERASI',
                  'BENDAHARA_KOPERASI',
                  'SEKRETARIS_KOPERASI',
                  'MANAJER_TOKO_KOPERASI',
                  'PENGAWAS_KOPERASI'
                ]
              }
            }
          },
          select: { id: true }
        });

        if (coopAssignment) {
          isCoopMember = true;
        } else {
          const activeMember = await prisma.member.findFirst({
            where: {
              tenantId,
              userId: user.id,
              status: 'ACTIVE',
            },
            select: { id: true },
          });
          isCoopMember = !!activeMember;
        }
      } catch (e) {
        // fail safe — default non-member (menu tersembunyi)
      }
    }

    // Build Tree Structure
    const byId: Record<string, any> = {};
    const roots: any[] = [];
    items.forEach((m) => (byId[m.id] = { ...m, children: [] }));
    items.forEach((m) => {
      const node = byId[m.id];
      if (m.parent_id && byId[m.parent_id]) {
        byId[m.parent_id].children.push(node);
      } else {
        roots.push(node);
      }
    });

    const filterNodes = (nodes: any[]): any[] => {
      const result: any[] = [];
      nodes.forEach((n) => {
        const children = filterNodes(n.children || []);
        
        let isVisible = false;
        
        if (isSuperAdmin) {
            isVisible = true;
        } else if (n.required_capability) {
            // Capability-based check (Primary)
            // Supports multiple capabilities separated by comma (OR logic)
            const required = n.required_capability.split(',').map((c: string) => c.trim());
            isVisible = required.some((c: string) => capabilities.includes(c));
        } else {
            // Fallback to Role-based check
            // If no capability required, check if role allows it
            // Default Deny: if no record, default to false
            const baseCanView = (canViewMap[n.id] ?? false);
            isVisible = baseCanView;
        }
        
        // Active check
        if (n.is_active === false) isVisible = false;

        // SaaS Feature Gating Check
        if (isVisible && n.required_features) {
            const reqFeatures = n.required_features as string[];
            if (Array.isArray(reqFeatures) && reqFeatures.length > 0) {
                // If menu requires specific features, checking if tenant has at least one of them
                const hasFeature = reqFeatures.some(f => tenantFeatures.includes(f));
                if (!hasFeature) isVisible = false;
            }
        }

        // Requires Petugas Active check
        // Only applies to SISWA role. GURU/ADMIN/etc ignore this flag.
        if (n.requires_petugas_active && isSiswaRole && !petugasActive) {
            isVisible = false;
        }

        // ── Cooperative Member Gating ─────────────────────────────────────────
        // GURU/SISWA yang belum terdaftar sebagai anggota koperasi aktif hanya
        // boleh melihat Dashboard & Pengumuman Koperasi. Menu personal lainnya
        // (Simpanan, Pinjaman, Laporan, dsb) disembunyikan secara otomatis.
        // GURU/SISWA yang sudah terdaftar sebagai anggota (isCoopMember=true)
        // bebas mengakses seluruh menu sesuai capability mereka.
        if (isVisible && (isGuruRole || isSiswaRole) && !isCoopMember) {
            // Daftar path yang wajib hanya untuk anggota koperasi terdaftar
            const memberOnlyPaths = [
                '/cooperative/savings',
                '/cooperative/loans',
                '/cooperative/members',
                '/cooperative/pos',
                '/cooperative/ppob',
                '/cooperative/tickets',
                '/cooperative/vouchers',
                '/cooperative/reports',
                '/cooperative/settings',
                '/cooperative/accounting',
                '/cooperative/products',
            ];
            const isMemberOnlyPath = memberOnlyPaths.some(
                (p) => n.path && (n.path === p || n.path.startsWith(p + '/'))
            );
            if (isMemberOnlyPath) isVisible = false;
        }

        // GERBANG Position Override: Hide non-essential menus for gate officers
        // to focus their workspace only on Attendance and Profile/Settings.
        if (isGerbang && !isSuperAdmin && roleName !== 'ADMIN') {
            const allowedTopPaths = ['/attendance', '/profile', '/settings', '/help', '/logout', '/attendance-ops'];
            const isAllowed = allowedTopPaths.some(p => n.path && (n.path === p || n.path.startsWith(p + '/')));
            
            if (n.path === '/dashboard' || !isAllowed) {
                isVisible = false;
            }
        }
        
        // Keep if visible OR has visible children
        if (isVisible || children.length > 0) {
          result.push({ ...n, children });
        }
      });
      return result;
    };
    
    return filterNodes(roots);
  },

  async auditRequiredCapability(filters?: MenuAuditFilter) {
    const permissions = await prisma.permission.findMany({ select: { id: true } });
    const validIds = new Set(permissions.map((p) => p.id));

    const menus = await prisma.menu.findMany({
      orderBy: { order: 'asc' }
    });

    const statusOrder: Record<string, number> = {
      unknown_string: 0,
      legacy_mappable: 1,
      empty: 2,
      valid_action_id: 3
    };

    const items = menus.map((m) => {
      const raw = (m.required_capability || '').trim();
      if (!raw) {
        return {
          id: m.id,
          name: m.name,
          path: m.path,
          required_capability: m.required_capability,
          status: 'empty',
          suggested_action_id: null,
          legacy_mapping_exists: false
        };
      }

      if (validIds.has(raw)) {
        return {
          id: m.id,
          name: m.name,
          path: m.path,
          required_capability: m.required_capability,
          status: 'valid_action_id',
          suggested_action_id: null,
          legacy_mapping_exists: false
        };
      }

      return {
        id: m.id,
        name: m.name,
        path: m.path,
        required_capability: m.required_capability,
        status: 'unknown_string',
        suggested_action_id: null,
        legacy_mapping_exists: false
      };
    });

    let result = items;

    const statusFilter = filters?.status ? String(filters.status).toLowerCase() : '';
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((item) => String(item.status).toLowerCase() === statusFilter);
    }

    const q = filters?.q ? String(filters.q).toLowerCase().trim() : '';
    if (q) {
      result = result.filter((item) => {
        const name = item.name ? item.name.toLowerCase() : '';
        const path = item.path ? item.path.toLowerCase() : '';
        const cap = item.required_capability ? String(item.required_capability).toLowerCase() : '';
        return name.includes(q) || path.includes(q) || cap.includes(q);
      });
    }

    const sortKey = filters?.sort || 'order';
    const sortOrder: 'asc' | 'desc' = filters?.order === 'desc' ? 'desc' : 'asc';

    if (sortKey === 'name') {
      result = [...result].sort((a, b) => {
        const an = a.name || '';
        const bn = b.name || '';
        if (an === bn) return 0;
        if (sortOrder === 'asc') return an.localeCompare(bn);
        return bn.localeCompare(an);
      });
    } else if (sortKey === 'status') {
      result = [...result].sort((a, b) => {
        const sa = statusOrder[a.status] ?? 99;
        const sb = statusOrder[b.status] ?? 99;
        if (sa === sb) {
          const an = a.name || '';
          const bn = b.name || '';
          if (sortOrder === 'asc') return an.localeCompare(bn);
          return bn.localeCompare(an);
        }
        if (sortOrder === 'asc') return sa - sb;
        return sb - sa;
      });
    } else if (sortKey === 'path') {
      result = [...result].sort((a, b) => {
        const ap = a.path || '';
        const bp = b.path || '';
        if (ap === bp) return 0;
        if (sortOrder === 'asc') return ap.localeCompare(bp);
        return bp.localeCompare(ap);
      });
    } else if (sortKey === 'required_capability') {
      result = [...result].sort((a, b) => {
        const ac = a.required_capability ? String(a.required_capability) : '';
        const bc = b.required_capability ? String(b.required_capability) : '';
        if (ac === bc) return 0;
        if (sortOrder === 'asc') return ac.localeCompare(bc);
        return bc.localeCompare(ac);
      });
    }

    return result;
  },

  async logAdminUpdateMenu(params: {
    tenantId: string;
    userId: string | null;
    menuId: string;
    ip?: string;
    before?: any;
    after?: any;
  }) {
    return prisma.activityLog.create({
      data: {
        tenant_id: params.tenantId,
        user_id: params.userId,
        action: 'ADMIN_UPDATE_MENU',
        entity: 'MENU',
        entity_id: params.menuId,
        metadata: JSON.stringify({
          menu_id: params.menuId,
          name_before: params.before?.name,
          name_after: params.after?.name,
          path_before: params.before?.path,
          path_after: params.after?.path,
          required_capability_before: params.before?.required_capability,
          required_capability_after: params.after?.required_capability,
          is_active_before: params.before?.is_active,
          is_active_after: params.after?.is_active,
          parent_id_before: params.before?.parent_id,
          parent_id_after: params.after?.parent_id,
          requires_petugas_active_before: params.before?.requires_petugas_active,
          requires_petugas_active_after: params.after?.requires_petugas_active,
          ip: params.ip
        })
      }
    });
  },

  async logAdminSetMenuRoles(params: {
    tenantId: string;
    userId: string | null;
    menuId: string;
    ip?: string;
    roles: MenuRolePayload[];
  }) {
    return prisma.activityLog.create({
      data: {
        tenant_id: params.tenantId,
        user_id: params.userId,
        action: 'ADMIN_SET_MENU_ROLES',
        entity: 'MENU',
        entity_id: params.menuId,
        metadata: JSON.stringify({
          menu_id: params.menuId,
          roles_count: (params.roles || []).length,
          roles: (params.roles || []).map((r) => ({
            role_id: r.role_id,
            can_view: r.can_view ?? true,
            can_create: r.can_create ?? false,
            can_update: r.can_update ?? false,
            can_delete: r.can_delete ?? false,
          })),
          ip: params.ip
        })
      }
    });
  }
};
