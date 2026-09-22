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
import { getTenantTimezone } from '@/utils/timezone.utils';
export class HubinCommonHelper {
  protected async ensureOwnership(tenantId: string, id: string, userId: string, org?: any) {
    if (org?.tenant_wide === true) return true;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        Guru: true,
        Role: { include: { rolePermissions: true } },
        organizationalAssignments: {
          where: { is_active: true },
          include: { Position: true }
        }
      }
    });

    const isGlobalHubin = user?.Role?.name === 'ADMIN' || 
                         user?.Role?.name === 'SUPERADMIN' ||
                         user?.organizationalAssignments?.some((oa: any) => oa.Position?.code === 'HUBIN') ||
                         user?.Role?.rolePermissions?.some((rp: any) => 
                           rp.permission_id === 'hubin.partners.manage' || rp.permission_id === 'hubin.pkl.manage'
                         );

    if (isGlobalHubin) return true;

    const pkl = await prisma.siswaPkl.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!pkl) throw new Error('Data penempatan PKL tidak ditemukan');

    if (user?.Guru?.id && pkl.pembimbing_id !== user.Guru.id) {
      throw new Error('Anda tidak memiliki akses ke data siswa ini');
    }

    return true;
  }

  log(tenantId: string, userId: string | null, event: string, entity: string, entityId?: string | null, metadata?: any) {
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

  protected async getTenantTz(tenantId?: string | null): Promise<string> {
    return await getTenantTimezone(tenantId);
  }

  protected async getTodayDateForTenant(tenantId: string): Promise<Date> {
    const tz = await this.getTenantTz(tenantId);
    return this.getTodayDate(tz);
  }

  protected async parseDateOnlyForTenant(tenantId: string, dateInput: string | Date): Promise<Date> {
    const tz = await this.getTenantTz(tenantId);
    return this.parseDateOnly(dateInput, tz);
  }

  protected getTodayDate(tz: string = 'Asia/Jakarta'): Date {
    const dateStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: tz, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(new Date());
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  protected parseDateOnly(dateInput: string | Date, tz: string = 'Asia/Jakarta'): Date {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const dateStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: tz, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(d);
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  /**
   * Helper: Calculate distance between two GPS coordinates in meters (Haversine formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
