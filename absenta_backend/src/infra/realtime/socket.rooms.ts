import { isSystemSuperAdmin } from '../../utils/rbac';
import { SocketMonitor } from './socket.monitor';

export type AttendanceFeedBuilder = (
  tenantId: string,
  userId: string,
  roleName: string,
  params: { tanggal?: string; kelas_id?: string; guru_id?: string; siswa_id?: string }
) => Promise<any>;

export type TenantDetailProvider = {
  getTenantMetrics: (tenantId: string) => Promise<any>;
  getRecentActivities: (tenantId: string, limit: number) => Promise<any>;
  getTenantLogs: (tenantId: string, params: { page: number; limit: number }) => Promise<any>;
  getAttendanceData: (tenantId: string, params: any) => Promise<any>;
  getTenantBilling: (tenantId: string) => Promise<any>;
  getTenantUsers: (tenantId: string, page: number, limit: number) => Promise<any>;
};

export function setupSocketRooms(
  io: any,
  ioApi: any,
  fastify: any,
  opts?: { buildAttendanceFeed?: AttendanceFeedBuilder; tenantDetailProvider?: TenantDetailProvider }
) {
  const monitor = SocketMonitor.getInstance();

  io.on('connection', (socket: any) => {
    const transport = (socket.conn as any)?.transport?.name || '';
    const user = socket.data.user || {};
    const tenantId = String(user.tenantId || '');
    
    // Monitor & Limit Check
    try {
      if (tenantId) monitor.onConnect(socket, tenantId);
    } catch (err: any) {
      fastify.log.warn(`[WS] Connection rejected: ${err.message}`);
      socket.disconnect(true);
      return;
    }

    fastify.log.info(`[WS] Connected transport=${transport} userId=${String(user.id || '')} tenantId=${tenantId} roleName=${String(user.roleName || '')}`);
    if (user.roleName === 'PARENT') {
      socket.join(`tenant:${user.tenantId}`);
      socket.join(`role:${user.roleName}`);
      socket.join(`user:${user.id}`); // Direct parent notifications
      
      // Join rooms for all linked students
      if (user.activeStudents && Array.isArray(user.activeStudents)) {
        user.activeStudents.forEach((studentId: string) => {
           socket.join(`siswa:${studentId}`);
           console.log(`[WS] Parent ${user.id} joined siswa:${studentId}`);
        });
      }
    } else {
      // Regular User (Guru, Admin, Siswa)
      socket.join(`tenant:${user.tenantId}`);
      socket.join(`role:${user.roleName}`);
      socket.join(`user:${user.id}`);
    }

    let lastParams: { tanggal?: string; kelas_id?: string; guru_id?: string; siswa_id?: string } = {};
    const emitFeed = async () => {
      try {
        if (!opts?.buildAttendanceFeed) return;
        const feed = await opts.buildAttendanceFeed(String(user.tenantId), String(user.id), String(user.roleName), lastParams);
        socket.emit('attendance_feed_update', feed);
      } catch {}
    };

    socket.on('attendance_feed_subscribe', async (params: any) => {
      lastParams = params || {};
      (socket.data as any).lastFeedParams = lastParams;
      await emitFeed();
    });

    socket.on('join_tenant', async (tenantId: string) => {
      try {
        const isSysSA = isSystemSuperAdmin(user.roleName, user.tenantId);
        const targetTenant = isSysSA ? tenantId : user.tenantId;
        if (!targetTenant) return;
        const targetRoom = `tenant:${targetTenant}`;
    const rooms = Array.from(socket.rooms.values());
    rooms.forEach((r) => { const name = String(r); if (name.startsWith('tenant:')) socket.leave(name); });
        socket.join(targetRoom);
        (socket.data as any).joinedTenantId = targetTenant;
      } catch {}
    });

    socket.on('join_self', () => {
       if (user.id) {
         socket.join(`user:${user.id}`);
         fastify.log.info(`[WS] User ${user.id} joined self room manually`);
       }
    });

    socket.on('infra_monitoring_subscribe', () => {
      const isSysSA = isSystemSuperAdmin(user.roleName, user.tenantId);
      if (!isSysSA) {
        fastify.log.warn(`[WS] Unauthorized infra monitoring subscribe attempt by userId=${user.id}`);
        return;
      }
      socket.join('infra:monitoring');
      fastify.log.info(`[WS] User ${user.id} joined infra:monitoring room`);
      // InfraMonitoringBroadcaster.getInstance().start(io);
    });

    socket.on('infra_monitoring_unsubscribe', () => {
      socket.leave('infra:monitoring');
      fastify.log.info(`[WS] User ${user.id} left infra:monitoring room`);
    });

    socket.on('tenant_update_request', async (payload: any) => {
      try {
        if (!opts?.tenantDetailProvider) return;
        const isSysSA = isSystemSuperAdmin(user.roleName, user.tenantId);
        const targetTenant = (isSysSA && payload?.tenantId) ? String(payload.tenantId) : String(user.tenantId || '');
        if (!targetTenant) return;
        const targetRoom = `tenant:${targetTenant}`;
        const type = String(payload?.type || 'all');
        const tasks: Array<Promise<void>> = [];
        const emitToRoom = (event: string, data: any) => { io.to(targetRoom).emit(event, data); };
        if (type === 'all' || type === 'metrics') {
          tasks.push(opts.tenantDetailProvider.getTenantMetrics(targetTenant).then((data) => emitToRoom('tenant_metrics_update', data)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'activities') {
          tasks.push(opts.tenantDetailProvider.getRecentActivities(targetTenant, 10).then((res: any) => emitToRoom('tenant_activities_update', Array.isArray(res?.data) ? res.data : res)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'logs') {
          tasks.push(opts.tenantDetailProvider.getTenantLogs(targetTenant, { page: 1, limit: 20 }).then((data) => emitToRoom('tenant_logs_update', data)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'attendance') {
          tasks.push(opts.tenantDetailProvider.getAttendanceData(targetTenant, { period: 'weekly' }).then((data) => emitToRoom('tenant_attendance_update', data)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'billing') {
          tasks.push(opts.tenantDetailProvider.getTenantBilling(targetTenant).then((data) => emitToRoom('tenant_billing_update', data)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'users') {
          tasks.push(opts.tenantDetailProvider.getTenantUsers(targetTenant, 1, 50).then((data) => emitToRoom('tenant_users_update', data)).catch(() => Promise.resolve()));
        }
        await Promise.all(tasks);
      } catch {}
    });

    socket.on('disconnect', (reason: any) => {
      monitor.onDisconnect(socket, tenantId);
      fastify.log.warn(`[WS] Disconnected userId=${String(user.id || '')} tenantId=${String(user.tenantId || '')} reason=${String(reason || '')}`);
    });
  });

  ioApi.on('connection', (socket: any) => {
    const transport = (socket.conn as any)?.transport?.name || '';
    const user = socket.data.user || {};
    const tenantId = String(user.tenantId || '');

    // Monitor & Limit Check
    try {
      if (tenantId) monitor.onConnect(socket, tenantId);
    } catch (err: any) {
      fastify.log.warn(`[WS] Connection rejected: ${err.message}`);
      socket.disconnect(true);
      return;
    }

    fastify.log.info(`[WS] Connected transport=${transport} userId=${String(user.id || '')} tenantId=${tenantId} roleName=${String(user.roleName || '')}`);
    if (user.roleName === 'PARENT') {
      socket.join(`tenant:${user.tenantId}`);
      socket.join(`role:${user.roleName}`);
      socket.join(`user:${user.id}`); // Direct parent notifications
      
      // Join rooms for all linked students
      if (user.activeStudents && Array.isArray(user.activeStudents)) {
        user.activeStudents.forEach((student: any) => {
           const studentId = typeof student === 'string' ? student : student?.siswa_id;
           if (!studentId) return;
           socket.join(`siswa:${studentId}`);
           console.log(`[WS] Parent ${user.id} joined siswa:${studentId}`);
        });
      }
    } else {
      // Regular User (Guru, Admin, Siswa)
      socket.join(`tenant:${user.tenantId}`);
      socket.join(`role:${user.roleName}`);
      socket.join(`user:${user.id}`);
    }

    let lastParams: { tanggal?: string; kelas_id?: string; guru_id?: string; siswa_id?: string } = {};

    const emitFeed = async () => {
      try {
        if (!opts?.buildAttendanceFeed) return;
        const feed = await opts.buildAttendanceFeed(String(user.tenantId), String(user.id), String(user.roleName), lastParams);
        socket.emit('attendance_feed_update', feed);
      } catch {}
    };

    socket.on('attendance_feed_subscribe', async (params: any) => {
      lastParams = params || {};
      (socket.data as any).lastFeedParams = lastParams;
      await emitFeed();
    });

    socket.on('join_tenant', async (tenantId: string) => {
      try {
        const isSysSA = isSystemSuperAdmin(user.roleName, user.tenantId);
        const targetTenant = isSysSA ? tenantId : user.tenantId;
        if (!targetTenant) return;
        const targetRoom = `tenant:${targetTenant}`;
    const rooms = Array.from(socket.rooms.values());
    rooms.forEach((r) => { const name = String(r); if (name.startsWith('tenant:')) socket.leave(name); });
        socket.join(targetRoom);
        (socket.data as any).joinedTenantId = targetTenant;
      } catch {}
    });

    socket.on('join_self', () => {
       if (user.id) {
         socket.join(`user:${user.id}`);
         fastify.log.info(`[WS] User ${user.id} joined self room manually`);
       }
    });

    socket.on('infra_monitoring_subscribe', () => {
      const isSysSA = isSystemSuperAdmin(user.roleName, user.tenantId);
      if (!isSysSA) {
        fastify.log.warn(`[WS] Unauthorized infra monitoring subscribe attempt by userId=${user.id}`);
        return;
      }
      socket.join('infra:monitoring');
      fastify.log.info(`[WS] User ${user.id} joined infra:monitoring room`);
      // InfraMonitoringBroadcaster.getInstance().start(ioApi);
    });

    socket.on('infra_monitoring_unsubscribe', () => {
      socket.leave('infra:monitoring');
      fastify.log.info(`[WS] User ${user.id} left infra:monitoring room`);
    });

    socket.on('tenant_update_request', async (payload: any) => {
      try {
        if (!opts?.tenantDetailProvider) return;
        const isSysSA = isSystemSuperAdmin(user.roleName, user.tenantId);
        const targetTenant = (isSysSA && payload?.tenantId) ? String(payload.tenantId) : String(user.tenantId || '');
        if (!targetTenant) return;
        const targetRoom = `tenant:${targetTenant}`;
        const type = String(payload?.type || 'all');
        const tasks: Array<Promise<void>> = [];
        const emitToRoom = (event: string, data: any) => { ioApi.to(targetRoom).emit(event, data); };
        if (type === 'all' || type === 'metrics') {
          tasks.push(opts.tenantDetailProvider.getTenantMetrics(targetTenant).then((data) => emitToRoom('tenant_metrics_update', data)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'activities') {
          tasks.push(opts.tenantDetailProvider.getRecentActivities(targetTenant, 10).then((res: any) => emitToRoom('tenant_activities_update', Array.isArray(res?.data) ? res.data : res)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'logs') {
          tasks.push(opts.tenantDetailProvider.getTenantLogs(targetTenant, { page: 1, limit: 20 }).then((data) => emitToRoom('tenant_logs_update', data)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'attendance') {
          tasks.push(opts.tenantDetailProvider.getAttendanceData(targetTenant, { period: 'weekly' }).then((data) => emitToRoom('tenant_attendance_update', data)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'billing') {
          tasks.push(opts.tenantDetailProvider.getTenantBilling(targetTenant).then((data) => emitToRoom('tenant_billing_update', data)).catch(() => Promise.resolve()));
        }
        if (type === 'all' || type === 'users') {
          tasks.push(opts.tenantDetailProvider.getTenantUsers(targetTenant, 1, 50).then((data) => emitToRoom('tenant_users_update', data)).catch(() => Promise.resolve()));
        }
        await Promise.all(tasks);
      } catch {}
    });

    socket.on('disconnect', (reason: any) => {
      monitor.onDisconnect(socket, tenantId);
      fastify.log.warn(`[WS] Disconnected userId=${String(user.id || '')} tenantId=${String(user.tenantId || '')} reason=${String(reason || '')}`);
    });
  });
}
