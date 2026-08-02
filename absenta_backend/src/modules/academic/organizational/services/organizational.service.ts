import { randomUUID } from 'crypto';
import { prisma } from '@/utils/prisma';
import { organizationalContextCache } from '@/modules/auth/services/organizational-context-cache';
import { sidebarRenderingService } from '@/modules/menu/services/sidebar-rendering.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map((v) => String(v).trim()).filter(Boolean)));
}

export class OrganizationalService {
  private async invalidateUsersByPosition(positionId: string) {
    const assigns = await prisma.organizationalAssignment.findMany({
      where: { position_id: positionId, is_active: true },
      select: { user_id: true },
    });
    const userIds = Array.from(new Set(assigns.map((a) => String(a.user_id)).filter(Boolean)));
    await Promise.all(userIds.map((uid) => organizationalContextCache.invalidateUser(uid)));
    await Promise.all(userIds.map((uid) => sidebarRenderingService.invalidateUser(uid)));
  }

  async listPositions(tenantId: string) {
    return prisma.organizationalPosition.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ code: 'asc' }],
    });
  }

  async createPosition(tenantId: string, input: any) {
    const code = String(input.code || '').trim();
    const name = String(input.name || '').trim();
    const scope_type = String(input.scope_type || '').trim();
    const unit_type = input.unit_type ? String(input.unit_type).trim() : null;
    if (!code || !name || !scope_type) throw new Error('code, name, scope_type are required');

    const created = await prisma.organizationalPosition.create({
      data: {
        tenant_id: tenantId,
        code,
        name,
        scope_type,
        unit_type,
        is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
        updated_at: new Date(),
      },
    });
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    return created;
  }

  async updatePosition(tenantId: string, id: string, input: any) {
    const existing = await prisma.organizationalPosition.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!existing) throw new Error('Position not found');

    const updated = await prisma.organizationalPosition.update({
      where: { id },
      data: {
        code: input.code !== undefined ? String(input.code).trim() : undefined,
        name: input.name !== undefined ? String(input.name).trim() : undefined,
        scope_type: input.scope_type !== undefined ? String(input.scope_type).trim() : undefined,
        unit_type: input.unit_type !== undefined ? (input.unit_type ? String(input.unit_type).trim() : null) : undefined,
        is_active: input.is_active !== undefined ? Boolean(input.is_active) : undefined,
        updated_at: new Date(),
      },
    });

    await this.invalidateUsersByPosition(id);
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    return updated;
  }

  async deletePosition(tenantId: string, id: string) {
    const existing = await prisma.organizationalPosition.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!existing) throw new Error('Position not found');

    await this.invalidateUsersByPosition(id);
    await prisma.organizationalPosition.delete({ where: { id } });
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
  }

  async updatePositionCapabilities(tenantId: string, positionId: string, rawCaps: unknown) {
    const position = await prisma.organizationalPosition.findFirst({
      where: { id: positionId, tenant_id: tenantId },
      select: { id: true },
    });
    if (!position) throw new Error('Position not found');

    const capabilities = uniqueStrings(rawCaps);

    await prisma.$transaction(async (tx) => {
      await tx.organizationalCapability.deleteMany({
        where: {
          position_id: positionId,
          ...(capabilities.length > 0 ? { permission_id: { notIn: capabilities } } : {}),
        },
      });

      if (capabilities.length > 0) {
        await tx.organizationalCapability.createMany({
          data: capabilities.map((permission_id) => ({
            id: randomUUID(),
            position_id: positionId,
            permission_id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.organizationalPosition.update({
        where: { id: positionId },
        data: { updated_at: new Date() },
      });
    });

    await this.invalidateUsersByPosition(positionId);
    await cacheInvalidationService.invalidateStrukturTree(tenantId);

    return prisma.organizationalCapability.findMany({
      where: { position_id: positionId },
      select: { permission_id: true, conditions: true },
    });
  }

  async createOrUpdateAssignment(tenantId: string, input: any) {
    const position_id = String(input.position_id || '').trim();
    const user_id = String(input.user_id || '').trim();
    const kelas_id = input.kelas_id ? String(input.kelas_id).trim() : null;
    const unit_id = input.unit_id ? String(input.unit_id).trim() : null;
    if (!position_id || !user_id) throw new Error('position_id and user_id are required');

    const position = await prisma.organizationalPosition.findFirst({
      where: { id: position_id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!position) throw new Error('Position not found');

    const user = await prisma.user.findFirst({
      where: { id: user_id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!user) throw new Error('User not found');

    const data = await prisma.$transaction(async (tx) => {
      const existing = await tx.organizationalAssignment.findFirst({
        where: {
          tenant_id: tenantId,
          user_id,
          position_id,
          kelas_id: kelas_id ?? undefined,
        },
        select: { id: true },
      });

      const payload = {
        tenant_id: tenantId,
        position_id,
        user_id,
        kelas_id,
        unit_id,
        start_date: input.start_date ? new Date(input.start_date) : new Date(),
        end_date: input.end_date ? new Date(input.end_date) : null,
        is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
        updated_at: new Date(),
      };

      if (existing) {
        return tx.organizationalAssignment.update({ where: { id: existing.id }, data: payload });
      }

      return tx.organizationalAssignment.create({
        data: { id: randomUUID(), ...payload },
      });
    });

    await organizationalContextCache.invalidateUser(user_id);
    await sidebarRenderingService.invalidateUser(user_id);
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    return data;
  }

  async deleteAssignment(tenantId: string, id: string) {
    const existing = await prisma.organizationalAssignment.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true, user_id: true, position_id: true },
    });
    if (!existing) throw new Error('Assignment not found');

    await prisma.organizationalAssignment.delete({ where: { id } });
    await organizationalContextCache.invalidateUser(String(existing.user_id));
    await sidebarRenderingService.invalidateUser(String(existing.user_id));
    await this.invalidateUsersByPosition(String(existing.position_id));
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
  }
}

export const organizationalService = new OrganizationalService();
