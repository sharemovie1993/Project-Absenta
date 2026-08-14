import { isSystemSuperAdmin } from '../../utils/rbac';
import { SocketMonitor } from './socket.monitor';
import { prisma } from '../../utils/prisma';

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

function registerWebRTCSignaling(socket: any, io: any, fastify: any) {
  const user = socket.data.user || {};

  // 1. Inisiasi Panggilan
  socket.on('call:initiate', async (data: {
    callId: string;
    targetUserId: string;
    threadId?: string;
    callType: 'AUDIO' | 'VIDEO';
    offer: any;
    callerName?: string;
    callerRole?: string;
    callerAvatar?: string;
  }) => {
    try {
      if (!data?.targetUserId || !data?.callId) return;

      const callerName = data.callerName || user.full_name || user.name || 'Penelepon';
      const callerRole = data.callerRole || user.roleName || 'GTK';

      io.to(`user:${data.targetUserId}`).emit('call:incoming', {
        callId: data.callId,
        callerId: user.id,
        callerName,
        callerRole,
        callerAvatar: data.callerAvatar || user.avatar,
        callType: data.callType || 'AUDIO',
        offer: data.offer,
        threadId: data.threadId
      });
      fastify.log.info(`[WebRTC] Call initiated from ${user.id} to ${data.targetUserId} (type: ${data.callType})`);
    } catch (err: any) {
      fastify.log.error(`[WebRTC] Error initiating call: ${err.message}`);
    }
  });

  // 2. Jawaban Panggilan (Accepted)
  socket.on('call:accepted', (data: {
    callId: string;
    targetUserId: string;
    answer: any;
  }) => {
    if (!data?.targetUserId || !data?.answer) return;
    io.to(`user:${data.targetUserId}`).emit('call:accepted', {
      callId: data.callId,
      answer: data.answer,
      calleeId: user.id
    });
    fastify.log.info(`[WebRTC] Call ${data.callId} accepted by ${user.id}`);
  });

  // 3. Panggilan Ditolak / Sibuk (Rejected)
  socket.on('call:rejected', (data: {
    callId: string;
    targetUserId: string;
    reason?: string;
  }) => {
    if (!data?.targetUserId) return;
    io.to(`user:${data.targetUserId}`).emit('call:rejected', {
      callId: data.callId,
      reason: data.reason || 'Panggilan ditolak',
      byUserId: user.id
    });
    fastify.log.info(`[WebRTC] Call ${data.callId} rejected by ${user.id}`);
  });

  // 4. Pertukaran ICE Candidate (NAT / Firewall Traversal)
  socket.on('call:ice_candidate', (data: {
    callId: string;
    targetUserId: string;
    candidate: any;
  }) => {
    if (!data?.targetUserId || !data?.candidate) return;
    io.to(`user:${data.targetUserId}`).emit('call:ice_candidate', {
      callId: data.callId,
      candidate: data.candidate,
      fromUserId: user.id
    });
  });

  // 5. Panggilan Selesai / Ditutup (Ended)
  socket.on('call:ended', async (data: {
    callId: string;
    targetUserId: string;
    durationSeconds?: number;
    threadId?: string;
    callType?: 'AUDIO' | 'VIDEO';
  }) => {
    if (!data?.targetUserId) return;
    io.to(`user:${data.targetUserId}`).emit('call:ended', {
      callId: data.callId,
      durationSeconds: data.durationSeconds || 0,
      byUserId: user.id
    });

    // Logging ke Database Chat jika threadId ada
    if (data.threadId && user.tenantId) {
      try {
        const durationSec = data.durationSeconds || 0;
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const durStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        const icon = data.callType === 'VIDEO' ? '📹' : '📞';
        const typeStr = data.callType === 'VIDEO' ? 'Panggilan Video' : 'Panggilan Suara';

        await (prisma as any).internalMessage.create({
          data: {
            tenant_id: user.tenantId,
            thread_id: data.threadId,
            sender_id: user.id,
            content: `${icon} ${typeStr} Selesai (${durStr})`,
            is_system_event: true
          }
        });
      } catch (logErr: any) {
        fastify.log.warn(`[WebRTC] Failed to log call history: ${logErr.message}`);
      }
    }
    fastify.log.info(`[WebRTC] Call ${data.callId} ended by ${user.id} (duration: ${data.durationSeconds}s)`);
  });
}

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

    // ── WebRTC Production Calling Signaling ──
    registerWebRTCSignaling(socket, io, fastify);
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

    // ── WebRTC Production Calling Signaling ──
    registerWebRTCSignaling(socket, ioApi, fastify);
  });
}
