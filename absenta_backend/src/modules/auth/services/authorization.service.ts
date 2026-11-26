import { prisma } from '@/utils/prisma';
import { RoleName } from '@/constants/enums';
import { organizationalAuthorizationEngine } from './organizational-authorization.engine';

const USER_CAPABILITIES_CACHE_TTL_MS = 60 * 1000;

export class AuthorizationService {
  private capabilitiesCache = new Map<string, { caps: string[]; expiresAt: number }>();

  invalidateUserCapabilities(userId?: string) {
    if (userId) this.capabilitiesCache.delete(userId);
    else this.capabilitiesCache.clear();
  }

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
    const rawRole = context?.user?.roleName || context?.user?.Role?.name || (typeof context?.user?.role === 'string' ? context?.user?.role : context?.user?.role?.name);
    let roleNameFromUser = String(rawRole || '').trim().toUpperCase();

    if (roleNameFromUser === RoleName.SUPERADMIN || roleNameFromUser === 'SUPERADMIN') {
      return ['system.platform.full_access'];
    }

    const now = Date.now();
    if (userId && directFromUser.length === 0) {
      const cached = this.capabilitiesCache.get(userId);
      if (cached && now < cached.expiresAt) {
        return cached.caps;
      }
    }

    const caps = new Set<string>();

    if (directFromUser.length > 0) {
      directFromUser.forEach((c) => caps.add(c));
    }
    
    if (directFromUser.length === 0 || roleNameFromUser === 'ADMIN') {
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

      if (user) {
        if (!roleNameFromUser && user.Role?.name) {
          roleNameFromUser = String(user.Role.name).trim().toUpperCase();
        }
        const roleCaps = Array.isArray(user?.Role?.rolePermissions)
          ? user.Role.rolePermissions.map((rp: any) => rp?.Permission?.id).filter(Boolean)
          : [];
        roleCaps.forEach((c: string) => caps.add(String(c)));
      }
    }

    // Selalu gabungkan structural/organizational capabilities dari database
    const orgCaps = await organizationalAuthorizationEngine.resolveOrganizationalCapabilities(userId);
    orgCaps.forEach((c) => caps.add(String(c)));

    const resolved = Array.from(caps);
    let finalCaps = resolved;
    if (roleNameFromUser === 'SISWA') {
      const student = await prisma.siswa.findFirst({
        where: { user_id: userId },
        select: { status: true }
      });
      if (student?.status?.toUpperCase() !== 'LULUS') {
        finalCaps = resolved.filter(c => c !== 'hubin.self.tracer' && c !== 'hubin.self.bkk');
      }
    }

    if (userId) {
      if (this.capabilitiesCache.size > 5000) this.capabilitiesCache.clear();
      this.capabilitiesCache.set(userId, { caps: finalCaps, expiresAt: Date.now() + USER_CAPABILITIES_CACHE_TTL_MS });
    }

    return finalCaps;
  }

  async isUserAuthorized(
    userId: string,
    requiredCapabilities: string[],
    context?: { user?: any }
  ): Promise<{ allowed: boolean; reason?: string }> {
    const user = context?.user;
    const rawRole = user?.roleName || user?.Role?.name || (typeof user?.role === 'string' ? user?.role : user?.role?.name);
    let roleName = String(rawRole || '').trim().toUpperCase();

    if (!roleName && userId) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { Role: { select: { name: true } } }
        });
        if (dbUser?.Role?.name) {
          roleName = String(dbUser.Role.name).trim().toUpperCase();
        }
      } catch {}
    }

    if (roleName === RoleName.SUPERADMIN || roleName === 'SUPERADMIN') return { allowed: true };
    if (roleName === RoleName.ADMIN || roleName === 'ADMIN') {
      const hasCoop = requiredCapabilities.some(cap => cap.startsWith('cooperative.'));
      if (!hasCoop) return { allowed: true };
    }

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
