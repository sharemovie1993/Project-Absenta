import { createSocketServers } from './socket.init';
import { setupSocketAuth } from './socket.auth';
import { setupSocketRooms } from './socket.rooms';
import { setupSocketEvents } from './socket.events';
import { createPostResponseCacheInvalidation } from '../../middleware/cache-invalidation.middleware';
import type { ParentTokenValidator } from './socket.auth';
import type { AttendanceFeedBuilder, TenantDetailProvider } from './socket.rooms';

export async function initRealtime(opts: {
  server: any;
  fastify: any;
  prisma: any;
  adapters?: {
    validateParentToken?: ParentTokenValidator;
    buildAttendanceFeed?: AttendanceFeedBuilder;
    tenantDetailProvider?: TenantDetailProvider;
  };
}) {
  const { server, fastify } = opts;
  const { io, ioApi } = createSocketServers(server);
  (fastify as any).io = io;
  (fastify as any).ioApi = ioApi;
  fastify.addHook('onResponse', createPostResponseCacheInvalidation(io));
  fastify.addHook('onResponse', createPostResponseCacheInvalidation(ioApi));
  setupSocketAuth(io, ioApi, fastify, { validateParentToken: opts.adapters?.validateParentToken });
  setupSocketRooms(io, ioApi, fastify, {
    buildAttendanceFeed: opts.adapters?.buildAttendanceFeed,
    tenantDetailProvider: opts.adapters?.tenantDetailProvider,
  });
  setupSocketEvents(io, ioApi);
  return { io, ioApi };
}
