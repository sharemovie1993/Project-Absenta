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


export const gerbangRecordsController = {
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
      const isSiswa = roleName === 'SISWA';
      const managementRoles = ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN'];
      const isManagement = managementRoles.includes(roleName) || positions.some((p: any) => managementRoles.includes(p.code));
      const hasPrivilegedAccess = roleName === RoleName.ADMIN || roleName === RoleName.SUPERADMIN || isManagement || isPetugasGerbang || org?.tenant_wide === true;
      
      let enforcedKelasId: string | null = (kelas_id as string) || null;

      if (!hasPrivilegedAccess && !isWaliKelas && !isPetugasSesi && !isSiswa) {
          reply.status(403);
          return { success: false, message: 'Forbidden: Hanya Wali Kelas, Petugas, atau Siswa yang dapat mengakses daftar ini' };
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
              // Fallback to student's own class from Siswa table
              if (isSiswa && request.user?.id) {
                const s = await prisma.siswa.findFirst({ where: { user_id: request.user.id }, select: { kelas_id: true } });
                if (s?.kelas_id) enforcedKelasId = s.kelas_id;
              }
              if (!enforcedKelasId) {
                reply.status(403);
                return { success: false, message: 'Forbidden: Anda tidak memiliki penugasan kelas yang aktif' };
              }
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
      const { siswa_id, status, catatan } = request.body || {};
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
          catatan: catatan ? String(catatan).trim() : null,
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

};
