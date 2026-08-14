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

// In-memory active meeting room tracking: Map<roomId, { tenantId, roomTitle, hostName, startedAt, participants: Map<userId, participantInfo> }>
const activeMeetingRooms = new Map<string, {
  roomId: string;
  tenantId: string;
  roomTitle: string;
  hostName: string;
  hostRole?: string;
  startedAt: string;
  participants: Map<string, any>;
}>();

function getActiveMeetingsForTenant(tenantId: string) {
  const list: any[] = [];
  activeMeetingRooms.forEach((room) => {
    if (!room.tenantId || room.tenantId === tenantId) {
      list.push({
        roomId: room.roomId,
        roomTitle: room.roomTitle,
        hostName: room.hostName,
        hostRole: room.hostRole,
        startedAt: room.startedAt,
        participantCount: room.participants.size,
        participants: Array.from(room.participants.values())
      });
    }
  });
  return list;
}

export function registerWebRTCSignaling(socket: any, io: any, fastify: any) {
  const user = socket.data.user || {};
  const tenantId = String(user.tenantId || '');

  // 0. Kirim daftar meeting aktif saat diminta
  socket.on('meeting:get_active_list', () => {
    const list = getActiveMeetingsForTenant(tenantId);
    socket.emit('meeting:active_list_update', list);
  });

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

  // ── 6. Virtual Meeting Room Multi-Participant WebRTC Signaling ──
  socket.on('meeting:join', (data: {
    roomId: string;
    roomTitle?: string;
    participantInfo?: { name: string; role?: string; avatar?: string };
  }) => {
    if (!data?.roomId) return;
    const cleanRoomId = data.roomId.replace(/\s+/g, '').toLowerCase();
    const meetingRoom = `meeting:${cleanRoomId}`;
    socket.join(meetingRoom);

    const participant = {
      userId: user.id,
      name: data.participantInfo?.name || user.full_name || user.name || 'Peserta',
      role: data.participantInfo?.role || user.roleName || 'GTK',
      avatar: data.participantInfo?.avatar || user.avatar
    };

    if (!activeMeetingRooms.has(cleanRoomId)) {
      activeMeetingRooms.set(cleanRoomId, {
        roomId: cleanRoomId,
        tenantId,
        roomTitle: data.roomTitle || 'Rapat Koordinasi KBM',
        hostName: participant.name,
        hostRole: participant.role,
        startedAt: new Date().toISOString(),
        participants: new Map()
      });
    }
    const room = activeMeetingRooms.get(cleanRoomId)!;

    // Send existing peers in this room back to the new participant
    const existingPeers = Array.from(room.participants.values()).filter(p => p.userId !== user.id);
    socket.emit('meeting:room_state', { peers: existingPeers });

    // Store new participant
    room.participants.set(user.id, participant);

    // Broadcast ke peserta lain di ruangan
    socket.to(meetingRoom).emit('meeting:peer_joined', participant);

    // Database persistence: Sync session and load history for late joiner
    if (tenantId) {
      prisma.meetingSession.findFirst({
        where: { tenant_id: tenantId, room_id: cleanRoomId }
      }).then(async (existingSession) => {
        if (!existingSession) {
          await prisma.meetingSession.create({
            data: {
              tenant_id: tenantId,
              room_id: cleanRoomId,
              title: data.roomTitle || 'Rapat Koordinasi KBM',
              host_id: user.id,
              host_name: participant.name,
              status: 'ACTIVE'
            }
          });
        }

        // Fetch previous chat history and send to joiner
        const msgs = await prisma.meetingMessage.findMany({
          where: { tenant_id: tenantId, room_id: cleanRoomId },
          orderBy: { created_at: 'asc' },
          take: 100
        });

        if (msgs && msgs.length > 0) {
          socket.emit('meeting:chat_history', msgs.map((m) => ({
            senderId: m.sender_id,
            sender: m.sender_name,
            role: m.sender_role || 'Peserta',
            text: m.message,
            time: new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          })));
        }
      }).catch((err) => {
        fastify.log.warn(`[Meeting DB] Sync error: ${err.message}`);
      });
    }

    // Broadcast daftar meeting aktif ke seluruh tenant
    if (tenantId) {
      io.to(`tenant:${tenantId}`).emit('meeting:active_list_update', getActiveMeetingsForTenant(tenantId));
    }
    fastify.log.info(`[Meeting] User ${user.id} (${participant.name}) joined ${meetingRoom}. Total peers: ${room.participants.size}`);
  });

  socket.on('meeting:offer', (data: {
    targetUserId: string;
    roomId: string;
    offer: any;
  }) => {
    if (!data?.targetUserId || !data?.offer) return;
    io.to(`user:${data.targetUserId}`).emit('meeting:offer', {
      fromUserId: user.id,
      roomId: data.roomId,
      offer: data.offer,
      senderInfo: {
        name: user.full_name || user.name || 'Peserta',
        role: user.roleName || 'GTK',
        avatar: user.avatar
      }
    });
  });

  socket.on('meeting:answer', (data: {
    targetUserId: string;
    roomId: string;
    answer: any;
  }) => {
    if (!data?.targetUserId || !data?.answer) return;
    io.to(`user:${data.targetUserId}`).emit('meeting:answer', {
      fromUserId: user.id,
      roomId: data.roomId,
      answer: data.answer
    });
  });

  socket.on('meeting:ice_candidate', (data: {
    targetUserId: string;
    roomId: string;
    candidate: any;
  }) => {
    if (!data?.targetUserId || !data?.candidate) return;
    io.to(`user:${data.targetUserId}`).emit('meeting:ice_candidate', {
      fromUserId: user.id,
      roomId: data.roomId,
      candidate: data.candidate
    });
  });

  socket.on('meeting:chat', (data: {
    roomId: string;
    text: string;
    senderName?: string;
    senderRole?: string;
    time?: string;
  }) => {
    if (!data?.roomId || !data?.text) return;
    const cleanRoomId = data.roomId.replace(/\s+/g, '').toLowerCase();
    const senderName = data.senderName || user.full_name || user.name || (user as any).username || 'Peserta';
    const senderRole = data.senderRole || user.roleName || 'Peserta Rapat';
    const currentTime = data.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Persist chat message to PostgreSQL database
    if (tenantId) {
      prisma.meetingMessage.create({
        data: {
          tenant_id: tenantId,
          room_id: cleanRoomId,
          sender_id: user.id,
          sender_name: senderName,
          sender_role: senderRole,
          message: data.text
        }
      }).catch((err) => {
        fastify.log.warn(`[Meeting DB] Message persist error: ${err.message}`);
      });
    }

    io.to(`meeting:${cleanRoomId}`).emit('meeting:chat', {
      senderId: user.id,
      sender: senderName,
      role: senderRole,
      text: data.text,
      time: currentTime
    });
  });

  socket.on('meeting:reaction', (data: { roomId: string; emoji: string }) => {
    if (!data?.roomId || !data?.emoji) return;
    const cleanRoomId = data.roomId.replace(/\s+/g, '').toLowerCase();
    io.to(`meeting:${cleanRoomId}`).emit('meeting:reaction', {
      emoji: data.emoji,
      userId: user.id,
      userName: user.full_name || user.name || 'Peserta'
    });
  });

  socket.on('meeting:raise_hand', (data: { roomId: string; isRaised: boolean }) => {
    if (!data?.roomId) return;
    const cleanRoomId = data.roomId.replace(/\s+/g, '').toLowerCase();
    io.to(`meeting:${cleanRoomId}`).emit('meeting:raise_hand', {
      userId: user.id,
      isRaised: data.isRaised
    });
  });

  socket.on('meeting:mute_all', (data: { roomId: string }) => {
    if (!data?.roomId) return;
    const cleanRoomId = data.roomId.replace(/\s+/g, '').toLowerCase();
    socket.to(`meeting:${cleanRoomId}`).emit('meeting:mute_all', {
      byUserId: user.id
    });
  });

  socket.on('meeting:save_notulen', async (payload: any) => {
    if (!payload?.roomId) return;
    const cleanRoomId = String(payload.roomId).replace(/\s+/g, '').toLowerCase();
    try {
      if (tenantId) {
        const existing = await prisma.meetingSession.findFirst({
          where: { tenant_id: tenantId, room_id: cleanRoomId }
        });
        if (existing) {
          await prisma.meetingSession.update({
            where: { id: existing.id },
            data: {
              status: 'COMPLETED',
              ended_at: new Date()
            }
          });
        } else {
          await prisma.meetingSession.create({
            data: {
              tenant_id: tenantId,
              room_id: cleanRoomId,
              title: payload.roomTitle || 'Rapat Koordinasi',
              host_id: user.id,
              host_name: payload.hostName || user.full_name || 'Host',
              status: 'COMPLETED',
              ended_at: new Date()
            }
          });
        }
      }
      socket.emit('meeting:notulen_saved', { success: true, roomId: cleanRoomId });
    } catch (err: any) {
      fastify.log.warn(`[Meeting Notulen DB] Failed to save: ${err.message}`);
      socket.emit('meeting:notulen_saved', { success: false, error: err.message });
    }
  });

  socket.on('meeting:leave', (data: { roomId: string }) => {
    if (!data?.roomId) return;
    const cleanRoomId = data.roomId.replace(/\s+/g, '').toLowerCase();
    const meetingRoom = `meeting:${cleanRoomId}`;
    socket.leave(meetingRoom);

    const room = activeMeetingRooms.get(cleanRoomId);
    if (room) {
      room.participants.delete(user.id);
      if (room.participants.size === 0) {
        activeMeetingRooms.delete(cleanRoomId);
      }
    }

    socket.to(meetingRoom).emit('meeting:peer_left', { userId: user.id });

    // Update tenant active meeting list
    if (tenantId) {
      io.to(`tenant:${tenantId}`).emit('meeting:active_list_update', getActiveMeetingsForTenant(tenantId));
    }
    fastify.log.info(`[Meeting] User ${user.id} left ${meetingRoom}`);
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
