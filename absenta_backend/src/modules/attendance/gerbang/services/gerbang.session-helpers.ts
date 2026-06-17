import { getRedisConnection } from '@/queue/redis';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { gerbangDb } from './repositories/gerbang.db';
import type { GerbangServiceResponse } from '../types/gerbang.types';
import { JenisTap, AbsensiMode } from '@/constants/enums';
import { buildDuplicateResponse, buildErrorResponse } from './gerbang.tap-helpers';

export async function markGatePresent(tenantId: string, siswaId: string): Promise<void> {
  try {
    const cfg = await systemConfigService.getActive(tenantId);
    const tz = String((cfg as any)?.timezone || '').trim();
    const offsetStr = tz === 'Asia/Makassar' ? '+08:00' : (tz === 'Asia/Jayapura' ? '+09:00' : '+07:00');
    const offsetHours = offsetStr === '+09:00' ? 9 : (offsetStr === '+08:00' ? 8 : 7);
    const dayStr = new Date(new Date().getTime() + offsetHours * 60 * 60 * 1000).toISOString().split('T')[0];
    const endOfDay = new Date(`${dayStr}T23:59:59.999${offsetStr}`);
    let ttlSeconds = Math.floor((endOfDay.getTime() - Date.now()) / 1000);
    ttlSeconds = Math.max(60, ttlSeconds);
    ttlSeconds = Math.min(ttlSeconds, 86400);
    const redis = getRedisConnection();
    const key = `absenta:gate_present:${tenantId}:${dayStr}:${siswaId}`;
    await (redis as any).set(key, '1', 'EX', ttlSeconds);
  } catch {}
}

export async function getOrCreateSessionInfo(tenantId: string): Promise<any> {
  const cfg = await systemConfigService.getActive(tenantId);
  const tz = String((cfg as any)?.timezone || '').trim();
  const offsetStr = tz === 'Asia/Makassar' ? '+08:00' : (tz === 'Asia/Jayapura' ? '+09:00' : '+07:00');
  const offsetHours = offsetStr === '+09:00' ? 9 : (offsetStr === '+08:00' ? 8 : 7);
  const dayStr = new Date(new Date().getTime() + offsetHours * 60 * 60 * 1000).toISOString().split('T')[0];
  const startOfDay = new Date(`${dayStr}T00:00:00.000${offsetStr}`);
  const endOfDay = new Date(`${dayStr}T23:59:59.999${offsetStr}`);

  let sesiGerbang = await gerbangDb.sesiGerbang.findFirst({
    where: {
      tenant_id: tenantId,
      tanggal: { gte: startOfDay, lte: endOfDay },
    },
  });

  if (sesiGerbang) return sesiGerbang;

  const redis = getRedisConnection();
  const lockKey = `absenta:lock:session:create:${tenantId}:${dayStr}`;
  const lockValue = Date.now().toString();
  const acquired = await (redis as any).set(lockKey, lockValue, 'EX', 5, 'NX');

  if (!acquired) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const retryResult = await gerbangDb.sesiGerbang.findFirst({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
    });
    if (!retryResult) throw new Error('Gagal mendapatkan sesi gerbang (Lock contention)');
    return retryResult;
  }

  try {
    sesiGerbang = await gerbangDb.sesiGerbang.findFirst({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (sesiGerbang) return sesiGerbang;

    let sekolah = await gerbangDb.sekolah.findFirst({
      where: { tenant_id: tenantId },
    });

    if (!sekolah) {
      sekolah = await gerbangDb.sekolah.create({
        data: {
          tenant_id: tenantId,
          nama: 'Default School',
        },
      });
    }

    const activeYear = await gerbangDb.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } } as any);
    sesiGerbang = await gerbangDb.sesiGerbang.create({
      data: {
        tenant_id: tenantId,
        sekolah_id: sekolah.id,
        tanggal: new Date(`${dayStr}T00:00:00.000${offsetStr}`),
        waktu_mulai: startOfDay,
        waktu_selesai: endOfDay,
        tahun_pelajaran_id: (activeYear as any)?.id || null,
      },
    });

    return sesiGerbang;
  } finally {
    const currentVal = await (redis as any).get(lockKey);
    if (currentVal === lockValue) {
      await (redis as any).del(lockKey);
    }
  }
}

