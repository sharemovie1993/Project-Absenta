import { createClient } from 'redis';
import { Server } from 'socket.io';
import { getRedisUrl } from '../../config/redis.config';

export function setupSocketEvents(io: Server, _ioApi: Server) {
  const redisUrl = getRedisUrl();
  const sub = createClient({ url: redisUrl });
  
  sub.on('error', (err) => console.error('[WS EVENTS] Redis Sub Error:', err));
  
  sub.connect().then(() => {
    console.log('[WS EVENTS] Redis Subscriber Connected');
    
    // Subscribe to Session Attendance Updates
    sub.subscribe('events:session_attendance_update', (message) => {
      try {
        const payload = JSON.parse(message);
        // payload: { tenant_id, sesi_id, record: { id, siswa_id, status, waktu_tap } }
        
        if (payload?.record?.siswa_id) {
           const eventData = {
             type: 'SESSION_UPDATE',
             data: payload.record,
             sesi_id: payload.sesi_id
           };
           
           // Emit to Student Room
           io.to(`siswa:${payload.record.siswa_id}`).emit('attendance_update', eventData);
           // ioApi.to(`siswa:${payload.record.siswa_id}`).emit('attendance_update', eventData); // Redundant via Redis Adapter
           
           // Also Emit to Tenant Room (if needed for dashboard monitoring)
           // io.to(`tenant:${payload.tenant_id}`).emit('attendance_update', eventData);
        }
      } catch (e) {
        console.error('[WS EVENTS] Error processing session update:', e);
      }
    });

    // Subscribe to Parent Notifications
    sub.subscribe('events:parent_notification', (message) => {
      try {
        const payload = JSON.parse(message);
        // payload: { recipient, title, message, type, related_id, tenant_id, log_id, created_at }
        
        if (payload.recipient) {
           const eventData = {
             type: 'NOTIFICATION',
             data: payload
           };
           
           // Emit to User Room (Parent)
           io.to(`user:${payload.recipient}`).emit('notification', eventData);
           // ioApi.to(`user:${payload.recipient}`).emit('notification', eventData); // Redundant via Redis Adapter
           
           console.log(`[WS EVENTS] Forwarded NOTIFICATION for ${payload.recipient}`);
        }
      } catch (e) {
        console.error('[WS EVENTS] Error processing parent notification:', e);
      }
    });

    // Subscribe to Gate Updates (Broadcasting across nodes via Redis PubSub)
    sub.subscribe('events:gerbang_tap_update', (message) => {
       try {
         const payload = JSON.parse(message);
         // payload: { tenant_id, sesi_gerbang_id, siswa_id, arah, status, record_id, source }
         
         if (payload.tenant_id) {
           const tenantRoom = `tenant:${payload.tenant_id}`;
           
           // Standard events expected by frontend managers
           io.to(tenantRoom).emit('gerbang_tap_update', payload);
           io.to(tenantRoom).emit('tenant_attendance_update', { type: 'GATE_TAP', ...payload });
           io.to(tenantRoom).emit('attendance_feed_update', { type: 'GATE_TAP', ...payload });
           
           // Specific room for Parent App or Student personal devices
           if (payload.siswa_id) {
             io.to(`siswa:${payload.siswa_id}`).emit('attendance_update', {
               type: 'GATE_TAP',
               data: payload
             });
           }
         }
       } catch (e) {
         console.error('[WS EVENTS] Error processing gerbang tap update:', e);
       }
    });

  });
}
