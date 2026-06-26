import { prisma } from '@/utils/prisma';
import { RoleName } from '@/constants/enums';
import { organizationalAuthorizationEngine } from './organizational-authorization.engine';

export class AuthorizationService {
  private parseCapabilityList(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((v) => String(v)).map((v) => v.trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      try {
        const parsed: unknown = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v)).map((v) => v.trim()).filter(Boolean);
        }
      } catch { }
      return s
        .split(',')
        .map((v) => String(v).trim())
        .filter(Boolean);
    }
    return [];
  }

  private unique(values: string[]): string[] {
    return Array.from(new Set(values.map((v) => String(v).trim()).filter(Boolean)));
  }

  async resolveUserCapabilities(userId: string, context?: { user?: any }): Promise<string[]> {
    const directFromUser = this.parseCapabilityList(context?.user?.capabilities);
    const roleNameFromUser = context?.user?.roleName || context?.user?.Role?.name || context?.user?.role?.name;

    if (roleNameFromUser === RoleName.SUPERADMIN) {
      return ['system.platform.full_access'];
    }

    if (directFromUser.length > 0) {
      const resolved = this.unique(directFromUser);
      if (roleNameFromUser === 'SISWA') {
        const student = await prisma.siswa.findFirst({
          where: { user_id: userId },
          select: { status: true }
        });
        if (student?.status?.toUpperCase() !== 'LULUS') {
          return resolved.filter(c => c !== 'hubin.self.tracer' && c !== 'hubin.self.bkk');
        }
      }
      return resolved;
    }

    const user: any = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        Role: {
          select: {
            name: true,
            rolePermissions: { select: { Permission: { select: { id: true } } } },
          },
        },
      } as any,
    });

    if (!user) return [];

    const roleName = user?.Role?.name;
    if (roleName === RoleName.SUPERADMIN) {
      return ['system.platform.full_access'];
    }

    const caps = new Set<string>();
    const roleCaps = Array.isArray(user?.Role?.rolePermissions)
      ? user.Role.rolePermissions.map((rp: any) => rp?.Permission?.id).filter(Boolean)
      : [];
    roleCaps.forEach((c: string) => caps.add(String(c)));

    const orgCaps = await organizationalAuthorizationEngine.resolveOrganizationalCapabilities(userId);
    orgCaps.forEach((c) => caps.add(String(c)));

    const resolved = Array.from(caps);
    if (roleName === 'SISWA') {
      const student = await prisma.siswa.findFirst({
        where: { user_id: userId },
        select: { status: true }
      });
      if (student?.status?.toUpperCase() !== 'LULUS') {
        return resolved.filter(c => c !== 'hubin.self.tracer' && c !== 'hubin.self.bkk');
      }
    }

    return resolved;
  }

  async isUserAuthorized(
    userId: string,
    requiredCapabilities: string[],
    context?: { user?: any }
  ): Promise<{ allowed: boolean; reason?: string }> {
    const user = context?.user;
    const roleName = user?.roleName || user?.Role?.name || user?.role?.name;

    if (roleName === RoleName.SUPERADMIN) return { allowed: true };

    const required = this.unique(requiredCapabilities);
    if (required.length === 0) return { allowed: true };

    const fastCaps = this.parseCapabilityList(user?.capabilities)
      .concat(this.parseCapabilityList(user?.role?.permissions))
      .concat(this.parseCapabilityList(user?.Role?.rolePermissions?.map((rp: any) => rp?.Permission?.id)));
    if (fastCaps.length > 0) {
      const set = new Set<string>(fastCaps.map((c) => String(c)));
      if (roleName === 'SISWA' && (set.has('hubin.self.tracer') || set.has('hubin.self.bkk'))) {
        const student = await prisma.siswa.findFirst({
          where: { user_id: userId },
          select: { status: true }
        });
        if (student?.status?.toUpperCase() !== 'LULUS') {
          set.delete('hubin.self.tracer');
          set.delete('hubin.self.bkk');
        }
      }
      if (required.some((c) => set.has(c))) return { allowed: true };
    }

    const caps = await this.resolveUserCapabilities(userId, context);
    const capSet = new Set(caps);
    if (required.some((c) => capSet.has(c))) return { allowed: true };

    return { allowed: false };
  }

  /**
   * UNIFIED PERMISSION CHECK (Hybrid Role & Structure Based)
   * Memeriksa izin berdasarkan Role Permission DAN Struktur Permission di database.
   * Struktur Organisasi (Tugas Tambahan) turut menyumbang capability.
   */
  async hasUserPermission(userId: string, capability: string): Promise<boolean> {
    const res = await this.isUserAuthorized(userId, [capability]);
    return res.allowed;
  }

  /**
   * Mengambil semua capability yang dimiliki oleh user berdasarkan Role DAN Struktur-nya.
   */
  async getCapabilities(userId: string): Promise<string[]> {
    return this.resolveUserCapabilities(userId);
  }
}

export const authorizationService = new AuthorizationService();
