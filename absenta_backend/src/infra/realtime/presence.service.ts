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

  // Socket IO reference for broadcasting presence deltas
  private io: any = null;

  private constructor() {
    // Periodically clean up stale sessions (> 12 hours without touch, defensive cleanup)
    setInterval(() => {
      this.purgeStaleSessions();
    }, 10 * 60 * 1000); // Every 10 mins
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
   * Broadcast updated total online count to tenant rooms
   */
  private broadcastTenantCount(tenantId: string): void {
    if (!this.io) return;
    const count = this.getActiveUserCount(tenantId);
    this.io.to(`tenant:${tenantId}`).emit('presence:count_update', {
      tenantId,
      totalOnline: count,
      activeUsers: count,
      totalActiveUsers: count,
      count,
      timestamp: new Date().toISOString()
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
   * Get count of unique active users (realtime)
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
   * Get detailed active users summary for a tenant
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

      users.push({
        userId: session.userId,
        name: session.name,
        roleName: role,
        role,
        tenantId: session.tenantId,
        sessionCount: session.socketIds.size,
        tabsCount: session.socketIds.size,
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
   * Housekeeping: Purge any zombie sessions
   */
  private purgeStaleSessions(): void {
    const now = Date.now();
    const MAX_STALE_MS = 12 * 60 * 60 * 1000; // 12 hours

    for (const [tenantId, users] of this.tenantPresences.entries()) {
      for (const [userId, session] of users.entries()) {
        if (session.socketIds.size === 0 || now - session.lastSeenAt.getTime() > MAX_STALE_MS) {
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
