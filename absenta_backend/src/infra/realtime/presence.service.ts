import { getRedisConnection } from '@/queue/redis';
import { prisma } from '@/utils/prisma';

const REDIS_PRESENCE_SNAPSHOT_PREFIX = 'presence:cluster:snapshot:';
const HTTP_ONLY_STALE_MS = 4 * 60 * 1000; // 4 minutes sliding window for HTTP-active users without active WS

export interface UserPresenceSession {
  userId: string;
  name: string;
  roleName: string;
  tenantId: string;
  socketIds: Set<string>;
  connectedAt: Date;
  lastSeenAt: Date;
  ip?: string;
  userAgent?: string;
}

export interface UserPresenceSummary {
  userId: string;
  name: string;
  roleName: string;
  tenantId: string;
  sessionCount: number;
  connectedAt: string;
  lastSeenAt: string;
  ip?: string;
}

export class PresenceService {
  private static instance: PresenceService;

  // Primary presence registry: tenantId -> (userId -> UserPresenceSession)
  private tenantPresences: Map<string, Map<string, UserPresenceSession>> = new Map();

  // Reverse mapping for fast O(1) disconnect resolution: socketId -> { tenantId, userId }
  private socketToUserMap: Map<string, { tenantId: string; userId: string }> = new Map();

  // Cache resolved user names & roles from DB so HTTP-only requests show real full_name
  private userProfileCache: Map<string, { name: string; roleName: string }> = new Map();
  private pendingProfileLookups: Set<string> = new Set();

  // Socket IO reference for broadcasting presence deltas
  private io: any = null;

  private constructor() {
    // Periodically clean up stale sessions (every 30s for HTTP-only idle users, 12h for zombie WS)
    setInterval(() => {
      this.purgeStaleSessions();
    }, 30 * 1000);

    // Sync this worker's active user sessions to Redis every 4 seconds for PM2 cluster aggregation
    setInterval(() => {
      this.syncWorkerSnapshotToRedis();
    }, 4000);
  }

  public static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  /**
   * Set global Socket.IO instance for broadcasting presence updates
   */
  public setIo(ioInstance: any): void {
    this.io = ioInstance;
  }

  /**
   * Register a user connection from Socket.io handshake
   */
  public registerConnection(socket: any, user: { id: string; name?: string; full_name?: string; roleName?: string; role?: string; tenantId: string }): void {
    if (!user || !user.id || !user.tenantId) return;

    const tenantId = String(user.tenantId);
    const userId = String(user.id);
    const socketId = String(socket.id);
    const displayName = user.full_name || user.name || 'Pengguna';
    
    let rawRole = String(user.roleName || (user as any).role || '').trim().toUpperCase();
    if (!rawRole || rawRole === 'UNDEFINED' || rawRole === 'NULL') {
      rawRole = 'ADMIN';
    }
    const roleName = rawRole;
    const clientIp = String((socket.handshake as any)?.address || '');
    const userAgent = String((socket.handshake?.headers as any)?.['user-agent'] || '');

    if (!this.tenantPresences.has(tenantId)) {
      this.tenantPresences.set(tenantId, new Map());
    }

    const tenantUsers = this.tenantPresences.get(tenantId)!;
    const now = new Date();

    let isNewOnlineUser = false;

    if (!tenantUsers.has(userId)) {
      isNewOnlineUser = true;
      tenantUsers.set(userId, {
        userId,
        name: displayName,
        roleName,
        tenantId,
        socketIds: new Set([socketId]),
        connectedAt: now,
        lastSeenAt: now,
        ip: clientIp,
        userAgent
      });
    } else {
      const existing = tenantUsers.get(userId)!;
      existing.socketIds.add(socketId);
      existing.lastSeenAt = now;
      if (displayName) existing.name = displayName;
      if (roleName) existing.roleName = roleName;
    }

    this.socketToUserMap.set(socketId, { tenantId, userId });

    // Broadcast presence update to tenant room
    if (this.io) {
      if (isNewOnlineUser) {
        this.io.to(`tenant:${tenantId}`).emit('presence:user_online', {
          userId,
          name: displayName,
          role: roleName,
          roleName,
          connectedAt: now.toISOString(),
          totalOnline: tenantUsers.size,
          activeUsers: tenantUsers.size,
          totalActiveUsers: tenantUsers.size,
          tabsCount: 1,
          sessionCount: 1
        });
      }
      // Broadcast live total counter to tenant channel
      this.broadcastTenantCount(tenantId);
    }
  }

