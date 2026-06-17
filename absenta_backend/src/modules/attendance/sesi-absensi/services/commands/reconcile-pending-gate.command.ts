import { sesiDb } from '../repositories/sesi.db';
import { getRedisConnection } from '@/queue/redis';

/**
 * Reconciles student attendance records that were marked as 'not from gate' (asal_gerbang = false)
 * because the gate entry data was missing (e.g. offline sync lag).
 * This is called when a late gate-tap event arrives via the domain event bus.
 */
export async function reconcilePendingGate(params: {
  tenantId: string;
  studentId: string;
}): Promise<void> {
  const { tenantId, studentId } = params;
  
  // Calculate relative today start/end
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  try {
    // 1. Find all pending session records for this student today
    // We update asal_gerbang to true because the gate tap has now been confirmed.
    const result = await (sesiDb as any).absenSiswa.updateMany({
      where: {
        tenant_id: tenantId,
        siswa_id: studentId,
        asal_gerbang: false,
        created_at: { gte: startOfDay, lte: endOfDay }
      },
      data: {
        asal_gerbang: true,
        updated_at: new Date()
      }
    });

    if (result.count > 0) {
      console.log(`[Reconciliation] Successfully validated ${result.count} session records for student ${studentId} via late gate sync.`);
      
      // 2. Notify UI via Socket.io (via Redis publish)
      // This ensures the teacher's dashboard updates the 'Gate Status' icon in real-time.
      const redis = getRedisConnection();
      await redis.publish('events:session_attendance_update', JSON.stringify({
        tenant_id: tenantId,
        reconciled: true,
        siswa_id: studentId,
        count: result.count,
        timestamp: new Date().toISOString()
      }));
    }
  } catch (error) {
    console.error(`[Reconciliation] Failed to reconcile records for student ${studentId}:`, error);
  }
}
