import { parentAppController } from '../controllers/parent-auth.controller';
import { parentAuthGuard } from '../guards/parent-auth.guard';
import { initParentAppAttendanceEventConsumer } from '../services/event-handlers/attendance-event-consumer';

export async function parentAppRoutes(fastify: any) {
  await initParentAppAttendanceEventConsumer();
  // console.log('🔥 parentAppRoutes REGISTERED');
  const NotificationController = (require('../../notification/controllers/notification.controller') as any)
    .NotificationController as any;
  const notificationController = new NotificationController();

  // Push Notification VAPID Key (Public within parent-app context)
  fastify.get('/notifications/push/vapid-public-key', {
    config: { skipAuth: true },
    handler: notificationController.getVapidPublicKey.bind(notificationController),
  });

  // Subscribe Push (Public within parent-app context)
  fastify.post('/notifications/push/subscribe', {
    config: { skipAuth: true },
    handler: notificationController.subscribePush.bind(notificationController),
  });

  // Register FCM token (Native app)
  fastify.post('/notifications/fcm/register', {
    config: { skipAuth: true },
    handler: notificationController.registerFcmToken.bind(notificationController),
  });

  // Main Dashboard (Profile + Active Students + Status)
  fastify.get('/me', {
    config: { skipAuth: true },
    preHandler: parentAuthGuard,
    handler: async (request: any, reply: any) => {
      console.log('🔥🔥🔥 /api/parent-app/me HANDLER HIT');
      return parentAppController.getDashboard(request, reply);
    }
  });

  // Student Attendance History (Paginated)
  fastify.get('/siswa/:id/riwayat-kehadiran', {
    config: { skipAuth: true },
    preHandler: parentAuthGuard,
    handler: parentAppController.getAttendanceHistory
  });

  // Student Notifications (Paginated)
  fastify.get('/siswa/:id/notifikasi', {
    config: { skipAuth: true },
    preHandler: parentAuthGuard,
    handler: parentAppController.getNotifications
  });

  // Student Monthly Recap
  fastify.get('/siswa/:id/rekap-bulanan', {
    config: { skipAuth: true },
    preHandler: parentAuthGuard,
    handler: parentAppController.getMonthlyRecap
  });

  // Student Daily Tracking
  fastify.get('/siswa/:id/tracking-harian', {
    config: { skipAuth: true },
    preHandler: parentAuthGuard,
    handler: parentAppController.getDailyTracking
  });

  // Report Absence (SAKIT/IZIN)
  fastify.post('/siswa/:id/lapor-absen', {
    config: { skipAuth: true },
    preHandler: parentAuthGuard,
    handler: parentAppController.reportAbsence.bind(parentAppController)
  });
}
