import { cacheService } from '@/utils/cache.service';

export const ORG_CONTEXT_TTL_SECONDS = 60;

export class OrganizationalContextCache {
  private key(userId: string) {
    return `org_context:user:${userId}`;
  }

  async get<T>(userId: string): Promise<T | null> {
    return cacheService.get<T>(this.key(userId));
  }

  async getOrSet<T>(userId: string, fetch: () => Promise<T>): Promise<T> {
    return cacheService.getOrSet<T>(this.key(userId), fetch, ORG_CONTEXT_TTL_SECONDS);
  }

  async invalidateUser(userId: string): Promise<void> {
    await cacheService.delete(this.key(userId));
  }
}

export const organizationalContextCache = new OrganizationalContextCache();

