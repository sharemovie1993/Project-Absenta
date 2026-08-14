import { handleSesiSummaryUpdate, handleSessionAttendanceUpdate, handleSesiStatusUpdate, handleAbsenGuruUpdate, handleGerbangTapUpdate, handleGateTapDomainEvent } from './attendance.events';
import { createRedisConnection } from '../redis/redisClient';
import { DOMAIN_EVENT_CHANNEL } from './index';

export async function subscribeRedisEvents(opts: { redis: any; io: any; ioApi: any }) {
  const { redis, io, ioApi } = opts;
  if (!redis) return;
  const subscriber =
    typeof redis?.duplicate === 'function' ? (redis.duplicate() as any) : (createRedisConnection() as any);
  const handlers: Record<string, (payload: any) => Promise<void>> = {
    'events:sesi_summary_update': async (payload) => handleSesiSummaryUpdate(io, ioApi, payload),
    'events:session_attendance_update': async (payload) => handleSessionAttendanceUpdate(io, ioApi, payload),
    'events:sesi_status_update': async (payload) => handleSesiStatusUpdate(io, ioApi, payload),
    'events:absen_guru_update': async (payload) => handleAbsenGuruUpdate(io, ioApi, payload),
    'events:gerbang_tap_update': async (payload) => handleGerbangTapUpdate(io, ioApi, payload),
    [DOMAIN_EVENT_CHANNEL]: async (payload) => {
      if (payload.event_type === 'attendance.tap') {
        await handleGateTapDomainEvent(payload.payload);
      }
    }
  };
  subscriber.on('message', async (channel: string, message: string) => {
    const fn = handlers[String(channel)];
    if (!fn) return;
    try {
      const payload = JSON.parse(String(message));
      await fn(payload);
    } catch (e) {
      console.error(`[RedisSubscriber] Error processing channel ${channel}:`, e);
    }
  });
  await subscriber.subscribe(...Object.keys(handlers));
}