  /**
   * Unregister a socket on disconnect
   */
  public unregisterConnection(socketId: string, tenantIdHint?: string, userIdHint?: string): { wasRemoved: boolean; remainingSockets: number } {
    const mapped = this.socketToUserMap.get(socketId);
    const tenantId = mapped?.tenantId || tenantIdHint;
    const userId = mapped?.userId || userIdHint;

    this.socketToUserMap.delete(socketId);

    if (!tenantId || !userId) {
      return { wasRemoved: false, remainingSockets: 0 };
    }

    const tenantUsers = this.tenantPresences.get(tenantId);
    if (!tenantUsers) {
      return { wasRemoved: false, remainingSockets: 0 };
    }

    const userSession = tenantUsers.get(userId);
    if (!userSession) {
      return { wasRemoved: false, remainingSockets: 0 };
    }

    userSession.socketIds.delete(socketId);
    const remaining = userSession.socketIds.size;

    if (remaining === 0) {
      // User has closed all tabs/connections -> OFFLINE
      tenantUsers.delete(userId);
      if (tenantUsers.size === 0) {
        this.tenantPresences.delete(tenantId);
      }

      if (this.io) {
        this.io.to(`tenant:${tenantId}`).emit('presence:user_offline', {
          userId,
          name: userSession.name,
          role: userSession.roleName,
          roleName: userSession.roleName,
          offlineAt: new Date().toISOString(),
          totalOnline: tenantUsers ? tenantUsers.size : 0,
          activeUsers: tenantUsers ? tenantUsers.size : 0,
          totalActiveUsers: tenantUsers ? tenantUsers.size : 0
        });
        this.broadcastTenantCount(tenantId);
      }

      return { wasRemoved: true, remainingSockets: 0 };
    }

    return { wasRemoved: false, remainingSockets: remaining };
  }