export async function getSessionsForDate(tenantId: string, date?: Date): Promise<GerbangServiceResponse<{ sessions: any[]; date: string }>> {
  try {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await gerbangDb.sesiGerbang.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { waktu_mulai: 'asc' },
    });

    return {
      success: true,
      message: 'Sessions retrieved successfully',
      data: {
        sessions,
        date: targetDate.toISOString().split('T')[0],
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve sessions',
      error: {
        error_type: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { tenant_id: tenantId },
      } as any,
    };
  }
}

export async function getStudentCurrentStatus(tenantId: string, siswaId: string): Promise<GerbangServiceResponse<any>> {
  try {
    const siswa = await gerbangDb.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId } as any,
      select: { id: true, nama_siswa: true, Kelas: { select: { nama_kelas: true } } } as any,
    });

    if (!siswa) {
      return {
        success: false,
        message: 'Student not found',
        error: {
          error_type: 'STUDENT_ERROR',
          message: 'Student not found or does not belong to this tenant',
          details: { siswa_id: siswaId, tenant_id: tenantId },
        } as any,
      };
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const session = await gerbangDb.sesiGerbang.findFirst({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startOfDay, lte: endOfDay },
      } as any,
    });

    if (!session) {
      return {
        success: true,
        message: 'Student status retrieved successfully',
        data: {
          siswa_info: siswa,
          status: 'NO_SESSION',
          is_present: false,
          last_tap: null,
        },
      };
    }

    const taps = await gerbangDb.absenGerbangSiswa.findMany({
      where: {
        siswa_id: siswaId,
        sesi_gerbang_id: (session as any).id,
      } as any,
      orderBy: { waktu_tap: 'desc' },
    });

    const lastTap = (taps as any)[0] || null;
    const isPresent = lastTap?.arah === JenisTap.GERBANG_DATANG;

    return {
      success: true,
      message: 'Student status retrieved successfully',
      data: {
        siswa_info: siswa,
        status: lastTap ? 'HAS_TAPPED' : 'NOT_TAPPED',
        is_present: isPresent,
        last_tap: lastTap,
        tap_count: (taps as any).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve student status',
      error: {
        error_type: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { siswa_id: siswaId, tenant_id: tenantId },
      } as any,
    };
  }
}

