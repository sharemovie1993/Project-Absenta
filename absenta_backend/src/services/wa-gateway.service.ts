// @ts-nocheck
import {
  callMasterViaRpc,
  waGatewayServiceLocal,
  getRedisConnection,
  getGroupsCacheKey,
  initClusterRpc,
  isMasterInstance
} from './wa-gateway/wa-engine';

export const waGatewayService = {
  async initTenant(tenantId: string): Promise<void> {
    return callMasterViaRpc('initTenant', tenantId);
  },
  async sendMessage(tenantId: string, nomor: string, pesan: string): Promise<boolean> {
    return callMasterViaRpc('sendMessage', tenantId, [nomor, pesan]);
  },
  async sendMessageToJid(tenantId: string, jidTarget: string, pesan: string): Promise<boolean> {
    return callMasterViaRpc('sendMessageToJid', tenantId, [jidTarget, pesan]);
  },
  async sendMessageSoft(tenantId: string, nomor: string | null | undefined, pesan: string, source?: string): Promise<void> {
    return waGatewayServiceLocal.sendMessageSoft(tenantId, nomor, pesan, source);
  },
  async hasWaSubscription(tenantId: string): Promise<boolean> {
    return waGatewayServiceLocal.hasWaSubscription(tenantId);
  },
  async getStatus(tenantId: string) {
    return callMasterViaRpc('getStatus', tenantId);
  },
  async getHealthStatus(tenantId: string) {
    return callMasterViaRpc('getHealthStatus', tenantId);
  },
  async getQRBase64(tenantId: string): Promise<string | null> {
    return callMasterViaRpc('getQRBase64', tenantId);
  },
  clearTenantAuth(tenantId: string) {
    return waGatewayServiceLocal.clearTenantAuth(tenantId);
  },
  async disconnectTenant(tenantId: string): Promise<void> {
    return callMasterViaRpc('disconnectTenant', tenantId);
  },
  async getParticipatingGroups(tenantId: string, forceRefresh = false) {
    if (!forceRefresh) {
      const redis = getRedisConnection();
      if (redis) {
        try {
          const cached = await redis.get(getGroupsCacheKey(tenantId));
          if (cached) {
            console.log(`[WA-Pool:${tenantId}] Groups: Serving from Redis cache (local process check).`);
            return JSON.parse(cached);
          }
        } catch (_) {}
      }
    }
    return callMasterViaRpc('getParticipatingGroups', tenantId, [forceRefresh]);
  },
  async invalidateGroupsCache(tenantId: string): Promise<void> {
    return callMasterViaRpc('invalidateGroupsCache', tenantId);
  },
  on(tenantId: string, event: string, listener: (...args: any[]) => void) {
    return waGatewayServiceLocal.on(tenantId, event, listener);
  },
  async restoreConnections(): Promise<void> {
    initClusterRpc();
    if (isMasterInstance()) {
      return waGatewayServiceLocal.restoreConnections();
    }
  },
  async shutdownAll(): Promise<void> {
    return waGatewayServiceLocal.shutdownAll();
  },
};