  /**
   * Register or refresh user presence from authenticated HTTP requests (covers mobile APK & REST clients)
   */
  public registerHttpActivity(
    user: { id: string; name?: string; full_name?: string; roleName?: string; role?: string; tenantId?: string; tenant_id?: string },
    ip?: string
  ): void {
    const userId = String(user?.id || '').trim();
    const tenantId = String(user?.tenantId || user?.tenant_id || '').trim();
    if (!userId || !tenantId) return;

    const cachedProfile = this.userProfileCache.get(userId);
    let displayName = String(user.full_name || user.name || cachedProfile?.name || '').trim();
    let rawRole = String(user.roleName || (user as any).role || cachedProfile?.roleName || '').trim().toUpperCase();
    if (!rawRole || rawRole === 'UNDEFINED' || rawRole === 'NULL') {
      rawRole = 'ADMIN';
    }

    if (displayName && displayName !== 'Pengguna') {
      this.userProfileCache.set(userId, { name: displayName, roleName: rawRole });
    } else if (!cachedProfile && !this.pendingProfileLookups.has(userId)) {
      this.pendingProfileLookups.add(userId);
      prisma.user
        .findUnique({
          where: { id: userId },
          select: { full_name: true, email: true, Role: { select: { name: true } } } as any,
        })
        .then((dbUser: any) => {
          if (dbUser) {
            const resolvedName = String(dbUser.full_name || dbUser.email || 'Pengguna').trim();
            const resolvedRole = String(dbUser.Role?.name || rawRole || 'ADMIN').trim().toUpperCase();
            this.userProfileCache.set(userId, { name: resolvedName, roleName: resolvedRole });
            const tMap = this.tenantPresences.get(tenantId);
            const sess = tMap?.get(userId);
            if (sess) {
              if (!sess.name || sess.name === 'Pengguna') sess.name = resolvedName;
              if (resolvedRole) sess.roleName = resolvedRole;
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          this.pendingProfileLookups.delete(userId);
        });
    }

    if (!displayName) displayName = 'Pengguna';

    if (!this.tenantPresences.has(tenantId)) {
      this.tenantPresences.set(tenantId, new Map());
    }
    const tenantUsers = this.tenantPresences.get(tenantId)!;
    const now = new Date();

    if (!tenantUsers.has(userId)) {
      tenantUsers.set(userId, {
        userId,
        name: displayName,
        roleName: rawRole,
        tenantId,
        socketIds: new Set(),
        connectedAt: now,
        lastSeenAt: now,
        ip: ip || '',
      });
    } else {
      const existing = tenantUsers.get(userId)!;
      existing.lastSeenAt = now;
      if (displayName && displayName !== 'Pengguna') existing.name = displayName;
      if (rawRole && rawRole !== 'ADMIN') existing.roleName = rawRole;
      if (ip && !existing.ip) existing.ip = ip;
    }
  }

  /**
   * Sync this worker's active user sessions to Redis for PM2 cluster aggregation
   */
  public async syncWorkerSnapshotToRedis(): Promise<void> {
    try {
      const redis = getRedisConnection() as any;
      if (!redis) return;

      const tenantsPayload: Record<string, Array<UserPresenceSummary & { role: string; tabsCount: number }>> = {};

      for (const [tId, users] of this.tenantPresences.entries()) {
        if (users.size === 0) continue;
        const list: Array<UserPresenceSummary & { role: string; tabsCount: number }> = [];
        for (const session of users.values()) {
          let role = session.roleName || 'ADMIN';
          if (!role || role.toUpperCase() === 'UNDEFINED' || role.toUpperCase() === 'NULL') {
            role = 'ADMIN';
          }
          role = role.toUpperCase();
          const tabs = Math.max(1, session.socketIds.size);
          list.push({
            userId: session.userId,
            name: session.name || 'Pengguna',
            roleName: role,
            role,
            tenantId: session.tenantId,
            sessionCount: tabs,
            tabsCount: tabs,
            connectedAt: session.connectedAt.toISOString(),
            lastSeenAt: session.lastSeenAt.toISOString(),
            ip: session.ip,
          });
        }
        tenantsPayload[tId] = list;
      }

      await redis.set(
        `${REDIS_PRESENCE_SNAPSHOT_PREFIX}${process.pid}`,
        JSON.stringify({ pid: process.pid, updatedAt: Date.now(), tenants: tenantsPayload }),
        'EX',
        25
      );
    } catch {
      // Non-blocking if Redis is unavailable
    }
  }

  /**
   * Broadcast updated cluster-wide total online count to tenant rooms
   */
  private broadcastTenantCount(tenantId: string): void {
    if (!this.io) return;
    this.syncWorkerSnapshotToRedis()
      .then(() => this.getClusterTenantSummary(tenantId, false))
      .then((summary) => {
        if (!this.io) return;
        const count = summary.totalOnline;
        this.io.to(`tenant:${tenantId}`).emit('presence:count_update', {
          tenantId,
          totalOnline: count,
          activeUsers: count,
          totalActiveUsers: count,
          count,
          timestamp: new Date().toISOString(),
        });
      })
      .catch(() => {
        if (!this.io) return;
        const count = this.getActiveUserCount(tenantId);
        this.io.to(`tenant:${tenantId}`).emit('presence:count_update', {
          tenantId,
          totalOnline: count,
          activeUsers: count,
          totalActiveUsers: count,
          count,
          timestamp: new Date().toISOString(),
        });
      });
  }

  /**
   * Touch session to keep active timestamp fresh
   */
  public touchUser(tenantId: string, userId: string): void {
    const tenantUsers = this.tenantPresences.get(tenantId);
    if (tenantUsers && tenantUsers.has(userId)) {
      tenantUsers.get(userId)!.lastSeenAt = new Date();
    }
  }

  /**
   * Get count of unique active users (realtime on local worker)
   * If tenantId is provided, returns active users for that tenant.
   * If omitted, returns global active users across all tenants.
   */
  public getActiveUserCount(tenantId?: string): number {
    if (tenantId) {
      const users = this.tenantPresences.get(tenantId);
      return users ? users.size : 0;
    }

    // Global across all tenants
    let globalCount = 0;
    for (const users of this.tenantPresences.values()) {
      globalCount += users.size;
    }
    return globalCount;
  }

  /**
   * Export active user IDs grouped by tenantId for cluster-wide Redis telemetry aggregation
   */
  public getActiveUserIdsByTenant(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [tId, users] of this.tenantPresences.entries()) {
      if (users.size > 0) {
        result[tId] = Array.from(users.keys());
      }
    }
    return result;
  }

  /**
   * Get cluster-wide detailed active users summary across all PM2 workers via Redis.
   * When includeAllTenants is true (or tenantId === 'system'), aggregates users across all tenants.
   */
  public async getClusterTenantSummary(
    tenantId?: string,
    includeAllTenants = false
  ): Promise<{
    totalOnline: number;
    totalActiveUsers: number;
    totalConnections: number;
    roleBreakdown: Record<string, number>;
    roleCounts: Record<string, number>;
    users: (UserPresenceSummary & { role: string; tabsCount: number })[];
  }> {
    await this.syncWorkerSnapshotToRedis();

    const mergedUsersMap: Map<string, UserPresenceSummary & { role: string; tabsCount: number }> = new Map();
    const aggregateAll = includeAllTenants || !tenantId || tenantId === 'system';

    const mergeUserEntry = (u: UserPresenceSummary & { role: string; tabsCount: number }) => {
      if (!u || !u.userId) return;
      if (!aggregateAll && u.tenantId !== tenantId) return;

      const existing = mergedUsersMap.get(u.userId);
      if (!existing) {
        mergedUsersMap.set(u.userId, { ...u });
      } else {
        // Combine tabs/sessions across workers and pick best display name & latest seen timestamp
        if (u.name && u.name !== 'Pengguna' && existing.name === 'Pengguna') {
          existing.name = u.name;
        }
        if (u.role && u.role !== 'ADMIN' && existing.role === 'ADMIN') {
          existing.role = u.role;
          existing.roleName = u.role;
        }
        if (new Date(u.connectedAt).getTime() < new Date(existing.connectedAt).getTime()) {
          existing.connectedAt = u.connectedAt;
        }
        if (new Date(u.lastSeenAt).getTime() > new Date(existing.lastSeenAt).getTime()) {
          existing.lastSeenAt = u.lastSeenAt;
        }
      }
    };

    // 1. Read snapshots from all PM2 workers in Redis
    try {
      const redis = getRedisConnection() as any;
      if (redis) {
        const keys: string[] = await redis.keys(`${REDIS_PRESENCE_SNAPSHOT_PREFIX}*`);
        if (keys.length > 0) {
          const rawList = await redis.mget(...keys);
          for (const raw of rawList) {
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              const tenantsObj = parsed?.tenants || {};
              if (aggregateAll) {
                for (const list of Object.values(tenantsObj)) {
                  if (Array.isArray(list)) {
                    for (const u of list) mergeUserEntry(u);
                  }
                }
              } else {
                const list = tenantsObj[tenantId!];
                if (Array.isArray(list)) {
                  for (const u of list) mergeUserEntry(u);
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    // 2. Also merge local worker memory in case Redis had any lag
    for (const [tId, users] of this.tenantPresences.entries()) {
      if (!aggregateAll && tId !== tenantId) continue;
      for (const session of users.values()) {
        let role = session.roleName || 'ADMIN';
        if (!role || role.toUpperCase() === 'UNDEFINED' || role.toUpperCase() === 'NULL') {
          role = 'ADMIN';
        }
        role = role.toUpperCase();
        const tabs = Math.max(1, session.socketIds.size);
        mergeUserEntry({
          userId: session.userId,
          name: session.name || 'Pengguna',
          roleName: role,
          role,
          tenantId: session.tenantId,
          sessionCount: tabs,
          tabsCount: tabs,
          connectedAt: session.connectedAt.toISOString(),
          lastSeenAt: session.lastSeenAt.toISOString(),
          ip: session.ip,
        });
      }
    }

    const users = Array.from(mergedUsersMap.values());
    users.sort((a, b) => new Date(b.lastSeenAt || b.connectedAt).getTime() - new Date(a.lastSeenAt || a.connectedAt).getTime());

    const roleBreakdown: Record<string, number> = {};
    let totalConnections = 0;
    for (const u of users) {
      const r = (u.role || u.roleName || 'ADMIN').toUpperCase();
      roleBreakdown[r] = (roleBreakdown[r] || 0) + 1;
      totalConnections += Math.max(1, u.tabsCount || 1);
    }

    return {
      totalOnline: users.length,
      totalActiveUsers: users.length,
      totalConnections,
      roleBreakdown,
      roleCounts: roleBreakdown,
      users,
    };
  }

  /**
   * Get detailed active users summary for a tenant (local worker synchronous fallback)
   */
  public getTenantSummary(tenantId: string): {
    totalOnline: number;
    totalActiveUsers: number;
    roleBreakdown: Record<string, number>;
    roleCounts: Record<string, number>;
    users: (UserPresenceSummary & { role: string; tabsCount: number })[];
  } {
    const tenantUsers = this.tenantPresences.get(tenantId);
    if (!tenantUsers || tenantUsers.size === 0) {
      return {
        totalOnline: 0,
        totalActiveUsers: 0,
        roleBreakdown: {},
        roleCounts: {},
        users: []
      };
    }

    const roleBreakdown: Record<string, number> = {};
    const users: (UserPresenceSummary & { role: string; tabsCount: number })[] = [];

    for (const session of tenantUsers.values()) {
      let role = session.roleName || 'ADMIN';
      if (!role || role.toUpperCase() === 'UNDEFINED' || role.toUpperCase() === 'NULL') {
        role = 'ADMIN';
      }
      role = role.toUpperCase();
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      const tabs = Math.max(1, session.socketIds.size);

      users.push({
        userId: session.userId,
        name: session.name,
        roleName: role,
        role,
        tenantId: session.tenantId,
        sessionCount: tabs,
        tabsCount: tabs,
        connectedAt: session.connectedAt.toISOString(),
        lastSeenAt: session.lastSeenAt.toISOString(),
        ip: session.ip
      });
    }

    // Sort newest connections first
    users.sort((a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime());

    return {
      totalOnline: tenantUsers.size,
      totalActiveUsers: tenantUsers.size,
      roleBreakdown,
      roleCounts: roleBreakdown,
      users
    };
  }

  /**
   * Get global stats across all tenants (for platform admin / telemetry)
   */
  public getGlobalSummary(): {
    totalOnline: number;
    activeTenantsCount: number;
    tenantCounts: Record<string, number>;
  } {
    let totalOnline = 0;
    const tenantCounts: Record<string, number> = {};

    for (const [tId, users] of this.tenantPresences.entries()) {
      const count = users.size;
      totalOnline += count;
      tenantCounts[tId] = count;
    }

    return {
      totalOnline,
      activeTenantsCount: this.tenantPresences.size,
      tenantCounts
    };
  }

  /**
   * Housekeeping: Purge any idle HTTP-only sessions (> 4 mins) or zombie WS sessions (> 12 hours)
   */
  private purgeStaleSessions(): void {
    const now = Date.now();
    const MAX_WS_STALE_MS = 12 * 60 * 60 * 1000; // 12 hours

    for (const [tenantId, users] of this.tenantPresences.entries()) {
      for (const [userId, session] of users.entries()) {
        const idleMs = now - session.lastSeenAt.getTime();
        if (session.socketIds.size === 0 && idleMs > HTTP_ONLY_STALE_MS) {
          users.delete(userId);
        } else if (idleMs > MAX_WS_STALE_MS) {
          users.delete(userId);
        }
      }
      if (users.size === 0) {
        this.tenantPresences.delete(tenantId);
      }
    }
  }
}

export const presenceService = PresenceService.getInstance();
