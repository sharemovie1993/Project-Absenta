import { gerbangService } from '../services/gerbang.service';
import { gerbangTapSchema, faceVerifySchema, faceEnrollSchema } from '../services/gerbang.schema';
import { buildAttendanceFeed } from '@/modules/attendance/notify/controllers/notify.controller';
import { SocketMonitor } from '@/infra/realtime/socket.monitor';
import { GerbangTapInput } from '../types/gerbang.types';
import { JenisTap, AbsensiMode, RoleName } from '@/constants/enums';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { emitDomainEvent } from '@/infra/event-bus';
import { gerbangDb as prisma } from '../services/repositories/gerbang.db';
import { authorizationService } from '@/modules/auth/services/authorization.service';

export const gerbangController = {
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
      } else if (roleName === RoleName.GURU || roleName === RoleName.SISWA) {
        // 1. Check by Capability (Dinamis dari Database - Menghindari Token Stale)
        const hasScanPermission = await authorizationService.hasUserPermission(String(userId), 'attendance.scan');
        console.log(`[DEBUG_GERBANG] Result hasScanPermission: ${hasScanPermission}`);
        
        if (hasScanPermission) {
          allowed = true;
        } else {
          // 2. Fallback to strict Organizational Assignment (Legacy check)
          const now = new Date();
          const active = await prisma.organizationalAssignment.findFirst({
            where: {
              tenant_id: String(tenantId),
              user_id: String(userId),
              is_active: true,
              AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
              Position: { scope_type: 'attendance' },
            },
            select: { id: true },
          });
          allowed = !!active;
          console.log(`[DEBUG_GERBANG] Fallback active check: ${allowed}`);
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

  async faceVerifyTap(request: any, reply: any) {
    try {
      const parsedBody = faceVerifySchema.parse(request.body);
      const { siswa_id, arah, image_base64, embedding } = parsedBody;
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const attendanceMode = request.attendanceMode as AbsensiMode;

      let allowed = false;
      if (['SUPERADMIN', 'ADMIN'].includes(roleName)) {
        allowed = true;
      } else if (roleName === RoleName.GURU) {
        const hasScanPermission = await authorizationService.hasUserPermission(String(userId), 'attendance.scan');
        if (hasScanPermission) {
          allowed = true;
        } else {
          const now = new Date();
          const active = await prisma.organizationalAssignment.findFirst({
            where: {
              tenant_id: String(tenantId),
              user_id: String(userId),
              is_active: true,
              AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
              Position: { scope_type: 'attendance' },
            },
            select: { id: true },
          });
          allowed = !!active;
        }
      }
      
      if (!allowed) {
        reply.status(403);
        return { success: false, message: 'Forbidden: not active PetugasAbsensi' };
      }

      const result = await gerbangService.faceVerifyTap({ siswa_id, arah, image_base64, embedding }, userId, tenantId, attendanceMode);
      
      reply.status(200);

      if (result.success && result.data) {
        try {
          const payload = {
            tenant_id: String(tenantId),
            sesi_gerbang_id: String((result.data as any)?.sesi_gerbang_id || ''),
            siswa_id: String((result.data as any)?.siswa_id || ''),
            arah: String((result.data as any)?.arah || ''),
            waktu_tap: (result.data as any)?.waktu_tap || new Date().toISOString(),
            record_id: String((result.data as any)?.id || ''),
          };
          const redis = (await import('@/queue/redis')).getRedisConnection() as any;
          await redis.publish('events:gerbang_tap_update', JSON.stringify(payload));
          
          const io = (request.server as any).io;
          const ioApi = (request.server as any).ioApi;
          if (io) io.to(`tenant:${String(tenantId)}`).emit('gerbang_tap_update', payload);
          if (ioApi) ioApi.to(`tenant:${String(tenantId)}`).emit('gerbang_tap_update', payload);
        } catch (e) {
          console.error('Realtime notify error:', e);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Face identification error:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error', error: error.message };
    }
  },

  async faceEnroll(request: any, reply: any) {
    try {
      const parsedBody = faceEnrollSchema.parse(request.body);
      const { siswa_id, image_base64, source, embedding_type, model_name, embedding } = parsedBody;
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }
      if (roleName === RoleName.SISWA) {
        const siswaUser = await prisma.siswa.findFirst({ where: { tenant_id: String(tenantId), user_id: String(userId) }, select: { id: true } });
        if (!siswaUser) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa profile not found' };
        }
        if (String(siswa_id) !== String(siswaUser.id)) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa hanya dapat merekam wajah untuk dirinya sendiri' };
        }
      } else if (roleName === RoleName.GURU || roleName === RoleName.SISWA) {
        // Real-time capability check for face enrollment (Officer Context)
        const hasScanPermission = await authorizationService.hasUserPermission(String(userId), 'attendance.scan');
        
        if (!hasScanPermission) {
          const now = new Date();
          const active = await prisma.organizationalAssignment.findFirst({
            where: {
              tenant_id: String(tenantId),
              user_id: String(userId),
              is_active: true,
              AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
              Position: { scope_type: 'attendance' },
            },
            select: { id: true },
          });
          if (!active) {
            reply.status(403);
            const msg = roleName === RoleName.SISWA ? 'Forbidden: hanya Petugas Kelas yang dapat merekam wajah siswa lain' : 'Forbidden: hanya Petugas Absensi yang dapat merekam wajah siswa lain';
            return { success: false, message: msg };
          }
        }
      }
      console.log('[FACE_ENROLL_CTRL] request', { siswa_id, tenantId, userId, roleName });
      const result = await gerbangService.faceEnroll({ siswa_id, image_base64, source, embedding_type, model_name, embedding }, userId, tenantId);
      if (!result.success) {
        console.error('[FACE_ENROLL_CTRL] failed', { result });
        reply.status(400);
        return result;
      }
      console.log('[FACE_ENROLL_CTRL] success', { result });
      reply.status(200);
      return result;
    } catch (error) {
      console.error('[FACE_ENROLL_CTRL] error', { error });
      reply.status(500);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      return { success: false, message: msg };
    }
  },
  
  async getFaceTemplates(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const { search = '', kelas_id, limit = 50, offset = 0 } = request.query || {};
      if (!tenantId && roleName !== 'SUPERADMIN') {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }
      const where: any = {};
      if (roleName !== 'SUPERADMIN') where.tenant_id = tenantId;
      if (roleName === RoleName.SISWA) {
        const siswaUser = await prisma.siswa.findFirst({ where: { tenant_id: String(tenantId), user_id: String(request.user?.id || '') }, select: { id: true } });
        if (!siswaUser) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa profile not found' };
        }
        where.siswa_id = String(siswaUser.id);
      }
      if (search) {
        where.OR = [
          { siswa_id: search },
          { Siswa: { nama_siswa: { contains: search, mode: 'insensitive' } } },
          { Siswa: { nis: { contains: search, mode: 'insensitive' } } },
        ];
      }
      if (kelas_id) {
        where.Siswa = { ...(where.Siswa || {}), kelas_id };
      }
      const [rows, total] = await Promise.all([
        prisma.siswaFaceTemplate.findMany({
          where,
          include: { Siswa: { select: { id: true, nama_siswa: true, nis: true, Kelas: { select: { nama_kelas: true } } } } },
          orderBy: { created_at: 'desc' },
          take: parseInt(String(limit)),
          skip: parseInt(String(offset)),
        }),
        prisma.siswaFaceTemplate.count({ where }),
      ]);
      return {
        success: true,
        message: 'OK',
        data: rows,
        pagination: { total, limit: parseInt(String(limit)), offset: parseInt(String(offset)) },
      };
    } catch (error) {
      reply.status(500);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      return { success: false, message: msg };
    }
  },
  async getEmbeddingHealth(_request: any, reply: any) {
    try {
      const result = await gerbangService.embeddingProviderHealth();
      reply.status(result.success ? 200 : 502);
      return result;
    } catch (error) {
      reply.status(500);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      return { success: false, message: msg };
    }
  },

  async deleteFaceTemplate(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const userId = request.user?.id;
      const { id } = request.params as { id: string };
      if (!id) {
        reply.status(400);
        return { success: false, message: 'Template ID wajib diisi' };
      }
      if (!tenantId && roleName !== RoleName.SUPERADMIN) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }
      const tpl = await prisma.siswaFaceTemplate.findFirst({ where: { id: String(id) }, select: { id: true, tenant_id: true, siswa_id: true } });
      if (!tpl) {
        reply.status(404);
        return { success: false, message: 'Template tidak ditemukan' };
      }
      if (roleName !== RoleName.SUPERADMIN && String(tpl.tenant_id) !== String(tenantId)) {
        reply.status(403);
        return { success: false, message: 'Forbidden: tenant mismatch' };
      }
      if (roleName === RoleName.SISWA) {
        const siswaUser = await prisma.siswa.findFirst({ where: { tenant_id: String(tenantId), user_id: String(userId) }, select: { id: true } });
        if (!siswaUser) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa profile not found' };
        }
        if (String(tpl.siswa_id) !== String(siswaUser.id)) {
          reply.status(403);
          return { success: false, message: 'Forbidden: siswa hanya dapat menghapus template miliknya' };
        }
      }
      await prisma.siswaFaceTemplate.delete({ where: { id: String(id) } });
      return { success: true, message: 'Template berhasil dihapus' };
    } catch (error) {
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async getNotPresentStudents(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { tanggal, kelas_id, limit = 100, offset = 0 } = request.query || {};
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      const roleName = request.user?.roleName || request.user?.Role?.name || request.user?.role?.name;
      const org = request.organizationalScope;
      const positions = org?.positions || [];
      const isWaliKelas = positions.some((p: any) => p.code === 'WALIKELAS');
      const isPetugasSesi = positions.some((p: any) => p.code === 'PETUGAS_KELAS');
      const isPetugasGerbang = positions.some((p: any) => p.code === 'GERBANG');
      const managementRoles = ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN'];
      const isManagement = managementRoles.includes(roleName) || positions.some((p: any) => managementRoles.includes(p.code));
      const hasPrivilegedAccess = roleName === RoleName.ADMIN || roleName === RoleName.SUPERADMIN || isManagement || isPetugasGerbang || org?.tenant_wide === true;
      
      let enforcedKelasId: string | null = (kelas_id as string) || null;

      if (!hasPrivilegedAccess && !isWaliKelas && !isPetugasSesi) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Hanya Wali Kelas atau Petugas yang dapat mengakses daftar ini' };
      }

      // Enforce class isolation for non-admins
      if (!hasPrivilegedAccess) {
          const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
          if (kelasIds.length > 0) {
              // Jika user mengirim kelas_id spesifik, validasi apakah ada di list binaan
              if (enforcedKelasId && !kelasIds.includes(String(enforcedKelasId))) {
                  reply.status(403);
                  return { success: false, message: 'Forbidden: Anda tidak memiliki akses ke kelas yang dipilih' };
              }
              // Jika tidak kirim kelas_id, default ke kelas pertama yang dimiliki
              if (!enforcedKelasId) enforcedKelasId = kelasIds[0];
          } else {
              reply.status(403);
              return { success: false, message: 'Forbidden: Anda tidak memiliki penugasan kelas yang aktif' };
          }
      }


      const cfg = await systemConfigService.getActive(tenantId);
      const tz = String(cfg?.timezone || '').trim();
      const offsetStr = tz === 'Asia/Makassar' ? '+08:00' : (tz === 'Asia/Jayapura' ? '+09:00' : '+07:00');
      const offsetHours = offsetStr === '+09:00' ? 9 : (offsetStr === '+08:00' ? 8 : 7);
      const dayStrNP = tanggal ? String(tanggal) : (() => {
        const now = new Date();
        const shifted = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
        return shifted.toISOString().split('T')[0];
      })();
      const startOfDay = new Date(`${dayStrNP}T00:00:00.000${offsetStr}`);
      const endOfDay = new Date(`${dayStrNP}T23:59:59.999${offsetStr}`);
      let session = await prisma.sesiGerbang.findFirst({
        where: { tenant_id: tenantId, tanggal: { gte: startOfDay, lte: endOfDay } },
      });
      if (!session) {
        let sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
        if (!sekolah) {
          sekolah = await prisma.sekolah.create({ data: { tenant_id: tenantId, nama: 'Default School' } });
        }
        const activeYear = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
        session = await prisma.sesiGerbang.create({
          data: {
            tenant_id: tenantId,
            sekolah_id: sekolah.id,
            tanggal: new Date(`${dayStrNP}T00:00:00.000${offsetStr}`),
            waktu_mulai: startOfDay,
            waktu_selesai: endOfDay,
            tahun_pelajaran_id: activeYear?.id || null,
          },
        });
      }
      const whereSiswa: any = { tenant_id: tenantId, status: 'AKTIF' };
      if (enforcedKelasId) whereSiswa.kelas_id = enforcedKelasId;
      const students = await prisma.siswa.findMany({
        where: {
          ...whereSiswa,
          AbsenGerbangSiswa: { 
            none: { 
              tenant_id: tenantId, 
              arah: 'GERBANG_DATANG',
              sesi_gerbang_id: session.id
            } 
          },
        },
        select: { id: true, nama_siswa: true, kelas_id: true, Kelas: { select: { nama_kelas: true } } },
        orderBy: { nama_siswa: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });
      const total = await prisma.siswa.count({
        where: {
          ...whereSiswa,
          AbsenGerbangSiswa: { 
            none: { 
              tenant_id: tenantId, 
              arah: 'GERBANG_DATANG',
              sesi_gerbang_id: session.id
            } 
          },
        },
      });
      return {
        success: true,
        message: 'Not-present students retrieved successfully',
        data: students,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
        session_info: { id: session.id, tanggal: session.tanggal },
        filter_info: { kelas_id: enforcedKelasId || null, role: roleName || null },
      };
    } catch (error) {
      console.error('Error getting not-present students:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async markGateAbsence(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id;
      const { siswa_id, status } = request.body || {};
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      if (!siswa_id || !status) {
        reply.status(400);
        return { success: false, message: 'siswa_id and status are required' };
      }
      const roleName = request.user?.roleName || request.user?.Role?.name || request.user?.role?.name;
      const org = request.organizationalScope;
      const positions = org?.positions || [];
      const isWaliKelas = positions.some((p: any) => p.code === 'WALIKELAS');
      const isPetugasSesi = positions.some((p: any) => p.code === 'PETUGAS_KELAS');
      const hasPrivilegedAccess = roleName === RoleName.ADMIN || roleName === RoleName.SUPERADMIN || org?.tenant_wide === true;

      if (!hasPrivilegedAccess && !isWaliKelas && !isPetugasSesi) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Hanya Wali Kelas atau Petugas yang dapat mengubah data ini' };
      }

      // Enforce class isolation for non-admins
      if (!hasPrivilegedAccess) {
          const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
          const targetSiswa = await prisma.siswa.findFirst({ 
              where: { id: siswa_id, tenant_id: String(tenantId) }, 
              select: { kelas_id: true } 
          });

          if (!targetSiswa || !kelasIds.includes(String(targetSiswa.kelas_id))) {
              reply.status(403);
              return { success: false, message: 'Forbidden: Hanya dapat mengubah data siswa di kelas binaan/tugas Anda' };
          }
      }

      const allowedStatuses = ['HADIR', 'SAKIT', 'IZIN', 'ALPA', 'DISPEN'];
      if (!allowedStatuses.includes(status)) {
        reply.status(400);
        return { success: false, message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` };
      }

      if (status === 'HADIR') {
        const isDev = process.env.NODE_ENV === 'development';
        const allowManualConfig = await prisma.config.findFirst({
          where: { tenant_id: String(tenantId), key: 'ALLOW_MANUAL_HADIR_GATE' }
        });
        const isAllowed = isDev || (allowManualConfig?.value === 'true');
        if (!isAllowed) {
          reply.status(400);
          return {
            success: false,
            message: 'Pencatatan manual status HADIR dinonaktifkan. Kehadiran harus dicatat melalui scan gerbang fisik (Kecuali dikonfigurasi lain oleh Admin).'
          };
        }
      }
      const session = await gerbangService.getOrCreateSession(String(tenantId));
      const existing = await prisma.absenGerbangSiswa.findFirst({
        where: { tenant_id: tenantId, sesi_gerbang_id: session.id, siswa_id, arah: 'GERBANG_DATANG' },
      });
      if (existing) {
        reply.status(409);
        return { success: false, message: 'Record already exists for GERBANG_DATANG' };
      }
      const siswaInfo = await prisma.siswa.findFirst({ where: { id: siswa_id, tenant_id: tenantId }, include: { Kelas: { select: { nama_kelas: true } } } });
      const activeYear = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
      const tingkatData = siswaInfo?.kelas_id ? await prisma.kelas.findFirst({ where: { id: siswaInfo.kelas_id, tenant_id: tenantId }, select: { tingkat: true } }) : null;
      const created = await prisma.absenGerbangSiswa.create({
        data: {
          tenant_id: tenantId,
          sesi_gerbang_id: session.id,
          siswa_id,
          arah: 'GERBANG_DATANG',
          status,
          waktu_tap: new Date(),
          kelas_id_snapshot: siswaInfo?.kelas_id || null,
          kelas_nama_snapshot: siswaInfo?.Kelas?.nama_kelas || null,
          tingkat_snapshot: tingkatData?.tingkat ?? null,
          tahun_pelajaran_id_snapshot: activeYear?.id || null,
        },
      });

      // Notification logic for ALPA
      if (status === 'ALPA') {
        await emitDomainEvent({
          event_type: 'attendance.tap',
          tenant_id: String(tenantId),
          source_service: 'attendance',
          payload: {
            tenant_id: String(tenantId),
            student_id: String(siswa_id),
            device_id: 'MANUAL_PETUGAS',
            tap_time: created.waktu_tap ? created.waktu_tap.toISOString() : new Date().toISOString(),
            source: 'GERBANG_MANUAL_ENDPOINT',
            related_id: created.id,
            status: 'ALPA',
            arah: 'GERBANG_DATANG',
            notification_hint: 'STUDENT_ABSENT',
          },
        });
      }

      if (['SAKIT', 'IZIN', 'ALPA', 'DISPEN'].includes(status)) {
        try {
          const { sesiService } = await import('@/modules/attendance/sesi-absensi/services/sesi.service');
          await sesiService.propagateGateAbsenceToSessions(
            String(tenantId),
            String(siswa_id),
            String(status),
            created.waktu_tap || new Date()
          );
        } catch (e) {
          console.warn('Failed to propagate gate absence to sessions from manual mark', e);
        }
      }

      await prisma.activityLog.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          action: 'ABSEN_GERBANG_MANUAL',
          entity: 'AbsenGerbangSiswa',
          entity_id: created.id,
          metadata: JSON.stringify({ siswa_id, status, type: 'manual_absence' }),
        },
      });

      // --- EMIT SOCKET EVENT FOR MANUAL ATTENDANCE (DIRECT ENDPOINT) ---
      try {
        const payload = {
            tenant_id: String(tenantId),
            sesi_gerbang_id: String(created.sesi_gerbang_id || ''),
            siswa_id: String(siswa_id),
            arah: 'GERBANG_DATANG',
            waktu_tap: created.waktu_tap || new Date().toISOString(),
            status: status, // SAKIT, IZIN, ALPA, DISPEN
            record_id: String(created.id),
            source: 'MANUAL_PETUGAS'
        };
        
        try {
            const redis = (await import('@/queue/redis')).getRedisConnection() as any;
            await redis.publish('events:gerbang_tap_update', JSON.stringify(payload));
        } catch {}

        const io = (request.server as any).io;
        if (io) {
            SocketMonitor.getInstance().recordEvent(String(tenantId));
            // Emit to tenant room (Standard fallback)
            io.to(`tenant:${String(tenantId)}`).emit('gerbang_tap_update', payload);
            // Emit specifically for Attendance Dashboards (Standardized)
            io.to(`tenant:${String(tenantId)}`).emit('tenant_attendance_update', {
                type: 'GATE_TAP',
                ...payload
            });
            // Emit for general feed
            io.to(`tenant:${String(tenantId)}`).emit('attendance_feed_update', {
                type: 'GATE_TAP',
                ...payload
            });

            // Emit to student room (for Parent App)
            io.to(`siswa:${String(siswa_id)}`).emit('attendance_update', {
                type: 'GATE_TAP', 
                data: payload
            });
        }
      } catch (e) {
        console.error('[GerbangController] Failed to emit manual attendance socket event:', e);
      }
      // ----------------------------------------------------------------

      reply.status(201);
      return { success: true, message: 'Absence recorded', data: created };
    } catch (error) {
      console.error('Error marking absence:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  async getRecords(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { tanggal, arah, siswa_id, kelas_id, status, limit = 100, offset = 0, tahun_pelajaran_id } = request.query || {};
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const org = (request as any).organizationalScope;
      const isPetugas = (org?.kelas_ids?.length || 0) > 0 || org?.tenant_wide === true;

      let enforcedKelasId = kelas_id;
      if (roleName === RoleName.SISWA && !isPetugas) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Hanya Petugas yang dapat mengakses fitur ini' };
      }

      const where: any = { tenant_id: tenantId };
      if (tanggal) {
          const cfg = await systemConfigService.getActive(tenantId);
          const tz = String(cfg?.timezone || '').trim();
          const offsetStr = tz === 'Asia/Makassar' ? '+08:00' : (tz === 'Asia/Jayapura' ? '+09:00' : '+07:00');
          const dayStr = String(tanggal);
          where.SesiGerbang = {
              tanggal: {
                  gte: new Date(`${dayStr}T00:00:00.000${offsetStr}`),
                  lte: new Date(`${dayStr}T23:59:59.999${offsetStr}`),
              }
          };
      }
      if (arah) where.arah = arah;
      if (siswa_id) where.siswa_id = siswa_id;
      if (enforcedKelasId) where.Siswa = { kelas_id: enforcedKelasId };
      if (status) where.status = status;
      if (tahun_pelajaran_id) {
          where.tahun_pelajaran_id = tahun_pelajaran_id;
      }

      const records = await prisma.absenGerbangSiswa.findMany({
        where,
        include: { Siswa: { select: { nama_siswa: true, Kelas: { select: { nama_kelas: true } } } } },
        orderBy: { waktu_tap: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      const total = await prisma.absenGerbangSiswa.count({ where });

      return {
        success: true,
        message: 'Records retrieved successfully',
        data: records,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
      };
    } catch (error) {
      console.error('Error getting records:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  // Get active sessions for current date
  async getSessions(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { tanggal } = request.query;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const org = (request as any).organizationalScope;
      const isPetugas = (org?.kelas_ids?.length || 0) > 0 || org?.tenant_wide === true;

      if (roleName === RoleName.SISWA && !isPetugas) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Hanya Petugas yang dapat mengakses fitur ini' };
      }

      const cfgSess = await systemConfigService.getActive(tenantId);
      const tzSess = String(cfgSess?.timezone || '').trim();
      const offsetStrSess = tzSess === 'Asia/Makassar' ? '+08:00' : (tzSess === 'Asia/Jayapura' ? '+09:00' : '+07:00');
      const offsetHoursSess = offsetStrSess === '+08:00' ? 8 : (offsetStrSess === '+09:00' ? 9 : 7);
      const dayStrSess = tanggal ? String(tanggal) : new Date(new Date().getTime() + offsetHoursSess * 60 * 60 * 1000).toISOString().split('T')[0];
      const startOfDay = new Date(`${dayStrSess}T00:00:00.000${offsetStrSess}`);
      const endOfDay = new Date(`${dayStrSess}T23:59:59.999${offsetStrSess}`);

      const sessions = await prisma.sesiGerbang.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { waktu_mulai: 'asc' },
      });

      return {
        success: true,
        message: 'Sessions retrieved successfully',
        data: { sessions, date: dayStrSess },
      };
    } catch (error) {
      console.error('Error getting sessions:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  // Get specific session by ID
  async getSessionById(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { id } = request.params;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const org = (request as any).organizationalScope;
      const isPetugas = (org?.kelas_ids?.length || 0) > 0 || org?.tenant_wide === true;

      if (roleName === RoleName.SISWA && !isPetugas) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Hanya Petugas yang dapat mengakses fitur ini' };
      }

      const session = await prisma.sesiGerbang.findFirst({
        where: {
          id: id,
          tenant_id: tenantId,
        },
        include: {
          _count: {
            select: {
              AbsenGerbangSiswa: true,
            },
          },
        },
      });

      if (!session) {
        reply.status(404);
        return { success: false, message: 'Session not found' };
      }

      return {
        success: true,
        message: 'Session retrieved successfully',
        data: { session },
      };
    } catch (error) {
      console.error('Error getting session:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  // Get student's current gate status
  async getStudentStatus(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { siswa_id } = request.params;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const userId = request.user?.id;
      if (roleName === RoleName.SISWA && userId) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Siswa tidak memiliki akses ke fitur ini (Hanya Guru)' };
      }

      // Get student info
      const siswa = await prisma.siswa.findFirst({
        where: { id: siswa_id, tenant_id: tenantId },
        select: { id: true, nama_siswa: true, Kelas: { select: { nama_kelas: true } } },
      });

      if (!siswa) {
        reply.status(404);
        return { success: false, message: 'Student not found' };
      }

      // Get today's session
      const nowStat = new Date();
      const jktStat = new Date(nowStat.getTime() + 7 * 60 * 60 * 1000);
      const dayStrStat = jktStat.toISOString().split('T')[0];
      const startOfDay = new Date(`${dayStrStat}T00:00:00.000+07:00`);
      const endOfDay = new Date(`${dayStrStat}T23:59:59.999+07:00`);

      const session = await prisma.sesiGerbang.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfDay, lte: endOfDay },
        },
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

      // Get student's taps for today
      const taps = await prisma.absenGerbangSiswa.findMany({
        where: {
          siswa_id: siswa_id,
          sesi_gerbang_id: session.id,
        },
        orderBy: { waktu_tap: 'desc' },
      });

      const lastTap = taps[0] || null;
      const isPresent = lastTap?.arah === 'GERBANG_DATANG';

      return {
        success: true,
        message: 'Student status retrieved successfully',
        data: {
          siswa_info: siswa,
          status: lastTap ? 'HAS_TAPPED' : 'NOT_TAPPED',
          is_present: isPresent,
          last_tap: lastTap,
          tap_count: taps.length,
        },
      };
    } catch (error) {
      console.error('Error getting student status:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  // Get student's tap history
  async getStudentHistory(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { siswa_id } = request.params;
      const { tanggal_mulai, tanggal_selesai, limit = 20, offset = 0 } = request.query;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const org = (request as any).organizationalScope;
      const isPetugas = (org?.kelas_ids?.length || 0) > 0 || org?.tenant_wide === true;

      if (roleName === RoleName.SISWA && !isPetugas) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Hanya Petugas yang dapat mengakses fitur ini' };
      }

      // Build date filter
      const dateFilter: any = {};
      if (tanggal_mulai) {
        dateFilter.gte = new Date(`${String(tanggal_mulai)}T00:00:00.000+07:00`);
      }
      if (tanggal_selesai) {
        dateFilter.lte = new Date(`${String(tanggal_selesai)}T23:59:59.999+07:00`);
      }

      const history = await prisma.absenGerbangSiswa.findMany({
        where: {
          tenant_id: tenantId,
          siswa_id: siswa_id,
          SesiGerbang: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { tanggal: dateFilter }),
          },
        },
        include: {
          SesiGerbang: {
            select: { tanggal: true, waktu_mulai: true, waktu_selesai: true },
          },
        },
        orderBy: { waktu_tap: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      const total = await prisma.absenGerbangSiswa.count({
        where: {
          siswa_id: siswa_id,
          SesiGerbang: {
            tenant_id: tenantId,
            ...(Object.keys(dateFilter).length > 0 && { tanggal: dateFilter }),
          },
        },
      });

      return {
        success: true,
        message: 'Student history retrieved successfully',
        data: {
          history,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            has_more: total > parseInt(offset) + parseInt(limit),
          },
        },
      };
    } catch (error) {
      console.error('Error getting student history:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  // Get currently present students
  async getPresentStudents(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { kelas_id, limit = 100, offset = 0 } = request.query;
      const roleName = request.user?.roleName || request.user?.Role?.name;
      const userId = request.user?.id;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      let enforcedKelasId = kelas_id;
      if (roleName === RoleName.SISWA && userId) {
        reply.status(403);
        return { success: false, message: 'Forbidden: Siswa tidak memiliki akses ke fitur ini (Hanya Guru)' };
      }

      // Get today's session
      const cfgPres = await systemConfigService.getActive(tenantId);
      const tzPres = String(cfgPres?.timezone || '').trim();
      const offsetStrPres = tzPres === 'Asia/Makassar' ? '+08:00' : (tzPres === 'Asia/Jayapura' ? '+09:00' : '+07:00');
      const offsetHoursPres = offsetStrPres === '+09:00' ? 9 : (offsetStrPres === '+08:00' ? 8 : 7);
      const nowPres = new Date();
      const shiftedPres = new Date(nowPres.getTime() + offsetHoursPres * 60 * 60 * 1000);
      const dayStrPres = shiftedPres.toISOString().split('T')[0];
      const startOfDay = new Date(`${dayStrPres}T00:00:00.000${offsetStrPres}`);
      const endOfDay = new Date(`${dayStrPres}T23:59:59.999${offsetStrPres}`);

      const session = await prisma.sesiGerbang.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (!session) {
        return {
          success: true,
          message: 'No active session found',
          data: { present_students: [], total: 0 },
        };
      }

      // Get students who tapped in but haven't tapped out
      const take = Number.parseInt(String(limit), 10) || 100;
      const skip = Number.parseInt(String(offset), 10) || 0;

      let presentStudents: any[] = [];

      if (enforcedKelasId) {
        presentStudents = await prisma.$queryRaw`
          SELECT DISTINCT 
            s.id,
            s.kelas_id,
            s.nama_siswa AS nama_siswa,
            k.nama_kelas AS kelas_nama,
            ags.waktu_tap AS last_tap_time,
            ags.arah AS last_tap_direction
          FROM "Siswa" s
          JOIN "Kelas" k ON s.kelas_id = k.id
          JOIN "AbsenGerbangSiswa" ags ON s.id = ags.siswa_id
          WHERE s.tenant_id = ${tenantId}
            AND ags.sesi_gerbang_id = ${session.id}
            AND ags.arah = 'GERBANG_DATANG'
            AND NOT EXISTS (
              SELECT 1 FROM "AbsenGerbangSiswa" ags2 
              WHERE ags2.siswa_id = s.id 
                AND ags2.sesi_gerbang_id = ${session.id}
                AND ags2.arah = 'GERBANG_PULANG'
                AND ags2.waktu_tap > ags.waktu_tap
            )
            AND s.kelas_id = ${enforcedKelasId}
          ORDER BY ags.waktu_tap DESC
          LIMIT ${take} OFFSET ${skip}
        `;
      } else {
        presentStudents = await prisma.$queryRaw`
          SELECT DISTINCT 
            s.id,
            s.kelas_id,
            s.nama_siswa AS nama_siswa,
            k.nama_kelas AS kelas_nama,
            ags.waktu_tap AS last_tap_time,
            ags.arah AS last_tap_direction
          FROM "Siswa" s
          JOIN "Kelas" k ON s.kelas_id = k.id
          JOIN "AbsenGerbangSiswa" ags ON s.id = ags.siswa_id
          WHERE s.tenant_id = ${tenantId}
            AND ags.sesi_gerbang_id = ${session.id}
            AND ags.arah = 'GERBANG_DATANG'
            AND NOT EXISTS (
              SELECT 1 FROM "AbsenGerbangSiswa" ags2 
              WHERE ags2.siswa_id = s.id 
                AND ags2.sesi_gerbang_id = ${session.id}
                AND ags2.arah = 'GERBANG_PULANG'
                AND ags2.waktu_tap > ags.waktu_tap
            )
          ORDER BY ags.waktu_tap DESC
          LIMIT ${take} OFFSET ${skip}
        `;
      }

      return {
        success: true,
        message: 'Present students retrieved successfully',
        data: {
          present_students: presentStudents,
          session_info: {
            id: session.id,
            tanggal: session.tanggal,
            waktu_mulai: session.waktu_mulai,
            waktu_selesai: session.waktu_selesai,
          },
        },
      };
    } catch (error) {
      console.error('Error getting present students:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  // Get integration status (MULTI_SESI mode only)
  async getIntegrationStatus(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Get today's active activity sessions
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const activeSessions = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfDay, lte: endOfDay },
          waktu_selesai: { gte: new Date() },
        },
        select: {
          id: true,
          jenis_kegiatan: true,
          waktu_mulai: true,
          waktu_selesai: true,
        },
      });

      return {
        success: true,
        message: 'Integration status retrieved successfully',
        data: {
          integration_active: true,
          active_activity_sessions: activeSessions,
          gate_prerequisite_enabled: true,
          last_sync: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error getting integration status:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  // Get activity prerequisites for student (MULTI_SESI mode only)
  async getActivityPrerequisites(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { siswa_id } = request.params;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Check if student has tapped in today
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const gateSession = await prisma.sesiGerbang.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfDay, lte: endOfDay },
        },
      });

      let hasGatePrerequisite = false;
      if (gateSession) {
        const gateTap = await prisma.absenGerbangSiswa.findFirst({
          where: {
            tenant_id: tenantId,
            siswa_id: siswa_id,
            sesi_gerbang_id: gateSession.id,
            arah: 'GERBANG_DATANG',
          },
        });
        hasGatePrerequisite = !!gateTap;
      }

      // Get available activity sessions
      const availableActivities = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfDay, lte: endOfDay },
          waktu_selesai: { gte: new Date() },
        },
        select: {
          id: true,
          jenis_kegiatan: true,
          waktu_mulai: true,
          waktu_selesai: true,
        },
      });

      return {
        success: true,
        message: 'Activity prerequisites retrieved successfully',
        data: {
          siswa_id,
          has_gate_prerequisite: hasGatePrerequisite,
          eligible_for_activities: hasGatePrerequisite,
          available_activities: availableActivities,
          prerequisite_message: hasGatePrerequisite 
            ? 'Student has fulfilled gate prerequisite and can participate in activities'
            : 'Student must tap in at gate before participating in activities',
        },
      };
    } catch (error) {
      console.error('Error getting activity prerequisites:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },

  // Get system health status
  async getSystemHealth(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Check database connectivity
      const dbHealth = await prisma.$queryRaw`SELECT 1 as test`;
      
      // Check today's session availability
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const todaySession = await prisma.sesiGerbang.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfDay, lte: endOfDay },
        },
      });

      return {
        success: true,
        message: 'System health check completed',
        data: {
          status: 'healthy',
          database_connected: !!dbHealth,
          session_available: !!todaySession,
          timestamp: new Date().toISOString(),
          tenant_id: tenantId,
        },
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      reply.status(500);
      return { 
        success: false, 
        message: 'System health check failed',
        data: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  },

  // Get basic statistics
  async getStatistics(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { tanggal, kelas_id } = request.query;
      
      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      const roleName = request.user?.roleName || request.user?.Role?.name || request.user?.role?.name;
      
      // Auto-resolve kelas_id focus for non-admins (Wali Kelas / Petugas)

      const org = request.organizationalScope;
      const positions = org?.positions || [];
      const isWaliKelas = positions.some((p: any) => p.code === 'WALIKELAS');
      const isPetugasSesi = positions.some((p: any) => p.code === 'PETUGAS_KELAS');
      const isAdmin = roleName === RoleName.ADMIN || roleName === RoleName.SUPERADMIN || org?.tenant_wide === true;

      let enforcedKelasId = kelas_id;
      let targetKelasInfo = null;

      if (!isAdmin && (isWaliKelas || isPetugasSesi)) {
          const kelasIds = Array.isArray(org?.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
          if (kelasIds.length > 0) {
              if (enforcedKelasId && !kelasIds.includes(String(enforcedKelasId))) {
                  reply.status(403);
                  return { success: false, message: 'Forbidden: Anda tidak memiliki akses ke kelas ini' };
              }
              if (!enforcedKelasId) enforcedKelasId = kelasIds[0];
              
              // Get Class Name for Header metadata
              const kelasObj = await prisma.kelas.findFirst({ 
                  where: { id: String(enforcedKelasId), tenant_id: String(tenantId) },
                  select: { id: true, nama_kelas: true }
              });
              if (kelasObj) {
                  targetKelasInfo = {
                      id: kelasObj.id,
                      nama: kelasObj.nama_kelas
                  };
              }
          } else {
              reply.status(403);
              return { success: false, message: 'Forbidden: Anda tidak memiliki penugasan kelas yang aktif' };
          }
      }

      // Timezone-aware date logic
      const cfg = await systemConfigService.getActive(tenantId);
      const tz = String(cfg?.timezone || '').trim();
      const offsetStr = tz === 'Asia/Makassar' ? '+08:00' : (tz === 'Asia/Jayapura' ? '+09:00' : '+07:00');
      const offsetHours = offsetStr === '+09:00' ? 9 : (offsetStr === '+08:00' ? 8 : 7);
      
      const dayStr = tanggal ? String(tanggal) : (() => {
        const now = new Date();
        const shifted = new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
        return shifted.toISOString().split('T')[0];
      })();
      
      const startOfDay = new Date(`${dayStr}T00:00:00.000${offsetStr}`);
      const endOfDay = new Date(`${dayStr}T23:59:59.999${offsetStr}`);

      const session = await prisma.sesiGerbang.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (!session) {
        return {
          success: true,
          message: 'No session found for the specified date',
          data: {
            date: dayStr,
            total_taps: 0,
            students_entered: 0,
            students_exited: 0,
            currently_present: 0,
            kelas: targetKelasInfo,
          },
        };
      }

      // Base filter for counts
      const baseWhere = {
        tenant_id: tenantId,
        sesi_gerbang_id: session.id,
      };

      // Apply class filter if provided
      let countWhere: any = { ...baseWhere };
      if (enforcedKelasId) {
        countWhere = {
          ...countWhere,
          Siswa: {
            kelas_id: enforcedKelasId
          }
        };
      }

      // Get tap statistics (Unique Students)
      const totalTaps = await prisma.absenGerbangSiswa.count({
        where: countWhere,
      });

      const studentsEnteredGroup = await prisma.absenGerbangSiswa.groupBy({
        by: ['siswa_id'],
        where: { 
            ...countWhere,
            arah: 'GERBANG_DATANG',
        },
      });
      const studentsEntered = studentsEnteredGroup.length;

      const studentsExitedGroup = await prisma.absenGerbangSiswa.groupBy({
        by: ['siswa_id'],
        where: { 
            ...countWhere,
            arah: 'GERBANG_PULANG',
        },
      });
      const studentsExited = studentsExitedGroup.length;

      const currentlyPresent = studentsEntered - studentsExited;

      // NEW: Get total target population for accurate progress ratio
      const whereSiswaTarget: any = { tenant_id: tenantId, status: 'AKTIF' };
      if (enforcedKelasId) whereSiswaTarget.kelas_id = enforcedKelasId;
      const totalTarget = await prisma.siswa.count({ where: whereSiswaTarget });

      return {
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
          date: dayStr,
          session_id: session.id,
          total_taps: totalTaps,
          students_entered: studentsEntered,
          students_exited: studentsExited,
          total_students_target: totalTarget,
          currently_present: Math.max(0, currentlyPresent),
          kelas: targetKelasInfo,
          session_info: {
            waktu_mulai: session.waktu_mulai,
            waktu_selesai: session.waktu_selesai,
          },
        },
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      reply.status(500);
      return { success: false, message: 'Internal server error' };
    }
  },
};
