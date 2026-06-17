import { prisma } from '@/utils/prisma';
import { emitDomainEvent } from '@/infra/event-bus';
import { getRedisConnection } from '@/queue/redis';

export class AbsensiManualService {
  /**
   * Submit manual attendance (IZIN / SAKIT / ALPA)
   * Usually used by teachers/admins when student is not present physically to tap.
   */
  async submit(tenantId: string, siswaId: string, status: string, tanggal: Date, catatan?: string) {
    // 1. Validate status
    const validStatuses = ['IZIN', 'SAKIT', 'ALPA', 'DISPEN'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
    }

    // 2. Create/Update Attendance Record (Gate Level)
    // We assume manual entry corresponds to "Gate" attendance for the day.
    
    // Check if record exists for this date
    const startOfDay = new Date(tanggal);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tanggal);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.absenGerbangSiswa.findFirst({
      where: {
        tenant_id: tenantId,
        siswa_id: siswaId,
        waktu_tap: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    let record;
    if (existing) {
      record = await prisma.absenGerbangSiswa.update({
        where: { id_created_at: { id: existing.id, created_at: existing.created_at } },
        data: {
          status: status,
          // catatan removed as it's not in schema
          // is_manual: true // Assuming field exists or we just update status
        }
      });
    } else {
      record = await prisma.absenGerbangSiswa.create({
        data: {
          tenant_id: tenantId,
          siswa_id: siswaId,
          status: status,
          waktu_tap: new Date(),
          // catatan removed as it's not in schema
          arah: 'MASUK',
          verification_method: 'MANUAL'
        } as any
      });
    }

    // 4. Emit Real-time Socket Event (Standardized)
    try {
      const payload = {
        tenant_id: String(tenantId),
        siswa_id: String(siswaId),
        status: status,
        record_id: String(record.id),
        arah: 'MASUK',
        source: 'MANUAL_ENTRY'
      };
      const redis = getRedisConnection();
      await (redis as any).publish('events:gerbang_tap_update', JSON.stringify(payload));
    } catch (e) {
      console.warn('[AbsensiManualService] Socket emit failed', e);
    }

    // 3. Trigger Notification (STUDENT_PERMISSION)
    if (['IZIN', 'SAKIT'].includes(status)) {
      await emitDomainEvent({
        event_type: 'attendance.manual.submit',
        tenant_id: tenantId,
        source_service: 'attendance',
        payload: {
          tenant_id: tenantId,
          student_id: siswaId,
          device_id: 'MANUAL',
          tap_time: new Date().toISOString(),
          source: 'MANUAL',
          related_id: record.id,
          status,
          catatan,
          notification_hint: 'STUDENT_PERMISSION',
        },
      });
    }

    return record;
  }
}

export const absensiManualService = new AbsensiManualService();
