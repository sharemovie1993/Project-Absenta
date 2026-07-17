import { ModuleCapability } from '../../constants/capabilities';

export default async function attendancePlugin(fastify: any) {
  // Register all attendance routes under /api/attendance context
  // These routes require tenant middleware
  
  await fastify.register(async (subFastify: any) => {
    // Apply 'ABSENSI' capability requirement to all routes in this module
    subFastify.addHook('onRoute', (routeOptions: any) => {
      if (!routeOptions.config) {
        routeOptions.config = {};
      }
      // Only set if not already set (allows override)
      if (!routeOptions.config.capability) {
        routeOptions.config.capability = ModuleCapability.ABSENSI;
      }
    });

    // 1. Gerbang Routes
    const { gerbangRoutes } = await import('./gerbang/routes/gerbang.routes');
    await subFastify.register(gerbangRoutes, { prefix: '/gerbang' });

    // 2. Rekap Routes
    const { rekapRoutes } = await import('./rekap/routes/rekap.routes');
    await subFastify.register(rekapRoutes, { prefix: '/rekap' });

    // 3. Guru Monitoring Routes
    const { guruMonitoringRoutes } = await import('./guru-monitoring/routes/guru-monitoring.routes');
    await subFastify.register(guruMonitoringRoutes, { prefix: '/guru-monitoring' });

    // 4. Sesi Absensi Routes
    const { sesiAbsensiRoutes } = await import('./sesi-absensi/routes/sesi-absensi.routes');
    await subFastify.register(sesiAbsensiRoutes, { prefix: '/sesi-absensi' });

    // 5. Notify Routes
    const { attendanceNotifyRoutes } = await import('./notify/routes/notify.routes');
    await subFastify.register(attendanceNotifyRoutes, { prefix: '/notify' });

     // 8. Kejadian Khusus Routes
    const { kejadianKhususRoutes } = await import('./kejadian-khusus/routes/kejadian-khusus.routes');
    await subFastify.register(kejadianKhususRoutes, { prefix: '/kejadian-khusus' });

    // 9. Petugas Routes
    const { petugasRoutes } = await import('./petugas/routes/petugas.routes');
    await subFastify.register(petugasRoutes, { prefix: '/petugas' });

    // 10. Device Management Routes
    const { deviceRoutes } = await import('./devices/routes/device.routes');
    await subFastify.register(deviceRoutes, { prefix: '/devices' });


    subFastify.post('/session', {
      handler: async (request: any, reply: any) => {
        const { isSystemSuperAdmin } = await import('../../utils/rbac');
        if (!isSystemSuperAdmin(request.user?.roleName, request.user?.tenantId ?? request.user?.tenant_id)) {
          reply.status(403);
          return { success: false, message: 'Access denied. Only SUPERADMIN can access this endpoint.' };
        }
        const rawBody = request.body || {};
        const studentId =
          typeof rawBody.studentId === 'string' && rawBody.studentId.trim().length > 0
            ? rawBody.studentId.trim()
            : typeof rawBody.siswaId === 'string' && rawBody.siswaId.trim().length > 0
            ? rawBody.siswaId.trim()
            : '';
        const sessionId =
          typeof rawBody.sessionId === 'string' && rawBody.sessionId.trim().length > 0
            ? rawBody.sessionId.trim()
            : typeof rawBody.sesiId === 'string' && rawBody.sesiId.trim().length > 0
            ? rawBody.sesiId.trim()
            : 'stress-session';
        const msRaw = Number(rawBody.ms ?? 25);
        const ms = Math.max(0, Math.min(60000, Number.isFinite(msRaw) ? msRaw : 25));
        if (!studentId) {
          reply.status(400);
          return { success: false, code: 'INVALID_BODY', message: 'Expected body: { studentId, sessionId? }' };
        }
        const { getAttendanceQueue } = await import('../../queues/attendance.queue');
        const q = getAttendanceQueue();
        const ts = Date.now();
        await q.add(
          'attendance-stress-session',
          { ts, studentId, sessionId, ms },
          { jobId: `stress_session_${sessionId}_${studentId}_${ts}`, removeOnComplete: true, removeOnFail: true, attempts: 1 }
        );
        reply.status(200);
        return { success: true, message: 'Enqueued stress session job', data: { studentId, sessionId, ts } };
      },
    });


  }, { prefix: '/attendance' });
}
