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


export const gerbangAnalyticsController = {
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