export async function markManualAbsence(params: {
  tenantId: string;
  siswaId: string;
  status: string;
  userId: string;
  source: 'MANUAL_PETUGAS' | 'PARENT_APP';
  keterangan?: string;
  getOrCreateSession: (tenantId: string) => Promise<any>;
}): Promise<GerbangServiceResponse<any>> {
  const { tenantId, siswaId, status, userId, source, keterangan, getOrCreateSession } = params;

  const processingInfo: any = {
    start_time: new Date(),
    tenant_id: tenantId,
    user_id: userId,
    validation_steps: [],
    processing_steps: [],
  };

  try {
    const allowedStatuses = ['SAKIT', 'IZIN', 'ALPA', 'DISPEN'];
    if (!allowedStatuses.includes(status)) {
      return buildErrorResponse(
        {
          error_type: 'VALIDATION_ERROR',
          message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
        } as any,
        processingInfo,
      );
    }

    const session = await getOrCreateSession(tenantId);
    processingInfo.processing_steps!.push('session_resolved');

    const existing = await gerbangDb.absenGerbangSiswa.findFirst({
      where: { tenant_id: tenantId, sesi_gerbang_id: (session as any).id, siswa_id: siswaId, arah: 'GERBANG_DATANG' } as any,
    });
    if (existing) {
      return buildDuplicateResponse(existing, AbsensiMode.SIMPLE as any, processingInfo);
    }

    const siswaInfo = await gerbangDb.siswa.findFirst({ where: { id: siswaId, tenant_id: tenantId } as any, include: { Kelas: { select: { nama_kelas: true } } } as any });
    const activeYear = await gerbangDb.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } } as any);
    const tingkatData = (siswaInfo as any)?.kelas_id ? await gerbangDb.kelas.findUnique({ where: { id: (siswaInfo as any).kelas_id } as any, select: { tingkat: true } as any }) : null;

    const created = await gerbangDb.absenGerbangSiswa.create({
      data: {
        tenant_id: tenantId,
        sesi_gerbang_id: (session as any).id,
        siswa_id: siswaId,
        arah: 'GERBANG_DATANG',
        status: status as any,
        waktu_tap: new Date(),
        kelas_id_snapshot: (siswaInfo as any)?.kelas_id || null,
        kelas_nama_snapshot: (siswaInfo as any)?.Kelas?.nama_kelas || null,
        tingkat_snapshot: (tingkatData as any)?.tingkat ?? null,
        tahun_pelajaran_id_snapshot: (activeYear as any)?.id || null,
      } as any,
    });
    processingInfo.processing_steps!.push('record_created');

    try {
      const payload = {
        tenant_id: String(tenantId),
        sesi_gerbang_id: String((session as any).id),
        siswa_id: String(siswaId),
        arah: 'GERBANG_DATANG',
        waktu_tap: new Date().toISOString(),
        status: status,
        record_id: String((created as any).id),
        source: source,
      };

      try {
        const redis = (await import('@/queue/redis')).getRedisConnection() as any;
        await redis.publish('events:gerbang_tap_update', JSON.stringify(payload));
      } catch {}
    } catch (e) {
      console.error('[GerbangService] Failed to emit manual attendance socket event:', e);
    }

    const { emitDomainEvent } = await import('@/infra/event-bus');
    if (status === 'ALPA') {
      await emitDomainEvent({
        event_type: 'attendance.tap',
        tenant_id: tenantId,
        source_service: 'attendance',
        payload: {
          tenant_id: tenantId,
          student_id: siswaId,
          device_id: 'MANUAL',
          tap_time: new Date().toISOString(),
          source: 'GERBANG_MANUAL',
          related_id: (created as any).id,
          status: 'ALPA',
          arah: 'GERBANG_DATANG',
          notification_hint: 'STUDENT_ABSENT',
        },
      });
    }

    if (source === 'PARENT_APP' && (status === 'SAKIT' || status === 'IZIN')) {
      await emitDomainEvent({
        event_type: 'attendance.tap',
        tenant_id: tenantId,
        source_service: 'attendance',
        payload: {
          tenant_id: tenantId,
          student_id: siswaId,
          device_id: 'PARENT_APP',
          tap_time: new Date().toISOString(),
          source: 'PARENT_APP',
          related_id: (created as any).id,
          status,
          arah: 'GERBANG_DATANG',
          keterangan: keterangan || '',
          notification_hint: 'STUDENT_PERMISSION',
        },
      });
    }

    if (['SAKIT', 'IZIN', 'ALPA', 'DISPEN'].includes(status)) {
      try {
        const { sesiService } = await import('@/modules/attendance/sesi-absensi/services/sesi.service');
        await sesiService.propagateGateAbsenceToSessions(String(tenantId), String(siswaId), String(status), (created as any).waktu_tap || new Date());
        processingInfo.processing_steps!.push('propagation_triggered');
      } catch (e) {
        console.warn('Failed to propagate gate absence to sessions from manual mark', e);
      }
    }

    try {
      const logUserId = source === 'PARENT_APP' ? null : userId;
      const extraMeta = source === 'PARENT_APP' ? { parent_id: userId } : {};

      await gerbangDb.activityLog.create({
        data: {
          tenant_id: tenantId,
          user_id: logUserId,
          action: source === 'PARENT_APP' ? 'external.parent.report.absence' : 'ABSEN_GERBANG_MANUAL',
          entity: 'AbsenGerbangSiswa',
          entity_id: (created as any).id,
          metadata: JSON.stringify({
            siswa_id: siswaId,
            status,
            type: 'manual_absence',
            source,
            keterangan,
            ...extraMeta,
          }),
        } as any,
      });
    } catch (e) {
      console.warn('[GerbangService] activityLog write failed for markManualAbsence', e);
    }

    processingInfo.end_time = new Date();

    return {
      success: true,
      message: 'Absence recorded successfully',
      data: created,
      metadata: {
        processing_info: processingInfo,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return buildErrorResponse(
      {
        error_type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to mark absence',
        details: { error: errorMessage },
      } as any,
      processingInfo,
    );
  }
}

