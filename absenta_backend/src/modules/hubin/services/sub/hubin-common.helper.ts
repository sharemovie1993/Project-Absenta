// @ts-nocheck
import { prisma } from '@/utils/prisma';
import crypto from 'crypto';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { studentResolverService } from '@/services/student-resolver.service';
import { waGatewayService } from '@/services/wa-gateway.service';
import { getRedisConnection } from '@/queue/redis';
import { cacheService } from '@/utils/cache.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';
import { HubinCommonHelper } from './hubin-common.helper';

export class HubinCommonHelper {
  private log(tenantId: string, userId: string | null, event: string, entity: string, entityId?: string | null, metadata?: any) {
    try {
      activityLogService.logEvent({
        event_type: event,
        tenant_id: tenantId,
        user_id: userId,
        entity,
        entity_id: entityId,
        metadata
      });

      // Emit real-time event via Redis Pub/Sub
      queueMicrotask(async () => {
        try {
          const redis = getRedisConnection();
          let actorName = 'System / Anonim';
          if (userId) {
            const userObj = await prisma.user.findUnique({
              where: { id: userId },
              select: { full_name: true }
            });
            if (userObj?.full_name) {
              actorName = userObj.full_name;
            }
          }
          const payload = {
            id: crypto.randomUUID(),
            action: event,
            actor: actorName,
            entity,
            entity_id: entityId,
            metadata: metadata || null,
            created_at: new Date().toISOString(),
            tenant_id: tenantId
          };
          await redis.publish('events:hubin_activity_update', JSON.stringify(payload));
        } catch (wsErr) {
          console.error('[WS HUBIN LOG] Failed to publish real-time update:', wsErr);
        }
      });
    } catch (err) {
      console.error(`Failed to log HUBIN event ${event}:`, err);
    }
  }
}
