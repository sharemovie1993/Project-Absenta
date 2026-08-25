import { prisma } from '@/utils/prisma';
import { RedisSubscriber } from '@/infra/redis/redis-subscriber';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';
import { appLogger } from '@/utils/app-logger';

export async function restoreProgressRoutes(app: any) {
  app.get('/:id/progress/stream', { preHandler: [requireCapability("academic.backups.restore"), determineDataScope()] }, async (req: any, reply: any) => {
    const { id } = req.params;
    const tenantId = req.tenantId || req.dataScope?.tenantId;

    // 1. Validation with Tenant Context
    const backup = await prisma.tenantBackup.findFirst({
      where: {
        id,
        ...(tenantId ? { tenant_id: tenantId } : {})
      }
    });
    if (!backup) {
      return reply.status(404).send({ success: false, message: 'Backup not found' });
    }

    // 2. Set SSE Headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    reply.raw.write(`: connected\n\n`);

    // 3. Setup Redis Subscriber
    const subscriber = new RedisSubscriber();
    const channel = `restore:progress:${id}`;

    // 4. Subscribe to progress
    await subscriber.subscribe(channel, (message) => {
        reply.raw.write(`data: ${message}\n\n`);
    });

    // 5. Heartbeat
    const heartbeat = setInterval(() => {
        reply.raw.write(`: heartbeat\n\n`);
    }, 20000);

    // 6. Cleanup on disconnect
    req.raw.on('close', async () => {
        clearInterval(heartbeat);
        await subscriber.unsubscribe(channel);
        await subscriber.close();
        appLogger.info({ id }, '[SSE] Client disconnected from restore progress');
    });
  });
}
