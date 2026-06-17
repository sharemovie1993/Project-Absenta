import { PrismaClient } from '@prisma/client';
import { notificationRoutes } from './routes/notification.routes';

export async function notificationModule(fastify: any, _prisma: PrismaClient) {
  // Public routes (Webhooks) - Should be outside the protected block if they don't need auth
  // But here we register them under prefixes that are usually protected.
  // We'll wrap everything in a sub-fastify and handle auth inside if needed.
  
  await fastify.register(async (subFastify: any) => {
    await subFastify.register(notificationRoutes);
  }, { prefix: '/notifications' });

  await fastify.register(async (subFastify: any) => {
    await subFastify.register(notificationRoutes);
  }, { prefix: '/v1/notifications' });

  await fastify.register(async (subFastify: any) => {
    await subFastify.register(notificationRoutes);
  }, { prefix: '/notification' });
}

export { EmailService } from './services/email.service';
export { WhatsAppService } from './services/whatsapp.service';
export { NotificationController } from './controllers/notification.controller';
