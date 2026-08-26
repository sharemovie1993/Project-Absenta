// @ts-nocheck
import { gerbangService } from '../../services/gerbang.service';
import { gerbangTapSchema, faceVerifySchema, faceEnrollSchema } from '../../services/gerbang.schema';
import { buildAttendanceFeed } from '@/modules/attendance/notify/controllers/notify.controller';
import { SocketMonitor } from '@/infra/realtime/socket.monitor';
import { GerbangTapInput } from '../../types/gerbang.types';
import { JenisTap, AbsensiMode, RoleName } from '@/constants/enums';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { gerbangDb as prisma } from '../../services/repositories/gerbang.db';
import { authorizationService } from '@/modules/auth/services/authorization.service';


export const gerbangTapController = {
  async bypass(request: any, reply: any) {
    try {
      const { siswa_id, note } = request.body;
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id;
      const attendanceMode = request.attendanceMode as AbsensiMode;

      if (!siswa_id) {
        reply.status(400);
        return { success: false, message: 'siswa_id is required' };
      }

      const result = await gerbangService.bypassLate(
        { siswa_id, note },
        userId,
        tenantId,
        attendanceMode
      );

      if (!result.success) {
        reply.status(400); // Or 500 depending on error code
      }
      return result;

    } catch (error: any) {
      request.log.error(error);
      reply.status(500);
      return {
        success: false,
        message: 'Internal Server Error',
        error: error.message
      };
    }
  },

  async tap(request: any, reply: any) {
    try {
      const parsedBody = gerbangTapSchema.parse(request.body);
      const { siswa_id, arah, device_id, rfid, waktu_tap, is_offline_sync } = parsedBody;
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const userId = request.user?.id;
      
      // Get attendance mode from middleware (set by allowBothModes)
      const attendanceMode = request.attendanceMode as AbsensiMode;

      // Enhanced validation for required fields
      if (!siswa_id || !arah) {
        reply.status(400);
        return {
          success: false,
          message: 'siswa_id and arah are required',
          validation_errors: {
            siswa_id: !siswa_id ? 'Required field missing' : null,
            arah: !arah ? 'Required field missing' : null,
          },
        };
      }

      // Validate arah enum with gerbang-specific values
      const validGerbangArah = [JenisTap.GERBANG_DATANG, JenisTap.GERBANG_PULANG];
      if (!validGerbangArah.includes(arah)) {
        reply.status(400);
        return {
          success: false,
          message: `Invalid arah for gerbang. Must be one of: ${validGerbangArah.join(', ')}`,
          validation_errors: {
            arah: `Invalid value. Expected: ${validGerbangArah.join(' | ')}`,
          },
        };
      }

      // Validate tenant_id from JWT
      if (!tenantId) {
        reply.status(401);
        return {
          success: false,
          message: 'Unauthorized: tenant_id not found in token',
        };
      }

      let allowed = false;
      
      // LOG DIAGNOSA UNTUK USER
      console.log(`[DEBUG_GERBANG] User: ${userId} | Role: ${roleName} | Tenant: ${tenantId}`);

      if (['SUPERADMIN', 'ADMIN'].includes(roleName)) {
        allowed = true;
      } else {
        const hasScanPermission = await authorizationService.isUserAuthorized(String(userId), [
          'attendance.scan',
          'attendance.gate.tap.entry',
          'attendance.piket.view'
        ], { user: request.user });

        if (hasScanPermission.allowed) {
          allowed = true;
        } else {
          const now = new Date();
          const active = await prisma.organizationalAssignment.findFirst({
            where: {
              tenant_id: String(tenantId),
              user_id: String(userId),
              is_active: true,
              AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
            },
            select: { id: true },
          });
          allowed = !!active;
        }
      }
      
      if (!allowed) {
        console.warn(`[DEBUG_GERBANG] AKSES DITOLAK untuk User ID: ${userId} | Role: ${roleName}`);
        reply.status(403);
        return { success: false, message: 'Forbidden: Akses ditolak (Bukan Petugas)' };
      }

      // Enhanced validation for MULTI_SESI mode
      if (attendanceMode === AbsensiMode.MULTI_SESI) {
        // Additional validation for MULTI_SESI mode
        // Check if student has any pending sessions that require gerbang prerequisite
        /* 
        const pendingSessions = await prisma.sesiAbsensi.findMany({
          where: {
            tenant_id: tenantId,
            tanggal: (() => {
              const now = new Date();
              const jkt = new Date(now.getTime() + 7 * 60 * 60 * 1000);
              const day = jkt.toISOString().split('T')[0];
              const start = new Date(`${day}T00:00:00.000+07:00`);
              const end = new Date(`${day}T23:59:59.999+07:00`);
              return { gte: start, lte: end };
            })(),
            status: 'AKTIF',
          },
          select: {
            id: true,
            jenis_kegiatan: true,
            waktu_mulai: true,
            waktu_selesai: true,
          },
        });
        */

        // Log integration context for MULTI_SESI mode
        // console.log(`MULTI_SESI mode: Found ${pendingSessions.length} active sessions for integration`);
      }

      const tapInput: GerbangTapInput = {
        siswa_id,
        arah,
        device_id,
        rfid,
        waktu_tap,
        is_offline_sync,
      };

      const result = await gerbangService.tap(tapInput, request.user?.id, tenantId, attendanceMode);

      if (!result.success) {
        reply.status(400);
        return result;
      }

      const isDuplicate = !!(result.data && (result.data as any).duplicate_detected);

      const responseData = {
        success: true,
        message: result.message,
        data: result.data,
        metadata: {
          attendance_mode: attendanceMode,
          mode_features: {
            simple_mode: attendanceMode === AbsensiMode.SIMPLE,
            multi_sesi_mode: attendanceMode === AbsensiMode.MULTI_SESI,
            supports_kegiatan_integration: attendanceMode === AbsensiMode.MULTI_SESI,
          },
          integration_status: {
            gerbang_module: 'active',
            kegiatan_integration: attendanceMode === AbsensiMode.MULTI_SESI ? 'enabled' : 'disabled',
            prerequisite_for_kegiatan: attendanceMode === AbsensiMode.MULTI_SESI && arah === JenisTap.GERBANG_DATANG,
          },
          session_info: {
            session_type: 'gerbang_default',
            auto_session_creation: true,
            daily_session_scope: true,
            supports_multiple_taps: false,
          },
          tap_details: {
            direction: arah,
            is_entry: arah === JenisTap.GERBANG_DATANG,
            is_exit: arah === JenisTap.GERBANG_PULANG,
            device_tracked: !!device_id,
            rfid_tracked: !!rfid,
          },
          processing_info: {
            processed_at: new Date().toISOString(),
            tenant_id: tenantId,
            user_id: userId,
          },
        },
      };

      try {
        const payload = {
          tenant_id: String(tenantId),
          sesi_gerbang_id: String((result.data as any)?.sesi_gerbang_id || ''),
          siswa_id: String((result.data as any)?.siswa_id || ''),
          arah: String((result.data as any)?.arah || ''),
          waktu_tap: (result.data as any)?.waktu_tap || new Date().toISOString(),
          record_id: String((result.data as any)?.id || ''),
        };
        {
          const g: any = globalThis as any;
          if (!g.__realtimeThrottle) g.__realtimeThrottle = new Map<string, number>();
          if (g.__realtimeThrottle.size > 10000) {
            g.__realtimeThrottle.clear();
          }
          const tKey = String(tenantId);
          const now = Date.now();
          const last = Number(g.__realtimeThrottle.get(tKey) || 0);
          if (now - last > 500) {
            g.__realtimeThrottle.set(tKey, now);
            setImmediate(() => {
              void (async () => {
                try {
                  try {
                    const redis = (await import('@/queue/redis')).getRedisConnection() as any;
                    await redis.publish('events:gerbang_tap_update', JSON.stringify(payload));
                  } catch {}
                  const io = (request.server as any).io;
                  const ioApi = (request.server as any).ioApi;
                  if (io) {
                    SocketMonitor.getInstance().recordEvent(String(tenantId));
                    io.to(`tenant:${String(tenantId)}`).emit('gerbang_tap_update', payload);
                    io.to(`siswa:${payload.siswa_id}`).emit('attendance_update', {
                      type: 'GATE_TAP',
                      data: payload
                    });
                    const sockets = await io.in(`tenant:${String(tenantId)}`).fetchSockets();
                    const feedLocks = new Map<string, Promise<any>>();
                    await Promise.all(sockets.map(async (s: any) => {
                      const params = (s.data as any)?.lastFeedParams || {};
                      const uId = String(s.data?.user?.id || '');
                      const rName = String(s.data?.user?.roleName || '');
                      const k = `${uId}|${rName}|${JSON.stringify(params)}`;
                      let lock = feedLocks.get(k);
                      if (!lock) {
                        lock = buildAttendanceFeed(String(tenantId), uId, rName, params);
                        feedLocks.set(k, lock);
                      }
                      try {
                        const feed = await lock;
                        s.emit('attendance_feed_update', feed);
                      } catch {}
                    }));
                  }
                  if (ioApi) {
                    ioApi.to(`tenant:${String(tenantId)}`).emit('gerbang_tap_update', payload);
                    ioApi.to(`siswa:${payload.siswa_id}`).emit('attendance_update', {
                      type: 'GATE_TAP',
                      data: payload
                    });
                    const socketsApi = await ioApi.in(`tenant:${String(tenantId)}`).fetchSockets();
                    const feedLocksApi = new Map<string, Promise<any>>();
                    await Promise.all(socketsApi.map(async (s: any) => {
                      const params = (s.data as any)?.lastFeedParams || {};
                      const uId = String(s.data?.user?.id || '');
                      const rName = String(s.data?.user?.roleName || '');
                      const k = `${uId}|${rName}|${JSON.stringify(params)}`;
                      let lock = feedLocksApi.get(k);
                      if (!lock) {
                        lock = buildAttendanceFeed(String(tenantId), uId, rName, params);
                        feedLocksApi.set(k, lock);
                      }
                      try {
                        const feed = await lock;
                        s.emit('attendance_feed_update', feed);
                      } catch {}
                    }));
                  }
                } catch {}
              })();
            });
          }
        }
      } catch {}

      reply.status(isDuplicate ? 200 : 201);
      return responseData;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Tap recording failed';
      
      // Handle specific business logic errors with enhanced information
      if (errorMessage === 'Student not found') {
        reply.status(404);
        return {
          success: false,
          message: errorMessage,
          error_details: {
            error_type: 'STUDENT_NOT_FOUND',
            description: 'The specified student does not exist or does not belong to this tenant',
            suggested_action: 'Verify student ID and ensure student is registered in the system',
          },
        };
      }

      if (errorMessage === 'Duplicate tap detected') {
        reply.status(409);
        return {
          success: false,
          message: errorMessage,
          error_details: {
            error_type: 'DUPLICATE_TAP',
            description: 'Student has already tapped in the same direction today',
            suggested_action: 'Check existing attendance records or use different direction',
          },
        };
      }

      if (errorMessage.includes('Tenant not found')) {
        reply.status(404);
        return {
          success: false,
          message: errorMessage,
          error_details: {
            error_type: 'TENANT_NOT_FOUND',
            description: 'The specified tenant does not exist',
            suggested_action: 'Verify tenant configuration',
          },
        };
      }

      // Log the error for debugging with context
      console.error('Gerbang tap error:', {
        error,
        context: {
          tenantId: request.tenantId ?? request.user?.tenantId,
          userId: request.user?.id,
          attendanceMode: request.attendanceMode,
          timestamp: new Date().toISOString(),
        },
      });

      reply.status(500);
      return {
        success: false,
        message: 'Internal server error',
        error_details: {
          error_type: 'INTERNAL_SERVER_ERROR',
          description: 'An unexpected error occurred while processing the tap',
          suggested_action: 'Please try again or contact system administrator',
        },
      };
    }
  },

  async syncOfflineTaps(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { taps } = request.body;

      if (!Array.isArray(taps)) {
        return reply.status(400).send({ success: false, message: 'Payload "taps" harus berupa array' });
      }

      const result = await gerbangService.syncOfflineTaps(tenantId, taps);
      return reply.status(200).send({
        success: true,
        message: `Sinkronisasi selesai: ${result.success} berhasil, ${result.failed} gagal`,
        data: result
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Internal Server Error',
        error: error.message
      });
    }
  },

  async stressTest(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { count } = request.body;
      const roleName = request.user?.roleName || request.user?.Role?.name;

      if (roleName !== 'SUPERADMIN') {
        return reply.status(403).send({ success: false, message: 'Only SUPERADMIN can run stress tests' });
      }

      const siswa = await prisma.siswa.findMany({
        where: { tenant_id: tenantId, status: 'AKTIF' },
        take: count || 100,
        select: { id: true }
      });

      const startTime = Date.now();
      const results = await Promise.all(siswa.map(s => 
        gerbangService.tap({
          siswa_id: s.id,
          arah: JenisTap.GERBANG_DATANG,
          device_id: 'STRESS_TEST_BOT'
        }, 'SYSTEM', tenantId).catch(e => ({ success: false, error: e.message }))
      ));

      const duration = Date.now() - startTime;
      const successCount = results.filter((r: any) => r.success).length;

      return reply.status(200).send({
        success: true,
        metrics: {
          total_attempted: siswa.length,
          success: successCount,
          failed: siswa.length - successCount,
          total_duration_ms: duration,
          avg_ms_per_tap: duration / (siswa.length || 1)
        }
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },
};
