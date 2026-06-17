import { Socket } from 'socket.io';
import { getRedisConnection } from '../redis/redisClient';
import { prisma } from '../../utils/prisma';

export class SocketMonitor {
  private static instance: SocketMonitor;
  
  // Stats storage
  private activeConnections: Map<string, Set<string>> = new Map(); // tenantId -> Set<socketId>
  private eventCounts: Map<string, number> = new Map(); // tenantId -> count
  private eventRates: Map<string, number> = new Map(); // tenantId -> last second rate
  
  // Cache for tenant names
  private tenantNames: Map<string, string> = new Map();

  private userRateLimits: Map<string, { count: number, start: number }> = new Map(); // socketId -> { count, start }
  
  // Configuration
  private static readonly MAX_CONNECTIONS_PER_TENANT = 50;
  private static readonly MONITOR_INTERVAL_MS = 1000;
  private static readonly MAX_EVENTS_PER_USER_PER_SEC = 20;

  private constructor() {
    // Start monitoring interval
    setInterval(() => {
      this.rotateStats();
    }, SocketMonitor.MONITOR_INTERVAL_MS);
  }

  public static getInstance(): SocketMonitor {
    if (!SocketMonitor.instance) {
      SocketMonitor.instance = new SocketMonitor();
    }
    return SocketMonitor.instance;
  }

  /**
   * Register a new connection.
   * Throws error if limit exceeded.
   */
  public onConnect(socket: Socket, tenantId: string) {
    if (!tenantId) return;

    if (!this.activeConnections.has(tenantId)) {
      this.activeConnections.set(tenantId, new Set());
    }

    const connections = this.activeConnections.get(tenantId)!;
    
    // Guard: Max Connection Limit
    if (connections.size >= SocketMonitor.MAX_CONNECTIONS_PER_TENANT) {
      throw new Error(`Connection limit exceeded for tenant ${tenantId}`);
    }

    connections.add(socket.id);
    
    // Attach event monitor
    socket.onAny(() => {
      // 3. Rate Limit Event per User
      if (this.checkRateLimit(socket)) {
        this.recordEvent(tenantId);
      }
    });
  }

  /**
   * Check if user exceeded rate limit
   */
  private checkRateLimit(socket: Socket): boolean {
    const socketId = socket.id;
    const now = Date.now();
    const limit = this.userRateLimits.get(socketId) || { count: 0, start: now };

    if (now - limit.start > 1000) {
      limit.count = 1;
      limit.start = now;
    } else {
      limit.count++;
      if (limit.count > SocketMonitor.MAX_EVENTS_PER_USER_PER_SEC) {
        // Disconnect user if rate limit exceeded
        socket.disconnect(true);
        console.warn(`[WS] Rate limit exceeded for socket ${socketId}. Disconnecting.`);
        return false;
      }
    }
    this.userRateLimits.set(socketId, limit);
    return true;
  }

  /**
   * Cleanup on disconnect
   */
  public onDisconnect(socket: Socket, tenantId: string) {
    if (!tenantId) return;
    const connections = this.activeConnections.get(tenantId);
    if (connections) {
      connections.delete(socket.id);
      if (connections.size === 0) {
        this.activeConnections.delete(tenantId);
      }
    }
    this.userRateLimits.delete(socket.id);
  }

  /**
   * Record an event occurrence for a tenant
   */
  public recordEvent(tenantId: string) {
    const current = this.eventCounts.get(tenantId) || 0;
    this.eventCounts.set(tenantId, current + 1);

    // 1. Persist Monitoring Metrics (Redis)
    try {
      const redis = getRedisConnection() as any;
      void redis.incr(`stats:events:${tenantId}`);
    } catch {}
  }

  /**
   * Rotate stats (called every second)
   */
  private rotateStats() {
    // Move current counts to rates and reset counts
    for (const [tenantId, count] of this.eventCounts.entries()) {
      this.eventRates.set(tenantId, count);
      this.eventCounts.set(tenantId, 0);
    }
  }

  /**
   * Get current monitoring stats
   */
  public async getStats() {
    const stats: any[] = [];
    const allTenants = new Set([
      ...this.activeConnections.keys(),
      ...this.eventRates.keys()
    ]);

    // Fetch missing names
    const missingIds = Array.from(allTenants).filter(id => !this.tenantNames.has(id));
    if (missingIds.length > 0) {
      try {
        const tenants = await prisma.tenant.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, name: true }
        });
        tenants.forEach(t => this.tenantNames.set(t.id, t.name));
      } catch (e) {
        console.error('Failed to fetch tenant names', e);
      }
    }

    for (const tenantId of allTenants) {
      const eventRate = this.eventRates.get(tenantId) || 0;
      stats.push({
        tenantId,
        tenantName: this.tenantNames.get(tenantId) || 'Unknown Tenant',
        activeConnections: this.activeConnections.get(tenantId)?.size || 0,
        eventRate,
        // Estimated CPU usage based on event rate (heuristic: 100 events/sec ~= 1% CPU)
        cpuUsageEstimate: (eventRate * 0.01).toFixed(2) + '%'
      });
    }
    return stats;
  }

  /**
   * Get global stats
   */
  public async getGlobalStats() {
    const stats = await this.getStats();
    
    let totalConnections = 0;
    let totalEventsPerSec = 0;

    for (const tenant of stats) {
      totalConnections += tenant.activeConnections;
      totalEventsPerSec += tenant.eventRate;
    }

    // Heuristic: 100 events/sec ~= 1% CPU
    const cpuEstimate = (totalEventsPerSec * 0.01).toFixed(2) + '%';

    return {
      totalConnections,
      eventRate: totalEventsPerSec,
      cpuEstimate,
      tenants: stats
    };
  }
}
